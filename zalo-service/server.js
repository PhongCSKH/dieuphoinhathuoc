import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Zalo, ThreadType } from 'zca-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5050;

// Thư mục lưu trữ cố định trong Windows AppData - Miễn nhiễm với Git branch, build hay xóa file dự án
const USER_DATA_DIR = path.join(
  process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || os.homedir(), 'Library/Preferences') : path.join(process.env.HOME || os.homedir(), '.config')),
  'zalo-dispatch-bridge'
);
if (!fs.existsSync(USER_DATA_DIR)) {
  try {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Không thể tạo thư mục AppData:', err);
  }
}

const SESSION_FILE = path.join(USER_DATA_DIR, 'session.json');
const CONFIG_FILE = path.join(USER_DATA_DIR, 'config.json');
const LOCAL_SESSION_FILE = path.join(__dirname, 'session.json');
const LOCAL_CONFIG_FILE = path.join(__dirname, 'config.json');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Global state
let zaloInstance = new Zalo();
let zaloApi = null;
let currentQR = null;
let qrStatus = 'idle'; // 'idle' | 'generating' | 'waiting_scan' | 'scanned' | 'expired' | 'ready'
let currentUser = null;
let currentOwnId = null;
let isLoggingIn = false;

// Helper lưu & đọc session
function loadSessionData() {
  if (fs.existsSync(SESSION_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    } catch {}
  }
  if (fs.existsSync(LOCAL_SESSION_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_SESSION_FILE, 'utf-8'));
    } catch {}
  }
  return null;
}

function saveSessionData(data) {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), 'utf-8');
    try { fs.writeFileSync(LOCAL_SESSION_FILE, JSON.stringify(data, null, 2), 'utf-8'); } catch {}
    console.log('[Zalo Service] Đã lưu phiên đăng nhập vĩnh viễn vào:', SESSION_FILE);
  } catch (err) {
    console.error('[Zalo Service] Lỗi lưu session:', err.message);
  }
}

// Load persisted config
let alertConfig = {
  enabled: true,
  targetType: 'user', // 'user' | 'group'
  targetId: '', // empty means own cloud
  targetName: 'Cloud của tôi (Zalo cá nhân)',
  cooldownMinutes: 3,
};

function loadConfigData() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch {}
  }
  if (fs.existsSync(LOCAL_CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_CONFIG_FILE, 'utf-8'));
    } catch {}
  }
  return null;
}

const initialSavedConfig = loadConfigData();
if (initialSavedConfig) {
  alertConfig = { ...alertConfig, ...initialSavedConfig };
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(alertConfig, null, 2), 'utf-8');
    try { fs.writeFileSync(LOCAL_CONFIG_FILE, JSON.stringify(alertConfig, null, 2), 'utf-8'); } catch {}
  } catch (e) {
    console.error('Error saving config.json:', e);
  }
}

// In-memory alert cache for smart dispatch & deduplication
const alertHistory = new Map();

// Initialize session if exists
async function tryAutoLogin() {
  const credentials = loadSessionData();
  if (!credentials) {
    console.log('[Zalo Service] Chưa có phiên đăng nhập đã lưu trong hệ thống.');
    return false;
  }

  try {
    console.log('[Zalo Service] Đang khôi phục phiên đăng nhập từ AppData...');
    zaloInstance = new Zalo();
    zaloApi = await zaloInstance.login(credentials);
    
    try {
      currentOwnId = zaloApi.getOwnId();
    } catch {
      currentOwnId = null;
    }

    // Tự động làm mới và cập nhật cookies mới nhất vào storage
    try {
      const fullCookies = zaloApi.getCookie().toJSON().cookies;
      const ctx = zaloApi.getContext();
      saveSessionData({
        cookie: fullCookies,
        imei: ctx.imei,
        userAgent: ctx.userAgent,
        language: ctx.language || 'vi',
      });
    } catch {}

    try {
      const info = await zaloApi.fetchAccountInfo();
      currentUser = {
        id: currentOwnId,
        name: info?.data?.name || info?.data?.display_name || 'Người dùng Zalo',
        avatar: info?.data?.avatar || '',
      };
    } catch {
      currentUser = { id: currentOwnId, name: 'Đã kết nối Zalo cá nhân', avatar: '' };
    }

    qrStatus = 'ready';
    console.log(`[Zalo Service] Đăng nhập tự động thành công! Tài khoản: ${currentUser.name} (ID: ${currentOwnId})`);
    return true;
  } catch (err) {
    console.warn('[Zalo Service] Khôi phục session thất bại:', err.message);
    zaloApi = null;
    currentUser = null;
    qrStatus = 'idle';
    return false;
  }
}

