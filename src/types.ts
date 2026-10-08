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
}

export interface PharmacyStats {
  waitingCount: number;
  servingCount: number;
  activeCounters: string[]; // e.g. ['08', '09']
  lastUpdated: number;
}

export type LayoutMode = 'grid-4' | 'grid-6' | 'grid-2' | 'split-1-3' | 'focus-1';

export interface DispatchRules {
  maxWaitingPerCounter: number; // e.g. 3 (khi > 3 khách/quầy thì cảnh báo)
  maxImbalanceNT1NT2: number; // e.g. 2 (khi lệch > 2 khách thì cảnh báo)
  crowdedThreshold: number; // e.g. 5 (ngưỡng đông)
  soundEnabled: boolean; // Bật/tắt âm thanh cảnh báo
  telemetryInterval: number; // in seconds (e.g. 4)
}

export interface DispatchAlert {
  id: string;
  type: 'overload' | 'imbalance' | 'no_counter' | 'new_counter';
  severity: 'danger' | 'warning' | 'info';
  pharmacyId?: string;
  pharmacyName?: string;
  message: string;
  recommendation?: string;
  timestamp: number;
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

