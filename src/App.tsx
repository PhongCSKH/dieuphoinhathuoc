import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faEye } from '@fortawesome/free-solid-svg-icons';
import { PharmacyScreen, LayoutMode, DispatchRules, DispatchAlert } from './types';
import { DEFAULT_PHARMACIES, DEFAULT_RULES } from './constants';
import { Header } from './components/Header';
import { PharmacyCard } from './components/PharmacyCard';
import { ManageModal } from './components/ManageModal';
import { PasswordModal } from './components/PasswordModal';
import { AlertBanner } from './components/AlertBanner';
import { evaluateDispatchRules } from './utils/dispatchEngine';
import { soundManager } from './utils/audio';
import { 
  dispatchZaloAlert, 
  formatZaloOverloadAlert, 
  formatZaloImbalanceAlert 
} from './utils/zalo';

export const App: React.FC = () => {
  // 1. Pharmacies state
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

  // Previous pharmacies ref for diffing events
  const prevPharmaciesRef = useRef<PharmacyScreen[]>(pharmacies);

  // 2. Rules state
  const [rules, setRules] = useState<DispatchRules>(() => {
    try {
      const saved = localStorage.getItem('dieu_phoi_rules');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_RULES;
  });

  // 3. Layout state
  const [layout, setLayout] = useState<LayoutMode>(() => {
    return (localStorage.getItem('dieu_phoi_layout') as LayoutMode) || 'grid-4';
  });

  // 4. Global scale (mặc định 0.50 vừa khít lưới 4)
  const [globalScale, setGlobalScale] = useState<number>(() => {
    const saved = localStorage.getItem('dieu_phoi_scale');
    return saved ? parseFloat(saved) : 0.50;
  });

  // 5. Active Alerts
  const [alerts, setAlerts] = useState<DispatchAlert[]>([]);

  // 6. UI flags
  const [focusPharmacyId, setFocusPharmacyId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState<boolean>(false);
  const [isManageOpen, setIsManageOpen] = useState<boolean>(false);
  const [globalRefreshCount, setGlobalRefreshCount] = useState<number>(0);

  // Save pharmacies
  const handleSavePharmacies = (newPharmacies: PharmacyScreen[]) => {
    setPharmacies(newPharmacies);
    localStorage.setItem('dieu_phoi_pharmacies', JSON.stringify(newPharmacies));
  };

  // Save rules
  const handleSaveRules = (newRules: DispatchRules) => {
    setRules(newRules);
    localStorage.setItem('dieu_phoi_rules', JSON.stringify(newRules));
  };

  // Toggle sound
  const handleToggleSound = () => {
    const updated = { ...rules, soundEnabled: !rules.soundEnabled };
    handleSaveRules(updated);
  };

  // Layout change
  const handleChangeLayout = (newLayout: LayoutMode) => {
    setLayout(newLayout);
    setFocusPharmacyId(null);
    localStorage.setItem('dieu_phoi_layout', newLayout);
  };

  // Global scale change
  const handleChangeGlobalScale = (scale: number) => {
    setGlobalScale(scale);
    localStorage.setItem('dieu_phoi_scale', scale.toString());
    const updated = pharmacies.map((p) => ({ ...p, scale }));
    setPharmacies(updated);
    localStorage.setItem('dieu_phoi_pharmacies', JSON.stringify(updated));
  };

  // Scale per pharmacy
  const handleUpdatePharmacyScale = (id: string, newScale: number) => {
    const updated = pharmacies.map((p) => (p.id === id ? { ...p, scale: newScale } : p));
    setPharmacies(updated);
    localStorage.setItem('dieu_phoi_pharmacies', JSON.stringify(updated));
  };

  // Dismiss alert
  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isManageOpen || isPasswordOpen) return;
      if (e.key === 'Escape') {
        if (focusPharmacyId) setFocusPharmacyId(null);
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
  }, [focusPharmacyId, isManageOpen, isPasswordOpen, pharmacies]);

  // Periodic Telemetry Ingestion (Fetch QMS queue data)
  useEffect(() => {
    let isMounted = true;

    const fetchTelemetry = async () => {
      let hasChanges = false;
      const updatedList = await Promise.all(
        pharmacies.map(async (p) => {
          if (!p.roomId) return p;
          try {
            const endpoint = `https://qms.tahospital.vn/api/v1/waitqueue?room=${p.roomId}&status=lcd`;
            const res = await fetch(endpoint, { cache: 'no-store' });
            if (res.ok) {
              const json = await res.json();
              if (json.data && Array.isArray(json.data.data)) {
                const items = json.data.data;
                const waiting = items.filter((i: { status: number }) => i.status === 1).length;
                const servingItems = items.filter((i: { status: number }) => i.status === 2);
                const activeCounters = [
                  ...new Set(
                    servingItems.map((i: { counter: number | string }) => String(i.counter)).filter(Boolean)
                  ),
                ] as string[];

                const newStats = {
                  waitingCount: waiting,
                  servingCount: servingItems.length,
                  activeCounters,
                  lastUpdated: Date.now(),
                };

                if (
                  p.stats?.waitingCount !== newStats.waitingCount ||
                  p.stats?.servingCount !== newStats.servingCount ||
                  p.stats?.activeCounters.length !== newStats.activeCounters.length
                ) {
                  hasChanges = true;
                }

                return { ...p, stats: newStats };
              }
            }
          } catch {
            // CORS fallback
          }
          return p;
        })
      );

      if (isMounted && hasChanges) {
        const { alerts: newAlerts, soundType } = evaluateDispatchRules(
          updatedList,
          rules,
          prevPharmaciesRef.current
        );

        setPharmacies(updatedList);
        setAlerts(newAlerts);

        if (rules.soundEnabled && soundType) {
          soundManager.play(soundType);
        }

        // Tự động chuyển tiếp cảnh báo khẩn đến Zalo cá nhân / nhóm
        for (const alert of newAlerts) {
          if (alert.severity === 'danger' || alert.severity === 'warning') {
            let msg = '';
            if (alert.type === 'overload' || alert.type === 'no_counter') {
              const ph = updatedList.find((p) => p.id === alert.pharmacyId);
              msg = formatZaloOverloadAlert({
                pharmacyName: alert.pharmacyName || ph?.name || 'Nhà thuốc',
                waitingCount: ph?.stats?.waitingCount || 0,
                activeCounters: ph?.stats?.activeCounters || [],
                ratio: (ph?.stats?.waitingCount || 0) / Math.max(1, ph?.stats?.activeCounters.length || 1),
                threshold: rules.maxWaitingPerCounter,
              });
            } else if (alert.type === 'imbalance') {
              const nt1 = updatedList.find((p) => p.code === 'NT1') || updatedList[0];
              const nt2 = updatedList.find((p) => p.code === 'NT2') || updatedList[1];
              const w1 = nt1?.stats?.waitingCount || 0;
              const w2 = nt2?.stats?.waitingCount || 0;
              msg = formatZaloImbalanceAlert({
                nt1Waiting: w1,
                nt2Waiting: w2,
                diff: Math.abs(w1 - w2),
                threshold: rules.maxImbalanceNT1NT2,
              });
            }

            if (msg) {
              dispatchZaloAlert({ alertKey: alert.id, message: msg });
            }
          }
        }

        prevPharmaciesRef.current = updatedList;
      }
    };


    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, (rules.telemetryInterval || 4) * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pharmacies, rules]);

  const focusedPharmacy = pharmacies.find((p) => p.id === focusPharmacyId);

  // Render grid
  const renderGridContent = () => {
    if (focusedPharmacy) {
      return (
        <div className="relative w-full h-full p-2">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-900/90 border border-sky-500/40 text-slate-100 px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-sky-400">
              <FontAwesomeIcon icon={faEye} />
              Đang xem chi tiết: {focusedPharmacy.name}
            </span>
            <button
              onClick={() => setFocusPharmacyId(null)}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full transition text-[11px]"
            >
              <FontAwesomeIcon icon={faXmark} /> Thoát (Esc)
            </button>
          </div>

          <PharmacyCard
            key={`${focusedPharmacy.id}-${globalRefreshCount}`}
            pharmacy={focusedPharmacy}
            isFocused={true}
            onToggleFocus={() => setFocusPharmacyId(null)}
            onUpdateScale={(s) => handleUpdatePharmacyScale(focusedPharmacy.id, s)}
            alerts={alerts.filter((a) => a.pharmacyId === focusedPharmacy.id)}
          />
        </div>
      );
    }

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
                alerts={alerts.filter((a) => a.pharmacyId === item.id)}
              />
            </div>
          ))}
        </div>
      );
    }

    if (layout === 'split-1-3') {
      const primary = pharmacies[0];
      const sideItems = pharmacies.slice(1, 4);
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full w-full gap-2 p-2">
          {primary && (
            <div className="lg:col-span-2 h-full w-full min-h-0">
              <PharmacyCard
                key={`${primary.id}-${globalRefreshCount}`}
                pharmacy={primary}
                isFocused={false}
                onToggleFocus={() => setFocusPharmacyId(primary.id)}
                onUpdateScale={(s) => handleUpdatePharmacyScale(primary.id, s)}
                alerts={alerts.filter((a) => a.pharmacyId === primary.id)}
              />
            </div>
          )}
          <div className="grid grid-rows-3 h-full w-full gap-2 min-h-0">
            {sideItems.map((item) => (
              <div key={`${item.id}-${globalRefreshCount}`} className="h-full w-full min-h-0">
                <PharmacyCard
                  pharmacy={item}
                  isFocused={false}
                  onToggleFocus={() => setFocusPharmacyId(item.id)}
                  onUpdateScale={(s) => handleUpdatePharmacyScale(item.id, s)}
                  alerts={alerts.filter((a) => a.pharmacyId === item.id)}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

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
                alerts={alerts.filter((a) => a.pharmacyId === item.id)}
              />
            </div>
          ))}
        </div>
      );
    }

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
                alerts={alerts.filter((a) => a.pharmacyId === item.id)}
              />
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Header Control Bar (Tinh giản, chuyên nghiệp) */}
      <Header
        onRefreshAll={() => setGlobalRefreshCount((prev) => prev + 1)}
        onOpenManage={() => setIsPasswordOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        pharmacyCount={pharmacies.length}
        activeAlertCount={alerts.length}
        soundEnabled={rules.soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* 2. Real-time Alert Banner */}
      <AlertBanner alerts={alerts} onDismiss={handleDismissAlert} />

      {/* 3. Main Viewport Container */}
      <main className="flex-1 w-full h-[calc(100vh-3rem)] overflow-hidden bg-slate-950">
        {renderGridContent()}
      </main>

      {/* 4. Password Protection Modal (Yêu cầu mật khẩu PhongCSKH@) */}
      <PasswordModal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
        onSuccess={() => {
          setIsPasswordOpen(false);
          setIsManageOpen(true);
        }}
      />

      {/* 5. Configuration & Rules Modal */}
      <ManageModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        pharmacies={pharmacies}
        onSavePharmacies={handleSavePharmacies}
        rules={rules}
        onSaveRules={handleSaveRules}
        layout={layout}
        onChangeLayout={handleChangeLayout}
        globalScale={globalScale}
        onChangeGlobalScale={handleChangeGlobalScale}
      />
    </div>
  );
};

export default App;
