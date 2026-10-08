import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHospitalUser, 
  faRotate, 
  faSliders, 
  faExpand, 
  faCompress, 
  faBell, 
  faBellSlash,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';

interface HeaderProps {
  onRefreshAll: () => void;
  onOpenManage: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  pharmacyCount: number;
  activeAlertCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefreshAll,
  onOpenManage,
  isFullscreen,
  onToggleFullscreen,
  pharmacyCount,
  activeAlertCount,
  soundEnabled,
  onToggleSound,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex-shrink-0 h-12 bg-slate-950/95 border-b border-slate-800/80 px-4 flex items-center justify-between select-none backdrop-blur-md z-30">
      {/* Left: Branding & Status (Xóa dòng chữ phụ theo yêu cầu) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-md shadow-sky-500/20 text-white font-bold">
          <FontAwesomeIcon icon={faHospitalUser} className="text-sm" />
        </div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-sm font-bold tracking-tight text-white uppercase">
            Điều Phối Nhà Thuốc
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Live ({pharmacyCount})
          </span>

          {/* Active Alert Badge */}
          {activeAlertCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
              <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
              {activeAlertCount} Cảnh báo
            </span>
          )}
        </div>
      </div>

      {/* Right: Sound, Clock, Refresh, Cấu hình (chỉ biểu tượng), Fullscreen */}
      <div className="flex items-center gap-2">
        {/* Sound Chime Toggle */}
        <button
          onClick={onToggleSound}
          className={`p-2 rounded-lg text-xs font-semibold flex items-center transition border ${
            soundEnabled
              ? 'bg-slate-900 border-slate-700 text-sky-400 hover:text-white'
              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
          }`}
          title={soundEnabled ? 'Âm thanh cảnh báo: BẬT' : 'Âm thanh cảnh báo: TẮT'}
        >
          <FontAwesomeIcon icon={soundEnabled ? faBell : faBellSlash} className="text-xs" />
        </button>

        {/* Real-time Clock */}
        <div className="hidden sm:flex flex-col items-end px-2.5 py-0.5 bg-slate-900/80 rounded-lg border border-slate-800/80 font-mono">
          <span className="text-xs font-bold text-sky-400 tracking-wider">
            {currentTime}
          </span>
          <span className="text-[9px] text-slate-500 font-sans uppercase">
            {currentDate}
          </span>
        </div>

        {/* Refresh All */}
        <button
          onClick={onRefreshAll}
          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition"
          title="Tải lại toàn bộ các màn hình"
        >
          <FontAwesomeIcon icon={faRotate} className="text-xs" />
        </button>

        {/* Nút Cấu hình (CHỈ BIỂU TƯỢNG, KHÔNG CHỮ) */}
        <button
          onClick={onOpenManage}
          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-sky-400 rounded-lg border border-slate-800 transition"
          title="Cài đặt hệ thống (Yêu cầu mật khẩu)"
        >
          <FontAwesomeIcon icon={faSliders} className="text-xs" />
        </button>

        {/* Fullscreen F11 */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-sm transition"
          title={isFullscreen ? 'Thoát toàn màn hình (F11)' : 'Toàn màn hình TV (F11)'}
        >
          <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} className="text-xs" />
        </button>
      </div>
    </header>
  );
};
