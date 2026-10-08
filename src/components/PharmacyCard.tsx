import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faExpand, 
  faCompress, 
  faRotate, 
  faArrowUpRightFromSquare, 
  faMagnifyingGlassPlus, 
  faMagnifyingGlassMinus,
  faCircleExclamation,
  faUsers,
  faUserCheck,
  faDesktop,
  faScaleBalanced,
  faEllipsisVertical
} from '@fortawesome/free-solid-svg-icons';
import { PharmacyScreen, DispatchAlert } from '../types';

interface PharmacyCardProps {
  pharmacy: PharmacyScreen;
  isFocused: boolean;
  onToggleFocus: () => void;
  onUpdateScale: (newScale: number) => void;
  alerts?: DispatchAlert[];
}

export const PharmacyCard: React.FC<PharmacyCardProps> = ({
  pharmacy,
  isFocused,
  onToggleFocus,
  onUpdateScale,
  alerts = [],
}) => {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    setHasError(false);
    setIsMenuOpen(false);
    setIframeKey((prev) => prev + 1);
  };

  const handleZoomChange = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentScale = pharmacy.scale || 0.50;
    const newScale = Math.min(1.20, Math.max(0.30, parseFloat((currentScale + delta).toFixed(2))));
    onUpdateScale(newScale);
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Auto refresh interval if set
  useEffect(() => {
    if (!pharmacy.autoRefreshInterval || pharmacy.autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      setIframeKey((prev) => prev + 1);
    }, pharmacy.autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [pharmacy.autoRefreshInterval]);

  const effectiveScale = isFocused ? Math.max(pharmacy.scale || 0.50, 0.95) : (pharmacy.scale || 0.50);
  const widthPercent = (100 / effectiveScale).toFixed(2);
  const heightPercent = (100 / effectiveScale).toFixed(2);

  const stats = pharmacy.stats || {
    waitingCount: 0,
    servingCount: 0,
    activeCounters: [],
    lastUpdated: Date.now(),
  };

  const isOverloaded = alerts.some((a) => a.severity === 'danger' && a.pharmacyId === pharmacy.id);
  const isCrowded = alerts.some((a) => a.severity === 'warning' && a.pharmacyId === pharmacy.id);

  return (
    <div 
      className={`relative flex flex-col h-full w-full bg-slate-900 border rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isOverloaded 
          ? 'border-rose-500 ring-2 ring-rose-500/40 animate-pulse' 
          : isCrowded
          ? 'border-amber-500 ring-1 ring-amber-500/30'
          : isFocused 
          ? 'border-sky-500 ring-2 ring-sky-500/30' 
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/95 border-b border-slate-800/80 backdrop-blur-md z-10 select-none">
        {/* Left: Code badge & Name */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 px-2 py-0.5 text-xs font-bold font-mono tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-md">
            {pharmacy.code || 'NT'}
          </span>
          <h2 className="text-xs sm:text-sm font-semibold text-slate-100 truncate tracking-tight">
            {pharmacy.name}
          </h2>
          {pharmacy.notes && (
            <span className="hidden xl:inline text-[11px] text-slate-400 truncate max-w-[130px]">
              ({pharmacy.notes})
            </span>
          )}
        </div>

        {/* Right: Quick Maximize + 3-Dots Menu */}
        <div className="relative flex items-center gap-1 flex-shrink-0" ref={menuRef}>
          {/* Quick Maximize / Focus Button */}
          <button
            onClick={onToggleFocus}
            className={`p-1.5 rounded-md transition ${
              isFocused 
                ? 'bg-sky-600 text-white hover:bg-sky-500' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={isFocused ? 'Thu nhỏ về chế độ lưới (Esc)' : 'Phóng to quầy này'}
          >
            <FontAwesomeIcon 
              icon={isFocused ? faCompress : faExpand} 
              className="text-xs" 
            />
          </button>

          {/* 3-Dots Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-1.5 rounded-md transition ${
              isMenuOpen
                ? 'bg-slate-800 text-sky-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Tùy chọn chức năng"
          >
            <FontAwesomeIcon icon={faEllipsisVertical} className="text-xs px-1" />
          </button>

          {/* 3-Dots Popover Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-8 z-30 w-48 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
              {/* Zoom row */}
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-800/80">
                <span className="text-[11px] text-slate-400">Tỉ lệ TV:</span>
                <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700/60">
                  <button
                    onClick={(e) => handleZoomChange(-0.05, e)}
                    className="p-1 hover:text-white hover:bg-slate-700 rounded transition"
                    title="Thu nhỏ (-5%)"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlassMinus} className="text-[10px]" />
                  </button>
                  <span className="px-1 font-mono font-bold text-[11px] text-sky-400 min-w-[32px] text-center">
                    {Math.round(effectiveScale * 100)}%
                  </span>
                  <button
                    onClick={(e) => handleZoomChange(0.05, e)}
                    className="p-1 hover:text-white hover:bg-slate-700 rounded transition"
                    title="Phóng to (+5%)"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="text-[10px]" />
                  </button>
                </div>
              </div>

              {/* Refresh single button */}
              <button
                onClick={handleRefresh}
                className="w-full px-3 py-2 text-left hover:bg-slate-800/80 hover:text-white flex items-center gap-2 transition"
              >
                <FontAwesomeIcon icon={faRotate} className={`text-xs ${isLoading ? 'animate-spin text-sky-400' : 'text-slate-400'}`} />
                <span>Tải lại màn hình</span>
              </button>

              {/* Open in new tab button */}
              <a
                href={pharmacy.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="w-full px-3 py-2 text-left hover:bg-slate-800/80 hover:text-white flex items-center gap-2 transition"
              >
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs text-slate-400" />
                <span>Mở trong tab mới</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 2. Smart HUD Telemetry Bar (Live Metrics) */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-1 bg-slate-950/90 border-b border-slate-800/80 text-[11px] font-mono select-none">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Waiting Count */}
          <span 
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-semibold ${
              stats.waitingCount > 3
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : stats.waitingCount > 1
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
            }`}
            title="Số lượng khách hàng đang chờ"
          >
            <FontAwesomeIcon icon={faUsers} className="text-[10px]" />
            <span>Chờ: <strong>{stats.waitingCount}</strong></span>
          </span>

          {/* Serving Count */}
          <span 
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-700/60 bg-slate-800/80 text-sky-300"
            title="Số lượng khách hàng đang được phục vụ"
          >
            <FontAwesomeIcon icon={faUserCheck} className="text-[10px]" />
            <span>Phục vụ: <strong>{stats.servingCount}</strong></span>
          </span>

          {/* Active Counters */}
          <span 
            className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
              stats.activeCounters.length > 0
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
            }`}
            title="Danh sách số quầy đang mở phục vụ"
          >
            <FontAwesomeIcon icon={faDesktop} className="text-[10px]" />
            <span>
              {stats.activeCounters.length > 0 
                ? `Quầy ${stats.activeCounters.join(', ')}` 
                : 'Chưa mở quầy'}
            </span>
          </span>
        </div>

        {/* Load Ratio Indicator */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <FontAwesomeIcon icon={faScaleBalanced} className="text-[10px]" />
          <span>
            Tải: <strong className={stats.waitingCount > (stats.activeCounters.length || 1) * 3 ? 'text-rose-400' : 'text-slate-200'}>
              {stats.activeCounters.length > 0 ? (stats.waitingCount / stats.activeCounters.length).toFixed(1) : stats.waitingCount}
            </strong> kh/quầy
          </span>
        </div>
      </div>

      {/* 3. Frame Container */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950">
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-xs font-medium text-slate-400 animate-pulse">
              Đang kết nối màn hình {pharmacy.name}...
            </p>
          </div>
        )}

        {/* Error Fallback */}
        {hasError && (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-300">
            <FontAwesomeIcon icon={faCircleExclamation} className="text-3xl text-amber-500 mb-2" />
            <p className="font-semibold text-sm">Không thể kết nối màn hình</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Vui lòng kiểm tra lại đường truyền mạng hoặc liên kết QMS.</p>
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition"
            >
              Thử kết nối lại
            </button>
          </div>
        )}

        {/* Scaled Iframe */}
        <div 
          className="w-full h-full overflow-hidden origin-top-left"
          style={{
            width: `${widthPercent}%`,
            height: `${heightPercent}%`,
            transform: `scale(${effectiveScale})`,
            transformOrigin: 'top left',
          }}
        >
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={pharmacy.url}
            title={pharmacy.name}
            className="w-full h-full border-0 block"
            allow="autoplay; fullscreen; clipboard-read; clipboard-write"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </div>
      </div>
    </div>
  );
};
