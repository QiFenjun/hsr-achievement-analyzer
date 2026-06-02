export interface AchievementItem {
  id: string;
  game?: GameKey;
  name: string;
  englishName?: string;
  achievementType: string;
  version: string;
  collection: string;
  englishCollection?: string;
  category: string;
  subCategory?: string;
  completed: boolean;
  apiId?: string;
  note?: string;
  source?: string;
  description?: string;
  englishDescription?: string;
  guide?: string;
  reward?: string;
  stellarJade?: number | string;
  image?: string;
  completedAt?: string;
  updatedAt?: string;
}

export type GameKey = 'starRail' | 'genshin';

export interface GameDefinition {
  key: GameKey;
  label: string;
  shortLabel: string;
  title: string;
  subtitle: string;
  rewardLabel: string;
  defaultVersion: string;
  defaultCollection: string;
  defaultAchievementType: string;
  resetLabel: string;
  records: AchievementItem[];
}

export type ImportableFieldKey =
  | 'id'
  | 'name'
  | 'englishName'
  | 'achievementType'
  | 'version'
  | 'collection'
  | 'englishCollection'
  | 'completed'
  | 'apiId'
  | 'note'
  | 'source'
  | 'description'
  | 'englishDescription'
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
