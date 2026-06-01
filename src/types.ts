export interface AchievementItem {
  id: string;
  name: string;
  achievementType: string;
  version: string;
  collection: string;
  category: string;
  subCategory?: string;
  completed: boolean;
  note?: string;
  source?: string;
  description?: string;
  guide?: string;
  reward?: string;
  stellarJade?: number | string;
  image?: string;
  completedAt?: string;
  updatedAt?: string;
}

export type ImportableFieldKey =
  | 'id'
  | 'name'
  | 'achievementType'
  | 'version'
  | 'collection'
  | 'completed'
  | 'note'
  | 'source'
  | 'description'
  | 'guide'
  | 'reward'
  | 'stellarJade'
  | 'image'
  | 'completedAt'
  | 'updatedAt';

export type GroupDimension = 'achievementType' | 'version' | 'collection' | 'source';

export type ImportMode = 'replace' | 'append' | 'merge';

export type ThemeMode = 'system' | 'dark' | 'light';

export type SourceSyncStatus = 'unsupported' | 'idle' | 'pending' | 'syncing' | 'saved' | 'error';

export interface SourceSyncUiState {
  supported: boolean;
  bound: boolean;
  fileName: string;
  autoSync: boolean;
  status: SourceSyncStatus;
  message: string;
  lastSyncedAt?: string;
}

export interface ImportDraft {
  fileName: string;
  headers: string[];
  notice?: string;
  rows: Record<string, unknown>[];
  mappings: FieldMapping;
}

export type FieldMapping = Partial<Record<ImportableFieldKey, string>>;

export interface FocusedGroup {
  dimension: GroupDimension;
  value: string;
}

export interface GroupStat {
  dimension: GroupDimension;
  label: string;
  value: string;
  total: number;
  completed: number;
  incomplete: number;
  rate: number;
}

export interface SummaryStats {
  total: number;
  completed: number;
  incomplete: number;
  rate: number;
}