// Start QR login
async function startQRLogin() {
  if (isLoggingIn) return;
  isLoggingIn = true;
  qrStatus = 'generating';
  currentQR = null;

  try {
    zaloInstance = new Zalo();
    console.log('[Zalo Service] Đang yêu cầu mã QR từ máy chủ Zalo...');

    const apiPromise = zaloInstance.loginQR({}, (event) => {
      // 0: QRCodeGenerated
      if (event.type === 0) {
        currentQR = `data:image/png;base64,${event.data.image}`;
        qrStatus = 'waiting_scan';
        console.log('[Zalo Service] Đã tạo mã QR mới, đang chờ quét...');
      }
      // 1: QRCodeExpired
      else if (event.type === 1) {
        qrStatus = 'expired';
        console.log('[Zalo Service] Mã QR đã hết hạn.');
      }
      // 2: QRCodeScanned
      else if (event.type === 2) {
        qrStatus = 'scanned';
        currentUser = {
          name: event.data?.display_name || 'Đang xác thực...',
          avatar: event.data?.avatar || '',
        };
        console.log(`[Zalo Service] Đã quét QR bởi: ${currentUser.name}. Vui lòng bấm Xác nhận trên điện thoại!`);
      }
      // 4: GotLoginInfo
      else if (event.type === 4) {
        saveSessionData(event.data);
      }
    });

    zaloApi = await apiPromise;
    try {
      currentOwnId = zaloApi.getOwnId();
    } catch {
      currentOwnId = null;
    }

    // Sau khi đăng nhập thành công, trích xuất và lưu trọn vẹn bộ cookie phiên mới nhất từ Zalo Context
    try {
      const fullCookies = zaloApi.getCookie().toJSON().cookies;
      const ctx = zaloApi.getContext();
      const completeSession = {
        cookie: fullCookies,
        imei: ctx.imei,
        userAgent: ctx.userAgent,
        language: ctx.language || 'vi',
      };
      saveSessionData(completeSession);
      console.log('[Zalo Service] Đã cập nhật trọn vẹn bộ Cookie phiên đăng nhập Zalo vào AppData!');
    } catch (saveErr) {
      console.warn('[Zalo Service] Cảnh báo lưu cookie cập nhật:', saveErr.message);
    }

    try {
      const info = await zaloApi.fetchAccountInfo();
      currentUser = {
        id: currentOwnId,
        name: info?.data?.name || info?.data?.display_name || currentUser?.name || 'Người dùng Zalo',
        avatar: info?.data?.avatar || currentUser?.avatar || '',
      };
    } catch {
      currentUser = { id: currentOwnId, name: currentUser?.name || 'Zalo Cá Nhân', avatar: '' };
    }

    qrStatus = 'ready';
    currentQR = null;
    console.log(`[Zalo Service] Hoàn tất đăng nhập: ${currentUser.name}!`);
  } catch (err) {
    console.error('[Zalo Service] Quá trình quét QR thất bại:', err.message);
    qrStatus = 'idle';
    currentQR = null;
    zaloApi = null;
  } finally {
    isLoggingIn = false;
  }
}

// API Routes

// 1. Get Status
app.get('/api/status', (req, res) => {
  res.json({
    online: true,
    loggedIn: !!zaloApi && qrStatus === 'ready',
    qrStatus,
    qrCode: currentQR,
    user: currentUser,
    config: alertConfig,
  });
});

