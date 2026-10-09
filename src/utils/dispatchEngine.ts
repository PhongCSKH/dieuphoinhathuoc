import { PharmacyScreen, DispatchRules, DispatchAlert, AlertScenario } from '../types';
import { compileZaloMessage, TemplateVariables } from './zaloTextCompiler';

interface OverloadBaseline {
  initialCounterCount: number;
  initialCounters: string[];
  reportedReinforcedCounters: string[];
}

// Lưu mốc số quầy tại thời điểm bắt đầu phát cảnh báo quá tải cho từng nhà thuốc
const baselineMap = new Map<string, OverloadBaseline>();
// Lưu thời điểm xuất hiện khách chờ đầu tiên khi chưa có quầy mở (ms)
const noCounterStartMap = new Map<string, number>();
// Theo dõi nhà thuốc đã từng xảy ra quá tải
const hadOverloadHistorySet = new Set<string>();
// Theo dõi nhà thuốc đã báo vãn khách để tránh gửi lặp liên tục
const lowTrafficReportedSet = new Set<string>();

export function buildAllVariables(
  curr?: PharmacyScreen,
  pharmacies: PharmacyScreen[] = [],
  extra: Record<string, any> = {},
  maxWaitingPerCounter: number = 3
): TemplateVariables {
  const stats = curr?.stats || { waitingCount: 0, servingCount: 0, activeCounters: [], lastUpdated: Date.now() };
  const counterCount = stats.activeCounters.length;
  const taiTrong = counterCount > 0 ? (stats.waitingCount / counterCount).toFixed(1) : stats.waitingCount.toString();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const getPh = (code: string) => pharmacies.find((item) => item.code === code) || pharmacies.find((item) => item.id === code);
  const p1 = getPh('NT1') || pharmacies[0];
  const p2 = getPh('NT2') || pharmacies[1];
  const p3 = getPh('NT3') || pharmacies[2];
  const p4 = getPh('NT4') || pharmacies[3];

  const p1Wait = p1?.stats?.waitingCount || 0;
  const p1Cnt = p1?.stats?.activeCounters.length || 0;
  const p2Wait = p2?.stats?.waitingCount || 0;
  const p2Cnt = p2?.stats?.activeCounters.length || 0;
  const p3Wait = p3?.stats?.waitingCount || 0;
  const p3Cnt = p3?.stats?.activeCounters.length || 0;
  const p4Wait = p4?.stats?.waitingCount || 0;
  const p4Cnt = p4?.stats?.activeCounters.length || 0;

  const totalWait = pharmacies.reduce((sum, item) => sum + (item.stats?.waitingCount || 0), 0);
  const totalCounters = pharmacies.reduce((sum, item) => sum + (item.stats?.activeCounters.length || 0), 0);

  const summaryLines = [
    p1 ? `• ${p1.name}: ${p1Wait} khách / ${p1Cnt} quầy` : '',
    p2 ? `• ${p2.name}: ${p2Wait} khách / ${p2Cnt} quầy` : '',
    p3 ? `• ${p3.name}: ${p3Wait} khách / ${p3Cnt} quầy` : '',
    p4 ? `• ${p4.name}: ${p4Wait} khách / ${p4Cnt} quầy` : '',
  ].filter(Boolean).join('\n');

  return {
    ten_quay: curr?.name || 'Nhà thuốc',
    ma_quay: curr?.code || 'NT',
    so_khach: stats.waitingCount,
    dang_phuc_vu: stats.servingCount,
    so_quay: counterCount,
    danh_sach_quay_mo: stats.activeCounters.length > 0 ? stats.activeCounters.map((c) => `Quầy ${c}`).join(', ') : 'Chưa có',
    tai_trong: taiTrong,
    nguong_tai: maxWaitingPerCounter,
    gio_hien_tai: timeStr,
    nt1_khach: p1Wait,
    nt1_quay: p1Cnt,
    nt1_tai_trong: p1Cnt > 0 ? (p1Wait / p1Cnt).toFixed(1) : p1Wait.toString(),
    nt2_khach: p2Wait,
    nt2_quay: p2Cnt,
    nt2_tai_trong: p2Cnt > 0 ? (p2Wait / p2Cnt).toFixed(1) : p2Wait.toString(),
    nt3_khach: p3Wait,
    nt3_quay: p3Cnt,
    nt3_tai_trong: p3Cnt > 0 ? (p3Wait / p3Cnt).toFixed(1) : p3Wait.toString(),
    nt4_khach: p4Wait,
    nt4_quay: p4Cnt,
    nt4_tai_trong: p4Cnt > 0 ? (p4Wait / p4Cnt).toFixed(1) : p4Wait.toString(),
    tong_quan_cac_quay: summaryLines,
    tong_khach_cho: totalWait,
    tong_quay_mo: totalCounters,
    ...extra,
  };
}

