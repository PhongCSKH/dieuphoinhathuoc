import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faPlus,
  faTrashCan,
  faRotateLeft,
  faDownload,
  faUpload,
  faCheck,
  faArrowUpRightFromSquare,
  faHospital,
  faLayerGroup,
  faTableCellsLarge,
  faSquare,
  faTableColumns,
  faTableCells,
  faMaximize,
  faComments,
  faSliders,
  faFloppyDisk,
  faAt,
} from '@fortawesome/free-solid-svg-icons';
import { PharmacyScreen, DispatchRules, LayoutMode, AlertScenario } from '../types';
import { DEFAULT_PHARMACIES, SCALE_OPTIONS, DEFAULT_SCENARIOS } from '../constants';
import { ZaloSettingsTab } from './ZaloSettingsTab';
import { ScenarioManagementTab } from './ScenarioManagementTab';
import { fetchZaloContacts, dispatchZaloAlert } from '../utils/zalo';
import { generateDispatchSnapshot } from '../utils/snapshotGenerator';
import { ZaloContact } from '../types';

interface ManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacies: PharmacyScreen[];
  onSavePharmacies: (newPharmacies: PharmacyScreen[]) => void;
  rules: DispatchRules;
  onSaveRules: (newRules: DispatchRules) => void;
  layout: LayoutMode;
  onChangeLayout: (newLayout: LayoutMode) => void;
  globalScale: number;
  onChangeGlobalScale: (scale: number) => void;
}