// 2. Request new QR Code
app.post('/api/login-qr', async (req, res) => {
  if (zaloApi && qrStatus === 'ready') {
    return res.json({ success: true, message: 'Đã đăng nhập', loggedIn: true, user: currentUser });
  }

  // Trigger QR generation in background
  startQRLogin();
  
  // Wait a short moment to return the QR if quickly ready
  let attempts = 0;
  while (!currentQR && attempts < 10) {
    await new Promise((r) => setTimeout(r, 400));
    attempts++;
  }

  res.json({
    success: true,
    qrStatus,
    qrCode: currentQR,
    message: currentQR ? 'Mã QR đã sẵn sàng' : 'Đang khởi tạo mã QR...',
  });
});

// 3. Logout
app.post('/api/logout', (req, res) => {
  try {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
    if (fs.existsSync(LOCAL_SESSION_FILE)) fs.unlinkSync(LOCAL_SESSION_FILE);
  } catch {}
  zaloApi = null;
  currentUser = null;
  currentOwnId = null;
  qrStatus = 'idle';
  currentQR = null;
  res.json({ success: true, message: 'Đã đăng xuất tài khoản Zalo' });
});

// 4. Update Alert Configuration
app.post('/api/config', (req, res) => {
  const { enabled, targetType, targetId, targetName, cooldownMinutes } = req.body;
  if (typeof enabled === 'boolean') alertConfig.enabled = enabled;
  if (targetType) alertConfig.targetType = targetType;
  if (targetId !== undefined) alertConfig.targetId = targetId;
  if (targetName) alertConfig.targetName = targetName;
  if (cooldownMinutes !== undefined) alertConfig.cooldownMinutes = Number(cooldownMinutes);
  
  saveConfig();
  res.json({ success: true, config: alertConfig });
});

