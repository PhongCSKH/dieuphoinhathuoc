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
import { evaluateDispatchRules, buildAllVariables } from './utils/dispatchEngine';
import { compileZaloMessage } from './utils/zaloTextCompiler';
import { soundManager } from './utils/audio';
import { 
  dispatchZaloAlert, 
} from './utils/zalo';
import { generateDispatchSnapshot } from './utils/snapshotGenerator';

export const App: React.FC = () => {
  // Set custom favicon
  useEffect(() => {
    const setFaviconUrl = (url: string) => {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.type = 'image/png';
      link.href = url;
    };
    setFaviconUrl('https://iili.io/F66acRs.png');
  }, []);

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
  // Track pharmacies with active overload to notify when resolved
  const prevOverloadedPhsRef = useRef<Set<string>>(new Set());

  // 2. Rules state
  const [rules, setRules] = useState<DispatchRules>(() => {
    try {
      const saved = localStorage.getItem('dieu_phoi_rules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.scenarios || !Array.isArray(parsed.scenarios) || parsed.scenarios.length === 0) {
          parsed.scenarios = DEFAULT_RULES.scenarios;
        }
        return parsed;
      }
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
                  p.stats?.activeCounters.length !== newStats.activeCounters.length ||
                  p.stats?.activeCounters.join(',') !== newStats.activeCounters.join(',')
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

      const isAnyNoCounterPending = updatedList.some(
        (p) => p.enabled && (p.stats?.waitingCount || 0) > 0 && (p.stats?.activeCounters.length || 0) === 0
      );

      if (isMounted && (hasChanges || isAnyNoCounterPending)) {
        const { alerts: newAlerts, soundType } = evaluateDispatchRules(
          updatedList,
          rules,
          prevPharmaciesRef.current
        );

        if (hasChanges) {
          setPharmacies(updatedList);
        }
        setAlerts(newAlerts);

        if (rules.soundEnabled && soundType) {
          soundManager.play(soundType);
        }

        // Tự động chuyển tiếp cảnh báo đến Zalo cá nhân / nhóm theo đúng Kịch Bản của Admin
        for (const alert of newAlerts) {
          if (alert.pharmacyId && (alert.type === 'overload' || alert.type === 'no_counter')) {
            prevOverloadedPhsRef.current.add(alert.pharmacyId);
          }

          // Chỉ gửi tin nhắn khi kịch bản được kích hoạt và BẬT gửi Zalo
          if (alert.zaloPayload) {
            let imageBase64: string | undefined = undefined;

            // Nếu kịch bản yêu cầu đính kèm ảnh chụp màn hình
            if (alert.zaloPayload.attachScreenshot) {
              const snapshot = await generateDispatchSnapshot({
                pharmacies: updatedList,
                targetPharmacyId: alert.pharmacyId,
                mode: alert.zaloPayload.screenshotMode || 'all',
                alertTitle: alert.message,
              });
              if (snapshot) {
                imageBase64 = snapshot;
              }
            }

            // 1. Luôn luôn gửi vào Nhóm Chung điều phối (Kênh tổng)
            const alertPharmacy = alert.pharmacyId ? updatedList.find((p) => p.id === alert.pharmacyId) : undefined;
            dispatchZaloAlert({
              alertKey: alert.id,
              message: alert.zaloPayload.message,
              styles: alert.zaloPayload.styles,
              urgency: alert.zaloPayload.urgency,
              mentions: alert.zaloPayload.mentions,
              forceSend: alert.type === 'reinforced' || alert.type === 'low_traffic',
              targetUrl: alert.zaloPayload.screenshotMode === 'single' && alertPharmacy?.url ? alertPharmacy.url : undefined,
              targetZoom: alertPharmacy?.captureZoom || 0.85,
              imageBase64,
            });

            // 2. Gửi KÉP vào Nhóm Riêng của quầy (nếu quầy này có cài đặt nhóm Zalo riêng)
            const targetPharmacy = alertPharmacy;
            if (targetPharmacy && targetPharmacy.zaloTargetId) {
              // Đối với nhóm riêng, tạo snapshot tập trung cận cảnh quầy đó nếu có ảnh
              let privateSnapshot: string | undefined = imageBase64;
              if (alert.zaloPayload.attachScreenshot && alert.zaloPayload.screenshotMode !== 'single') {
                const singleSnap = await generateDispatchSnapshot({
                  pharmacies: updatedList,
                  targetPharmacyId: targetPharmacy.id,
                  mode: 'single',
                  alertTitle: alert.message,
                });
                if (singleSnap) privateSnapshot = singleSnap;
              }

              // Xử lý @All và @Đích danh người được chọn cho nhóm riêng
              let privateMsg = alert.zaloPayload.message;
              let privateStyles = alert.zaloPayload.styles ? [...alert.zaloPayload.styles] : [];
              let privateMentions = alert.zaloPayload.mentions ? [...alert.zaloPayload.mentions] : [];

              let privatePrefix = '';
              const newPrivateMentions: Array<{ pos: number; uid: string; len: number; name?: string }> = [];

              if (targetPharmacy.zaloTargetType === 'group') {
                if (targetPharmacy.mentionAll) {
                  const allTag = '@All ';
                  newPrivateMentions.push({
                    pos: privatePrefix.length,
                    uid: '-1',
                    len: '@All'.length,
                    name: 'All',
                  });
                  privatePrefix += allTag;
                }
                if (Array.isArray(targetPharmacy.mentionMembers) && targetPharmacy.mentionMembers.length > 0) {
                  targetPharmacy.mentionMembers.forEach((m) => {
                    const tag = `@${m.name} `;
                    newPrivateMentions.push({
                      pos: privatePrefix.length,
                      uid: m.uid,
                      len: `@${m.name}`.length,
                      name: m.name,
                    });
                    privatePrefix += tag;
                  });
                }
              }

              if (privatePrefix) {
                privateMsg = privatePrefix + privateMsg;
                privateStyles = privateStyles.map((s) => ({ ...s, start: s.start + privatePrefix.length }));
                privateMentions = privateMentions.map((m) => ({ ...m, pos: m.pos + privatePrefix.length }));
                privateMentions = [...newPrivateMentions, ...privateMentions];
              }

              dispatchZaloAlert({
                alertKey: `${alert.id}-private-${targetPharmacy.id}`,
                message: privateMsg,
                styles: privateStyles,
                urgency: alert.zaloPayload.urgency,
                mentions: privateMentions,
                forceSend: alert.type === 'reinforced' || alert.type === 'low_traffic',
                targetUrl: targetPharmacy.url,
                targetZoom: targetPharmacy.captureZoom || 0.85,
                imageBase64: privateSnapshot,
                targetType: targetPharmacy.zaloTargetType || 'group',
                targetId: targetPharmacy.zaloTargetId,
                targetName: targetPharmacy.zaloTargetName || `Nhóm riêng: ${targetPharmacy.name}`,
              });
            }
          }
        }

        // Tự động thông báo khi nhà thuốc đã hạ tải và ổn định an toàn trở lại
        for (const pharmacyId of Array.from(prevOverloadedPhsRef.current)) {
          const isStillOverloaded = newAlerts.some(
            (a) => a.pharmacyId === pharmacyId && (a.type === 'overload' || a.type === 'no_counter')
          );
          if (!isStillOverloaded) {
            const ph = updatedList.find((p) => p.id === pharmacyId);
            // Chỉ gửi thông báo hạ tải khi nhà thuốc đang có quầy phục vụ
            if (ph && (ph.stats?.activeCounters.length || 0) > 0) {
              const scLowTraffic = rules.scenarios?.find((s) => s.type === 'low_traffic');
              if (scLowTraffic && scLowTraffic.enabled && scLowTraffic.zalo?.enabled) {
                const compiled = compileZaloMessage(
                  scLowTraffic.zalo.messageTemplate,
                  buildAllVariables(ph, updatedList, {
                    so_khach: ph.stats?.waitingCount || 0,
                    so_quay: ph.stats?.activeCounters.length || 0,
                  }),
                  scLowTraffic.zalo.mentionMembers,
                  scLowTraffic.zalo.styles
                );

                // 1. Gửi thông báo hạ tải vào Nhóm Chung
                dispatchZaloAlert({
                  alertKey: `resolved-${pharmacyId}`,
                  message: compiled.message,
                  styles: compiled.styles,
                  urgency: scLowTraffic.zalo.urgency,
                  mentions: compiled.mentions,
                  isResolved: true,
                  forceSend: true,
                });

                // 2. Gửi thêm vào Nhóm Riêng của nhà thuốc (nếu có cài đặt)
                if (ph.zaloTargetId) {
                  dispatchZaloAlert({
                    alertKey: `resolved-${pharmacyId}-private`,
                    message: compiled.message,
                    styles: compiled.styles,
                    urgency: scLowTraffic.zalo.urgency,
                    mentions: compiled.mentions,
                    isResolved: true,
                    forceSend: true,
                    targetType: ph.zaloTargetType || 'group',
                    targetId: ph.zaloTargetId,
                    targetName: ph.zaloTargetName || `Nhóm riêng: ${ph.name}`,
                  });
                }
              }
            }
            prevOverloadedPhsRef.current.delete(pharmacyId);
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
