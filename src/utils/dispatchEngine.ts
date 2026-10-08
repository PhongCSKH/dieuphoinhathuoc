import { PharmacyScreen, DispatchRules, DispatchAlert } from '../types';

interface OverloadBaseline {
  initialCounterCount: number;
  initialCounters: string[];
  reportedReinforcedCounters: string[];
}

// Lưu mốc số quầy tại thời điểm bắt đầu phát cảnh báo quá tải cho từng nhà thuốc
const baselineMap = new Map<string, OverloadBaseline>();

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

  // 1. Kiểm tra từng nhà thuốc (Quá tải, Quầy tăng cường, Chưa mở quầy, Vãn khách)
  for (const p of pharmacies) {
    if (!p.enabled) continue;
    const stats = p.stats || { waitingCount: 0, servingCount: 0, activeCounters: [], lastUpdated: Date.now() };
    const waiting = stats.waitingCount;
    const counterCount = stats.activeCounters.length;

    // Tình huống 5: Có khách chờ nhưng chưa mở quầy nào
    if (waiting > 0 && counterCount === 0) {
      alerts.push({
        id: `no-counter-${p.id}`,
        type: 'no_counter',
        severity: 'danger',
        pharmacyId: p.id,
        pharmacyName: p.name,
        message: `Chưa mở quầy phục vụ tại ${p.name}!`,
        recommendation: `Mở quầy gấp`,
        timestamp: Date.now(),
        metadata: {
          waitingCount: waiting,
          totalCounters: 0,
        },
      });
      highestSound = 'danger';
      continue;
    }

    // Tình huống 1 & 2: Quá tải tỉ lệ khách chờ / quầy & Theo dõi quầy tăng cường
    const isOverloaded = counterCount > 0 && waiting > counterCount * rules.maxWaitingPerCounter;

    if (isOverloaded) {
      const neededCounters = Math.ceil(waiting / rules.maxWaitingPerCounter) - counterCount;

      // Lưu mốc ban đầu nếu là lần đầu quá tải
      if (!baselineMap.has(p.id)) {
        baselineMap.set(p.id, {
          initialCounterCount: counterCount,
          initialCounters: [...stats.activeCounters],
          reportedReinforcedCounters: [],
        });

        // Bắn cảnh báo ban đầu
        alerts.push({
          id: `overload-${p.id}`,
          type: 'overload',
          severity: 'danger',
          pharmacyId: p.id,
          pharmacyName: p.name,
          message: `${p.name} vượt tải trọng (${waiting} khách / ${counterCount} quầy)`,
          recommendation: `Mở thêm tối thiểu ${Math.max(1, neededCounters)} quầy`,
          timestamp: Date.now(),
          metadata: {
            waitingCount: waiting,
            totalCounters: counterCount,
            initialCounterCount: counterCount,
          },
        });
        highestSound = 'danger';
      } else {
        // Đã có mốc ban đầu -> Kiểm tra xem có quầy mới được tăng cường hay không
        const base = baselineMap.get(p.id)!;
        const newReinforced = stats.activeCounters.filter(
          (c) => !base.initialCounters.includes(c) && !base.reportedReinforcedCounters.includes(c)
        );

        if (newReinforced.length > 0) {
          alerts.push({
            id: `reinforced-${p.id}-${newReinforced.join('-')}`,
            type: 'reinforced',
            severity: 'info',
            pharmacyId: p.id,
            pharmacyName: p.name,
            message: `${p.name} đã tăng cường thêm Quầy ${newReinforced.join(', ')}`,
            recommendation: `Đang có ${counterCount} quầy phục vụ (ban đầu ${base.initialCounterCount} quầy)`,
            timestamp: Date.now(),
            metadata: {
              addedCounters: newReinforced,
              initialCounterCount: base.initialCounterCount,
              totalCounters: counterCount,
              waitingCount: waiting,
            },
          });
          base.reportedReinforcedCounters.push(...newReinforced);
          highestSound = highestSound || 'success';
        } else {
          // Vẫn trong tình trạng quá tải
          alerts.push({
            id: `overload-${p.id}`,
            type: 'overload',
            severity: 'danger',
            pharmacyId: p.id,
            pharmacyName: p.name,
            message: `${p.name} vượt tải trọng (${waiting} khách / ${counterCount} quầy)`,
            recommendation: `Mở thêm tối thiểu ${Math.max(1, neededCounters)} quầy`,
            timestamp: Date.now(),
            metadata: {
              waitingCount: waiting,
              totalCounters: counterCount,
              initialCounterCount: base.initialCounterCount,
            },
          });
          highestSound = 'danger';
        }
      }
    } else {
      // Khi đã giảm tải an toàn -> Xóa mốc baseline
      if (baselineMap.has(p.id)) {
        baselineMap.delete(p.id);
      }

      // Tình huống Đông nhẹ (Chạm ngưỡng đông)
      if (waiting >= rules.crowdedThreshold) {
        alerts.push({
          id: `crowded-${p.id}`,
          type: 'overload',
          severity: 'warning',
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
        if (highestSound !== 'danger') highestSound = 'warning';
      } 
      // Tình huống 6: Vãn khách hoàn toàn (nếu đang mở ≥ 3 quầy mà khách ≤ 1)
      else if (waiting <= 1 && counterCount >= 3) {
        alerts.push({
          id: `low-traffic-${p.id}`,
          type: 'low_traffic',
          severity: 'info',
          pharmacyId: p.id,
          pharmacyName: p.name,
          message: `${p.name} đã vãn khách hoàn toàn`,
          recommendation: `Đã vãn khách hoàn toàn`,
          timestamp: Date.now(),
          metadata: {
            waitingCount: waiting,
            totalCounters: counterCount,
          },
        });
      }
    }
  }

  // 2. Tình huống 4: Kiểm tra lệch tải giữa Nhà thuốc 1 và Nhà thuốc 2
  const nt1 = pharmacies.find((p) => p.code === 'NT1') || pharmacies[0];
  const nt2 = pharmacies.find((p) => p.code === 'NT2') || pharmacies[1];

  if (nt1 && nt2 && nt1.enabled && nt2.enabled) {
    const w1 = nt1.stats?.waitingCount || 0;
    const w2 = nt2.stats?.waitingCount || 0;
    const diff = Math.abs(w1 - w2);

    if (diff >= rules.maxImbalanceNT1NT2 && (w1 > 0 || w2 > 0)) {
      const lighter = w1 > w2 ? nt2 : nt1;

      alerts.push({
        id: 'imbalance-nt1-nt2',
        type: 'imbalance',
        severity: 'warning',
        message: `Lệch tải giữa NT1 & NT2 (Chênh lệch ${diff} khách)`,
        recommendation: `Điều phối khách sang ${lighter.name}`,
        timestamp: Date.now(),
        metadata: {
          waitingCount: diff,
        },
      });
      if (highestSound !== 'danger') highestSound = 'imbalance';
    }
  }

  return { alerts, soundType: highestSound };
}
