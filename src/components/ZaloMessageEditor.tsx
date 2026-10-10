import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBold,
  faItalic,
  faUnderline,
  faStrikethrough,
  faPalette,
  faBell,
  faCircleExclamation,
  faAt,
  faTrashCan,
  faCheck,
  faPlus,
  faCamera,
} from '@fortawesome/free-solid-svg-icons';
import { AlertScenario, ZaloGroupMember } from '../types';
import {
  ZALO_PRESET_COLORS,
  TEMPLATE_VARIABLE_DEFINITIONS,
  renderFormattedPreview,
} from '../utils/zaloTextCompiler';
import { fetchGroupMembers } from '../utils/zalo';

interface ZaloMessageEditorProps {
  scenario: AlertScenario;
  onChange: (updated: AlertScenario) => void;
  groupId?: string;
}

export const ZaloMessageEditor: React.FC<ZaloMessageEditorProps> = ({
  scenario,
  onChange,
  groupId,
}) => {
  const [availableMembers, setAvailableMembers] = useState<ZaloGroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('#db342e');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [variableGroupFilter, setVariableGroupFilter] = useState<'all' | 'current' | 'dispatch' | 'system'>('current');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tải danh sách thành viên nhóm Zalo hiện tại
  useEffect(() => {
    let isMounted = true;
    setIsLoadingMembers(true);
    fetchGroupMembers(groupId)
      .then((mems) => {
        if (isMounted) {
          setAvailableMembers(mems);
          setIsLoadingMembers(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingMembers(false);
      });
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  const { zalo } = scenario;

  const handleUpdateZalo = (updates: Partial<AlertScenario['zalo']>) => {
    onChange({
      ...scenario,
      zalo: {
        ...scenario.zalo,
        ...updates,
      },
    });
  };

  /**
   * Bọc đoạn văn bản đang được bôi đen bằng cặp thẻ [tag]...[/tag]
   * Hoạt động chuẩn xác ở bất kỳ dòng nào (dòng 1, 2, 3...) và trên cả các biến!
   */
  const wrapSelectionWithTag = (openTag: string, closeTag: string) => {
    const textarea = textareaRef.current;
    const currentText = zalo.messageTemplate || '';

    if (!textarea) {
      handleUpdateZalo({ messageTemplate: currentText + `${openTag}văn bản${closeTag}` });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    let newText = '';
    let newCursorPos = start + openTag.length;

    if (start !== end) {
      // Có bôi đen một đoạn chữ
      const selected = currentText.substring(start, end);
      newText = currentText.substring(0, start) + openTag + selected + closeTag + currentText.substring(end);
      newCursorPos = end + openTag.length + closeTag.length;
    } else {
      // Không bôi đen: chèn thẻ rỗng tại vị trí con trỏ
      newText = currentText.substring(0, start) + openTag + closeTag + currentText.substring(start);
      newCursorPos = start + openTag.length;
    }

    handleUpdateZalo({ messageTemplate: newText });

    // Đưa con trỏ chuột vào giữa cặp thẻ
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  /**
   * Chèn biến tại vị trí con trỏ chuột
   */
  const handleInsertVariable = (token: string) => {
    const textarea = textareaRef.current;
    const currentText = zalo.messageTemplate || '';

    if (!textarea) {
      handleUpdateZalo({ messageTemplate: currentText + token });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newText = currentText.substring(0, start) + token + currentText.substring(end);
    const newPos = start + token.length;

    handleUpdateZalo({ messageTemplate: newText });

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 50);
  };

  const handleToggleMember = (member: ZaloGroupMember) => {
    const exists = zalo.mentionMembers.some((m) => m.uid === member.uid);
    let newMembers: ZaloGroupMember[];
    if (exists) {
      newMembers = zalo.mentionMembers.filter((m) => m.uid !== member.uid);
    } else {
      newMembers = [...zalo.mentionMembers, member];
    }
    handleUpdateZalo({ mentionMembers: newMembers });
  };

  // Định dạng IN HOA đoạn bôi đen hoặc chèn tag [upper]
  const handleUppercaseSelection = () => {
    wrapSelectionWithTag('[upper]', '[/upper]');
  };

  // Xóa toàn bộ các thẻ định dạng trong ô soạn thảo
  const handleClearAllTags = () => {
    const clean = (zalo.messageTemplate || '').replace(/\[\/?(b|i|u|s|big|small|color|upper)(?:=[^\]]+)?\]/gi, '');
    handleUpdateZalo({ messageTemplate: clean, styles: [] });
  };

  // Tạo nội dung preview giả lập đầy đủ biến số
  const generatePreviewText = () => {
    let text = zalo.messageTemplate || '';

    const replaceMap: Record<string, string> = {
      '{ten_quay}': 'Nhà thuốc 1',
      '{ma_quay}': 'NT1',
      '{so_khach}': '8',
      '{dang_phuc_vu}': '2',
      '{so_quay}': '2',
      '{danh_sach_quay_mo}': 'Quầy 08, 09',
      '{danh_sach_quay_moi}': 'Quầy 10',
      '{quay_can_mo}': '1',
      '{tai_trong}': '4.0',
      '{nguong_tai}': String(scenario.thresholds.value || 3),
      '{so_lech}': '3',
      '{quay_dong}': 'Nhà thuốc 1',
      '{quay_vang}': 'Nhà thuốc 2',
      '{thoi_gian}': String(scenario.thresholds.delaySeconds || 60),
      '{gio_hien_tai}': '14:20:00',
      '{nt1_khach}': '8',
      '{nt1_quay}': '2',
      '{nt1_tai_trong}': '4.0',
      '{nt2_khach}': '2',
      '{nt2_quay}': '2',
      '{nt2_tai_trong}': '1.0',
      '{nt3_khach}': '1',
      '{nt3_quay}': '1',
      '{nt3_tai_trong}': '1.0',
      '{nt4_khach}': '0',
      '{nt4_quay}': '1',
      '{nt4_tai_trong}': '0.0',
      '{tong_quan_cac_quay}':
        '• NT1: 8 khách / 2 quầy\n• NT2: 2 khách / 2 quầy\n• NT3: 1 khách / 1 quầy\n• NT4: 0 khách / 1 quầy',
      '{tong_khach_cho}': '11',
      '{tong_quay_mo}': '6',
    };

    for (const [token, val] of Object.entries(replaceMap)) {
      text = text.split(token).join(val);
    }

    if (zalo.mentionMembers.length > 0) {
      const mentionStr = zalo.mentionMembers.map((m) => `@${m.name}`).join(' ');
      if (text.includes('{tag_nhan_su}')) {
        text = text.replace('{tag_nhan_su}', mentionStr);
      } else {
        text += `\n👉 Kính chuyển: ${mentionStr}`;
      }
    }

    return text;
  };

  const previewCompiledText = generatePreviewText();

  const filteredVariables = TEMPLATE_VARIABLE_DEFINITIONS.filter((v) => {
    if (variableGroupFilter === 'all') return true;
    return v.group === variableGroupFilter;
  });

  return (
    <div className="space-y-4">
      {/* 1. Chế độ đánh dấu Zalo (Urgency: 0, 1, 2) */}
      <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
        <label className="text-xs font-semibold text-slate-300 block">
          Chế độ đánh dấu tin nhắn Zalo:
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleUpdateZalo({ urgency: 0 })}
            className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition ${
              zalo.urgency === 0
                ? 'bg-slate-800 text-white border-slate-600 shadow'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <span>💬 Bình thường</span>
          </button>

          <button
            type="button"
            onClick={() => handleUpdateZalo({ urgency: 1 })}
            className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition ${
              zalo.urgency === 1
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-amber-300'
            }`}
          >
            <FontAwesomeIcon icon={faCircleExclamation} className="text-amber-400" />
            <span>Quan trọng (!)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUpdateZalo({ urgency: 2 })}
            className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition ${
              zalo.urgency === 2
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-rose-300'
            }`}
          >
            <FontAwesomeIcon icon={faBell} className="text-rose-400 animate-bounce" />
            <span>Khẩn cấp (🔔 Chuông)</span>
          </button>
        </div>
      </div>

      {/* 2. Cấu hình Đính kèm Ảnh Chụp Màn Hình Lúc Đó (Zero-Impact Local Snapshot) */}
      <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <FontAwesomeIcon icon={faCamera} className="text-sky-400" />
            <span>Đính kèm ảnh chụp màn hình lúc đó:</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
            <input
              type="checkbox"
              checked={zalo.attachScreenshot ?? true}
              onChange={(e) => handleUpdateZalo({ attachScreenshot: e.target.checked })}
              className="w-4 h-4 rounded text-sky-600 bg-slate-950 border-slate-700"
            />
            <span className={zalo.attachScreenshot ?? true ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {zalo.attachScreenshot ?? true ? 'BẬT chụp kèm ảnh' : 'TẮT chụp ảnh'}
            </span>
          </label>
        </div>

        {(zalo.attachScreenshot ?? true) && (
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleUpdateZalo({ screenshotMode: 'all' })}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition ${
                (zalo.screenshotMode || 'all') === 'all'
                  ? 'bg-sky-500/20 text-white border-sky-500/50 shadow'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>📸 Toàn bộ lưới nhà thuốc (Tổng quan)</span>
                {(zalo.screenshotMode || 'all') === 'all' && <FontAwesomeIcon icon={faCheck} className="text-sky-400" />}
              </div>
              <span className="text-[11px] opacity-80 font-normal">
                Chụp toàn cảnh tất cả các quầy để thấy rõ quầy nào đông, quầy nào trống.
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleUpdateZalo({ screenshotMode: 'single' })}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition ${
                zalo.screenshotMode === 'single'
                  ? 'bg-sky-500/20 text-white border-sky-500/50 shadow'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>🎯 Chỉ quầy gặp sự cố (Tập trung)</span>
                {zalo.screenshotMode === 'single' && <FontAwesomeIcon icon={faCheck} className="text-sky-400" />}
              </div>
              <span className="text-[11px] opacity-80 font-normal">
                Chụp cận cảnh nhà thuốc đang quá tải/chưa mở quầy để đối soát nhanh.
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Tag nhân sự phụ trách trong nhóm Zalo */}
      <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FontAwesomeIcon icon={faAt} className="text-sky-400" />
            <span>Tag tên nhân sự trong nhóm:</span>
          </label>
          <span className="text-[11px] text-slate-400">
            Đã chọn: <strong className="text-sky-400">{zalo.mentionMembers.length}</strong> người
          </span>
        </div>

        {/* Selected members chips */}
        <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
          {zalo.mentionMembers.length === 0 ? (
            <span className="text-[11px] text-slate-400 italic">
              Chưa chọn nhân sự tag tên (gửi tin nhắn thông thường)
            </span>
          ) : (
            zalo.mentionMembers.map((m) => (
              <span
                key={m.uid}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30"
              >
                <span>@{m.name}</span>
                <button
                  type="button"
                  onClick={() => handleToggleMember(m)}
                  className="text-sky-400 hover:text-rose-400 transition"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>

        {/* Member selector dropdown trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMemberDropdown(!showMemberDropdown)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center gap-1.5"
          >
            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
            <span>Chọn thành viên trong nhóm Zalo</span>
          </button>

          {showMemberDropdown && (
            <div className="absolute z-20 left-0 top-9 w-72 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 space-y-1">
              {isLoadingMembers ? (
                <div className="p-3 text-center text-xs text-slate-400">Đang tải danh sách...</div>
              ) : availableMembers.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  Không tìm thấy thành viên (hãy đảm bảo đã kết nối nhóm Zalo)
                </div>
              ) : (
                availableMembers.map((mem) => {
                  const isChecked = zalo.mentionMembers.some((m) => m.uid === mem.uid);
                  return (
                    <button
                      key={mem.uid}
                      type="button"
                      onClick={() => handleToggleMember(mem)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition ${
                        isChecked
                          ? 'bg-sky-500/20 text-sky-200'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {mem.avatar ? (
                          <img
                            src={mem.avatar}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white">
                            {mem.name.charAt(0)}
                          </div>
                        )}
                        <span className="truncate">{mem.name}</span>
                      </div>
                      {isChecked && <FontAwesomeIcon icon={faCheck} className="text-sky-400 text-xs" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Soạn Thảo Tin Nhắn & Rich Text Toolbar */}
      <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200">
            Nội dung mẫu tin nhắn Zalo:
          </label>
          <span className="text-[10px] text-slate-500 italic">Xem trước tự động cập nhật bên dưới</span>
        </div>

        {/* Toolbar: Tinh gọn, chỉ dùng biểu tượng, không chữ dài dòng */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-950 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => wrapSelectionWithTag('[b]', '[/b]')}
            className="w-7 h-7 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs font-black transition border border-slate-800 flex items-center justify-center"
            title="In đậm [B]"
          >
            <FontAwesomeIcon icon={faBold} />
          </button>
          <button
            type="button"
            onClick={() => wrapSelectionWithTag('[i]', '[/i]')}
            className="w-7 h-7 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs italic transition border border-slate-800 flex items-center justify-center"
            title="In nghiêng [I]"
          >
            <FontAwesomeIcon icon={faItalic} />
          </button>
          <button
            type="button"
            onClick={() => wrapSelectionWithTag('[u]', '[/u]')}
            className="w-7 h-7 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs underline transition border border-slate-800 flex items-center justify-center"
            title="Gạch chân [U]"
          >
            <FontAwesomeIcon icon={faUnderline} />
          </button>
          <button
            type="button"
            onClick={() => wrapSelectionWithTag('[s]', '[/s]')}
            className="w-7 h-7 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs line-through transition border border-slate-800 flex items-center justify-center"
            title="Gạch ngang [S]"
          >
            <FontAwesomeIcon icon={faStrikethrough} />
          </button>

          <span className="w-px h-4 bg-slate-800 mx-0.5" />

          {/* In hoa (Uppercase) */}
          <button
            type="button"
            onClick={handleUppercaseSelection}
            className="px-2 h-7 bg-sky-950/60 hover:bg-sky-900 text-sky-300 rounded text-xs font-black transition border border-sky-800/80 flex items-center justify-center tracking-wider"
            title="IN HOA [AA]"
          >
            <span className="font-mono text-xs font-black">AA</span>
          </button>

          <span className="w-px h-4 bg-slate-800 mx-0.5" />

          {/* Font size */}
          <button
            type="button"
            onClick={() => wrapSelectionWithTag('[big]', '[/big]')}
            className="px-1.5 h-7 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs font-bold transition border border-slate-800 flex items-center justify-center gap-0.5"
            title="Cỡ chữ lớn (Tiêu đề [big])"
          >
            <span className="font-black text-xs">A</span>
            <span className="text-[10px] text-sky-400 font-black">▲</span>
          </button>
          <button
            type="button"
            onClick={() => wrapSelectionWithTag('[small]', '[/small]')}
            className="px-1.5 h-7 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs transition border border-slate-800 flex items-center justify-center gap-0.5"
            title="Cỡ chữ nhỏ (Ghi chú [small])"
          >
            <span className="font-semibold text-[11px]">a</span>
            <span className="text-[10px] text-slate-400 font-bold">▼</span>
          </button>

          <span className="w-px h-4 bg-slate-800 mx-0.5" />

          {/* Color palette */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="px-2 h-7 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs transition border border-slate-800 flex items-center justify-center gap-1.5"
              title="Chọn màu chữ Zalo"
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: selectedColor }}
              />
              <FontAwesomeIcon icon={faPalette} className="text-xs" />
            </button>

            {showColorPicker && (
              <div className="absolute z-20 left-0 top-8 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 space-y-2.5">
                <div className="text-[11px] font-semibold text-slate-300">Bảng màu chuẩn Zalo:</div>
                <div className="grid grid-cols-4 gap-2">
                  {ZALO_PRESET_COLORS.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setSelectedColor(c.hex);
                        wrapSelectionWithTag(`[color=${c.hex}]`, '[/color]');
                        setShowColorPicker(false);
                      }}
                      className="w-8 h-8 rounded-lg border border-slate-700 flex items-center justify-center hover:scale-110 transition shadow-sm"
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {selectedColor === c.hex && (
                        <FontAwesomeIcon icon={faCheck} className="text-white text-xs drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Tự chọn:</span>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => {
                      const hex = e.target.value;
                      setSelectedColor(hex);
                      wrapSelectionWithTag(`[color=${hex}]`, '[/color]');
                    }}
                    className="w-8 h-6 bg-transparent border-0 cursor-pointer rounded"
                  />
                  <span className="text-xs font-mono text-slate-300 uppercase">{selectedColor}</span>
                </div>
              </div>
            )}
          </div>

          <span className="w-px h-5 bg-slate-800 mx-1" />

          {/* Reset styles */}
          <button
            type="button"
            onClick={handleClearAllTags}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition text-xs"
            title="Xóa toàn bộ các thẻ định dạng màu/kiểu chữ"
          >
            <FontAwesomeIcon icon={faTrashCan} />
          </button>
        </div>

        {/* Bộ Biến Số Đầy Đủ & Nhóm Biến */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Danh mục biến số Realtime:
            </span>
            <div className="flex items-center gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setVariableGroupFilter('current')}
                className={`px-2 py-0.5 rounded transition ${
                  variableGroupFilter === 'current'
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Quầy cảnh báo
              </button>
              <button
                type="button"
                onClick={() => setVariableGroupFilter('system')}
                className={`px-2 py-0.5 rounded transition ${
                  variableGroupFilter === 'system'
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Từng quầy & Toàn viện
              </button>
              <button
                type="button"
                onClick={() => setVariableGroupFilter('dispatch')}
                className={`px-2 py-0.5 rounded transition ${
                  variableGroupFilter === 'dispatch'
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Lệch tải & Giờ
              </button>
              <button
                type="button"
                onClick={() => setVariableGroupFilter('all')}
                className={`px-2 py-0.5 rounded transition ${
                  variableGroupFilter === 'all'
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tất cả ({TEMPLATE_VARIABLE_DEFINITIONS.length})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-950/50 rounded-lg border border-slate-800">
            {filteredVariables.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => handleInsertVariable(v.token)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 text-[11px] font-mono rounded border border-slate-800 transition flex items-center gap-1"
                title={`${v.desc} (bấm để chèn tại con trỏ)`}
              >
                <span>+{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Box */}
        <div className="space-y-1">
          <textarea
            ref={textareaRef}
            rows={5}
            value={zalo.messageTemplate || ''}
            onChange={(e) => handleUpdateZalo({ messageTemplate: e.target.value })}
            placeholder="Nhập nội dung tin nhắn. Bôi đen văn bản rồi bấm biểu tượng [B], [I], [AA] hoặc Màu chữ để định dạng..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          <div className="text-[10px] text-slate-500 italic flex justify-between">
            <span>Mẹo: Bôi đen chữ hoặc biến số rồi bấm icon trên thanh công cụ để định dạng.</span>
            <span>Độ dài: {(zalo.messageTemplate || '').length} ký tự</span>
          </div>
        </div>

        {/* Live Preview Box: Hiển thị ngay bên dưới, cập nhật tức thì */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <span>👁️</span> Xem trước hiển thị trên Zalo (Thời gian thực):
            </span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Tự động đồng bộ
            </span>
          </div>

          <div className="bg-[#eef2f8] text-slate-900 rounded-2xl p-4 shadow-md max-w-xl border border-slate-300 font-sans">
            {/* Header Urgency badge */}
            {zalo.urgency === 2 && (
              <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs mb-2 pb-1.5 border-b border-rose-200">
                <FontAwesomeIcon icon={faBell} className="text-rose-600" />
                <span>[Tin nhắn Khẩn cấp]</span>
              </div>
            )}
            {zalo.urgency === 1 && (
              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs mb-2 pb-1.5 border-b border-amber-200">
                <FontAwesomeIcon icon={faCircleExclamation} className="text-amber-600" />
                <span>[Tin nhắn Quan trọng]</span>
              </div>
            )}

            {/* Compiled Text with Rich Formatting Nodes */}
            <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800">
              {renderFormattedPreview(previewCompiledText)}
            </div>

            <div className="mt-2.5 pt-1.5 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Đã nhận</span>
              <span>Vừa xong</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
