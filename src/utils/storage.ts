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

    const storedRecords = parsed
      .filter((item): item is AchievementItem => Boolean(item && typeof item === 'object'))
      .map(normalizeStoredRecord);

    return mergeStoredRecordsWithSampleData(storedRecords);
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

function mergeStoredRecordsWithSampleData(storedRecords: AchievementItem[]): AchievementItem[] {
  let changed = false;
  const sampleBySignature = new Map(sampleData.map((record) => [recordSignature(record), record]));
  const mergedStoredRecords = storedRecords.map((record) => {
    const sampleRecord = sampleBySignature.get(recordSignature(record));
    if (!sampleRecord) {
      return record;
    }

    const mergedRecord = mergeStoredRecordMetadata(record, sampleRecord);
    if (mergedRecord !== record) {
      changed = true;
    }
    return mergedRecord;
  });
  const seenSignatures = new Set(mergedStoredRecords.map(recordSignature));
  const missingSampleRecords = sampleData.filter((record) => !seenSignatures.has(recordSignature(record)));

  if (missingSampleRecords.length === 0 && !changed) {
    return storedRecords;
  }

  const mergedRecords = [...mergedStoredRecords, ...missingSampleRecords];
  saveRecords(mergedRecords);
  return mergedRecords;
}

function mergeStoredRecordMetadata(storedRecord: AchievementItem, sampleRecord: AchievementItem): AchievementItem {
  const nextSource = sampleRecord.source || storedRecord.source;
  const nextNote =
    !storedRecord.note || storedRecord.note.startsWith('StarRailStaticAPI ID:')
      ? sampleRecord.note || storedRecord.note
      : storedRecord.note;

  if (nextSource === storedRecord.source && nextNote === storedRecord.note) {
    return storedRecord;
  }

  return {
    ...storedRecord,
    source: nextSource,
    note: nextNote,
  };
}

function recordSignature(record: AchievementItem): string {
  return [record.name, record.version, record.collection].map((part) => cleanString(part).toLowerCase()).join('|');
}

function cleanString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}
