import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faQrcode, 
  faCircleCheck, 
  faCircleExclamation, 
  faRotate, 
  faRightFromBracket, 
  faPaperPlane, 
  faUser, 
  faCloud,
  faSliders,
  faCircleNotch,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { ZaloStatus, ZaloAlertConfig, ZaloContact } from '../types';
import { 
  fetchZaloStatus, 
  requestZaloQR, 
  logoutZalo, 
  fetchZaloContacts, 
  updateZaloConfig, 
  triggerTestZalo 
} from '../utils/zalo';

export const ZaloSettingsTab: React.FC = () => {
  const [status, setStatus] = useState<ZaloStatus | null>(null);
  const [contacts, setContacts] = useState<{ self: ZaloContact; groups: ZaloContact[]; friends: ZaloContact[] } | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [config, setConfig] = useState<ZaloAlertConfig>({
    enabled: true,
    targetType: 'user',
    targetId: '',
    targetName: 'Cloud của tôi (Zalo cá nhân)',
    cooldownMinutes: 3,
  });

  // Poll status periodically while component is mounted
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      const s = await fetchZaloStatus();
      if (!isMounted) return;
      setStatus(s);
      if (s?.config) {
        setConfig(s.config);
      }
      if (s?.loggedIn && !contacts) {
        const c = await fetchZaloContacts();
        if (isMounted) setContacts(c);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [contacts]);

  const handleGenerateQR = async () => {
    setIsLoadingQR(true);
    setTestResult(null);
    const res = await requestZaloQR();
    setIsLoadingQR(false);
    if (res.success) {
      const s = await fetchZaloStatus();
      setStatus(s);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn ngắt kết nối tài khoản Zalo này không?')) return;
    await logoutZalo();
    setContacts(null);
    const s = await fetchZaloStatus();
    setStatus(s);
  };

  const handleConfigChange = async (newConfig: Partial<ZaloAlertConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    await updateZaloConfig(newConfig);
  };

  const handleSendTest = async () => {
    if (!status?.loggedIn) {
      setTestResult({
        success: false,
        message: '⚠️ Vui lòng bấm "Tạo Mã QR" và dùng Zalo trên điện thoại quét đăng nhập ở bước trên trước khi gửi thử nghiệm!',
      });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);
    const res = await triggerTestZalo();
    setIsSendingTest(false);
    setTestResult(res);
  };

  const isBridgeOnline = !!status?.online;
  const isLoggedIn = !!status?.loggedIn;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Service Status Bar */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        isBridgeOnline 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isBridgeOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <div>
            <h4 className="font-bold text-sm">
              {isBridgeOnline ? 'Dịch vụ Zalo Dispatch Bridge: ĐANG HOẠT ĐỘNG' : 'Dịch vụ Zalo Dispatch Bridge: CHƯA KẾT NỐI'}
            </h4>
            <p className="text-xs opacity-80 mt-0.5">
              {isBridgeOnline 
                ? 'Cổng nội bộ máy tính 5050 - Sẵn sàng gửi tin nhắn trực tiếp qua Zalo cá nhân' 
                : 'Vui lòng chạy file Mo_Dieu_Phoi_Nha_Thuoc.bat hoặc Khoi_Dong_Zalo_Bridge.bat trên Desktop.'}
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            const s = await fetchZaloStatus();
            setStatus(s);
          }}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
        >
          <FontAwesomeIcon icon={faRotate} className="text-xs" />
          <span>Kiểm tra lại</span>
        </button>
      </div>

      {/* 2. KHỐI 1: TÀI KHOẢN VÀ ĐĂNG NHẬP ZALO */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
            <FontAwesomeIcon icon={faQrcode} />
            Bước 1: Kết Nối Tài Khoản Zalo Cá Nhân
          </h4>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
            isLoggedIn 
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          }`}>
            {isLoggedIn ? '● Đã kết nối Zalo' : '○ Chưa đăng nhập'}
          </span>
        </div>

        {isLoggedIn ? (
          /* Đã đăng nhập */
          <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              {status?.user?.avatar ? (
                <img 
                  src={status.user.avatar} 
                  alt="Avatar" 
                  className="w-12 h-12 rounded-full border-2 border-emerald-500 object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center text-lg">
                  <FontAwesomeIcon icon={faUser} />
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-white">{status?.user?.name || 'Zalo Cá Nhân'}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  ID Zalo: <span className="font-mono text-emerald-400 font-bold">{status?.user?.id || 'Chính bạn'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Đăng xuất khỏi phiên Zalo hiện tại"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="text-xs" />
              <span>Đăng xuất</span>
            </button>
          </div>
        ) : (
          /* Chưa đăng nhập -> Hiện nút tạo QR và hiển thị QR */
          <div className="text-center py-3">
            <p className="text-xs text-slate-300 max-w-lg mx-auto mb-4">
              Bạn chỉ cần quét mã QR bằng Zalo trên điện thoại <strong>1 lần duy nhất</strong>. Phiên đăng nhập sẽ được lưu tự động trên máy tính của bạn.
            </p>

            {status?.qrCode ? (
              <div className="flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl shadow-2xl inline-block border-4 border-sky-500 animate-in zoom-in-95 duration-200">
                  <img 
                    src={status.qrCode} 
                    alt="Mã QR Zalo" 
                    className="w-56 h-56 object-contain"
                  />
                </div>

                <div className="mt-3 text-xs font-semibold">
                  {status.qrStatus === 'waiting_scan' && (
                    <span className="text-sky-400 flex items-center gap-1.5 justify-center">
                      <FontAwesomeIcon icon={faCircleNotch} className="animate-spin text-xs" />
                      Mở Zalo trên điện thoại ➜ Bấm nút Quét QR ở góc trên ➜ Hướng camera vào màn hình
                    </span>
                  )}
                  {status.qrStatus === 'scanned' && (
                    <span className="text-amber-400 flex items-center gap-1.5 justify-center animate-pulse">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-xs" />
                      Đã quét thành công! Vui lòng bấm nút "ĐĂNG NHẬP" trên màn hình điện thoại của bạn.
                    </span>
                  )}
                  {status.qrStatus === 'expired' && (
                    <span className="text-rose-400 flex items-center gap-1.5 justify-center">
                      <FontAwesomeIcon icon={faCircleExclamation} className="text-xs" />
                      Mã QR đã hết hạn. Vui lòng bấm nút tạo lại mã bên dưới.
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <button
                    onClick={handleGenerateQR}
                    disabled={isLoadingQR}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faRotate} className={isLoadingQR ? 'animate-spin' : ''} />
                    <span>Làm mới mã QR</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerateQR}
                disabled={isLoadingQR || !isBridgeOnline}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/25 transition flex items-center gap-2 mx-auto"
              >
                <FontAwesomeIcon icon={isLoadingQR ? faCircleNotch : faQrcode} className={isLoadingQR ? 'animate-spin' : ''} />
                <span>{isLoadingQR ? 'Đang tạo mã QR...' : 'Tạo Mã QR Đăng Nhập Zalo'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. KHỐI 2: CẤU HÌNH NHẬN CẢNH BÁO & NÚT GỬI THỬ NGHIỆM (LUÔN LUÔN HIỂN THỊ) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
            <FontAwesomeIcon icon={faSliders} />
            Bước 2: Cấu Hình Nơi Nhận Cảnh Báo & Thử Nghiệm
          </h4>
          <span className="text-[11px] text-slate-400">
            {config.enabled ? '🟢 Đang Bật Gửi Zalo' : '⚪ Đang Tắt Gửi Zalo'}
          </span>
        </div>

        {/* Toggle Enable */}
        <div className="flex items-center justify-between py-2 border-b border-slate-800">
          <div>
            <p className="text-xs font-semibold text-slate-200">Kích hoạt gửi cảnh báo tự động qua Zalo</p>
            <p className="text-[11px] text-slate-400">Tự động bắn tin khi phát hiện quá tải khách chờ hoặc mất cân đối quầy</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleConfigChange({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
          </label>
        </div>

        {/* Target Destination: Self vs Group */}
        <div className="space-y-2 py-2 border-b border-slate-800">
          <label className="text-xs font-semibold text-slate-200 block">
            Nơi nhận tin nhắn cảnh báo (Chọn Cá Nhân hoặc Nhóm Zalo):
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: Cloud của tôi */}
            <button
              type="button"
              onClick={() => handleConfigChange({
                targetType: 'user',
                targetId: '',
                targetName: 'Cloud của tôi (Zalo cá nhân)',
              })}
              className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                config.targetType === 'user' && !config.targetId
                  ? 'bg-sky-500/15 border-sky-500/50 text-white ring-1 ring-sky-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faCloud} className="text-sm" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Cloud của tôi (Zalo Cá Nhân)</div>
                <div className="text-[10px] text-slate-400">Gửi trực tiếp vào hộp thoại riêng của bạn</div>
              </div>
            </button>

            {/* Option 2: Nhóm Zalo */}
            <div className="space-y-1">
              <select
                value={config.targetType === 'group' ? config.targetId : ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (!selectedId) {
                    handleConfigChange({
                      targetType: 'user',
                      targetId: '',
                      targetName: 'Cloud của tôi (Zalo cá nhân)',
                    });
                    return;
                  }
                  const grp = contacts?.groups.find((g) => g.id === selectedId);
                  handleConfigChange({
                    targetType: 'group',
                    targetId: selectedId,
                    targetName: grp ? grp.name : 'Nhóm Zalo',
                  });
                }}
                className={`w-full p-2.5 rounded-xl border bg-slate-950 text-xs font-semibold outline-none transition ${
                  config.targetType === 'group'
                    ? 'border-sky-500 text-white ring-1 ring-sky-500/30'
                    : 'border-slate-800 text-slate-300'
                }`}
              >
                <option value="">-- Hoặc chọn gửi vào Nhóm Zalo CSKH --</option>
                {contacts?.groups?.map((g) => (
                  <option key={g.id} value={g.id}>
                    👥 {g.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                {isLoggedIn 
                  ? (contacts?.groups?.length 
                      ? `Tìm thấy ${contacts.groups.length} nhóm bạn đang tham gia` 
                      : 'Đang tải danh sách nhóm Zalo...')
                  : '💡 Sau khi quét QR đăng nhập Zalo ở Bước 1, danh sách nhóm của bạn sẽ hiện ra tại đây'}
              </p>
            </div>
          </div>

          <div className="mt-2 text-xs text-sky-400 font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between">
            <span>Đang thiết lập gửi đến: <strong>{config.targetName}</strong></span>
            <span className="text-[11px] text-slate-400 font-sans">
              Loại: {config.targetType === 'group' ? 'Nhóm Zalo' : 'Cá nhân'}
            </span>
          </div>
        </div>

        {/* Immediate trigger + Cooldown description */}
        <div className="space-y-2 py-2 border-b border-slate-800">
          <label className="text-xs font-semibold text-slate-200 block">
            Cơ chế gửi cảnh báo:
          </label>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <FontAwesomeIcon icon={faCircleCheck} className="text-xs" />
              <span>Gửi ngay lập tức: Khi có cảnh báo mới hoặc thay đổi trạng thái quá tải sẽ BẮN NGAY TỨC THÌ.</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-slate-400">Giãn cách nhắc lại nếu vẫn tiếp diễn (Cooldown):</span>
              <select
                value={config.cooldownMinutes}
                onChange={(e) => handleConfigChange({ cooldownMinutes: Number(e.target.value) })}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none font-bold"
              >
                <option value={1}>1 phút</option>
                <option value={3}>3 phút</option>
                <option value={5}>5 phút (Khuyến nghị)</option>
                <option value={10}>10 phút</option>
              </select>
            </div>
          </div>
        </div>

        {/* NÚT GỬI THỬ NGHIỆM */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-300">
            Bấm nút bên cạnh để kiểm tra chuông Zalo trên điện thoại ngay:
          </div>

          <button
            type="button"
            onClick={handleSendTest}
            disabled={isSendingTest}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/30 transition flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={isSendingTest ? faCircleNotch : faPaperPlane} className={isSendingTest ? 'animate-spin' : ''} />
            <span>{isSendingTest ? 'Đang gửi tin...' : 'Gửi Tin Nhắn Thử Nghiệm'}</span>
          </button>
        </div>

        {/* Kết quả Test Alert */}
        {testResult && (
          <div className={`p-3 rounded-xl text-xs font-semibold border animate-in fade-in duration-150 flex items-center gap-2 ${
            testResult.success 
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}>
            <FontAwesomeIcon icon={testResult.success ? faCircleCheck : faTriangleExclamation} />
            <span>{testResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
