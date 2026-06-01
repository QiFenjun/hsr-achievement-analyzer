import { sampleData } from '../data/sampleData';
import type { AchievementItem } from '../types';

const STORAGE_KEY = 'game-completion-analyzer.records.v2';

export function loadRecords(): AchievementItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return sampleData;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return sampleData;
    }

    return parsed
      .filter((item): item is AchievementItem => Boolean(item && typeof item === 'object'))
      .map(normalizeStoredRecord);
  } catch {
    return sampleData;
  }
}

export function saveRecords(records: AchievementItem[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function resetRecords(): AchievementItem[] {
  saveRecords(sampleData);
  return sampleData;
}

function normalizeStoredRecord(item: Partial<AchievementItem>): AchievementItem {
  const collection = cleanString(item.collection || item.category) || '未分合集';
  const achievementType = cleanString(item.achievementType || item.subCategory) || '未分类型';
  const version = cleanString(item.version) || '未标记版本';

  return {
    id: cleanString(item.id) || crypto.randomUUID(),
    name: cleanString(item.name) || '未命名条目',
    achievementType,
    version,
    collection,
    category: collection,
    subCategory: cleanString(item.subCategory || achievementType),
    completed: Boolean(item.completed),
    note: cleanString(item.note),
    source: cleanString(item.source) || '未填写来源',
    description: cleanString(item.description),
    guide: cleanString(item.guide),
    reward: cleanString(item.reward),
    stellarJade: item.stellarJade ?? '',
    image: cleanString(item.image),
    completedAt: cleanString(item.completedAt),
    updatedAt: cleanString(item.updatedAt) || new Date().toISOString(),
  };
}

function cleanString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}
