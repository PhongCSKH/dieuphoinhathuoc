import React from 'react';
import { ZaloStyleItem, ZaloMentionItem, ZaloGroupMember } from '../types';

export const ZALO_PRESET_COLORS = [
  { name: 'Đỏ Khẩn Cấp', hex: '#db342e', code: 'c_db342e' },
  { name: 'Cam Cảnh Báo', hex: '#f27806', code: 'c_f27806' },
  { name: 'Vàng Lưu Ý', hex: '#f7b503', code: 'c_f7b503' },
  { name: 'Xanh Lá An Toàn', hex: '#15a85f', code: 'c_15a85f' },
  { name: 'Xanh Dương Zalo', hex: '#0068ff', code: 'c_0068ff' },
  { name: 'Tím Điều Phối', hex: '#7b1fa2', code: 'c_7b1fa2' },
  { name: 'Hồng Nổi Bật', hex: '#e91e63', code: 'c_e91e63' },
  { name: 'Xám Tối', hex: '#4b5563', code: 'c_4b5563' },
];

export function hexToZaloColorCode(hex: string): string {
  const clean = hex.replace('#', '').trim().toLowerCase();
  return `c_${clean}`;
}

export function zaloColorCodeToHex(code: string): string {
  if (code.startsWith('c_')) {
    return `#${code.slice(2)}`;
  }
  return '#ffffff';
}

export interface TemplateVariables {
  ten_quay?: string;
  ma_quay?: string;
  so_khach?: number | string;
  dang_phuc_vu?: number | string;
  so_quay?: number | string;
  danh_sach_quay_mo?: string;
  danh_sach_quay_moi?: string;
  quay_can_mo?: number | string;
  tai_trong?: number | string;
  nguong_tai?: number | string;
  so_lech?: number | string;
  quay_dong?: string;
  quay_vang?: string;
  thoi_gian?: number | string;
  gio_hien_tai?: string;
  nt1_khach?: number | string;
  nt1_quay?: number | string;
  nt1_tai_trong?: number | string;
  nt2_khach?: number | string;
  nt2_quay?: number | string;
  nt2_tai_trong?: number | string;
  nt3_khach?: number | string;
  nt3_quay?: number | string;
  nt3_tai_trong?: number | string;
  nt4_khach?: number | string;
  nt4_quay?: number | string;
  nt4_tai_trong?: number | string;
  tong_quan_cac_quay?: string;
  tong_khach_cho?: number | string;
  tong_quay_mo?: number | string;
  [key: string]: any;
}

