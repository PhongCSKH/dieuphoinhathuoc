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

export interface ZaloStyleItem {
  start: number;
  len: number;
  st: string;
}

export interface ZaloFormattedMessage {
  text: string;
  styles: ZaloStyleItem[];
  urgency: number; // 0 = Default, 1 = Important, 2 = Urgent
}

export async function dispatchZaloAlert(params: {
  alertKey: string;
  message: string;
  styles?: ZaloStyleItem[];
  urgency?: number;
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

// Helper sinh Rich Text Style cho dòng tiêu đề
function makeTitleStyle(title: string, colorCode: string = 'c_db342e'): ZaloStyleItem[] {
  return [
    { start: 0, len: title.length, st: 'b' }, // In đậm
    { start: 0, len: title.length, st: colorCode }, // Đổi màu
    { start: 0, len: title.length, st: 'f_18' }, // Chữ lớn
  ];
}

/**
 * 1. CẢNH BÁO ĐÔNG (QUÁ TẢI)
 * Màu Đỏ Khẩn Cấp, In Đậm
 */
export function formatZaloOverloadAlert(params: {
  pharmacyName: string;
  waitingCount: number;
  activeCounters: string[];
  threshold: number;
}): ZaloFormattedMessage {
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const title = `[CẢNH BÁO ĐÔNG - ${params.pharmacyName.toUpperCase()}]`;
  const counterStr = params.activeCounters.length > 0 
    ? `${params.activeCounters.length} quầy (Quầy ${params.activeCounters.join(', ')})`
    : '0 quầy (Chưa mở quầy!)';
  const neededCounters = Math.max(1, Math.ceil(params.waitingCount / params.threshold) - params.activeCounters.length);

  const text = `${title}\n` +
    `• Khách chờ: ${params.waitingCount} người\n` +
    `• Đang phục vụ: ${counterStr}\n` +
    `→ Đề xuất: Mở thêm tối thiểu ${neededCounters} quầy\n` +
    `• Thời gian: ${timeStr}`;

  return {
    text,
    styles: makeTitleStyle(title, 'c_db342e'), // Đỏ khẩn cấp
    urgency: 2, // Khẩn cấp
  };
}

/**
 * 2. TĂNG CƯỜNG QUẦY (ĐÃ MỞ THÊM QUẦY KỂ TỪ LÚC CẢNH BÁO)
 * Màu Xanh Lá, In Đậm
 */
export function formatZaloReinforcedAlert(params: {
  pharmacyName: string;
  addedCounters: string[];
  totalCounters: number;
  initialCounterCount: number;
  waitingCount: number;
}): ZaloFormattedMessage {
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const title = `[TĂNG CƯỜNG QUẦY - ${params.pharmacyName.toUpperCase()}]`;

  const text = `${title}\n` +
    `• Tăng cường: +${params.addedCounters.length} quầy (Mở thêm Quầy ${params.addedCounters.join(', ')})\n` +
    `• Tổng quầy phục vụ: ${params.totalCounters} quầy (ban đầu ${params.initialCounterCount} quầy)\n` +
    `• Khách chờ hiện tại: ${params.waitingCount} người (Đang giảm)\n` +
    `• Thời gian: ${timeStr}`;

  return {
    text,
    styles: makeTitleStyle(title, 'c_15a85f'), // Xanh lá
    urgency: 2,
  };
}

/**
 * 3. HẠ TẢI - ĐÃ ỔN ĐỊNH
 * Màu Xanh Lá, In Đậm
 */
export function formatZaloResolvedAlert(params: {
  pharmacyName: string;
  waitingCount: number;
  activeCountersCount: number;
}): ZaloFormattedMessage {
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const title = `[HẠ TẢI ỔN ĐỊNH - ${params.pharmacyName.toUpperCase()}]`;

  const text = `${title}\n` +
    `• Khách chờ còn: ${params.waitingCount} người (Đã an toàn)\n` +
    `• Quầy hoạt động: ${params.activeCountersCount} quầy\n` +
    `✔ Trạng thái: Bình thường, đã giải tỏa xong\n` +
    `• Thời gian: ${timeStr}`;

  return {
    text,
    styles: makeTitleStyle(title, 'c_15a85f'), // Xanh lá
    urgency: 0,
  };
}

/**
 * 4. LỆCH TẢI NT1 VÀ NT2
 * Màu Cam, In Đậm
 */
export function formatZaloImbalanceAlert(params: {
  heavierName?: string;
  lighterName?: string;
  heavierCount?: number;
  lighterCount?: number;
  nt1Waiting?: number;
  nt2Waiting?: number;
  diff: number;
  threshold?: number;
}): ZaloFormattedMessage {
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const title = `[LỆCH TẢI - NHÀ THUỐC 1 & 2]`;
  const isNt1Higher = (params.nt1Waiting ?? 0) >= (params.nt2Waiting ?? 0);
  const heavierName = params.heavierName || (isNt1Higher ? 'Nhà Thuốc 1' : 'Nhà Thuốc 2');
  const lighterName = params.lighterName || (isNt1Higher ? 'Nhà Thuốc 2' : 'Nhà Thuốc 1');
  const heavierCount = params.heavierCount ?? Math.max(params.nt1Waiting ?? 0, params.nt2Waiting ?? 0);
  const lighterCount = params.lighterCount ?? Math.min(params.nt1Waiting ?? 0, params.nt2Waiting ?? 0);

  const text = `${title}\n` +
    `• ${heavierName}: ${heavierCount} khách chờ (Đông hơn)\n` +
    `• ${lighterName}: ${lighterCount} khách chờ\n` +
    `• Chênh lệch: ${params.diff} khách\n` +
    `→ Đề xuất: Điều phối khách sang ${lighterName}\n` +
    `• Thời gian: ${timeStr}`;

  return {
    text,
    styles: makeTitleStyle(title, 'c_f27806'), // Màu Cam
    urgency: 1, // Cảnh báo
  };
}

/**
 * 5. CHƯA CÓ QUẦY MỞ (0 QUẦY)
 * Màu Đỏ Khẩn Cấp
 */
export function formatZaloNoCounterAlert(params: {
  pharmacyName: string;
  waitingCount: number;
}): ZaloFormattedMessage {
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const title = `[CHƯA CÓ QUẦY MỞ - ${params.pharmacyName.toUpperCase()}]`;

  const text = `${title}\n` +
    `• Khách đang đợi: ${params.waitingCount} người\n` +
    `• Quầy hoạt động: 0 quầy (Chưa mở quầy!)\n` +
    `→ Đề xuất: Mở quầy gấp\n` +
    `• Thời gian: ${timeStr}`;

  return {
    text,
    styles: makeTitleStyle(title, 'c_db342e'), // Đỏ khẩn cấp
    urgency: 2, // Khẩn cấp
  };
}

/**
 * 6. VÃN KHÁCH HOÀN TOÀN (BỎ DÒNG ĐỀ XUẤT THEO YÊU CẦU)
 * Màu Xanh Lam, In Đậm
 */
export function formatZaloLowTrafficAlert(params: {
  pharmacyName: string;
  waitingCount: number;
  counterCount: number;
}): ZaloFormattedMessage {
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const title = `[VÃN KHÁCH - ${params.pharmacyName.toUpperCase()}]`;

  const text = `${title}\n` +
    `• Khách chờ: ${params.waitingCount} người / ${params.counterCount} quầy mở\n` +
    `✔ Tình hình: Đã vãn khách hoàn toàn\n` +
    `• Thời gian: ${timeStr}`;

  return {
    text,
    styles: makeTitleStyle(title, 'c_15a85f'), // Xanh lá
    urgency: 0,
  };
}