export function evaluateDispatchRules(
  pharmacies: PharmacyScreen[],
  rules: DispatchRules,
  _prevPharmacies?: PharmacyScreen[]
): {
  alerts: DispatchAlert[];
  soundType?: 'danger' | 'warning' | 'success' | 'imbalance';
} {
  const alerts: DispatchAlert[] = [];
  let highestSound: 'danger' | 'warning' | 'success' | 'imbalance' | undefined = undefined;

  const scenarios = rules.scenarios || [];
  const getScenario = (type: string): AlertScenario | undefined =>
    scenarios.find((s) => s.type === type && s.enabled);

  const scNoCounter = getScenario('no_counter');
  const scOverload = getScenario('overload');
  const scImbalance = getScenario('imbalance');
  const scCrowded = getScenario('crowded');
  const scReinforced = getScenario('reinforced');
  const scLowTraffic = getScenario('low_traffic');

  // Ngưỡng tính toán
  const maxWaitingPerCounter = scOverload?.thresholds?.value ?? rules.maxWaitingPerCounter ?? 3;
  const noCounterDelay = scNoCounter?.thresholds?.delaySeconds ?? rules.noCounterAlertDelaySeconds ?? 60;
  const maxImbalance = scImbalance?.thresholds?.value ?? rules.maxImbalanceNT1NT2 ?? 2;
  const crowdedThreshold = scCrowded?.thresholds?.value ?? rules.crowdedThreshold ?? 5;

  const buildVariablesForPh = (curr?: PharmacyScreen, extra: Record<string, any> = {}) =>
    buildAllVariables(curr, pharmacies, extra, maxWaitingPerCounter);

  // 1. Kiểm tra từng nhà thuốc
  for (const p of pharmacies) {
    if (!p.enabled) continue;
    const stats = p.stats || { waitingCount: 0, servingCount: 0, activeCounters: [], lastUpdated: Date.now() };
    const waiting = stats.waitingCount;
    const counterCount = stats.activeCounters.length;

    // Tình huống: Có khách chờ nhưng chưa mở quầy nào
    if (waiting > 0 && counterCount === 0) {
      if (!noCounterStartMap.has(p.id)) {
        noCounterStartMap.set(p.id, Date.now());
      }

      const startTime = noCounterStartMap.get(p.id)!;
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

      // Kích hoạt khi quá thời gian quy định
      if (elapsedSeconds >= noCounterDelay) {
        let zaloPayload: DispatchAlert['zaloPayload'] = undefined;
        if (scNoCounter?.zalo?.enabled) {
          const compiled = compileZaloMessage(
            scNoCounter.zalo.messageTemplate,
            buildVariablesForPh(p, {
              thoi_gian: elapsedSeconds,
              quay_can_mo: 1,
            }),
            scNoCounter.zalo.mentionMembers,
            scNoCounter.zalo.styles
          );
          zaloPayload = {
            message: compiled.message,
            urgency: scNoCounter.zalo.urgency,
            styles: compiled.styles,
            mentions: compiled.mentions,
            cooldownMinutes: scNoCounter.zalo.cooldownMinutes,
          };
        }

        alerts.push({
          id: `no-counter-${p.id}`,
          scenarioId: scNoCounter?.id,
          type: 'no_counter',
          severity: scNoCounter?.severity || 'danger',
          pharmacyId: p.id,
          pharmacyName: p.name,
          message: `Chưa mở quầy phục vụ tại ${p.name}! (Khách chờ ${elapsedSeconds}s)`,
          recommendation: `Mở quầy gấp`,
          timestamp: Date.now(),
          zaloPayload,
          metadata: {
            waitingCount: waiting,
            totalCounters: 0,
          },
        });

        if (scNoCounter ? scNoCounter.sound.enabled : rules.soundEnabled) {
          highestSound = scNoCounter?.sound?.type || 'danger';
        }
      }
      continue;
    } else {
      if (noCounterStartMap.has(p.id)) {
        noCounterStartMap.delete(p.id);
      }
    }

    // Tình huống: Quá tải tỉ lệ khách chờ / quầy
    const isOverloaded = counterCount > 0 && waiting > counterCount * maxWaitingPerCounter;

    if (isOverloaded) {
      hadOverloadHistorySet.add(p.id);
      const neededCounters = Math.ceil(waiting / maxWaitingPerCounter) - counterCount;

      let zaloPayload: DispatchAlert['zaloPayload'] = undefined;
      if (scOverload?.zalo?.enabled) {
        const compiled = compileZaloMessage(
          scOverload.zalo.messageTemplate,
          buildVariablesForPh(p, {
            quay_can_mo: Math.max(1, neededCounters),
          }),
          scOverload.zalo.mentionMembers,
          scOverload.zalo.styles
        );
        zaloPayload = {
          message: compiled.message,
          urgency: scOverload.zalo.urgency,
          styles: compiled.styles,
          mentions: compiled.mentions,
          cooldownMinutes: scOverload.zalo.cooldownMinutes,
        };
      }

      if (!baselineMap.has(p.id)) {
        baselineMap.set(p.id, {
          initialCounterCount: counterCount,
          initialCounters: [...stats.activeCounters],
          reportedReinforcedCounters: [],
        });

        alerts.push({
          id: `overload-${p.id}`,
          scenarioId: scOverload?.id,
          type: 'overload',
          severity: scOverload?.severity || 'danger',
          pharmacyId: p.id,
          pharmacyName: p.name,
          message: `${p.name} vượt tải trọng (${waiting} khách / ${counterCount} quầy)`,
          recommendation: `Mở thêm tối thiểu ${Math.max(1, neededCounters)} quầy`,
          timestamp: Date.now(),
          zaloPayload,
          metadata: {
            waitingCount: waiting,
            totalCounters: counterCount,
            initialCounterCount: counterCount,
          },
        });

        if (scOverload ? scOverload.sound.enabled : rules.soundEnabled) {
          highestSound = scOverload?.sound?.type || 'danger';
        }
      } else {
        const base = baselineMap.get(p.id)!;
        const newReinforced = stats.activeCounters.filter(
          (c) => !base.initialCounters.includes(c) && !base.reportedReinforcedCounters.includes(c)
        );

        if (newReinforced.length > 0) {
          let reinforcedPayload: DispatchAlert['zaloPayload'] = undefined;
          if (scReinforced?.zalo?.enabled) {
            const compiled = compileZaloMessage(
              scReinforced.zalo.messageTemplate,
              buildVariablesForPh(p, {
                danh_sach_quay_moi: newReinforced.map((c) => `Quầy ${c}`).join(', '),
              }),
              scReinforced.zalo.mentionMembers,
              scReinforced.zalo.styles
            );
            reinforcedPayload = {
              message: compiled.message,
              urgency: scReinforced.zalo.urgency,
              styles: compiled.styles,
              mentions: compiled.mentions,
              cooldownMinutes: scReinforced.zalo.cooldownMinutes,
            };
          }

          alerts.push({
            id: `reinforced-${p.id}-${newReinforced.join('-')}`,
            scenarioId: scReinforced?.id,
            type: 'reinforced',
            severity: scReinforced?.severity || 'info',
            pharmacyId: p.id,
            pharmacyName: p.name,
            message: `${p.name} đã tăng cường thêm Quầy ${newReinforced.join(', ')}`,
            recommendation: `Đang có ${counterCount} quầy phục vụ`,
            timestamp: Date.now(),
            zaloPayload: reinforcedPayload,
            metadata: {
              addedCounters: newReinforced,
              initialCounterCount: base.initialCounterCount,
              totalCounters: counterCount,
              waitingCount: waiting,
            },
          });
          base.reportedReinforcedCounters.push(...newReinforced);
          highestSound = highestSound || scReinforced?.sound?.type || 'success';
        } else {
          alerts.push({
            id: `overload-${p.id}`,
            scenarioId: scOverload?.id,
            type: 'overload',
            severity: scOverload?.severity || 'danger',
            pharmacyId: p.id,
            pharmacyName: p.name,
            message: `${p.name} vượt tải trọng (${waiting} khách / ${counterCount} quầy)`,
            recommendation: `Mở thêm tối thiểu ${Math.max(1, neededCounters)} quầy`,
            timestamp: Date.now(),
            zaloPayload,
            metadata: {
              waitingCount: waiting,
              totalCounters: counterCount,
              initialCounterCount: base.initialCounterCount,
            },
          });
          if (scOverload ? scOverload.sound.enabled : rules.soundEnabled) {
            highestSound = scOverload?.sound?.type || 'danger';
          }
        }
      }
    } else {
      if (baselineMap.has(p.id)) {
        const base = baselineMap.get(p.id)!;
        const newReinforced = stats.activeCounters.filter(
          (c) => !base.initialCounters.includes(c) && !base.reportedReinforcedCounters.includes(c)
        );

        if (newReinforced.length > 0) {
          let reinforcedPayload: DispatchAlert['zaloPayload'] = undefined;
          if (scReinforced?.zalo?.enabled) {
            const compiled = compileZaloMessage(
              scReinforced.zalo.messageTemplate,
              buildVariablesForPh(p, {
                danh_sach_quay_moi: newReinforced.map((c) => `Quầy ${c}`).join(', '),
              }),
              scReinforced.zalo.mentionMembers,
              scReinforced.zalo.styles
            );
            reinforcedPayload = {
              message: compiled.message,
              urgency: scReinforced.zalo.urgency,
              styles: compiled.styles,
              mentions: compiled.mentions,
              cooldownMinutes: scReinforced.zalo.cooldownMinutes,
            };
          }

          alerts.push({
            id: `reinforced-${p.id}-${newReinforced.join('-')}`,
            scenarioId: scReinforced?.id,
            type: 'reinforced',
            severity: scReinforced?.severity || 'info',
            pharmacyId: p.id,
            pharmacyName: p.name,
            message: `${p.name} đã tăng cường thêm Quầy ${newReinforced.join(', ')}`,
            recommendation: `Đang có ${counterCount} quầy phục vụ`,
            timestamp: Date.now(),
            zaloPayload: reinforcedPayload,
            metadata: {
              addedCounters: newReinforced,
              initialCounterCount: base.initialCounterCount,
              totalCounters: counterCount,
              waitingCount: waiting,
            },
          });
          base.reportedReinforcedCounters.push(...newReinforced);
          highestSound = highestSound || scReinforced?.sound?.type || 'success';
        }
        baselineMap.delete(p.id);
      }

      // Đông nhẹ
      if (waiting >= crowdedThreshold) {
        alerts.push({
          id: `crowded-${p.id}`,
          scenarioId: scCrowded?.id,
          type: 'crowded',
          severity: scCrowded?.severity || 'warning',
          pharmacyId: p.id,
          pharmacyName: p.name,
          message: `${p.name} bắt đầu đông khách (${waiting} khách chờ)`,
          recommendation: `Chuẩn bị quầy dự phòng`,
          timestamp: Date.now(),
          metadata: {
            waitingCount: waiting,
            totalCounters: counterCount,
          },
        });
        if (highestSound !== 'danger') {
          highestSound = scCrowded?.sound?.enabled ? scCrowded.sound.type : 'warning';
        }
      } 
      // Vãn khách hoàn toàn
      else if (waiting <= 1 && counterCount >= 3 && hadOverloadHistorySet.has(p.id)) {
        if (!lowTrafficReportedSet.has(p.id)) {
          let lowTrafficPayload: DispatchAlert['zaloPayload'] = undefined;
          if (scLowTraffic?.zalo?.enabled) {
            const compiled = compileZaloMessage(
              scLowTraffic.zalo.messageTemplate,
              buildVariablesForPh(p),
              scLowTraffic.zalo.mentionMembers,
              scLowTraffic.zalo.styles
            );
            lowTrafficPayload = {
              message: compiled.message,
              urgency: scLowTraffic.zalo.urgency,
              styles: compiled.styles,
              mentions: compiled.mentions,
              cooldownMinutes: scLowTraffic.zalo.cooldownMinutes,
            };
          }

          alerts.push({
            id: `low-traffic-${p.id}`,
            scenarioId: scLowTraffic?.id,
            type: 'low_traffic',
            severity: scLowTraffic?.severity || 'info',
            pharmacyId: p.id,
            pharmacyName: p.name,
            message: `${p.name} đã vãn khách hoàn toàn`,
            recommendation: `Đã vãn khách hoàn toàn`,
            timestamp: Date.now(),
            zaloPayload: lowTrafficPayload,
            metadata: {
              waitingCount: waiting,
              totalCounters: counterCount,
            },
          });
          lowTrafficReportedSet.add(p.id);
          hadOverloadHistorySet.delete(p.id);
        }
      }

      if (waiting > 1 || counterCount < 3) {
        lowTrafficReportedSet.delete(p.id);
      }
      if (counterCount < 3) {
        hadOverloadHistorySet.delete(p.id);
      }
    }
  }

  // 2. Lệch tải NT1 vs NT2
  const nt1 = pharmacies.find((p) => p.code === 'NT1') || pharmacies[0];
  const nt2 = pharmacies.find((p) => p.code === 'NT2') || pharmacies[1];

  if (nt1 && nt2 && nt1.enabled && nt2.enabled) {
    const w1 = nt1.stats?.waitingCount || 0;
    const w2 = nt2.stats?.waitingCount || 0;
    const diff = Math.abs(w1 - w2);

    if (diff >= maxImbalance && (w1 > 0 || w2 > 0)) {
      const heavier = w1 > w2 ? nt1 : nt2;
      const lighter = w1 > w2 ? nt2 : nt1;
      const lighterCounters = lighter.stats?.activeCounters.length || 0;

      if (lighterCounters > 0) {
        let imbalancePayload: DispatchAlert['zaloPayload'] = undefined;
        if (scImbalance?.zalo?.enabled) {
          const compiled = compileZaloMessage(
            scImbalance.zalo.messageTemplate,
            buildVariablesForPh(heavier, {
              so_lech: diff,
              quay_dong: heavier.name,
              quay_vang: lighter.name,
              so_khach: Math.max(w1, w2),
            }),
            scImbalance.zalo.mentionMembers,
            scImbalance.zalo.styles
          );
          imbalancePayload = {
            message: compiled.message,
            urgency: scImbalance.zalo.urgency,
            styles: compiled.styles,
            mentions: compiled.mentions,
            cooldownMinutes: scImbalance.zalo.cooldownMinutes,
          };
        }

        alerts.push({
          id: 'imbalance-nt1-nt2',
          scenarioId: scImbalance?.id,
          type: 'imbalance',
          severity: scImbalance?.severity || 'warning',
          message: `Lệch tải giữa ${heavier.name} & ${lighter.name} (Chênh lệch ${diff} khách)`,
          recommendation: `Điều phối khách sang ${lighter.name}`,
          timestamp: Date.now(),
          zaloPayload: imbalancePayload,
          metadata: {
            waitingCount: diff,
          },
        });
        if (highestSound !== 'danger') {
          highestSound = scImbalance?.sound?.enabled ? scImbalance.sound.type : 'imbalance';
        }
      }
    }
  }

  return { alerts, soundType: highestSound };
}
