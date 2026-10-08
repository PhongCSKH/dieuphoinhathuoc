import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHospitalUser, 
  faLayerGroup, 
  faTableCellsLarge, 
  faSquare, 
  faTableColumns, 
  faTableCells, 
  faRotate, 
  faSliders, 
  faExpand, 
  faCompress, 
  faPlay, 
  faPause, 
  faBell, 
  faBellSlash,
  faTriangleExclamation,
  faMaximize
} from '@fortawesome/free-solid-svg-icons';
import { LayoutMode } from '../types';
import { SCALE_OPTIONS } from '../constants';

interface HeaderProps {
  layout: LayoutMode;
  onChangeLayout: (newLayout: LayoutMode) => void;
  onRefreshAll: () => void;
  onOpenManage: () => void;
  globalScale: number;
  onChangeGlobalScale: (scale: number) => void;
  carouselActive: boolean;
  onToggleCarousel: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  pharmacyCount: number;
  activeAlertCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  layout,
  onChangeLayout,
  onRefreshAll,
  onOpenManage,
  globalScale,
  onChangeGlobalScale,
  carouselActive,
  onToggleCarousel,
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
    <header className="flex-shrink-0 h-14 bg-slate-950/95 border-b border-slate-800/80 px-4 flex items-center justify-between select-none backdrop-blur-md z-30">
      {/* Left: Branding & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg shadow-sky-500/20 text-white font-bold">
          <FontAwesomeIcon icon={faHospitalUser} className="text-base" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-white uppercase sm:text-base">
              Điều Phối Nhà Thuốc
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Live ({pharmacyCount} Quầy)
            </span>

            {/* Active Alert Badge */}
            {activeAlertCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                {activeAlertCount} Cảnh báo
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 hidden md:block">
            Trung tâm giám sát & điều phối gọi số QMS thông minh
          </p>
        </div>
      </div>

      {/* Middle: Layout Selector & Global Scale */}
      <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
        <span className="text-xs font-medium text-slate-400 px-2 flex items-center gap-1">
          <FontAwesomeIcon icon={faLayerGroup} className="text-xs" /> Bố cục:
        </span>

        {/* 2x2 Grid */}
        <button
          onClick={() => onChangeLayout('grid-4')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            layout === 'grid-4' 
              ? 'bg-sky-600 text-white shadow-sm' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Lưới 2x2 (4 Màn hình chuẩn)"
        >
          <FontAwesomeIcon icon={faTableCellsLarge} className="text-xs" />
          <span>Lưới 4</span>
        </button>

        {/* Split 1 + 3 */}
        <button
          onClick={() => onChangeLayout('split-1-3')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            layout === 'split-1-3' 
              ? 'bg-sky-600 text-white shadow-sm' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="1 Quầy chính to + 3 Quầy phụ nhỏ"
        >
          <FontAwesomeIcon icon={faSquare} className="text-xs" />
          <span>1 To + 3 Phụ</span>
        </button>

        {/* 1x2 Split */}
        <button
          onClick={() => onChangeLayout('grid-2')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            layout === 'grid-2' 
              ? 'bg-sky-600 text-white shadow-sm' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Chia đôi 2 màn hình (1x2)"
        >
          <FontAwesomeIcon icon={faTableColumns} className="text-xs" />
          <span>Lưới 2</span>
        </button>

        {/* 2x3 Grid */}
        <button
          onClick={() => onChangeLayout('grid-6')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            layout === 'grid-6' 
              ? 'bg-sky-600 text-white shadow-sm' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Lưới 6 màn hình (2x3)"
        >
          <FontAwesomeIcon icon={faTableCells} className="text-xs" />
          <span>Lưới 6</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-800 mx-1"></div>

        {/* Global Scale Quick Selector */}
        <div className="flex items-center gap-1.5 pl-1 pr-1">
          <span className="text-xs text-slate-400">Tỉ lệ TV:</span>
          <select
            value={globalScale}
            onChange={(e) => onChangeGlobalScale(parseFloat(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-1.5 py-0.5 outline-none focus:border-sky-500 font-mono font-medium"
          >
            {SCALE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Quick Fit 50% Button */}
          <button
            onClick={() => onChangeGlobalScale(0.50)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition flex items-center gap-1 ${
              globalScale === 0.50 
                ? 'bg-sky-600 text-white border-sky-500' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title="Tự động thu phóng 50% vừa khít trọn vẹn cả 4 màn hình"
          >
            <FontAwesomeIcon icon={faMaximize} className="text-[10px]" />
            <span>Vừa khít (50%)</span>
          </button>
        </div>
      </div>

      {/* Right: Sound, Clock, Actions & Fullscreen */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Sound Chime Toggle */}
        <button
          onClick={onToggleSound}
          className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
            soundEnabled
              ? 'bg-slate-900 border-slate-700 text-sky-400 hover:text-white'
              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
          }`}
          title={soundEnabled ? 'Âm thanh cảnh báo: Đang BẬT' : 'Âm thanh cảnh báo: Đang TẮT'}
        >
          <FontAwesomeIcon icon={soundEnabled ? faBell : faBellSlash} className="text-xs" />
        </button>

        {/* Real-time Clock */}
        <div className="hidden md:flex flex-col items-end px-2.5 py-1 bg-slate-900/80 rounded-lg border border-slate-800/80 font-mono">
          <span className="text-xs font-bold text-sky-400 tracking-wider">
            {currentTime}
          </span>
          <span className="text-[10px] text-slate-500 font-sans uppercase">
            {currentDate}
          </span>
        </div>

        {/* Auto Carousel Rotation Toggle */}
        <button
          onClick={onToggleCarousel}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
            carouselActive
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
          title={carouselActive ? 'Tắt xoay vòng tự động' : 'Bật xoay vòng tự động chuyển quầy'}
        >
          <FontAwesomeIcon icon={carouselActive ? faPause : faPlay} className="text-xs" />
          <span className="hidden sm:inline">{carouselActive ? 'Xoay vòng: Bật' : 'Xoay vòng'}</span>
        </button>

        {/* Refresh All */}
        <button
          onClick={onRefreshAll}
          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition"
          title="Tải lại toàn bộ các màn hình"
        >
          <FontAwesomeIcon icon={faRotate} className="text-xs" />
        </button>

        {/* Manage Links & Rules */}
        <button
          onClick={onOpenManage}
          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
          title="Cấu hình Nhà thuốc & Ngưỡng điều phối"
        >
          <FontAwesomeIcon icon={faSliders} className="text-xs" />
          <span className="hidden sm:inline">Cấu hình</span>
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
