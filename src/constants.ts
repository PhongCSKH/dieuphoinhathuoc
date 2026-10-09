import { PharmacyScreen, AppSettings, DispatchRules, AlertScenario } from './types';

export const DEFAULT_PHARMACIES: PharmacyScreen[] = [
  {
    id: 'nt-1',
    name: 'Nhà thuốc 1',
    code: 'NT1',
    url: 'https://qms.tahospital.vn/view/61c5c1802e9902406bb4b93d',
    roomId: '61c5c1802e9902406bb4b93d',
    scale: 0.50,
    autoRefreshInterval: 0,
    notes: 'Khu vực quầy phát thuốc 1',
    enabled: true,
    stats: {
      waitingCount: 0,
      servingCount: 0,
      activeCounters: [],
      lastUpdated: Date.now(),
    },
  },
  {
    id: 'nt-2',
    name: 'Nhà thuốc 2',
    code: 'NT2',
    url: 'https://qms.tahospital.vn/view/62b9400190350c1d96ac9515',
    roomId: '62b9400190350c1d96ac9515',
    scale: 0.50,
    autoRefreshInterval: 0,
    notes: 'Khu vực quầy phát thuốc 2',
    enabled: true,
    stats: {
      waitingCount: 0,
      servingCount: 0,
      activeCounters: [],
      lastUpdated: Date.now(),
    },
  },
  {
    id: 'nt-3',
    name: 'Nhà thuốc 3',
    code: 'NT3',
    url: 'https://qms.tahospital.vn/view/637310582555bd22685d0724',
    roomId: '637310582555bd22685d0724',
    scale: 0.50,
    autoRefreshInterval: 0,
    notes: 'Khu vực quầy phát thuốc 3',
    enabled: true,
    stats: {
      waitingCount: 0,
      servingCount: 0,
      activeCounters: [],
      lastUpdated: Date.now(),
    },
  },
  {
    id: 'nt-4',
    name: 'Nhà thuốc 4',
    code: 'NT4',
    url: 'https://qms.tahospital.vn/view/65f3b899c01f53001c34e9a6',
    roomId: '65f3b899c01f53001c34e9a6',
    scale: 0.50,
    autoRefreshInterval: 0,
    notes: 'Khu vực quầy phát thuốc 4',
    enabled: true,
    stats: {
      waitingCount: 0,
      servingCount: 0,
      activeCounters: [],
      lastUpdated: Date.now(),
    },
  },
];

