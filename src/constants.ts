import { PharmacyScreen, AppSettings, DispatchRules } from './types';

export const DEFAULT_PHARMACIES: PharmacyScreen[] = [
  {
    id: 'nt-1',
    name: 'Nhà thuốc 1',
    code: 'NT1',
    url: 'https://qms.tahospital.vn/view/61c5c1802e9902406bb4b93d',
    roomId: '61c5c1802e9902406bb4b93d',
    scale: 0.50, // 50% hiển thị vừa khít 100% trọn vẹn màn hình QMS
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

export const DEFAULT_RULES: DispatchRules = {
  maxWaitingPerCounter: 3, // Cảnh báo khi vượt quá 3 khách/quầy
  maxImbalanceNT1NT2: 2,   // Cảnh báo khi Nhà thuốc 1 & 2 lệch từ 2 khách trở lên
  crowdedThreshold: 5,     // Ngưỡng đông khách
  soundEnabled: true,      // Bật âm thanh chuông báo
  telemetryInterval: 4,    // Chu kỳ cập nhật (giây)
  noCounterAlertDelaySeconds: 60, // Độ trễ cảnh báo khi có khách chờ nhưng chưa mở quầy (60 giây)
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