export const TEMPLATE_VARIABLE_DEFINITIONS = [
  // Nhóm 1: Quầy phát sinh cảnh báo
  { token: '{ten_quay}', label: 'Tên Quầy', desc: 'Tên nhà thuốc phát sinh cảnh báo (vd: Nhà thuốc 1)', group: 'current' },
  { token: '{ma_quay}', label: 'Mã Quầy', desc: 'Mã nhà thuốc (vd: NT1)', group: 'current' },
  { token: '{so_khach}', label: 'Số Khách Chờ', desc: 'Số khách đang bấm số chờ tại quầy', group: 'current' },
  { token: '{dang_phuc_vu}', label: 'Đang Phục Vụ', desc: 'Số khách đang được gọi phục vụ tại quầy', group: 'current' },
  { token: '{so_quay}', label: 'Số Quầy Mở', desc: 'Số lượng quầy đang mở phục vụ', group: 'current' },
  { token: '{danh_sach_quay_mo}', label: 'DS Quầy Đang Mở', desc: 'Tên các quầy đang mở (vd: Quầy 08, 09)', group: 'current' },
  { token: '{tai_trong}', label: 'Tải Trọng Hiện Tại', desc: 'Tỉ lệ khách/quầy (vd: 4.0)', group: 'current' },
  { token: '{nguong_tai}', label: 'Ngưỡng Tải Quy Định', desc: 'Ngưỡng tải trọng tối đa đã cấu hình (vd: 3)', group: 'current' },
  { token: '{quay_can_mo}', label: 'Số Quầy Cần Mở', desc: 'Số quầy tối thiểu cần mở thêm để hạ tải', group: 'current' },
  { token: '{danh_sach_quay_moi}', label: 'Quầy Mới Mở Thêm', desc: 'Quầy vừa được tăng cường (vd: Quầy 10)', group: 'current' },
  { token: '{thoi_gian}', label: 'Thời Gian Chờ', desc: 'Số giây khách chờ khi chưa mở quầy (vd: 60s)', group: 'current' },

  // Nhóm 2: Điều phối lệch tải & thời gian
  { token: '{so_lech}', label: 'Độ Lệch Tải', desc: 'Chênh lệch số khách giữa NT1 và NT2', group: 'dispatch' },
  { token: '{quay_dong}', label: 'Quầy Đông Hơn', desc: 'Tên quầy cần chuyển bớt khách đi', group: 'dispatch' },
  { token: '{quay_vang}', label: 'Quầy Còn Trống', desc: 'Tên quầy vắng sẵn sàng nhận khách', group: 'dispatch' },
  { token: '{gio_hien_tai}', label: 'Giờ Hiện Tại', desc: 'Thời gian phát cảnh báo (vd: 14:30:15)', group: 'dispatch' },
  { token: '{tag_nhan_su}', label: 'Tag Nhân Sự Nhóm', desc: 'Vị trí tag đích danh @Tên nhân sự', group: 'dispatch' },

  // Nhóm 3: Toàn viện realtime (Tổng quan tất cả các quầy)
  { token: '{tong_quan_cac_quay}', label: 'Tổng Quan Toàn Viện', desc: 'Bảng tóm tắt realtime NT1, NT2, NT3, NT4', group: 'system' },
  { token: '{tong_khach_cho}', label: 'Tổng Khách Toàn Viện', desc: 'Tổng số khách chờ của cả 4 quầy', group: 'system' },
  { token: '{tong_quay_mo}', label: 'Tổng Quầy Mở Toàn Viện', desc: 'Tổng số quầy đang mở của cả 4 quầy', group: 'system' },
  { token: '{nt1_khach}', label: 'NT1 Khách Chờ', desc: 'Số khách chờ tại Nhà thuốc 1', group: 'system' },
  { token: '{nt1_quay}', label: 'NT1 Quầy Mở', desc: 'Số quầy mở tại Nhà thuốc 1', group: 'system' },
  { token: '{nt2_khach}', label: 'NT2 Khách Chờ', desc: 'Số khách chờ tại Nhà thuốc 2', group: 'system' },
  { token: '{nt2_quay}', label: 'NT2 Quầy Mở', desc: 'Số quầy mở tại Nhà thuốc 2', group: 'system' },
  { token: '{nt3_khach}', label: 'NT3 Khách Chờ', desc: 'Số khách chờ tại Nhà thuốc 3', group: 'system' },
  { token: '{nt3_quay}', label: 'NT3 Quầy Mở', desc: 'Số quầy mở tại Nhà thuốc 3', group: 'system' },
  { token: '{nt4_khach}', label: 'NT4 Khách Chờ', desc: 'Số khách chờ tại Nhà thuốc 4', group: 'system' },
  { token: '{nt4_quay}', label: 'NT4 Quầy Mở', desc: 'Số quầy mở tại Nhà thuốc 4', group: 'system' },
];

interface TagOpenInfo {
  tag: string;
  attr?: string;
  startInPlain: number;
}

/**
 * Parser giải mã chuỗi có chứa inline tags: [b], [i], [u], [s], [color=...], [big], [small]
 * Trả về:
 * - plainText: Chuỗi sạch đã bỏ toàn bộ tags (dùng để gửi vào Zalo)
 * - styles: Mảng ZaloStyleItem { start, len, st } chuẩn xác 100% đến từng byte
 */
export function parseInlineTagsToZaloStyles(textWithTags: string): {
  plainText: string;
  styles: ZaloStyleItem[];
} {
  let plainText = '';
  const styles: ZaloStyleItem[] = [];
  const openStack: TagOpenInfo[] = [];
  let upperCount = 0;

  // Regex bắt các tag mở và đóng: [b], [/b], [color=...], [/color], [upper], [/upper], v.v.
  const tagRegex = /\[(\/)?(b|i|u|s|big|small|color|upper)(?:=([^\]]+))?\]/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(textWithTags)) !== null) {
    // 1. Ký tự thường trước tag
    const rawBefore = textWithTags.substring(lastIndex, match.index);
    if (rawBefore.length > 0) {
      const textBefore = upperCount > 0 ? rawBefore.toLocaleUpperCase('vi-VN') : rawBefore;
      plainText += textBefore;
    }
    lastIndex = tagRegex.lastIndex;

    const isClose = !!match[1];
    const tagName = match[2].toLowerCase();
    const attr = match[3];

    if (!isClose) {
      if (tagName === 'upper') {
        upperCount++;
      }
      // Tag mở: đẩy vào stack kèm vị trí bắt đầu trong plainText
      openStack.push({
        tag: tagName,
        attr,
        startInPlain: plainText.length,
      });
    } else {
      if (tagName === 'upper') {
        upperCount = Math.max(0, upperCount - 1);
      }
      // Tag đóng: tìm tag mở tương ứng gần nhất
      const foundIdx = openStack.map((o) => o.tag).lastIndexOf(tagName);
      if (foundIdx !== -1) {
        const opened = openStack.splice(foundIdx, 1)[0];
        const len = plainText.length - opened.startInPlain;
        if (len > 0) {
          let styleCode = '';
          if (opened.tag === 'b') styleCode = 'b';
          else if (opened.tag === 'i') styleCode = 'i';
          else if (opened.tag === 'u') styleCode = 'u';
          else if (opened.tag === 's') styleCode = 's';
          else if (opened.tag === 'big') styleCode = 'f_18';
          else if (opened.tag === 'small') styleCode = 'f_13';
          else if (opened.tag === 'color' && opened.attr) {
            let colorVal = opened.attr.trim();
            if (colorVal.startsWith('#')) {
              styleCode = hexToZaloColorCode(colorVal);
            } else if (colorVal.startsWith('c_')) {
              styleCode = colorVal;
            } else {
              styleCode = `c_${colorVal}`;
            }
          }

          if (styleCode) {
            styles.push({
              start: opened.startInPlain,
              len,
              st: styleCode,
            });
          }
        }
      }
    }
  }

  // Thêm phần còn lại sau tag cuối cùng
  if (lastIndex < textWithTags.length) {
    const rawTrailing = textWithTags.substring(lastIndex);
    plainText += upperCount > 0 ? rawTrailing.toLocaleUpperCase('vi-VN') : rawTrailing;
  }

  return { plainText, styles };
}