export const ManageModal: React.FC<ManageModalProps> = ({
  isOpen,
  onClose,
  pharmacies,
  onSavePharmacies,
  rules,
  onSaveRules,
  layout,
  onChangeLayout,
  globalScale,
  onChangeGlobalScale,
}) => {
  const [activeTab, setActiveTab] = useState<'display' | 'pharmacies' | 'scenarios' | 'zalo'>('scenarios');
  const [list, setList] = useState<PharmacyScreen[]>(pharmacies);
  const [localRules, setLocalRules] = useState<DispatchRules>(() => {
    return {
      ...rules,
      scenarios: rules.scenarios && rules.scenarios.length > 0 ? rules.scenarios : DEFAULT_SCENARIOS,
    };
  });
  const [notification, setNotification] = useState<string | null>(null);
  const [zaloContacts, setZaloContacts] = useState<{ self: ZaloContact; groups: ZaloContact[]; friends: ZaloContact[] } | null>(null);
  const wasOpenRef = React.useRef(false);

  // Load danh bạ Zalo khi mở modal
  useEffect(() => {
    if (isOpen) {
      fetchZaloContacts().then((c) => {
        if (c) setZaloContacts(c);
      });
    }
  }, [isOpen]);

  // Chỉ sync state khi modal vừa chuyển từ ĐÓNG sang MỞ (tránh bị telemetry ghi đè trong lúc đang sửa)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setList(pharmacies);
      setLocalRules({
        ...rules,
        scenarios: rules.scenarios && rules.scenarios.length > 0 ? rules.scenarios : DEFAULT_SCENARIOS,
      });
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Phím tắt Esc và Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAndClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, list, localRules]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateItem = (id: string, updates: Partial<PharmacyScreen>) => {
    setList((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleAddNew = () => {
    const nextNumber = list.length + 1;
    const newItem: PharmacyScreen = {
      id: `nt-${Date.now()}`,
      name: `Nhà thuốc ${nextNumber}`,
      code: `NT${nextNumber}`,
      url: 'https://qms.tahospital.vn/view/...',
      scale: 0.50,
      autoRefreshInterval: 0,
      notes: `Quầy phát thuốc ${nextNumber}`,
      enabled: true,
      stats: {
        waitingCount: 0,
        servingCount: 0,
        activeCounters: [],
        lastUpdated: Date.now(),
      },
    };
    setList([...list, newItem]);
    showNotification(`Đã thêm Nhà thuốc ${nextNumber}`);
  };

  const handleDelete = (id: string) => {
    if (confirm('Xóa quầy này khỏi hệ thống theo dõi?')) {
      setList(list.filter((item) => item.id !== id));
      showNotification('Đã xóa quầy!');
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Khôi phục lại danh sách 4 Nhà thuốc chuẩn của Bệnh viện Tâm Anh?')) {
      setList(DEFAULT_PHARMACIES);
      onSavePharmacies(DEFAULT_PHARMACIES);
      showNotification('Đã khôi phục 4 Nhà thuốc chuẩn!');
    }
  };

  const handleSaveAndClose = () => {
    onSavePharmacies(list);
    onSaveRules(localRules);
    onClose();
  };

  const handleExportJSON = () => {
    const exportData = {
      pharmacies: list,
      rules: localRules,
      exportedAt: new Date().toISOString(),
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cau_hinh_dieu_phoi_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('Đã tải xuống file cấu hình JSON!');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.pharmacies && Array.isArray(parsed.pharmacies)) {
          setList(parsed.pharmacies);
          onSavePharmacies(parsed.pharmacies);
          if (parsed.rules) {
            setLocalRules(parsed.rules);
            onSaveRules(parsed.rules);
          }
          showNotification('Đã nhập cấu hình thành công!');
        } else if (Array.isArray(parsed)) {
          setList(parsed);
          onSavePharmacies(parsed);
          showNotification('Đã nhập cấu hình thành công!');
        }
      } catch {
        alert('Không thể đọc file JSON!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUpdateScenarios = (newScenarios: AlertScenario[]) => {
    const scOverload = newScenarios.find((s) => s.type === 'overload');
    const scNoCounter = newScenarios.find((s) => s.type === 'no_counter');
    const scImbalance = newScenarios.find((s) => s.type === 'imbalance');
    const scCrowded = newScenarios.find((s) => s.type === 'crowded');

    setLocalRules((prev) => {
      const updated: DispatchRules = {
        ...prev,
        scenarios: newScenarios,
        maxWaitingPerCounter: scOverload?.thresholds?.value ?? prev.maxWaitingPerCounter,
        noCounterAlertDelaySeconds: scNoCounter?.thresholds?.delaySeconds ?? prev.noCounterAlertDelaySeconds,
        maxImbalanceNT1NT2: scImbalance?.thresholds?.value ?? prev.maxImbalanceNT1NT2,
        crowdedThreshold: scCrowded?.thresholds?.value ?? prev.crowdedThreshold,
      };
      // Tự động lưu ngay lập tức vào App state & LocalStorage
      onSaveRules(updated);
      return updated;
    });
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col text-slate-100 overflow-hidden animate-in fade-in duration-150">
      {/* 1. TOP HEADER BAR */}
      <header className="h-14 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-black text-sm shadow">
            TA
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">
              TRUNG TÂM QUẢN TRỊ ĐIỀU PHỐI NHÀ THUỐC
            </h1>
          </div>
        </div>

        {/* Global Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
            title="Xuất file JSON sao lưu cấu hình"
          >
            <FontAwesomeIcon icon={faDownload} className="text-xs" />
            <span>Xuất JSON</span>
          </button>

          <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer transition">
            <FontAwesomeIcon icon={faUpload} className="text-xs" />
            <span>Nhập JSON</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition"
          >
            <FontAwesomeIcon icon={faFloppyDisk} className="text-xs" />
            <span>Lưu Cấu Hình (Ctrl+S)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 px-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Đóng (Esc)"
          >
            <FontAwesomeIcon icon={faXmark} className="text-base" />
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {notification && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 text-xs font-semibold text-emerald-400 flex items-center gap-2 flex-shrink-0 animate-in fade-in">
          <FontAwesomeIcon icon={faCheck} className="text-xs" /> {notification}
        </div>
      )}

      {/* 2. BODY SPLIT: SIDEBAR LEFT + MAIN WORKSPACE RIGHT */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION (240px) */}
        <aside className="w-64 bg-slate-900/70 border-r border-slate-800 flex flex-col justify-between p-3 flex-shrink-0 select-none">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('scenarios')}
              className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                activeTab === 'scenarios'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faSliders} className="text-sm" />
                <span>Kịch Bản Cảnh Báo</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'scenarios' ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {(localRules.scenarios || []).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pharmacies')}
              className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                activeTab === 'pharmacies'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faHospital} className="text-sm" />
                <span>Danh Sách Quầy</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'pharmacies' ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {list.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('display')}
              className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                activeTab === 'display'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={faLayerGroup} className="text-sm" />
              <span>Bố Cục & Tỉ Lệ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('zalo')}
              className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                activeTab === 'zalo'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={faComments} className="text-sm" />
              <span>Kết Nối Zalo</span>
            </button>
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1.5">
            <div className="text-slate-400 flex justify-between">
              <span>Số quầy trực:</span>
              <strong className="text-white">{list.length}</strong>
            </div>
            <div className="text-slate-400 flex justify-between">
              <span>Đang giám sát:</span>
              <strong className="text-emerald-400">Thời gian thực</strong>
            </div>
          </div>
        </aside>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* TAB 1: KỊCH BẢN CẢNH BÁO ĐIỀU PHỐI (TAB CHÍNH MỚI) */}
          {activeTab === 'scenarios' && (
            <ScenarioManagementTab
              scenarios={localRules.scenarios || DEFAULT_SCENARIOS}
              onChangeScenarios={handleUpdateScenarios}
              pharmacies={list}
              onShowToast={showNotification}
            />
          )}

          {/* TAB 2: QUẢN LÝ QUẦY NHÀ THUỐC */}
          {activeTab === 'pharmacies' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddNew}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm"
                  >
                    <FontAwesomeIcon icon={faPlus} className="text-xs" /> Thêm quầy mới
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-700"
                  >
                    <FontAwesomeIcon icon={faRotateLeft} className="text-xs" /> Khôi phục 4 Quầy chuẩn
                  </button>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Đang có <strong className="text-white">{list.length}</strong> quầy phát thuốc
                </span>
              </div>

              {/* List of pharmacies */}
              <div className="space-y-2.5">
                {list.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border bg-slate-900/70 border-slate-800 hover:border-slate-700 transition"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-1 flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500">
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={item.code}
                          onChange={(e) => handleUpdateItem(item.id, { code: e.target.value })}
                          placeholder="Mã"
                          className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-sky-400 font-mono text-center outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                          Tên Quầy
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="md:col-span-5">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                          Link URL QMS
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="url"
                            value={item.url}
                            onChange={(e) => handleUpdateItem(item.id, { url: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-sky-300 font-mono outline-none focus:border-sky-500 truncate"
                          />
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-2 text-slate-400 hover:text-white"
                            title="Mở kiểm tra thử"
                          >
                            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
                          </a>
                        </div>
                      </div>

                      <div className="md:col-span-3 flex items-center justify-between gap-2 mt-2 md:mt-4">
                        <select
                          value={item.scale}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { scale: parseFloat(e.target.value) })
                          }
                          className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-sky-500 font-mono"
                        >
                          {SCALE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              Zoom: {opt.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition"
                          title="Xóa quầy này"
                        >
                          <FontAwesomeIcon icon={faTrashCan} className="text-xs" />
                        </button>
                      </div>
                    </div>

                    {/* Dòng bổ sung: Cấu hình Kênh Zalo Riêng Biệt cho Quầy (Bắn kép đồng thời với Nhóm Chung) */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faComments} className="text-sky-400 text-[10px]" />
                          <span>Nhóm Zalo nhận riêng của quầy:</span>
                        </span>
                        <select
                          value={item.zaloTargetId ? `${item.zaloTargetType || 'group'}:${item.zaloTargetId}` : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                              handleUpdateItem(item.id, {
                                zaloTargetId: undefined,
                                zaloTargetName: undefined,
                                zaloTargetType: undefined,
                              });
                            } else {
                              const [tType, tId] = val.split(':');
                              let tName = '';
                              if (tType === 'group') {
                                const found = zaloContacts?.groups.find((g) => g.id === tId);
                                tName = found ? found.name : `Nhóm ${tId}`;
                              } else {
                                const found = zaloContacts?.friends.find((f) => f.id === tId);
                                tName = found ? found.name : `Cá nhân ${tId}`;
                              }
                              handleUpdateItem(item.id, {
                                zaloTargetType: tType as 'group' | 'user',
                                zaloTargetId: tId,
                                zaloTargetName: tName,
                              });
                            }
                          }}
                          className={`bg-slate-950 border rounded-lg px-2.5 py-1 text-xs outline-none transition max-w-[280px] truncate ${
                            item.zaloTargetId
                              ? 'border-emerald-500/60 text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                              : 'border-slate-700 text-slate-400'
                          }`}
                        >
                          <option value="">(Chỉ nhận tại Nhóm Chung các nhà thuốc)</option>
                          {zaloContacts?.groups && zaloContacts.groups.length > 0 && (
                            <optgroup label="Nhóm Zalo">
                              {zaloContacts.groups.map((g) => (
                                <option key={g.id} value={`group:${g.id}`}>
                                  👥 {g.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {zaloContacts?.friends && zaloContacts.friends.length > 0 && (
                            <optgroup label="Cá Nhân / Bạn Bè">
                              {zaloContacts.friends.map((f) => (
                                <option key={f.id} value={`user:${f.id}`}>
                                  👤 {f.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">
                            Thu nhỏ ảnh chụp QMS:
                          </label>
                          <select
                            value={item.captureZoom || 0.85}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { captureZoom: parseFloat(e.target.value) })
                            }
                            className="bg-slate-950 border border-slate-700 text-sky-400 text-[11px] rounded px-2 py-0.5 outline-none font-mono"
                          >
                            <option value={1.0}>100% (Gốc)</option>
                            <option value={0.90}>90% (Hơi thu nhỏ)</option>
                            <option value={0.85}>85% (Chuẩn trọn vẹn)</option>
                            <option value={0.80}>80% (Góc rộng)</option>
                            <option value={0.75}>75% (Rộng)</option>
                            <option value={0.70}>70% (Rất rộng)</option>
                            <option value={0.60}>60% (Siêu rộng 60%)</option>
                            <option value={0.50}>50% (Toàn cảnh 50%)</option>
                          </select>
                        </div>

                        {item.zaloTargetId ? (
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Tùy chọn @All cho nhóm riêng */}
                            {item.zaloTargetType === 'group' && (
                              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-950 px-2 py-1 rounded border border-slate-800 hover:border-slate-700 select-none">
                                <input
                                  type="checkbox"
                                  checked={!!item.mentionAll}
                                  onChange={(e) => handleUpdateItem(item.id, { mentionAll: e.target.checked })}
                                  className="w-3.5 h-3.5 rounded text-sky-500 focus:ring-0 bg-slate-900 border-slate-700"
                                />
                                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                                  <FontAwesomeIcon icon={faAt} className="text-[10px]" />
                                  @All (Cả nhóm)
                                </span>
                              </label>
                            )}

                            <span className="text-[11px] text-emerald-400 font-mono">
                              ● Gửi song song: Nhóm Chung + {item.zaloTargetName || item.zaloTargetId}
                            </span>

                            <button
                              type="button"
                              onClick={async () => {
                                showNotification(`Đang chụp ảnh & gửi thử vào ${item.name}...`);
                                const nowTime = new Date().toLocaleTimeString('vi-VN');
                                const title = `[KIỂM TRA KẾT NỐI - ${item.name}]`;
                                
                                // Nếu có bật @All cho nhóm riêng thì thêm @All vào đầu nội dung
                                let testMsg = `🔔 ${title}\n` +
                                  `• Xin Chào Các Bạn!\n` +
                                  `• Thời gian: ${nowTime}`;
                                
                                const styles = [
                                  { start: 2, len: title.length, st: 'b' as const },
                                  { start: 2, len: title.length, st: 'c_0068ff' as const },
                                  { start: 2, len: title.length, st: 'f_18' as const },
                                ];

                                let mentions: Array<{ pos: number; uid: string; len: number; name?: string }> = [];
                                if (item.mentionAll && item.zaloTargetType === 'group') {
                                  const mentionPrefix = '@All ';
                                  testMsg = mentionPrefix + testMsg;
                                  // Dịch chuyển styles theo độ dài prefix
                                  styles.forEach((s) => s.start += mentionPrefix.length);
                                  mentions.push({
                                    pos: 0,
                                    uid: '-1',
                                    len: '@All'.length,
                                    name: 'All',
                                  });
                                }

                                const snapshot = await generateDispatchSnapshot({
                                  pharmacies: list,
                                  targetPharmacyId: item.id,
                                  mode: 'single',
                                  alertTitle: `[KIỂM TRA KẾT NỐI] ${item.name}`,
                                });

                                const res = await dispatchZaloAlert({
                                  alertKey: `test-pharmacy-${item.id}-${Date.now()}`,
                                  message: testMsg,
                                  styles,
                                  urgency: 0,
                                  mentions,
                                  forceSend: true,
                                  targetUrl: item.url,
                                  targetZoom: item.captureZoom || 0.85,
                                  imageBase64: snapshot || undefined,
                                  targetType: item.zaloTargetType || 'group',
                                  targetId: item.zaloTargetId,
                                  targetName: item.zaloTargetName,
                                });
                                if (res.success) {
                                  showNotification(`Đã gửi tin kiểm tra kèm ảnh thực tế đến "${item.zaloTargetName || item.name}"!`);
                                } else {
                                  showNotification(`Gửi thất bại: ${res.reason || 'Lỗi kết nối'}`);
                                }
                              }}
                              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-[11px] shadow-sm transition"
                            >
                              Gửi thử
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">
                            💡 Chọn nhóm Zalo nếu bạn muốn gửi thêm thông báo riêng về cho nhân sự quầy này.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BỐ CỤC & TỈ LỆ HIỂN THỊ (SẠCH SẼ, KHÔNG TEXT DÀI DÒNG) */}
          {activeTab === 'display' && (
            <div className="space-y-6 max-w-4xl">
              {/* Layout mode picker */}
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3.5">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FontAwesomeIcon icon={faLayerGroup} className="text-sky-400" />
                  <span>Bố Cục Chia Lưới Màn Hình TV:</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onChangeLayout('grid-4')}
                    className={`p-4 rounded-xl border text-xs font-bold flex flex-col items-center gap-2.5 transition ${
                      layout === 'grid-4'
                        ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <FontAwesomeIcon icon={faTableCellsLarge} className="text-lg" />
                    <span>Lưới 4 (2x2) ⭐</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeLayout('split-1-3')}
                    className={`p-4 rounded-xl border text-xs font-bold flex flex-col items-center gap-2.5 transition ${
                      layout === 'split-1-3'
                        ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <FontAwesomeIcon icon={faSquare} className="text-lg" />
                    <span>1 To + 3 Phụ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeLayout('grid-2')}
                    className={`p-4 rounded-xl border text-xs font-bold flex flex-col items-center gap-2.5 transition ${
                      layout === 'grid-2'
                        ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <FontAwesomeIcon icon={faTableColumns} className="text-lg" />
                    <span>Lưới 2 (1x2)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeLayout('grid-6')}
                    className={`p-4 rounded-xl border text-xs font-bold flex flex-col items-center gap-2.5 transition ${
                      layout === 'grid-6'
                        ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <FontAwesomeIcon icon={faTableCells} className="text-lg" />
                    <span>Lưới 6 (2x3)</span>
                  </button>
                </div>
              </div>

              {/* Global Scale Picker */}
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3.5">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FontAwesomeIcon icon={faMaximize} className="text-emerald-400" />
                  <span>Tỉ Lệ Thu Phóng Toàn Bộ Màn Hình (Global Zoom):</span>
                </h3>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <select
                    value={globalScale}
                    onChange={(e) => onChangeGlobalScale(parseFloat(e.target.value))}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-sky-500 font-mono font-medium"
                  >
                    {SCALE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => onChangeGlobalScale(0.50)}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faMaximize} />
                    <span>Đặt Vừa Khít (50%)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CẢNH BÁO QUA ZALO */}
          {activeTab === 'zalo' && (
            <ZaloSettingsTab scenarios={localRules.scenarios} pharmacies={list} />
          )}
        </main>
      </div>
    </div>
  );
};
