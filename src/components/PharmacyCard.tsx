import React, { useState, useRef, useEffect } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut,
  AlertCircle
} from 'lucide-react';
import { PharmacyScreen } from '../types';

interface PharmacyCardProps {
  pharmacy: PharmacyScreen;
  isFocused: boolean;
  onToggleFocus: () => void;
  onUpdateScale: (newScale: number) => void;
}

export const PharmacyCard: React.FC<PharmacyCardProps> = ({
  pharmacy,
  isFocused,
  onToggleFocus,
  onUpdateScale,
}) => {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    setHasError(false);
    setIframeKey((prev) => prev + 1);
  };

  const handleZoomChange = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newScale = Math.min(1.25, Math.max(0.5, parseFloat((pharmacy.scale + delta).toFixed(2))));
    onUpdateScale(newScale);
  };

  // Auto refresh interval if set
  useEffect(() => {
    if (!pharmacy.autoRefreshInterval || pharmacy.autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      setIframeKey((prev) => prev + 1);
    }, pharmacy.autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [pharmacy.autoRefreshInterval]);

  const scale = pharmacy.scale || 0.85;
  const widthPercent = (100 / scale).toFixed(2);
  const heightPercent = (100 / scale).toFixed(2);

  return (
    <div 
      className={`relative flex flex-col h-full w-full bg-slate-900 border rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isFocused 
          ? 'border-sky-500 ring-2 ring-sky-500/30' 
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/95 border-b border-slate-800/80 backdrop-blur-md z-10 select-none">
        {/* Left: Code badge & Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex-shrink-0 px-2 py-0.5 text-xs font-bold font-mono tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-md">
            {pharmacy.code || 'NT'}
          </span>
          <h2 className="text-sm font-semibold text-slate-100 truncate tracking-tight">
            {pharmacy.name}
          </h2>
          {pharmacy.notes && (
            <span className="hidden md:inline text-xs text-slate-400 truncate max-w-[140px]">
              ({pharmacy.notes})
            </span>
          )}
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800/90 rounded-md p-0.5 border border-slate-700/60 text-slate-300">
            <button
              onClick={(e) => handleZoomChange(-0.05, e)}
              className="p-1 hover:text-white hover:bg-slate-700 rounded transition"
              title="Thu nhỏ tỉ lệ (Zoom out)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-slate-300 font-semibold min-w-[38px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={(e) => handleZoomChange(0.05, e)}
              className="p-1 hover:text-white hover:bg-slate-700 rounded transition"
              title="Phóng to tỉ lệ (Zoom in)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition"
            title="Tải lại quầy này"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          {/* Open in new tab */}
          <a
            href={pharmacy.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-md transition"
            title="Mở tab riêng"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Maximize / Focus Button */}
          <button
            onClick={onToggleFocus}
            className={`p-1.5 rounded-md transition ${
              isFocused 
                ? 'bg-sky-600 text-white hover:bg-sky-500' 
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={isFocused ? 'Thu nhỏ về chế độ lưới (Esc)' : 'Phóng to quầy này'}
          >
            {isFocused ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Frame Container */}
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
            <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
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
            transform: `scale(${scale})`,
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
