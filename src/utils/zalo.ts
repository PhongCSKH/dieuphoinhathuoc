import { ZaloStatus, ZaloAlertConfig, ZaloContact } from '../types';

const ZALO_BRIDGE_BASE = 'http://localhost:5050';

export async function fetchZaloStatus(): Promise<ZaloStatus | null> {
  try {
    const res = await fetch(`${ZALO_BRIDGE_BASE}/api/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function requestZaloQR(): Promise<{ success: boolean; qrCode?: string; qrStatus?: string; message?: string }> {
  try {
    const res = await fetch(`${ZALO_BRIDGE_BASE}/api/login-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || 'Không thể kết nối đến Zalo Bridge' };
  }
}

export async function logoutZalo(): Promise<boolean> {
  try {
    const res = await fetch(`${ZALO_BRIDGE_BASE}/api/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchZaloContacts(): Promise<{
  self: ZaloContact;
  groups: ZaloContact[];
  friends: ZaloContact[];
} | null> {
  try {
    const res = await fetch(`${ZALO_BRIDGE_BASE}/api/contacts`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateZaloConfig(config: Partial<ZaloAlertConfig>): Promise<boolean> {
  try {
    const res = await fetch(`${ZALO_BRIDGE_BASE}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function triggerTestZalo(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${ZALO_BRIDGE_BASE}/api/test-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gửi thất bại');
    return { success: true, message: data.message || 'Đã gửi thành công!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi kết nối' };
  }
}

export async function dispatchZaloAlert(params: {
  alertKey: string;
  message: string;
  isResolved?: boolean;
  forceSend?: boolean;
}): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
  try {
    const res = await fetch(`${ZALO_BRIDGE_BASE}/api/send-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      return { success: false, reason: err.error };
    }
    return await res.json();
  } catch {
    return { success: false, reason: 'Bridge offline' };
  }
}

/**
 * Tạo nội dung tin nhắn cảnh báo định dạng Zalo chuẩn chuyên nghiệp
 */
export function formatZaloOverloadAlert(params: {
  pharmacyName: string;
  waitingCount: number;
  activeCounters: string[];
  ratio: number;
  threshold: number;
}): string {
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const counterStr = params.activeCounters.length > 0 
    ? `${params.activeCounters.length} quầy (Quầy ${params.activeCounters.join(', ')})`
    : '0 quầy (Chưa mở quầy!)';

  return `🚨 [CẢNH BÁO QUÁ TẢI NHÀ THUỐC]\n` +
    `📍 Khu vực: ${params.pharmacyName}\n` +
    `⚠️ Tình trạng: Quá tải khách chờ nhận thuốc!\n` +
    `👥 Số khách đang chờ: ${params.waitingCount} người\n` +
    `🚪 Số quầy đang phục vụ: ${counterStr}\n` +
    `📊 Tỷ lệ phục vụ: ${params.ratio.toFixed(1)} khách/quầy (Ngưỡng cho phép: ${params.threshold})\n` +
    `👉 Đề xuất CSKH: Đề nghị điều phối mở thêm quầy hoặc cử nhân viên hỗ trợ lấy thuốc!\n` +
    `⏰ Thời gian: ${timeStr} - ${dateStr}`;
}

export function formatZaloImbalanceAlert(params: {
  nt1Waiting: number;
  nt2Waiting: number;
  diff: number;
  threshold: number;
}): string {
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const higher = params.nt1Waiting > params.nt2Waiting ? 'Nhà Thuốc 1' : 'Nhà Thuốc 2';

  return `⚖️ [CẢNH BÁO LỆCH TẢI NHÀ THUỐC]\n` +
    `⚠️ Phát hiện mất cân đối giữa Nhà Thuốc 1 & Nhà Thuốc 2:\n` +
    `🔴 Nhà Thuốc 1: ${params.nt1Waiting} khách chờ\n` +
    `🔵 Nhà Thuốc 2: ${params.nt2Waiting} khách chờ\n` +
    `📈 Độ chênh lệch: ${params.diff} khách (Ngưỡng cảnh báo: ${params.threshold})\n` +
    `👉 Đề xuất CSKH: Hướng dẫn khách hàng di chuyển bớt sang quầy ít tải hơn để giảm ứ đọng tại ${higher}!\n` +
    `⏰ Thời gian: ${timeStr} - ${dateStr}`;
}

export function formatZaloResolvedAlert(params: {
  pharmacyName: string;
  waitingCount: number;
  activeCountersCount: number;
}): string {
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `✅ [HẠ TẢI - ĐÃ ỔN ĐỊNH]\n` +
    `📍 Khu vực: ${params.pharmacyName}\n` +
    `🟢 Lượng khách chờ đã giảm về mức an toàn: ${params.waitingCount} khách (${params.activeCountersCount} quầy đang mở).\n` +
    `⏰ Thời gian: ${timeStr}`;
}
