export interface PharmacyScreen {
  id: string;
  name: string;
  code: string;
  url: string;
  scale: number; // e.g. 0.75, 0.85, 1.0
  autoRefreshInterval: number; // in seconds (0 = off)
  notes?: string;
  enabled: boolean;
}

export type LayoutMode = 'grid-4' | 'grid-6' | 'grid-2' | 'split-1-3' | 'focus-1';

export interface AppSettings {
  defaultScale: number;
  carouselEnabled: boolean;
  carouselInterval: number; // in seconds
  showHeaders: boolean;
  autoHideControls: boolean;
}