/**
 * Biên dịch nội dung kịch bản:
 * 1. Thay thế biến số động
 * 2. Gắn Mention nhân sự
 * 3. Bóc tách inline tags thành plainText + Zalo styles chính xác 100%
 */
export function compileZaloMessage(
  template: string,
  variables: TemplateVariables,
  mentionMembers: ZaloGroupMember[] = [],
  legacyStyles: ZaloStyleItem[] = []
): {
  message: string;
  styles: ZaloStyleItem[];
  mentions: ZaloMentionItem[];
  plainText: string;
} {
  let text = template || '';

  // 1. Thay thế các biến động
  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const replaceMap: Record<string, string> = {
    '{ten_quay}': String(variables.ten_quay ?? 'Nhà thuốc 1'),
    '{ma_quay}': String(variables.ma_quay ?? 'NT1'),
    '{so_khach}': String(variables.so_khach ?? 0),
    '{dang_phuc_vu}': String(variables.dang_phuc_vu ?? 0),
    '{so_quay}': String(variables.so_quay ?? 0),
    '{danh_sach_quay_mo}': String(variables.danh_sach_quay_mo ?? 'Quầy 08, 09'),
    '{danh_sach_quay_moi}': String(variables.danh_sach_quay_moi ?? ''),
    '{quay_can_mo}': String(variables.quay_can_mo ?? 1),
    '{tai_trong}': String(variables.tai_trong ?? '0.0'),
    '{nguong_tai}': String(variables.nguong_tai ?? 3),
    '{so_lech}': String(variables.so_lech ?? 0),
    '{quay_dong}': String(variables.quay_dong ?? 'Nhà thuốc 1'),
    '{quay_vang}': String(variables.quay_vang ?? 'Nhà thuốc 2'),
    '{thoi_gian}': String(variables.thoi_gian ?? 60),
    '{gio_hien_tai}': String(variables.gio_hien_tai ?? timeStr),
    '{nt1_khach}': String(variables.nt1_khach ?? 0),
    '{nt1_quay}': String(variables.nt1_quay ?? 0),
    '{nt1_tai_trong}': String(variables.nt1_tai_trong ?? '0.0'),
    '{nt2_khach}': String(variables.nt2_khach ?? 0),
    '{nt2_quay}': String(variables.nt2_quay ?? 0),
    '{nt2_tai_trong}': String(variables.nt2_tai_trong ?? '0.0'),
    '{nt3_khach}': String(variables.nt3_khach ?? 0),
    '{nt3_quay}': String(variables.nt3_quay ?? 0),
    '{nt3_tai_trong}': String(variables.nt3_tai_trong ?? '0.0'),
    '{nt4_khach}': String(variables.nt4_khach ?? 0),
    '{nt4_quay}': String(variables.nt4_quay ?? 0),
    '{nt4_tai_trong}': String(variables.nt4_tai_trong ?? '0.0'),
    '{tong_quan_cac_quay}': String(
      variables.tong_quan_cac_quay ??
        `• NT1: ${variables.nt1_khach ?? 0} khách / ${variables.nt1_quay ?? 0} quầy\n` +
        `• NT2: ${variables.nt2_khach ?? 0} khách / ${variables.nt2_quay ?? 0} quầy\n` +
        `• NT3: ${variables.nt3_khach ?? 0} khách / ${variables.nt3_quay ?? 0} quầy\n` +
        `• NT4: ${variables.nt4_khach ?? 0} khách / ${variables.nt4_quay ?? 0} quầy`
    ),
    '{tong_khach_cho}': String(variables.tong_khach_cho ?? 0),
    '{tong_quay_mo}': String(variables.tong_quay_mo ?? 0),
  };

  for (const [token, val] of Object.entries(replaceMap)) {
    text = text.split(token).join(val);
  }

  // 2. Xử lý Tag Mention nhân sự
  let mentionsText = '';
  const mentionMembersList = mentionMembers || [];
  if (mentionMembersList.length > 0) {
    mentionsText = mentionMembersList.map((m) => `@${m.name}`).join(' ');
  }

  if (text.includes('{tag_nhan_su}')) {
    text = text.replace('{tag_nhan_su}', mentionsText);
  } else if (mentionsText) {
    text = text + `\n👉 Kính chuyển: ${mentionsText}`;
  }

  // 3. Phân giải Inline Tags sang plainText và styles
  const { plainText, styles: parsedStyles } = parseInlineTagsToZaloStyles(text);

  // 4. Tính toán offset chính xác cho Mentions trên plainText
  const mentions: ZaloMentionItem[] = [];
  if (mentionMembersList.length > 0) {
    mentionMembersList.forEach((member) => {
      const tagStr = `@${member.name}`;
      const pos = plainText.indexOf(tagStr);
      if (pos !== -1) {
        mentions.push({
          pos,
          len: tagStr.length,
          uid: member.uid,
          name: tagStr,
        });
      }
    });
  }

  // Hợp nhất styles: ưu tiên parsedStyles từ tags, nếu không có tags thì dùng legacyStyles
  const finalStyles = parsedStyles.length > 0 ? parsedStyles : (legacyStyles || []);

  return {
    message: plainText,
    styles: finalStyles,
    mentions,
    plainText,
  };
}

