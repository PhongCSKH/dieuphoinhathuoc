import React, { useState } from 'react';
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
  faShieldHalved,
  faSliders,
  faHospital,
  faTriangleExclamation,
  faScaleBalanced,
  faDesktop,
  faVolumeHigh
} from '@fortawesome/free-solid-svg-icons';
import { PharmacyScreen, DispatchRules } from '../types';
import { DEFAULT_PHARMACIES, SCALE_OPTIONS } from '../constants';
import { soundManager } from '../utils/audio';

interface ManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacies: PharmacyScreen[];
  onSavePharmacies: (newPharmacies: PharmacyScreen[]) => void;
  rules: DispatchRules;
  onSaveRules: (newRules: DispatchRules) => void;
}

export const ManageModal: React.FC<ManageModalProps> = ({
  isOpen,
  onClose,
  pharmacies,
  onSavePharmacies,
  rules,
  onSaveRules,
}) => {
  const [activeTab, setActiveTab] = useState<'pharmacies' | 'rules'>('pharmacies');
  const [list, setList] = useState<PharmacyScreen[]>(pharmacies);
  const [localRules, setLocalRules] = useState<DispatchRules>(rules);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateItem = (id: string, updates: Partial<PharmacyScreen>) => {
    setList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleAddNew = () => {
    const nextNumber = list.length + 1;
    const newItem: PharmacyScreen = {
      id: `nt-${Date.now()}`,
      name: `Nhà thuốc ${nextNumber}`,
      code: `NT${nextNumber}`,
      url: 'https://qms.tahospital.vn/view/...',
      scale: 0.85,
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
    setEditingId(newItem.id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa quầy này khỏi màn hình theo dõi?')) {
      setList(list.filter((item) => item.id !== id));
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Khôi phục lại danh sách 4 Nhà thuốc chuẩn của Tâm Anh Hospital?')) {
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
      } catch (err) {
        alert('Không thể đọc file JSON!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleTestSound = (type: 'danger' | 'warning' | 'success' | 'imbalance') => {
    soundManager.play(type);
    showNotification(`Đã phát thử âm thanh chuông: ${type.toUpperCase()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <FontAwesomeIcon icon={faSliders} className="text-sm" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Cấu Hình Trung Tâm Điều Phối Nhà Thuốc
              </h2>
              <p className="text-xs text-slate-400">
                Tùy chỉnh danh sách màn hình, ngưỡng cảnh báo quá tải và lệch tải
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/60 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('pharmacies')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 ${
              activeTab === 'pharmacies'
                ? 'border-sky-500 text-sky-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={faHospital} className="text-xs" />
            <span>Màn Hình Nhà Thuốc ({list.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 ${
              activeTab === 'rules'
                ? 'border-sky-500 text-sky-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={faScaleBalanced} className="text-xs" />
            <span>Quy Tắc & Ngưỡng Cảnh Báo Điều Phối</span>
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 text-xs font-semibold text-emerald-400 flex items-center gap-2">
            <FontAwesomeIcon icon={faCheck} className="text-xs" /> {notification}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: PHARMACIES */}
          {activeTab === 'pharmacies' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddNew}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm"
                  >
                    <FontAwesomeIcon icon={faPlus} className="text-xs" /> Thêm quầy mới
                  </button>
                  <button
                    onClick={handleResetDefaults}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-700"
                  >
                    <FontAwesomeIcon icon={faRotateLeft} className="text-xs" /> Khôi phục 4 Quầy chuẩn
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-700"
                    title="Xuất file JSON sao lưu"
                  >
                    <FontAwesomeIcon icon={faDownload} className="text-xs" /> Xuất JSON
                  </button>
                  <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-700 cursor-pointer">
                    <FontAwesomeIcon icon={faUpload} className="text-xs" /> Nhập JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJSON}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* List of pharmacies */}
              <div className="space-y-3">
                {list.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition ${
                      editingId === item.id 
                        ? 'bg-slate-800/60 border-sky-500/50' 
                        : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      {/* Code */}
                      <div className="md:col-span-1 flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500">
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={item.code}
                          onChange={(e) => handleUpdateItem(item.id, { code: e.target.value })}
                          placeholder="Mã"
                          className="w-14 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs font-bold text-sky-400 font-mono text-center outline-none focus:border-sky-500"
                        />
                      </div>

                      {/* Name */}
                      <div className="md:col-span-3">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                          Tên Quầy
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white font-medium outline-none focus:border-sky-500"
                        />
                      </div>

                      {/* URL */}
                      <div className="md:col-span-5">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                          Link URL QMS
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="url"
                            value={item.url}
                            onChange={(e) => handleUpdateItem(item.id, { url: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md pl-2.5 pr-8 py-1 text-xs text-sky-300 font-mono outline-none focus:border-sky-500 truncate"
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

                      {/* Scale & Actions */}
                      <div className="md:col-span-3 flex items-center justify-between gap-2 mt-2 md:mt-4">
                        <div>
                          <select
                            value={item.scale}
                            onChange={(e) => handleUpdateItem(item.id, { scale: parseFloat(e.target.value) })}
                            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-md px-2 py-1 outline-none focus:border-sky-500"
                          >
                            {SCALE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                Zoom: {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-md transition"
                            title="Xóa quầy này"
                          >
                            <FontAwesomeIcon icon={faTrashCan} className="text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB 2: RULES & THRESHOLDS */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rule 1: Max Waiting Per Counter */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-center gap-2.5 text-sky-400 font-semibold text-sm">
                    <FontAwesomeIcon icon={faDesktop} />
                    <h3>1. Tải Trọng Quầy (Khách / Quầy)</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Số lượng khách chờ tối đa cho phép trên mỗi quầy đang phục vụ. Khi vượt ngưỡng, hệ thống sẽ cảnh báo mở thêm quầy.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={localRules.maxWaitingPerCounter}
                      onChange={(e) => setLocalRules({ ...localRules, maxWaitingPerCounter: parseInt(e.target.value) || 1 })}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-white text-center outline-none focus:border-sky-500"
                    />
                    <span className="text-xs text-slate-400 font-medium">
                      khách chờ / 1 quầy mở (Mặc định: 3)
                    </span>
                  </div>
                </div>

                {/* Rule 2: NT1 vs NT2 Imbalance */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-sm">
                    <FontAwesomeIcon icon={faScaleBalanced} />
                    <h3>2. Độ Lệch Tải Giữa Nhà Thuốc 1 & 2</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Độ chênh lệch số lượng khách chờ tối đa giữa Nhà thuốc 1 và Nhà thuốc 2 trước khi kích hoạt cảnh báo hướng dẫn điều phối.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={localRules.maxImbalanceNT1NT2}
                      onChange={(e) => setLocalRules({ ...localRules, maxImbalanceNT1NT2: parseInt(e.target.value) || 1 })}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-white text-center outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-slate-400 font-medium">
                      khách chênh lệch (Mặc định: 2)
                    </span>
                  </div>
                </div>

                {/* Rule 3: Congestion Threshold */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-center gap-2.5 text-rose-400 font-semibold text-sm">
                    <FontAwesomeIcon icon={faTriangleExclamation} />
                    <h3>3. Ngưỡng Đông Khách Tuyệt Đối</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Số lượng khách chờ tại 1 nhà thuốc để coi là bước vào đợt cao điểm đông khách.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="number"
                      min={2}
                      max={30}
                      value={localRules.crowdedThreshold}
                      onChange={(e) => setLocalRules({ ...localRules, crowdedThreshold: parseInt(e.target.value) || 2 })}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-white text-center outline-none focus:border-rose-500"
                    />
                    <span className="text-xs text-slate-400 font-medium">
                      khách chờ (Mặc định: 5)
                    </span>
                  </div>
                </div>

                {/* Sound Settings & Simulator */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm">
                    <FontAwesomeIcon icon={faVolumeHigh} />
                    <h3>4. Chuông Cảnh Báo Âm Thanh</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tự động phát chuông chuẩn y tế khi có biến động tải hoặc khi mở thêm quầy mới.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                      <input
                        type="checkbox"
                        checked={localRules.soundEnabled}
                        onChange={(e) => setLocalRules({ ...localRules, soundEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700"
                      />
                      <span>Bật chuông âm thanh</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Sound Test Panel */}
              <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Thử Nghiệm Hợp Âm Chuông Thông Báo:
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleTestSound('danger')}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold rounded-lg border border-rose-500/30 transition flex items-center gap-1.5"
                  >
                    <FontAwesomeIcon icon={faTriangleExclamation} /> Chuông Quá Tải (Khẩn cấp)
                  </button>
                  <button
                    onClick={() => handleTestSound('imbalance')}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/30 transition flex items-center gap-1.5"
                  >
                    <FontAwesomeIcon icon={faScaleBalanced} /> Chuông Lệch Tải NT1 - NT2
                  </button>
                  <button
                    onClick={() => handleTestSound('success')}
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/30 transition flex items-center gap-1.5"
                  >
                    <FontAwesomeIcon icon={faCheck} /> Chuông Mở Thêm Quầy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Notice */}
          <div className="p-3 bg-sky-500/5 border border-sky-500/20 rounded-xl flex items-start gap-2.5 text-xs text-slate-300">
            <FontAwesomeIcon icon={faShieldHalved} className="text-sm text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">An toàn & Bảo mật Nội bộ:</p>
              <p className="text-slate-400 mt-0.5">
                Toàn bộ cấu hình và dữ liệu xử lý trực tiếp tại máy tính CSKH, không ghi nhận thêm traffic lạ lên hệ thống mạng của bệnh viện.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/90">
          <span className="text-xs text-slate-400">
            Hệ thống: <strong className="text-white">{list.length} quầy</strong> | Tải trọng: <strong className="text-white">{localRules.maxWaitingPerCounter} khách/quầy</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-sm transition"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