export const DEFAULT_SCENARIOS: AlertScenario[] = [
  {
    id: 'scenario-no-counter',
    name: 'Chưa mở quầy khi có khách chờ',
    enabled: true,
    type: 'no_counter',
    severity: 'danger',
    thresholds: {
      value: 0,
      delaySeconds: 60,
    },
    sound: {
      enabled: true,
      type: 'danger',
    },
    zalo: {
      enabled: true,
      urgency: 2, // 🔔 Khẩn cấp
      cooldownMinutes: 2,
      mentionMembers: [],
      messageTemplate: '🚨 [ĐIỀU PHỐI KHẨN CẤP] Chưa mở quầy tại {ten_quay}!\n⚠️ Khách đã bấm số chờ phục vụ > {thoi_gian}s nhưng chưa có quầy gọi.\n👉 Đề nghị kiểm tra và mở quầy gọi phục vụ ngay!',
      styles: [
        { start: 0, len: 48, st: 'c_db342e' }, // Đỏ
        { start: 0, len: 48, st: 'b' },        // In đậm
        { start: 0, len: 48, st: 'f_18' },     // Cỡ lớn
      ],
    },
  },
  {
    id: 'scenario-overload',
    name: 'Quá tải quầy phục vụ (Khách / Quầy)',
    enabled: true,
    type: 'overload',
    severity: 'danger',
    thresholds: {
      value: 3, // > 3 khách / quầy
    },
    sound: {
      enabled: true,
      type: 'danger',
    },
    zalo: {
      enabled: true,
      urgency: 2, // 🔔 Khẩn cấp
      cooldownMinutes: 3,
      mentionMembers: [],
      messageTemplate: '🚨 [CẢNH BÁO QUÁ TẢI] {ten_quay} vượt tải trọng phục vụ!\n📊 Tình trạng: {so_khach} khách chờ / {so_quay} quầy mở.\n👉 Đề nghị tăng cường mở thêm tối thiểu {quay_can_mo} quầy!',
      styles: [
        { start: 0, len: 48, st: 'c_db342e' },
        { start: 0, len: 48, st: 'b' },
        { start: 0, len: 48, st: 'f_18' },
      ],
    },
  },
  {
    id: 'scenario-imbalance',
    name: 'Lệch tải giữa Nhà thuốc 1 & Nhà thuốc 2',
    enabled: true,
    type: 'imbalance',
    severity: 'warning',
    thresholds: {
      value: 2, // Lệch >= 2 khách
    },
    sound: {
      enabled: true,
      type: 'imbalance',
    },
    zalo: {
      enabled: true,
      urgency: 1, // ! Quan trọng
      cooldownMinutes: 3,
      mentionMembers: [],
      messageTemplate: '⚠️ [ĐIỀU TIẾT DÒNG KHÁCH] Lệch tải giữa NT1 và NT2 ({so_lech} khách)!\n👉 Hướng dẫn khách hàng di chuyển sang quầy còn trống để cân bằng dòng khách.',
      styles: [
        { start: 0, len: 40, st: 'c_f27806' }, // Cam
        { start: 0, len: 40, st: 'b' },
      ],
    },
  },
  {
    id: 'scenario-crowded',
    name: 'Ngưỡng cao điểm đông khách',
    enabled: true,
    type: 'crowded',
    severity: 'warning',
    thresholds: {
      value: 5, // >= 5 khách chờ
    },
    sound: {
      enabled: false,
      type: 'warning',
    },
    zalo: {
      enabled: false,
      urgency: 1,
      cooldownMinutes: 5,
      mentionMembers: [],
      messageTemplate: '👥 [CAO ĐIỂM] {ten_quay} đang có {so_khach} khách chờ phục vụ.',
      styles: [
        { start: 0, len: 35, st: 'c_f7b503' }, // Vàng
      ],
    },
  },
  {
    id: 'scenario-reinforced',
    name: 'Ghi nhận quầy tăng cường phục vụ',
    enabled: true,
    type: 'reinforced',
    severity: 'info',
    thresholds: {
      value: 1,
    },
    sound: {
      enabled: true,
      type: 'success',
    },
    zalo: {
      enabled: true,
      urgency: 0, // Bình thường
      cooldownMinutes: 1,
      mentionMembers: [],
      messageTemplate: '✅ [GHI NHẬN TĂNG CƯỜNG] {ten_quay} đã mở thêm Quầy {danh_sach_quay_moi}!\n👏 Hiện đang có {so_quay} quầy phục vụ đồng thời.',
      styles: [
        { start: 0, len: 45, st: 'c_15a85f' }, // Xanh lá
        { start: 0, len: 45, st: 'b' },
      ],
    },
  },
  {
    id: 'scenario-low-traffic',
    name: 'Hạ tải an toàn & Vãn khách',
    enabled: true,
    type: 'low_traffic',
    severity: 'info',
    thresholds: {
      value: 0,
    },
    sound: {
      enabled: true,
      type: 'success',
    },
    zalo: {
      enabled: true,
      urgency: 0, // Bình thường
      cooldownMinutes: 2,
      mentionMembers: [],
      messageTemplate: '🟢 [HẠ TẢI AN TOÀN] {ten_quay} đã giải tỏa xong đợt cao điểm ({so_khach} khách chờ / {so_quay} quầy).',
      styles: [
        { start: 0, len: 45, st: 'c_15a85f' },
        { start: 0, len: 45, st: 'b' },
      ],
    },
  },
];

export const DEFAULT_RULES: DispatchRules = {
  maxWaitingPerCounter: 3,
  maxImbalanceNT1NT2: 2,
  crowdedThreshold: 5,
  soundEnabled: true,
  telemetryInterval: 4,
  noCounterAlertDelaySeconds: 60,
  scenarios: DEFAULT_SCENARIOS,
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultScale: 0.50,
  carouselEnabled: false,
  carouselInterval: 30,
  showHeaders: true,
  autoHideControls: false,
};

export const SCALE_OPTIONS = [
  { label: '35% (Rất nhỏ)', value: 0.35 },
  { label: '40% (Nhỏ gọn)', value: 0.40 },
  { label: '45% (Gọn gàng)', value: 0.45 },
  { label: '50% (Vừa khít Lưới 4 ⭐)', value: 0.50 },
  { label: '55% (Cân đối)', value: 0.55 },
  { label: '60% (Lớn vừa)', value: 0.60 },
  { label: '65%', value: 0.65 },
  { label: '75%', value: 0.75 },
  { label: '85%', value: 0.85 },
  { label: '100% (Gốc)', value: 1.0 },
];