/**
 * Render trực tiếp chuỗi có Inline Tags thành React Nodes trong khung Xem Trước Zalo
 */
export function renderFormattedPreview(textWithTags: string): React.ReactNode {
  // Thay thế tags thành cấu trúc React
  const parts: React.ReactNode[] = [];
  const tagRegex = /\[(\/)?(b|i|u|s|big|small|color|upper)(?:=([^\]]+))?\]/gi;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  interface StyleState {
    b: boolean;
    i: boolean;
    u: boolean;
    s: boolean;
    upper: boolean;
    size: 'normal' | 'big' | 'small';
    color?: string;
  }

  const currentStyle: StyleState = {
    b: false,
    i: false,
    u: false,
    s: false,
    upper: false,
    size: 'normal',
  };

  const styleStack: StyleState[] = [];

  const addTextChunk = (chunk: string) => {
    if (!chunk) return;
    const chunkText = currentStyle.upper ? chunk.toLocaleUpperCase('vi-VN') : chunk;
    const styleObj: React.CSSProperties = {
      fontWeight: currentStyle.b ? 'bold' : 'normal',
      fontStyle: currentStyle.i ? 'italic' : 'normal',
      textTransform: currentStyle.upper ? 'uppercase' : 'none',
      textDecoration: [
        currentStyle.u ? 'underline' : '',
        currentStyle.s ? 'line-through' : '',
      ]
        .filter(Boolean)
        .join(' ') || 'none',
      fontSize:
        currentStyle.size === 'big'
          ? '15px'
          : currentStyle.size === 'small'
          ? '11px'
          : '13px',
      color: currentStyle.color || '#1e293b',
    };

    parts.push(
      React.createElement('span', { key: parts.length, style: styleObj }, chunkText)
    );
  };

  while ((match = tagRegex.exec(textWithTags)) !== null) {
    const textBefore = textWithTags.substring(lastIdx, match.index);
    addTextChunk(textBefore);
    lastIdx = tagRegex.lastIndex;

    const isClose = !!match[1];
    const tagName = match[2].toLowerCase();
    const attr = match[3];

    if (!isClose) {
      styleStack.push({ ...currentStyle });
      if (tagName === 'b') currentStyle.b = true;
      if (tagName === 'i') currentStyle.i = true;
      if (tagName === 'u') currentStyle.u = true;
      if (tagName === 's') currentStyle.s = true;
      if (tagName === 'upper') currentStyle.upper = true;
      if (tagName === 'big') currentStyle.size = 'big';
      if (tagName === 'small') currentStyle.size = 'small';
      if (tagName === 'color' && attr) {
        currentStyle.color = attr.startsWith('#')
          ? attr
          : attr.startsWith('c_')
          ? zaloColorCodeToHex(attr)
          : `#${attr}`;
      }
    } else {
      if (styleStack.length > 0) {
        const prev = styleStack.pop()!;
        Object.assign(currentStyle, prev);
      }
    }
  }

  if (lastIdx < textWithTags.length) {
    addTextChunk(textWithTags.substring(lastIdx));
  }

  return parts;
}
