import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Zalo, ThreadType } from 'zca-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5050;
const SESSION_FILE = path.join(__dirname, 'session.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Global state
let zaloInstance = new Zalo();
let zaloApi = null;
let currentQR = null;
let qrStatus = 'idle'; // 'idle' | 'generating' | 'waiting_scan' | 'scanned' | 'expired' | 'ready'
let currentUser = null;
let currentOwnId = null;
let isLoggingIn = false;

// Load persisted config
let alertConfig = {
  enabled: true,
  targetType: 'user', // 'user' | 'group'
  targetId: '', // empty means own cloud
  targetName: 'Cloud của tôi (Zalo cá nhân)',
  cooldownMinutes: 3,
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    alertConfig = { ...alertConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) };
  } catch (e) {
    console.error('Error loading config.json:', e);
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(alertConfig, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving config.json:', e);
  }
}

// In-memory alert cache for smart dispatch & deduplication
const alertHistory = new Map();

// Initialize session if exists
async function tryAutoLogin() {
  if (!fs.existsSync(SESSION_FILE)) {
    console.log('[Zalo Service] Chưa có phiên đăng nhập (session.json).');
    return false;
  }

  try {
    console.log('[Zalo Service] Đang khôi phục phiên đăng nhập từ session.json...');
    const credentials = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    zaloInstance = new Zalo();
    zaloApi = await zaloInstance.login(credentials);
    
    try {
      currentOwnId = zaloApi.getOwnId();
    } catch {
      currentOwnId = null;
    }

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
    console.log(`[Zalo Service] Đăng nhập thành công! Tài khoản: ${currentUser.name} (ID: ${currentOwnId})`);
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
        try {
          fs.writeFileSync(SESSION_FILE, JSON.stringify(event.data, null, 2), 'utf-8');
          console.log('[Zalo Service] Đã lưu thông tin phiên đăng nhập vào session.json.');
        } catch (err) {
          console.error('[Zalo Service] Lỗi lưu session:', err);
        }
      }
    });

    zaloApi = await apiPromise;
    try {
      currentOwnId = zaloApi.getOwnId();
    } catch {
      currentOwnId = null;
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
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
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
    const groupsRaw = await zaloApi.getAllGroups().catch(() => ({ data: [] }));
    const friendsRaw = await zaloApi.getAllFriends().catch(() => ({ data: [] }));

    const groups = (Array.isArray(groupsRaw) ? groupsRaw : groupsRaw?.data || []).map((g) => ({
      id: g.groupId || g.id,
      name: g.groupName || g.name || 'Nhóm không tên',
      avatar: g.groupAvatar || g.avatar || '',
      type: 'group',
    }));

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

// Helper to send message
async function executeSendMessage(text, targetType, targetId) {
  if (!zaloApi) {
    throw new Error('Chưa đăng nhập Zalo');
  }

  const destinationId = targetId || currentOwnId;
  if (!destinationId) {
    throw new Error('Không xác định được ID người nhận hoặc Cloud của tôi');
  }

  const threadType = targetType === 'group' ? ThreadType.Group : ThreadType.User;
  console.log(`[Zalo Service] Đang gửi tin đến: ${destinationId} (Loại: ${targetType})...`);
  
  const result = await zaloApi.sendMessage(
    {
      msg: text,
      urgency: 2, // Urgent priority
    },
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

  const { alertKey, message, isResolved = false, forceSend = false } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Thiếu nội dung tin nhắn cảnh báo' });
  }

  const now = Date.now();
  const cooldownMs = (alertConfig.cooldownMinutes || 3) * 60 * 1000;

  // Smart Check:
  // - If alertKey is new -> SEND IMMEDIATELY!
  // - If isResolved -> SEND IMMEDIATELY!
  // - If forceSend -> SEND IMMEDIATELY!
  // - If already sent within cooldown and message content has not changed -> Skip to avoid flooding
  if (!forceSend && !isResolved && alertKey) {
    const lastSent = alertHistory.get(alertKey);
    if (lastSent && (now - lastSent.timestamp < cooldownMs) && lastSent.message === message) {
      return res.json({
        skipped: true,
        reason: `Cảnh báo ${alertKey} đã gửi cách đây ${Math.round((now - lastSent.timestamp) / 1000)}s (Đang trong chu kỳ cooldown)`,
      });
    }
  }

  try {
    const targetType = alertConfig.targetType;
    const targetId = alertConfig.targetId;

    const result = await executeSendMessage(message, targetType, targetId);
    
    // Update history
    if (alertKey) {
      if (isResolved) {
        alertHistory.delete(alertKey);
      } else {
        alertHistory.set(alertKey, { timestamp: now, message });
      }
    }

    res.json({
      success: true,
      deliveredTo: alertConfig.targetName || 'Zalo',
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
    const nowStr = new Date().toLocaleTimeString('vi-VN');
    const testMsg = `🔔 [THỬ NGHIỆM HỆ THỐNG ĐIỀU PHỐI NHÀ THUỐC]\n` +
      `✅ Kết nối thành công giữa Web Dashboard và Zalo!\n` +
      `📍 Người nhận: ${alertConfig.targetName || 'Zalo của bạn'}\n` +
      `⏰ Thời gian kiểm tra: ${nowStr}\n` +
      `👉 Khi phát hiện quá tải khách chờ hoặc mất cân đối quầy, thông báo khẩn sẽ tự động gửi đến đây.`;

    const result = await executeSendMessage(testMsg, alertConfig.targetType, alertConfig.targetId);
    res.json({ success: true, message: 'Đã gửi tin nhắn thử nghiệm thành công!', result });
  } catch (err) {
    console.error('[Zalo Service] Lỗi gửi test:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 ZALO DISPATCH BRIDGE ĐANG CHẠY TẠI CỔNG :${PORT}`);
  console.log(`🌐 API Endpoint: http://localhost:${PORT}/api/status`);
  console.log(`====================================================`);
  
  // Try auto-login on startup
  await tryAutoLogin();
});
