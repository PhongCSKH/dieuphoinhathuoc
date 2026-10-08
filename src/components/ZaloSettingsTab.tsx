import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faComments, 
  faQrcode, 
  faCircleCheck, 
  faCircleExclamation, 
  faRotate, 
  faRightFromBracket, 
  faPaperPlane, 
  faUser, 
  faCloud,
  faSliders,
  faCircleNotch
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
                ? 'Cổng nội bộ máy tính 5050 - Sẵn sàng gửi tin nhắn trực tiếp qua Zalo' 
                : 'Vui lòng chạy file Mo_Dieu_Phoi_Nha_Thuoc.bat hoặc Run_Zalo_Bridge.bat trên máy tính.'}
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

      {/* 2. Login Section */}
      {!isLoggedIn ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center text-2xl mx-auto mb-4">
            <FontAwesomeIcon icon={faComments} />
          </div>

          <h3 className="text-base font-bold text-white">Đăng Nhập Zalo Cá Nhân</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Hệ thống sử dụng Zalo cá nhân của bạn để tự động gửi thông báo điều phối. 
            Bạn chỉ cần quét mã QR 1 lần, phiên đăng nhập sẽ được lưu an toàn trên máy tính.
          </p>

          {status?.qrCode ? (
            <div className="mt-6 flex flex-col items-center">
              <div className="p-3 bg-white rounded-2xl shadow-xl inline-block border-4 border-sky-500/50 animate-in zoom-in-95 duration-200">
                <img 
                  src={status.qrCode} 
                  alt="Mã QR Zalo" 
                  className="w-56 h-56 object-contain"
                />
              </div>

              {/* Status Indicator */}
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
                {status.qrStatus === 'waiting_scan' && (
                  <span className="text-sky-400 flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCircleNotch} className="animate-spin text-xs" />
                    Đang chờ bạn mở Zalo trên điện thoại quét mã...
                  </span>
                )}
                {status.qrStatus === 'scanned' && (
                  <span className="text-amber-400 flex items-center gap-1.5 animate-pulse">
                    <FontAwesomeIcon icon={faCircleCheck} className="text-xs" />
                    Đã quét mã! Vui lòng bấm "Xác nhận đăng nhập" trên màn hình điện thoại của bạn.
                  </span>
                )}
                {status.qrStatus === 'expired' && (
                  <span className="text-rose-400 flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCircleExclamation} className="text-xs" />
                    Mã QR đã hết hạn. Vui lòng bấm tạo lại mã mới.
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleGenerateQR}
                  disabled={isLoadingQR}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 transition flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faRotate} className={isLoadingQR ? 'animate-spin' : ''} />
                  <span>Tạo lại mã QR</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <button
                onClick={handleGenerateQR}
                disabled={isLoadingQR || !isBridgeOnline}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/20 transition flex items-center gap-2 mx-auto"
              >
                <FontAwesomeIcon icon={isLoadingQR ? faCircleNotch : faQrcode} className={isLoadingQR ? 'animate-spin' : ''} />
                <span>{isLoadingQR ? 'Đang tạo mã QR...' : 'Tạo Mã QR Đăng Nhập Zalo'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 3. Logged-in Settings Section */
        <div className="space-y-6">
          {/* User Account Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status?.user?.avatar ? (
                <img 
                  src={status.user.avatar} 
                  alt="Avatar" 
                  className="w-12 h-12 rounded-full border-2 border-sky-500 object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center text-lg">
                  <FontAwesomeIcon icon={faUser} />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{status?.user?.name || 'Zalo Cá Nhân'}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Đã đăng nhập
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  ID Zalo: <span className="font-mono text-slate-300">{status?.user?.id || 'Chính bạn'}</span>
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

          {/* Alert Configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
              <FontAwesomeIcon icon={faSliders} />
              Cấu Hình Gửi Tin Nhắn Cảnh Báo
            </h4>

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
                Nơi nhận tin nhắn cảnh báo:
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
                      ? 'bg-sky-500/15 border-sky-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
                    <FontAwesomeIcon icon={faCloud} className="text-sm" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Cloud của tôi (Cá nhân)</div>
                    <div className="text-[10px] text-slate-400">Tin nhắn riêng bí mật vào Zalo của bạn</div>
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
                    <option value="">-- Hoặc chọn gửi vào Nhóm Zalo --</option>
                    {contacts?.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        👥 {g.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">
                    {contacts?.groups?.length 
                      ? `Tìm thấy ${contacts.groups.length} nhóm bạn đang tham gia` 
                      : 'Đang tải danh sách nhóm Zalo...'}
                  </p>
                </div>
              </div>

              <div className="mt-2 text-xs text-sky-400 font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                Đang thiết lập gửi đến: <strong>{config.targetName}</strong>
              </div>
            </div>

            {/* Immediate trigger + Cooldown description */}
            <div className="space-y-2 py-2">
              <label className="text-xs font-semibold text-slate-200 block">
                Cơ chế kích hoạt cảnh báo:
              </label>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-xs" />
                  <span>Kích hoạt tức thì: Cảnh báo mới hoặc thay đổi trạng thái sẽ gửi NGAY LẬP TỨC.</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400">Giãn cách nhắc nhở nếu tiếp tục đông (Cooldown):</span>
                  <select
                    value={config.cooldownMinutes}
                    onChange={(e) => handleConfigChange({ cooldownMinutes: Number(e.target.value) })}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs outline-none"
                  >
                    <option value={1}>1 phút</option>
                    <option value={3}>3 phút</option>
                    <option value={5}>5 phút (Khuyến nghị)</option>
                    <option value={10}>10 phút</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Test Action */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Kiểm tra rung chuông Zalo trên điện thoại của bạn ngay:
              </div>

              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                <FontAwesomeIcon icon={isSendingTest ? faCircleNotch : faPaperPlane} className={isSendingTest ? 'animate-spin' : ''} />
                <span>{isSendingTest ? 'Đang gửi test...' : 'Gửi Tin Nhắn Thử Nghiệm'}</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl text-xs font-semibold border animate-in fade-in duration-150 ${
                testResult.success 
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}>
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
