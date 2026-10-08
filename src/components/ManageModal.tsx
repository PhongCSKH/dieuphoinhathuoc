import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Download, 
  Upload, 
  Check, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { PharmacyScreen } from '../types';
import { DEFAULT_PHARMACIES, SCALE_OPTIONS } from '../constants';

interface ManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacies: PharmacyScreen[];
  onSavePharmacies: (newPharmacies: PharmacyScreen[]) => void;
}

export const ManageModal: React.FC<ManageModalProps> = ({
  isOpen,
  onClose,
  pharmacies,
  onSavePharmacies,
}) => {
  const [list, setList] = useState<PharmacyScreen[]>(pharmacies);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

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
    onClose();
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(list, null, 2));
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          setList(parsed);
          onSavePharmacies(parsed);
          showNotification('Đã nhập cấu hình thành công!');
        } else {
          alert('File JSON không đúng định dạng!');
        }
      } catch (err) {
        alert('Không thể đọc file JSON!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const showNotification = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Quản Lý Màn Hình Điều Phối
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Thêm, sửa link QMS và chỉnh tỉ lệ hiển thị cho từng nhà thuốc
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {copiedNotification && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 text-xs font-semibold text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4" /> {copiedNotification}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddNew}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus className="w-4 h-4" /> Thêm quầy mới
              </button>
              <button
                onClick={handleResetDefaults}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Khôi phục 4 Quầy chuẩn
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJSON}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-700"
                title="Xuất file JSON sao lưu"
              >
                <Download className="w-3.5 h-3.5" /> Xuất JSON
              </button>
              <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-700 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Nhập JSON
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
                className={`p-4 rounded-xl border transition ${
                  editingId === item.id 
                    ? 'bg-slate-800/60 border-sky-500/50' 
                    : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Order & Code */}
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
                        <ExternalLink className="w-3.5 h-3.5" />
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
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Notice */}
          <div className="p-3 bg-sky-500/5 border border-sky-500/20 rounded-xl flex items-start gap-2.5 text-xs text-slate-300">
            <ShieldAlert className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Lưu trữ trên thiết bị này:</p>
              <p className="text-slate-400 mt-0.5">
                Các thay đổi của bạn sẽ tự động được lưu vào trình duyệt (Local Storage). Khi mở lại ứng dụng hoặc tải lại trang web, cấu hình sẽ được giữ nguyên 100%.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <span className="text-xs text-slate-400">
            Tổng cộng: <strong className="text-white">{list.length} quầy</strong>
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
