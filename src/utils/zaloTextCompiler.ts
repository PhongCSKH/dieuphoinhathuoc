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
  so_khach?: number | string;
  so_quay?: number | string;
  so_lech?: number | string;
  thoi_gian?: number | string;
  quay_can_mo?: number | string;
  danh_sach_quay_moi?: string;
  [key: string]: any;
}

/**
 * Biên dịch nội dung kịch bản kèm biến động, tính toán offset chính xác cho Mention và Styles
 */
export function compileZaloMessage(
  template: string,
  variables: TemplateVariables,
  mentionMembers: ZaloGroupMember[] = [],
  baseStyles: ZaloStyleItem[] = []
): {
  message: string;
  styles: ZaloStyleItem[];
  mentions: ZaloMentionItem[];
} {
  let compiledText = template;

  // 1. Thay thế các biến thông dụng
  const replaceMap: Record<string, string> = {
    '{ten_quay}': String(variables.ten_quay ?? 'Nhà thuốc'),
    '{so_khach}': String(variables.so_khach ?? 0),
    '{so_quay}': String(variables.so_quay ?? 0),
    '{so_lech}': String(variables.so_lech ?? 0),
    '{thoi_gian}': String(variables.thoi_gian ?? 0),
    '{quay_can_mo}': String(variables.quay_can_mo ?? 1),
    '{danh_sach_quay_moi}': String(variables.danh_sach_quay_moi ?? ''),
  };

  for (const [token, val] of Object.entries(replaceMap)) {
    compiledText = compiledText.split(token).join(val);
  }

  // 2. Xử lý Tag Mention nhân sự trong nhóm
  const mentions: ZaloMentionItem[] = [];
  if (mentionMembers.length > 0) {
    let tagBlock = '\n👉 Kính chuyển: ';
    const mentionTokens: Array<{ tagString: string; uid: string }> = [];

    mentionMembers.forEach((member) => {
      const tagString = `@${member.name}`;
      mentionTokens.push({ tagString, uid: member.uid });
    });

    // Nếu trong template có sẵn placeholder {tag_nhan_su}
    if (compiledText.includes('{tag_nhan_su}')) {
      const tagIndex = compiledText.indexOf('{tag_nhan_su}');
      let currentOffset = tagIndex;
      const builtTags: string[] = [];

      mentionTokens.forEach((mt) => {
        const str = mt.tagString;
        mentions.push({
          pos: currentOffset,
          len: str.length,
          uid: mt.uid,
          name: str,
        });
        currentOffset += str.length + 1; // 1 space
        builtTags.push(str);
      });

      compiledText = compiledText.replace('{tag_nhan_su}', builtTags.join(' '));
    } else {
      // Tự động chèn khối tag vào cuối tin nhắn
      let currentOffset = compiledText.length + tagBlock.length;
      const builtTags: string[] = [];

      mentionTokens.forEach((mt) => {
        const str = mt.tagString;
        mentions.push({
          pos: currentOffset,
          len: str.length,
          uid: mt.uid,
          name: str,
        });
        currentOffset += str.length + 1;
        builtTags.push(str);
      });

      tagBlock += builtTags.join(' ');
      compiledText += tagBlock;
    }
  }

  // 3. Chuẩn hóa styles
  // Giữ lại các style hợp lệ trong phạm vi chiều dài tin nhắn mới
  const validStyles = (baseStyles || [])
    .filter((s) => s.start < compiledText.length)
    .map((s) => ({
      ...s,
      len: Math.min(s.len, Math.max(1, compiledText.length - s.start)),
    }));

  return {
    message: compiledText,
    styles: validStyles,
    mentions,
  };
}
