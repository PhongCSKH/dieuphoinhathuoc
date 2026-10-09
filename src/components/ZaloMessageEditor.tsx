import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBold,
  faItalic,
  faUnderline,
  faStrikethrough,
  faPalette,
  faFont,
  faBell,
  faCircleExclamation,
  faAt,
  faEye,
  faTrashCan,
  faCheck,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { AlertScenario, ZaloGroupMember, ZaloStyleItem } from '../types';
import {
  ZALO_PRESET_COLORS,
  hexToZaloColorCode,
  zaloColorCodeToHex,
  compileZaloMessage,
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
  const [previewTab, setPreviewTab] = useState<'editor' | 'preview'>('editor');

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
  const currentStyles = zalo.styles || [];

  const handleUpdateZalo = (updates: Partial<AlertScenario['zalo']>) => {
    onChange({
      ...scenario,
      zalo: {
        ...scenario.zalo,
        ...updates,
      },
    });
  };

  const handleInsertVariable = (token: string) => {
    const newText = (zalo.messageTemplate || '') + token;
    handleUpdateZalo({ messageTemplate: newText });
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

  // Áp dụng Style (Bold, Color, Size, etc.) cho dòng đầu hoặc toàn bộ tin
  const handleApplyStyleToHeader = (styleCode: string) => {
    const firstLineEnd = zalo.messageTemplate.indexOf('\n');
    const len = firstLineEnd > 0 ? firstLineEnd : Math.min(45, zalo.messageTemplate.length);
    if (len <= 0) return;

    // Lọc bỏ style cùng loại nếu là color hoặc size
    let filtered = currentStyles.filter((s) => {
      if (styleCode.startsWith('c_') && s.st.startsWith('c_')) return false;
      if (styleCode.startsWith('f_') && s.st.startsWith('f_')) return false;
      return true;
    });

    const newStyle: ZaloStyleItem = {
      start: 0,
      len,
      st: styleCode,
    };
    handleUpdateZalo({ styles: [...filtered, newStyle] });
  };

  const handleClearStyles = () => {
    handleUpdateZalo({ styles: [] });
  };

  // Preview compiled message
  const previewResult = compileZaloMessage(
    zalo.messageTemplate || '',
    {
      ten_quay: 'Nhà thuốc 1',
      so_khach: 8,
      so_quay: 2,
      so_lech: 3,
      thoi_gian: scenario.thresholds.delaySeconds || 60,
      quay_can_mo: 1,
      danh_sach_quay_moi: '09',
    },
    zalo.mentionMembers,
    currentStyles
  );

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

      {/* 2. Tag nhân sự phụ trách trong nhóm Zalo */}
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
          <label className="text-xs font-semibold text-slate-300">
            Nội dung mẫu tin nhắn Zalo:
          </label>
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setPreviewTab('editor')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                previewTab === 'editor'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Soạn thảo
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('preview')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                previewTab === 'preview'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={faEye} className="text-xs" />
              <span>Xem trước Zalo</span>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950 rounded-lg border border-slate-800">
          {/* Format styles buttons */}
          <button
            type="button"
            onClick={() => handleApplyStyleToHeader('b')}
            className="p-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs font-bold transition border border-slate-800"
            title="In đậm tiêu đề"
          >
            <FontAwesomeIcon icon={faBold} />
          </button>
          <button
            type="button"
            onClick={() => handleApplyStyleToHeader('i')}
            className="p-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs italic transition border border-slate-800"
            title="In nghiêng tiêu đề"
          >
            <FontAwesomeIcon icon={faItalic} />
          </button>
          <button
            type="button"
            onClick={() => handleApplyStyleToHeader('u')}
            className="p-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs underline transition border border-slate-800"
            title="Gạch chân tiêu đề"
          >
            <FontAwesomeIcon icon={faUnderline} />
          </button>
          <button
            type="button"
            onClick={() => handleApplyStyleToHeader('s')}
            className="p-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs line-through transition border border-slate-800"
            title="Gạch ngang tiêu đề"
          >
            <FontAwesomeIcon icon={faStrikethrough} />
          </button>

          <span className="w-px h-5 bg-slate-800 mx-1" />

          {/* Font size */}
          <button
            type="button"
            onClick={() => handleApplyStyleToHeader('f_18')}
            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs font-bold transition border border-slate-800 flex items-center gap-1"
            title="Cỡ chữ lớn (Tiêu đề)"
          >
            <FontAwesomeIcon icon={faFont} className="text-sm" />
            <span>Lớn (f_18)</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyStyleToHeader('f_13')}
            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs transition border border-slate-800 flex items-center gap-1"
            title="Cỡ chữ nhỏ (Ghi chú)"
          >
            <FontAwesomeIcon icon={faFont} className="text-[10px]" />
            <span>Nhỏ (f_13)</span>
          </button>

          <span className="w-px h-5 bg-slate-800 mx-1" />

          {/* Color palette */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded text-xs transition border border-slate-800 flex items-center gap-1.5"
              title="Đổi màu sắc chữ"
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: selectedColor }}
              />
              <FontAwesomeIcon icon={faPalette} className="text-xs" />
              <span>Màu chữ</span>
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
                        handleApplyStyleToHeader(c.code);
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
                      handleApplyStyleToHeader(hexToZaloColorCode(hex));
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
            onClick={handleClearStyles}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition text-xs"
            title="Xóa toàn bộ định dạng màu/kiểu chữ"
          >
            <FontAwesomeIcon icon={faTrashCan} />
          </button>
        </div>

        {/* Dynamic Variables Fast-Insert Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Chèn biến:</span>
          {[
            { token: '{ten_quay}', label: '{Tên Quầy}' },
            { token: '{so_khach}', label: '{Số Khách Chờ}' },
            { token: '{so_quay}', label: '{Số Quầy Mở}' },
            { token: '{so_lech}', label: '{Độ Lệch Tải}' },
            { token: '{thoi_gian}', label: '{Thời Gian Chờ}' },
            { token: '{quay_can_mo}', label: '{Số Quầy Cần Mở}' },
          ].map((v) => (
            <button
              key={v.token}
              type="button"
              onClick={() => handleInsertVariable(v.token)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] font-mono rounded border border-slate-700/80 transition"
            >
              +{v.label}
            </button>
          ))}
        </div>

        {/* Content View: Editor or Live Preview */}
        {previewTab === 'editor' ? (
          <textarea
            rows={5}
            value={zalo.messageTemplate || ''}
            onChange={(e) => handleUpdateZalo({ messageTemplate: e.target.value })}
            placeholder="Nhập nội dung tin nhắn gửi vào nhóm Zalo..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        ) : (
          /* Live Preview Bubble */
          <div className="bg-[#eef2f8] text-slate-900 rounded-2xl p-4 shadow-md max-w-lg border border-slate-300 font-sans">
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

            {/* Compiled Text with Styles */}
            <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800">
              {previewResult.message.split('\n').map((line, idx) => {
                if (idx === 0) {
                  // Dòng đầu tiêu đề với styles
                  const hasBold = currentStyles.some((s) => s.st === 'b');
                  const hasBig = currentStyles.some((s) => s.st === 'f_18');
                  const colorStyle = currentStyles.find((s) => s.st.startsWith('c_'));
                  const hex = colorStyle ? zaloColorCodeToHex(colorStyle.st) : undefined;
                  return (
                    <div
                      key={idx}
                      className="mb-1"
                      style={{
                        fontWeight: hasBold ? 'bold' : 'normal',
                        fontSize: hasBig ? '14px' : '12px',
                        color: hex || (zalo.urgency === 2 ? '#db342e' : '#1e293b'),
                      }}
                    >
                      {line}
                    </div>
                  );
                }
                return <div key={idx}>{line}</div>;
              })}
            </div>

            <div className="mt-2.5 pt-1.5 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Đã xem</span>
              <span>Vừa xong</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
