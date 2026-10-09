import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faRotateLeft,
  faPenToSquare,
  faTrashCan,
  faVolumeHigh,
  faComments,
  faSliders,
  faXmark,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { AlertScenario, PharmacyScreen } from '../types';
import { DEFAULT_SCENARIOS } from '../constants';
import { ZaloMessageEditor } from './ZaloMessageEditor';
import { soundManager } from '../utils/audio';
import { dispatchZaloAlert } from '../utils/zalo';
import { compileZaloMessage } from '../utils/zaloTextCompiler';
import { buildAllVariables } from '../utils/dispatchEngine';

interface ScenarioManagementTabProps {
  scenarios: AlertScenario[];
  onChangeScenarios: (newScenarios: AlertScenario[]) => void;
  pharmacies?: PharmacyScreen[];
  zaloGroupId?: string;
  onShowToast: (msg: string) => void;
}

export const ScenarioManagementTab: React.FC<ScenarioManagementTabProps> = ({
  scenarios,
  onChangeScenarios,
  pharmacies: _pharmacies,
  zaloGroupId,
  onShowToast,
}) => {
  const [editingScenario, setEditingScenario] = useState<AlertScenario | null>(null);

  const handleToggleScenario = (id: string, enabled: boolean) => {
    const updated = scenarios.map((s) => (s.id === id ? { ...s, enabled } : s));
    onChangeScenarios(updated);
  };

  const handleDeleteScenario = (id: string) => {
    if (confirm('Xóa kịch bản này khỏi hệ thống điều phối?')) {
      const updated = scenarios.filter((s) => s.id !== id);
      onChangeScenarios(updated);
      onShowToast('Đã xóa kịch bản!');
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Khôi phục danh sách kịch bản chuẩn của Bệnh viện Tâm Anh?')) {
      onChangeScenarios(DEFAULT_SCENARIOS);
      onShowToast('Đã khôi phục các kịch bản chuẩn!');
    }
  };

  const handleCreateNew = () => {
    const newSc: AlertScenario = {
      id: `scenario-${Date.now()}`,
      name: `Kịch bản tùy chỉnh ${scenarios.length + 1}`,
      enabled: true,
      type: 'overload',
      severity: 'warning',
      thresholds: {
        value: 3,
        delaySeconds: 0,
      },
      sound: {
        enabled: true,
        type: 'warning',
      },
      zalo: {
        enabled: true,
        urgency: 1,
        cooldownMinutes: 3,
        mentionMembers: [],
        messageTemplate: '⚠️ [CẢNH BÁO] {ten_quay} cần chú ý điều phối dòng khách ({so_khach} khách chờ).',
        styles: [{ start: 0, len: 30, st: 'c_f27806' }],
      },
    };
    setEditingScenario(newSc);
  };

  const handleSaveEditing = () => {
    if (!editingScenario) return;
    const exists = scenarios.some((s) => s.id === editingScenario.id);
    let updated: AlertScenario[];
    if (exists) {
      updated = scenarios.map((s) => (s.id === editingScenario.id ? editingScenario : s));
    } else {
      updated = [...scenarios, editingScenario];
    }
    onChangeScenarios(updated);
    setEditingScenario(null);
    onShowToast('Đã lưu kịch bản thành công!');
  };

  const handleTestSound = (type: 'danger' | 'warning' | 'imbalance' | 'success') => {
    soundManager.play(type);
    onShowToast(`Phát chuông: ${type.toUpperCase()}`);
  };

  const handleTestZalo = async (sc: AlertScenario) => {
    const primaryPh = _pharmacies && _pharmacies.length > 0 ? _pharmacies[0] : undefined;
    const allVars = buildAllVariables(primaryPh, _pharmacies || [], {
      thoi_gian: sc.thresholds.delaySeconds || 60,
      quay_can_mo: 1,
      danh_sach_quay_moi: '09',
      so_lech: 3,
    });

    const compiled = compileZaloMessage(
      sc.zalo.messageTemplate,
      allVars,
      sc.zalo.mentionMembers,
      sc.zalo.styles
    );

    const res = await dispatchZaloAlert({
      alertKey: `test-${sc.id}-${Date.now()}`,
      message: compiled.message,
      styles: compiled.styles,
      urgency: sc.zalo.urgency,
      mentions: compiled.mentions,
      forceSend: true,
    });

    if (res.success) {
      onShowToast(`Đã gửi thử tin Zalo cho "${sc.name}"!`);
    } else {
      onShowToast(`Không thể gửi: ${res.reason || 'Lỗi kết nối'}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateNew}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            <span>Thêm kịch bản mới</span>
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
          >
            <FontAwesomeIcon icon={faRotateLeft} className="text-xs" />
            <span>Khôi phục mẫu chuẩn</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Tổng số: <strong className="text-white">{scenarios.length}</strong> kịch bản (Đang bật:{' '}
          <strong className="text-emerald-400">{scenarios.filter((s) => s.enabled).length}</strong>)
        </div>
      </div>

      {/* Scenario List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {scenarios.map((sc) => {
          const isDanger = sc.severity === 'danger';
          const isWarning = sc.severity === 'warning';
          return (
            <div
              key={sc.id}
              className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                sc.enabled
                  ? 'bg-slate-900/90 border-slate-800 shadow-sm hover:border-slate-700'
                  : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              <div className="space-y-3">
                {/* Header row: Switch + Title + Severity */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* Toggle switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sc.enabled}
                        onChange={(e) => handleToggleScenario(sc.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>

                    <h4 className="text-xs font-bold text-white tracking-wide">{sc.name}</h4>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isDanger
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isDanger ? 'Khẩn cấp' : isWarning ? 'Cảnh báo' : 'Thông tin'}
                  </span>
                </div>

                {/* Key metrics grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                    <span className="text-slate-400">Ngưỡng:</span>
                    <strong className="text-sky-300 font-mono">
                      {sc.type === 'no_counter'
                        ? `Trễ ${sc.thresholds.delaySeconds || 60}s`
                        : `${sc.thresholds.value} ${
                            sc.type === 'overload'
                              ? 'khách/quầy'
                              : sc.type === 'imbalance'
                              ? 'khách lệch'
                              : 'khách'
                          }`}
                    </strong>
                  </div>

                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                    <span className="text-slate-400">Chuông:</span>
                    <span className="text-slate-300 font-semibold flex items-center gap-1">
                      <FontAwesomeIcon icon={faVolumeHigh} className="text-xs text-sky-400" />
                      <span>{sc.sound.enabled ? sc.sound.type : 'Tắt'}</span>
                    </span>
                  </div>
                </div>

                {/* Zalo status line */}
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faComments} className="text-sky-400" />
                    <span>Zalo:</span>
                    <span className="font-semibold text-slate-300">
                      {sc.zalo.enabled
                        ? sc.zalo.urgency === 2
                          ? '🔔 Khẩn cấp'
                          : sc.zalo.urgency === 1
                          ? '! Quan trọng'
                          : 'Bình thường'
                        : 'Tắt'}
                    </span>
                  </span>

                  <span className="text-slate-400">
                    Tag:{' '}
                    <strong className="text-sky-400">
                      {sc.zalo.mentionMembers.length > 0
                        ? `${sc.zalo.mentionMembers.length} người`
                        : 'Không'}
                    </strong>
                  </span>
                </div>
                {/* Message preview snippet */}
                {sc.zalo.enabled && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300 truncate">
                    <span className="text-slate-500 mr-1.5 text-[10px] font-semibold uppercase">Mẫu tin:</span>
                    <span className="text-emerald-400 font-medium">
                      {sc.zalo.messageTemplate.split('\n')[0].replace(/\[\/?(b|i|u|s|big|small|color(=[^\]]*)?)\]/gi, '')}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Card Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  {sc.sound.enabled && (
                    <button
                      type="button"
                      onClick={() => handleTestSound(sc.sound.type)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 flex items-center gap-1 transition"
                      title="Phát thử chuông"
                    >
                      <FontAwesomeIcon icon={faVolumeHigh} className="text-[10px]" />
                      <span>Chuông</span>
                    </button>
                  )}

                  {sc.zalo.enabled && (
                    <button
                      type="button"
                      onClick={() => handleTestZalo(sc)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold border flex items-center gap-1 transition ${
                        sc.type === 'hospital_summary'
                          ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
                          : sc.type === 'test_connection'
                          ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border-slate-700'
                      }`}
                      title={
                        sc.type === 'hospital_summary'
                          ? 'Bấm để gửi báo cáo tổng hợp hiện trạng các quầy lên Zalo ngay lập tức'
                          : 'Gửi thử tin nhắn Zalo'
                      }
                    >
                      <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                      <span>
                        {sc.type === 'hospital_summary'
                          ? 'Gửi Báo Cáo'
                          : sc.type === 'test_connection'
                          ? 'Gửi Thử Bot'
                          : 'Thử Zalo'}
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingScenario(sc)}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow flex items-center gap-1.5 transition"
                    title="Mở bộ soạn thảo và cấu hình kịch bản này"
                  >
                    <FontAwesomeIcon icon={faPenToSquare} className="text-xs" />
                    <span>Cấu hình & Sửa tin nhắn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteScenario(sc.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition"
                    title="Xóa kịch bản"
                  >
                    <FontAwesomeIcon icon={faTrashCan} className="text-xs" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scenario Editor Drawer / Modal Overlay */}
      {editingScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faSliders} className="text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  Thiết Lập Kịch Bản: {editingScenario.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingScenario(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Modal Scroll Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Row 1: Tên & Mức độ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Tên kịch bản:</label>
                  <input
                    type="text"
                    value={editingScenario.name}
                    onChange={(e) =>
                      setEditingScenario({ ...editingScenario, name: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Mức độ cảnh báo:</label>
                  <select
                    value={editingScenario.severity}
                    onChange={(e) =>
                      setEditingScenario({
                        ...editingScenario,
                        severity: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value="danger">🔴 Khẩn cấp (Đỏ)</option>
                    <option value="warning">🟡 Cảnh báo (Vàng)</option>
                    <option value="info">🟢 Thông tin / Hạ tải (Xanh)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Ngưỡng kích hoạt */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Điều kiện kích hoạt kịch bản:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">
                      Ngưỡng số lượng (Khách):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={editingScenario.thresholds.value}
                      onChange={(e) =>
                        setEditingScenario({
                          ...editingScenario,
                          thresholds: {
                            ...editingScenario.thresholds,
                            value: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">
                      Độ trễ trước khi báo (Giây):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={600}
                      step={5}
                      value={editingScenario.thresholds.delaySeconds ?? 0}
                      onChange={(e) =>
                        setEditingScenario({
                          ...editingScenario,
                          thresholds: {
                            ...editingScenario.thresholds,
                            delaySeconds: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Chuông âm thanh */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Âm thanh chuông báo:
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={editingScenario.sound.enabled}
                      onChange={(e) =>
                        setEditingScenario({
                          ...editingScenario,
                          sound: {
                            ...editingScenario.sound,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700"
                    />
                    <span>Bật chuông</span>
                  </label>
                </div>

                {editingScenario.sound.enabled && (
                  <div className="flex items-center gap-3">
                    <select
                      value={editingScenario.sound.type}
                      onChange={(e) =>
                        setEditingScenario({
                          ...editingScenario,
                          sound: {
                            ...editingScenario.sound,
                            type: e.target.value as any,
                          },
                        })
                      }
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                    >
                      <option value="danger">🚨 Chuông Khẩn Cấp (Danger)</option>
                      <option value="imbalance">⚖️ Chuông Lệch Tải (Imbalance)</option>
                      <option value="warning">⚠️ Chuông Cảnh Báo (Warning)</option>
                      <option value="success">✅ Chuông Hạ Tải / Tăng Cường (Success)</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleTestSound(editingScenario.sound.type)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
                    >
                      Phát thử
                    </button>
                  </div>
                )}
              </div>

              {/* Row 4: Cấu hình Zalo, Rich Text, Urgency & Mentions */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <FontAwesomeIcon icon={faComments} className="text-sky-400" />
                    <span>Cấu hình tin nhắn Zalo gửi tự động:</span>
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={editingScenario.zalo.enabled}
                      onChange={(e) =>
                        setEditingScenario({
                          ...editingScenario,
                          zalo: {
                            ...editingScenario.zalo,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700"
                    />
                    <span>Gửi Zalo cho kịch bản này</span>
                  </label>
                </div>

                {editingScenario.zalo.enabled && (
                  <ZaloMessageEditor
                    scenario={editingScenario}
                    onChange={(updated) => setEditingScenario(updated)}
                    groupId={zaloGroupId}
                  />
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/90">
              <button
                type="button"
                onClick={() => setEditingScenario(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEditing}
                className="px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow transition"
              >
                Lưu kịch bản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
