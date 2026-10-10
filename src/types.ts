export interface PharmacyScreen {
  id: string;
  name: string;
  code: string;
  url: string;
  roomId?: string; // MongoDB ObjectId of QMS room
  scale: number; // e.g. 0.75, 0.85, 1.0
  autoRefreshInterval: number; // in seconds (0 = off)
  notes?: string;
  enabled: boolean;
  stats?: PharmacyStats;
  zaloTargetType?: 'group' | 'user'; // Kênh Zalo riêng (Nhóm hoặc cá nhân)
  zaloTargetId?: string; // ID nhóm Zalo riêng (vd: ID nhóm NT4)
  zaloTargetName?: string; // Tên nhóm riêng hiển thị
  captureZoom?: number; // Tỉ lệ thu nhỏ ảnh chụp QMS (vd: 0.85 = 85%, 0.80 = 80%)
}

export interface PharmacyStats {
  waitingCount: number;
  servingCount: number;
  activeCounters: string[]; // e.g. ['08', '09']
  lastUpdated: number;
}

export type LayoutMode = 'grid-4' | 'grid-6' | 'grid-2' | 'split-1-3' | 'focus-1';

export interface ZaloStyleItem {
  start: number;
  len: number;
  st: string; // e.g. 'b', 'i', 'u', 's', 'c_db342e', 'f_18', 'f_13'
}

export interface ZaloMentionItem {
  pos: number;
  uid: string;
  len: number;
  name?: string;
}

export interface ZaloGroupMember {
  uid: string;
  name: string;
  avatar?: string;
}

export interface AlertScenario {
  id: string;
  name: string;
  enabled: boolean;
  type: 'overload' | 'no_counter' | 'imbalance' | 'crowded' | 'reinforced' | 'low_traffic' | 'test_connection' | 'hospital_summary';
  severity: 'danger' | 'warning' | 'info';
  thresholds: {
    value: number; // Ngưỡng chính (vd: 3 khách/quầy, 2 khách lệch, 5 khách đông)
    delaySeconds?: number; // Độ trễ giây (vd: 60s cho chưa mở quầy)
    targetPharmacyIds?: string[]; // Rỗng = áp dụng toàn bộ
  };
  sound: {
    enabled: boolean;
    type: 'danger' | 'warning' | 'imbalance' | 'success';
  };
  zalo: {
    enabled: boolean;
    urgency: 0 | 1 | 2; // 0: Bình thường, 1: Quan trọng (!), 2: Khẩn cấp (chuông)
    cooldownMinutes: number;
    mentionMembers: ZaloGroupMember[];
    messageTemplate: string;
    styles?: ZaloStyleItem[];
    attachScreenshot?: boolean; // Tự động đính kèm ảnh chụp màn hình khi gửi tin
    screenshotMode?: 'single' | 'all'; // 'single': quầy gặp sự cố, 'all': toàn bộ các nhà thuốc
  };
}

export interface DispatchRules {
  maxWaitingPerCounter: number; // e.g. 3
  maxImbalanceNT1NT2: number; // e.g. 2
  crowdedThreshold: number; // e.g. 5
  soundEnabled: boolean;
  telemetryInterval: number; // in seconds (e.g. 4)
  noCounterAlertDelaySeconds?: number; // Độ trễ cảnh báo chưa mở quầy (giây)
  scenarios?: AlertScenario[]; // Hệ thống kịch bản điều phối hiện đại
}

export interface DispatchAlert {
  id: string;
  scenarioId?: string;
  type: 'overload' | 'crowded' | 'imbalance' | 'no_counter' | 'new_counter' | 'reinforced' | 'low_traffic' | 'test_connection' | 'hospital_summary';
  severity: 'danger' | 'warning' | 'info';
  pharmacyId?: string;
  pharmacyName?: string;
  message: string;
  recommendation?: string;
  timestamp: number;
  zaloPayload?: {
    message: string;
    urgency: 0 | 1 | 2;
    styles?: ZaloStyleItem[];
    mentions?: ZaloMentionItem[];
    cooldownMinutes?: number;
    attachScreenshot?: boolean;
    screenshotMode?: 'single' | 'all';
    imageBase64?: string;
  };
  metadata?: {
    addedCounters?: string[];
    initialCounterCount?: number;
    totalCounters?: number;
    waitingCount?: number;
  };
}

export interface AppSettings {
  defaultScale: number;
  carouselEnabled: boolean;
  carouselInterval: number; // in seconds
  showHeaders: boolean;
  autoHideControls: boolean;
}

export interface ZaloAlertConfig {
  enabled: boolean;
  targetType: 'user' | 'group';
  targetId: string;
  targetName: string;
  cooldownMinutes: number;
}

export interface ZaloContact {
  id: string;
  name: string;
  avatar?: string;
  type: 'user' | 'group';
}

export interface ZaloStatus {
  online: boolean;
  loggedIn: boolean;
  qrStatus: string;
  qrCode: string | null;
  user: {
    id?: string;
    name: string;
    avatar?: string;
  } | null;
  config: ZaloAlertConfig;
}
