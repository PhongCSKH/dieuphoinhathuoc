import { PharmacyScreen, DispatchRules, DispatchAlert } from '../types';

export function evaluateDispatchRules(
  pharmacies: PharmacyScreen[],
  rules: DispatchRules,
  prevPharmacies: PharmacyScreen[]
): {
  alerts: DispatchAlert[];
  soundType?: 'danger' | 'warning' | 'success' | 'imbalance';
} {
  const alerts: DispatchAlert[] = [];
  let highestSound: 'danger' | 'warning' | 'success' | 'imbalance' | undefined = undefined;

  // 1. Kiểm tra từng nhà thuốc (Quá tải, Chưa mở quầy, Mở thêm quầy mới)
  for (const p of pharmacies) {
    if (!p.enabled) continue;
    const stats = p.stats || { waitingCount: 0, servingCount: 0, activeCounters: [], lastUpdated: Date.now() };
    const waiting = stats.waitingCount;
    const counterCount = stats.activeCounters.length;

    // Phát hiện quầy mới được mở
    const prevP = prevPharmacies.find((item) => item.id === p.id);
    const prevCounters = prevP?.stats?.activeCounters || [];
    const newCounters = stats.activeCounters.filter((c) => !prevCounters.includes(c));

    if (newCounters.length > 0 && prevCounters.length > 0) {
      alerts.push({
        id: `new-${p.id}-${Date.now()}`,
        type: 'new_counter',
        severity: 'info',
        pharmacyId: p.id,
        pharmacyName: p.name,
        message: `${p.name} vừa mở thêm Quầy ${newCounters.join(', ')}`,
        recommendation: `Hiện có ${counterCount} quầy đang hoạt động phục vụ bệnh nhân.`,
        timestamp: Date.now(),
      });
      highestSound = highestSound || 'success';
    }

    // Tình huống A: Có khách chờ nhưng chưa mở quầy nào
    if (waiting > 0 && counterCount === 0) {
      alerts.push({
        id: `no-counter-${p.id}`,
        type: 'no_counter',
        severity: 'danger',
        pharmacyId: p.id,
        pharmacyName: p.name,
        message: `Chưa mở quầy phục vụ tại ${p.name}!`,
        recommendation: `Đang có ${waiting} khách chờ nhưng chưa có quầy mở. Cần mở quầy khẩn cấp.`,
        timestamp: Date.now(),
      });
      highestSound = 'danger';
      continue;
    }

    // Tình huống B: Quá tải tỉ lệ khách chờ / quầy
    if (counterCount > 0 && waiting > counterCount * rules.maxWaitingPerCounter) {
      const neededCounters = Math.ceil(waiting / rules.maxWaitingPerCounter) - counterCount;
      alerts.push({
        id: `overload-${p.id}`,
        type: 'overload',
        severity: 'danger',
        pharmacyId: p.id,
        pharmacyName: p.name,
        message: `${p.name} vượt tải trọng (${waiting} khách / ${counterCount} quầy)`,
        recommendation: `Đề nghị mở thêm tối thiểu ${Math.max(1, neededCounters)} quầy để giảm thời gian chờ.`,
        timestamp: Date.now(),
      });
      highestSound = 'danger';
    } else if (waiting >= rules.crowdedThreshold) {
      // Tình huống C: Số khách chờ chạm ngưỡng đông
      alerts.push({
        id: `crowded-${p.id}`,
        type: 'overload',
        severity: 'warning',
        pharmacyId: p.id,
        pharmacyName: p.name,
        message: `${p.name} bắt đầu đông khách (${waiting} khách chờ)`,
        recommendation: `Chuẩn bị nhân sự dự phòng cho các quầy tiếp theo.`,
        timestamp: Date.now(),
      });
      if (highestSound !== 'danger') highestSound = 'warning';
    }
  }

  // 2. Kiểm tra lệch tải giữa Nhà thuốc 1 và Nhà thuốc 2
  const nt1 = pharmacies.find((p) => p.code === 'NT1') || pharmacies[0];
  const nt2 = pharmacies.find((p) => p.code === 'NT2') || pharmacies[1];

  if (nt1 && nt2 && nt1.enabled && nt2.enabled) {
    const w1 = nt1.stats?.waitingCount || 0;
    const w2 = nt2.stats?.waitingCount || 0;
    const diff = Math.abs(w1 - w2);

    if (diff >= rules.maxImbalanceNT1NT2 && (w1 > 0 || w2 > 0)) {
      const heavier = w1 > w2 ? nt1 : nt2;
      const lighter = w1 > w2 ? nt2 : nt1;

      alerts.push({
        id: 'imbalance-nt1-nt2',
        type: 'imbalance',
        severity: 'warning',
        message: `Lệch tải giữa NT1 & NT2 (Chênh lệch ${diff} khách)`,
        recommendation: `${heavier.name} đang đông hơn (${Math.max(w1, w2)} khách vs ${Math.min(w1, w2)} khách). CSKH đề nghị hướng dẫn khách sang ${lighter.name}.`,
        timestamp: Date.now(),
      });
      if (highestSound !== 'danger') highestSound = 'imbalance';
    }
  }

  return { alerts, soundType: highestSound };
}
