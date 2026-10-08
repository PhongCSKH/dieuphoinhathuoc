import React, { useState, useEffect } from 'react';
import { PharmacyScreen, LayoutMode } from './types';
import { DEFAULT_PHARMACIES } from './constants';
import { Header } from './components/Header';
import { PharmacyCard } from './components/PharmacyCard';
import { ManageModal } from './components/ManageModal';
import { X, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  // Load saved pharmacies or use defaults
  const [pharmacies, setPharmacies] = useState<PharmacyScreen[]>(() => {
    try {
      const saved = localStorage.getItem('dieu_phoi_pharmacies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PHARMACIES;
  });

  // Layout mode (default: grid-4)
  const [layout, setLayout] = useState<LayoutMode>(() => {
    return (localStorage.getItem('dieu_phoi_layout') as LayoutMode) || 'grid-4';
  });

  // Global scale for all screens
  const [globalScale, setGlobalScale] = useState<number>(() => {
    const saved = localStorage.getItem('dieu_phoi_scale');
    return saved ? parseFloat(saved) : 0.85;
  });

  // Focused single pharmacy (null = grid mode)
  const [focusPharmacyId, setFocusPharmacyId] = useState<string | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Carousel mode (auto rotation)
  const [carouselActive, setCarouselActive] = useState<boolean>(false);

  // Modal open
  const [isManageOpen, setIsManageOpen] = useState<boolean>(false);

  // Refresh all trigger
  const [globalRefreshCount, setGlobalRefreshCount] = useState<number>(0);

  // Save pharmacies
  const handleSavePharmacies = (newPharmacies: PharmacyScreen[]) => {
    setPharmacies(newPharmacies);
    localStorage.setItem('dieu_phoi_pharmacies', JSON.stringify(newPharmacies));
  };

  // Change layout
  const handleChangeLayout = (newLayout: LayoutMode) => {
    setLayout(newLayout);
    setFocusPharmacyId(null);
    localStorage.setItem('dieu_phoi_layout', newLayout);
  };

  // Change global scale
  const handleChangeGlobalScale = (scale: number) => {
    setGlobalScale(scale);
    localStorage.setItem('dieu_phoi_scale', scale.toString());
    const updated = pharmacies.map((p) => ({ ...p, scale }));
    setPharmacies(updated);
    localStorage.setItem('dieu_phoi_pharmacies', JSON.stringify(updated));
  };

  // Update scale for individual pharmacy
  const handleUpdatePharmacyScale = (id: string, newScale: number) => {
    const updated = pharmacies.map((p) => (p.id === id ? { ...p, scale: newScale } : p));
    setPharmacies(updated);
    localStorage.setItem('dieu_phoi_pharmacies', JSON.stringify(updated));
  };

  // Fullscreen handler
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Listen to native fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isManageOpen) return;

      if (e.key === 'Escape') {
        if (focusPharmacyId) {
          setFocusPharmacyId(null);
        }
      } else if (e.key === '1' && pharmacies[0]) {
        setFocusPharmacyId((prev) => (prev === pharmacies[0].id ? null : pharmacies[0].id));
      } else if (e.key === '2' && pharmacies[1]) {
        setFocusPharmacyId((prev) => (prev === pharmacies[1].id ? null : pharmacies[1].id));
      } else if (e.key === '3' && pharmacies[2]) {
        setFocusPharmacyId((prev) => (prev === pharmacies[2].id ? null : pharmacies[2].id));
      } else if (e.key === '4' && pharmacies[3]) {
        setFocusPharmacyId((prev) => (prev === pharmacies[3].id ? null : pharmacies[3].id));
      } else if (e.key === '0') {
        setFocusPharmacyId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusPharmacyId, isManageOpen, pharmacies]);

  // Carousel auto rotation
  useEffect(() => {
    if (!carouselActive || pharmacies.length === 0) return;

    const interval = setInterval(() => {
      setFocusPharmacyId((current) => {
        if (!current) {
          return pharmacies[0].id;
        }
        const currentIndex = pharmacies.findIndex((p) => p.id === current);
        const nextIndex = (currentIndex + 1) % pharmacies.length;
        return pharmacies[nextIndex].id;
      });
    }, 20000); // 20s per screen

    return () => clearInterval(interval);
  }, [carouselActive, pharmacies]);

  const focusedPharmacy = pharmacies.find((p) => p.id === focusPharmacyId);

  // Render grid based on layout mode
  const renderGridContent = () => {
    // If a specific pharmacy is focused
    if (focusedPharmacy) {
      return (
        <div className="relative w-full h-full p-2">
          {/* Floating Focus Badge */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-900/90 border border-sky-500/40 text-slate-100 px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-sky-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
              Đang xem chi tiết: {focusedPharmacy.name}
            </span>
            <button
              onClick={() => setFocusPharmacyId(null)}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full transition text-[11px]"
            >
              <X className="w-3.5 h-3.5" /> Thoát (Esc)
            </button>
          </div>

          <PharmacyCard
            key={`${focusedPharmacy.id}-${globalRefreshCount}`}
            pharmacy={focusedPharmacy}
            isFocused={true}
            onToggleFocus={() => setFocusPharmacyId(null)}
            onUpdateScale={(s) => handleUpdatePharmacyScale(focusedPharmacy.id, s)}
          />
        </div>
      );
    }

    // Layout: 2x2 Grid (4 Screens - Default)
    if (layout === 'grid-4') {
      const displayPharmacies = pharmacies.slice(0, 4);
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-2 h-full w-full gap-2 p-2">
          {displayPharmacies.map((item) => (
            <div key={`${item.id}-${globalRefreshCount}`} className="h-full w-full min-h-0 min-w-0">
              <PharmacyCard
                pharmacy={item}
                isFocused={false}
                onToggleFocus={() => setFocusPharmacyId(item.id)}
                onUpdateScale={(s) => handleUpdatePharmacyScale(item.id, s)}
              />
            </div>
          ))}
        </div>
      );
    }

    // Layout: 1 Large + 3 Small (Split 1-3)
    if (layout === 'split-1-3') {
      const primary = pharmacies[0];
      const sideItems = pharmacies.slice(1, 4);
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full w-full gap-2 p-2">
          {/* Main big screen */}
          {primary && (
            <div className="lg:col-span-2 h-full w-full min-h-0">
              <PharmacyCard
                key={`${primary.id}-${globalRefreshCount}`}
                pharmacy={primary}
                isFocused={false}
                onToggleFocus={() => setFocusPharmacyId(primary.id)}
                onUpdateScale={(s) => handleUpdatePharmacyScale(primary.id, s)}
              />
            </div>
          )}

          {/* 3 small screens stacked */}
          <div className="grid grid-rows-3 h-full w-full gap-2 min-h-0">
            {sideItems.map((item) => (
              <div key={`${item.id}-${globalRefreshCount}`} className="h-full w-full min-h-0">
                <PharmacyCard
                  pharmacy={item}
                  isFocused={false}
                  onToggleFocus={() => setFocusPharmacyId(item.id)}
                  onUpdateScale={(s) => handleUpdatePharmacyScale(item.id, s)}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Layout: 1x2 Grid (2 Screens)
    if (layout === 'grid-2') {
      const displayPharmacies = pharmacies.slice(0, 2);
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 h-full w-full gap-2 p-2">
          {displayPharmacies.map((item) => (
            <div key={`${item.id}-${globalRefreshCount}`} className="h-full w-full min-h-0">
              <PharmacyCard
                pharmacy={item}
                isFocused={false}
                onToggleFocus={() => setFocusPharmacyId(item.id)}
                onUpdateScale={(s) => handleUpdatePharmacyScale(item.id, s)}
              />
            </div>
          ))}
        </div>
      );
    }

    // Layout: 2x3 Grid (6 Screens)
    if (layout === 'grid-6') {
      const displayPharmacies = pharmacies.slice(0, 6);
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 h-full w-full gap-2 p-2">
          {displayPharmacies.map((item) => (
            <div key={`${item.id}-${globalRefreshCount}`} className="h-full w-full min-h-0">
              <PharmacyCard
                pharmacy={item}
                isFocused={false}
                onToggleFocus={() => setFocusPharmacyId(item.id)}
                onUpdateScale={(s) => handleUpdatePharmacyScale(item.id, s)}
              />
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navigation Control Bar */}
      <Header
        layout={layout}
        onChangeLayout={handleChangeLayout}
        onRefreshAll={() => setGlobalRefreshCount((prev) => prev + 1)}
        onOpenManage={() => setIsManageOpen(true)}
        globalScale={globalScale}
        onChangeGlobalScale={handleChangeGlobalScale}
        carouselActive={carouselActive}
        onToggleCarousel={() => setCarouselActive(!carouselActive)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        pharmacyCount={pharmacies.length}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-950">
        {renderGridContent()}
      </main>

      {/* Configuration & Links Modal */}
      <ManageModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        pharmacies={pharmacies}
        onSavePharmacies={handleSavePharmacies}
      />
    </div>
  );
};

export default App;