// 5. Get Contacts / Groups for selection
app.get('/api/contacts', async (req, res) => {
  if (!zaloApi) {
    return res.status(401).json({ error: 'Chưa đăng nhập Zalo' });
  }

  try {
    let groups = [];
    try {
      const groupsRaw = await zaloApi.getAllGroups();
      const groupIds = Object.keys(groupsRaw?.gridVerMap || {});
      console.log('[Zalo Service] Tìm thấy danh sách Group IDs:', groupIds);
      if (groupIds.length > 0) {
        const infoResp = await zaloApi.getGroupInfo(groupIds);
        const infoMap = infoResp?.gridInfoMap || {};
        groups = groupIds.map((gid) => {
          const g = infoMap[gid] || {};
          return {
            id: gid,
            name: g.name || `Nhóm ${gid}`,
            avatar: g.avt || g.avatar || '',
            type: 'group',
          };
        });
      }
    } catch (gErr) {
      console.error('[Zalo Service] Lỗi khi lấy danh sách nhóm:', gErr.message);
    }

    const friendsRaw = await zaloApi.getAllFriends().catch(() => ({ data: [] }));
    const friends = (Array.isArray(friendsRaw) ? friendsRaw : friendsRaw?.data || []).map((f) => ({
      id: f.userId || f.id,
      name: f.displayName || f.name || 'Bạn bè',
      avatar: f.avatar || '',
      type: 'user',
    }));


    res.json({
      self: {
        id: currentOwnId || '',
        name: 'Cloud của tôi (Zalo cá nhân)',
        type: 'user',
      },
      groups,
      friends,
    });
  } catch (err) {
    console.error('[Zalo Service] Lỗi lấy danh bạ:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5.1 Get Group Members for Mentioning
app.get('/api/group-members', async (req, res) => {
  if (!zaloApi) {
    return res.status(401).json({ error: 'Chưa đăng nhập Zalo' });
  }

  const groupId = req.query.groupId || alertConfig.targetId;
  if (!groupId) {
    return res.status(400).json({ error: 'Thiếu groupId' });
  }

  try {
    const infoResp = await zaloApi.getGroupInfo(groupId);
    const groupInfo = infoResp?.gridInfoMap?.[groupId];
    const memList = groupInfo?.memVerList || [];
    if (!memList || memList.length === 0) {
      return res.json({ members: [] });
    }

    // memVerList may contain items like "uid_0" or pure uid
    const uids = memList.map((m) => (typeof m === 'string' ? m.split('_')[0] : m));
    // Chunk requests if there are too many members
    const chunkUids = uids.slice(0, 100);
    const membersInfo = await zaloApi.getGroupMembersInfo(chunkUids);
    const profiles = membersInfo?.profiles || {};

    const members = Object.keys(profiles).map((uid) => ({
      uid,
      name: profiles[uid].displayName || profiles[uid].zaloName || 'Thành viên',
      avatar: profiles[uid].avatar || '',
    }));

    res.json({ members });
  } catch (err) {
    console.error('[Zalo Service] Lỗi lấy danh sách thành viên nhóm:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper to send message
async function executeSendMessage(text, targetType, targetId, styles = [], urgency = 2, mentions = [], imageBase64 = null) {
  if (!zaloApi) {
    throw new Error('Chưa đăng nhập Zalo');
  }

  const destinationId = targetId || currentOwnId;
  if (!destinationId) {
    throw new Error('Không xác định được ID người nhận hoặc Cloud của tôi');
  }

  const threadType = targetType === 'group' ? ThreadType.Group : ThreadType.User;
  console.log(`[Zalo Service] Đang gửi tin đến: ${destinationId} (Loại: ${targetType}, Styles: ${styles?.length || 0}, Mentions: ${mentions?.length || 0}, Urgency: ${urgency}, HasImage: ${!!imageBase64})...`);
  
  const payload = {
    msg: text,
    urgency,
  };
  if (Array.isArray(styles) && styles.length > 0) {
    payload.styles = styles;
  }
  if (Array.isArray(mentions) && mentions.length > 0) {
    payload.mentions = mentions;
  }

  // Xử lý đính kèm ảnh nếu có (Base64 JPEG/PNG)
  if (imageBase64) {
    try {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const filename = `snapshot_${Date.now()}.jpg`;

      // zca-js Attachment format
      payload.attachments = [
        {
          data: buffer,
          filename: filename,
          metadata: {
            totalSize: buffer.length,
          },
        },
      ];
      console.log(`[Zalo Service] Đã đính kèm ảnh chụp màn hình (${Math.round(buffer.length / 1024)} KB)`);
    } catch (imgErr) {
      console.error('[Zalo Service] Lỗi xử lý đính kèm ảnh:', imgErr.message);
    }
  }

  const result = await zaloApi.sendMessage(
    payload,
    destinationId,
    threadType
  );

  return result;
}

// 6. Send Dispatch Alert (with smart deduplication & immediate trigger)
app.post('/api/send-alert', async (req, res) => {
  if (!alertConfig.enabled) {
    return res.json({ skipped: true, reason: 'Tính năng gửi Zalo đang tắt trong cấu hình' });
  }

  if (!zaloApi) {
    return res.status(401).json({ error: 'Chưa đăng nhập Zalo trên máy tính' });
  }

  const { alertKey, message, styles = [], urgency = 2, mentions = [], isResolved = false, forceSend = false, imageBase64 = null, targetType: reqTargetType, targetId: reqTargetId, targetName: reqTargetName } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Thiếu nội dung tin nhắn cảnh báo' });
  }

  const now = Date.now();
  const cooldownMs = (alertConfig.cooldownMinutes || 3) * 60 * 1000;

  // Smart Cooldown & Deduplication:
  // - If forceSend -> Gửi ngay lập tức!
  // - If isResolved -> Gửi ngay lập tức và xóa lịch sử quá tải!
  // - Nếu cùng alertKey và chưa hết thời gian cooldown -> Bỏ qua để chống spam lặp lại liên tục
  if (!forceSend && !isResolved && alertKey) {
    const lastSent = alertHistory.get(alertKey);
    if (lastSent && (now - lastSent.timestamp < cooldownMs)) {
      const remainingSec = Math.round((cooldownMs - (now - lastSent.timestamp)) / 1000);
      console.log(`[Zalo Service] Giãn cách cảnh báo [${alertKey}] - Còn ${remainingSec}s nữa mới nhắc lại (Cooldown: ${alertConfig.cooldownMinutes || 3} phút)`);
      return res.json({
        skipped: true,
        reason: `Cảnh báo ${alertKey} đang trong chu kỳ giãn cách (còn ${remainingSec}s)`,
      });
    }
  }

  try {
    const targetType = reqTargetType || alertConfig.targetType;
    const targetId = reqTargetId !== undefined ? reqTargetId : alertConfig.targetId;
    const destinationLabel = reqTargetName || (targetId ? `Nhóm/ID ${targetId}` : alertConfig.targetName || 'Zalo');

    const result = await executeSendMessage(message, targetType, targetId, styles, urgency, mentions, imageBase64);
    
    // Update history
    if (alertKey) {
      if (isResolved) {
        alertHistory.delete(alertKey);
        const resolvedMatch = alertKey.match(/resolved-(.+)/);
        if (resolvedMatch) {
          const phId = resolvedMatch[1];
          alertHistory.delete(`overload-${phId}`);
          alertHistory.delete(`no-counter-${phId}`);
        }
        console.log(`[Zalo Service] Đã hạ tải và giải phóng cảnh báo [${alertKey}]`);
      } else {
        alertHistory.set(alertKey, { timestamp: now, message });
        console.log(`[Zalo Service] Đã gửi cảnh báo thành công [${alertKey}]`);
      }
    }

    res.json({
      success: true,
      deliveredTo: destinationLabel,
      result,
    });
  } catch (err) {
    console.error('[Zalo Service] Lỗi gửi cảnh báo:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Test Message Endpoint
app.post('/api/test-alert', async (req, res) => {
  if (!zaloApi) {
    return res.status(401).json({ error: 'Chưa đăng nhập Zalo' });
  }

  try {
    const { imageBase64 = null } = req.body || {};
    const nowStr = new Date().toLocaleTimeString('vi-VN');
    const title = `[THỬ NGHIỆM - ĐIỀU PHỐI NHÀ THUỐC]`;
    const testMsg = `${title}\n` +
      `• Kết nối: Thành công giữa Web Dashboard và Zalo\n` +
      `• Người nhận: ${alertConfig.targetName || 'Zalo của bạn'}\n` +
      `• Tình trạng: Hệ thống giám sát tự động hoạt động bình thường\n` +
      (imageBase64 ? `• Hình ảnh đính kèm: Đã chụp và đính kèm snapshot màn hình\n` : '') +
      `• Thời gian: ${nowStr}`;

    const styles = [
      { start: 0, len: title.length, st: 'b' },
      { start: 0, len: title.length, st: 'c_0d6efd' },
      { start: 0, len: title.length, st: 'f_18' },
    ];

    const result = await executeSendMessage(testMsg, alertConfig.targetType, alertConfig.targetId, styles, 0, [], imageBase64);
    res.json({ success: true, message: 'Đã gửi tin nhắn thử nghiệm thành công!', result });
  } catch (err) {
    console.error('[Zalo Service] Lỗi gửi test:', err);
    res.status(500).json({ error: err.message });
  }
});

// Chống crash: Bắt mọi ngoại lệ để dịch vụ chạy bền bỉ 24/7
process.on('uncaughtException', (err) => {
  console.error('[Zalo Service] Đã ngăn chặn lỗi ngoại lệ (Uncaught Exception):', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Zalo Service] Đã ngăn chặn lỗi Promise (Unhandled Rejection):', reason?.message || reason);
});

// Start Express Server
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 ZALO DISPATCH BRIDGE ĐANG CHẠY TẠI CỔNG :${PORT}`);
  console.log(`🌐 API Endpoint: http://localhost:${PORT}/api/status`);
  console.log(`====================================================`);
  
  // Try auto-login on startup
  await tryAutoLogin();

  // Tự động kiểm tra và phục hồi kết nối định kỳ mỗi 60 giây
  setInterval(async () => {
    if (!zaloApi || qrStatus !== 'ready') {
      console.log('[Zalo Service] Phát hiện mất kết nối Zalo, đang tự động phục hồi...');
      await tryAutoLogin();
    }
  }, 60 * 1000);
});

