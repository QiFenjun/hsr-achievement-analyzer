import { getGameDefinition } from '../data/gameData';
import type { AchievementItem, GameDefinition, GameKey } from '../types';

const STORAGE_KEYS: Record<GameKey, string> = {
  starRail: 'game-achievement-analyzer.star-rail.records.v1',
  genshin: 'game-achievement-analyzer.genshin.records.v1',
};

const LEGACY_STAR_RAIL_STORAGE_KEY = 'game-completion-analyzer.records.v2';

export function loadRecords(gameKey: GameKey): AchievementItem[] {
  const game = getGameDefinition(gameKey);

  try {
    const raw =
      window.localStorage.getItem(getStorageKey(game.key)) ||
      (game.key === 'starRail' ? window.localStorage.getItem(LEGACY_STAR_RAIL_STORAGE_KEY) : null);

    if (!raw) {
      return game.records;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return game.records;
    }

    const storedRecords = parsed
      .filter((item): item is AchievementItem => Boolean(item && typeof item === 'object'))
      .map((item) => normalizeStoredRecord(item, game));

    return mergeStoredRecordsWithSampleData(storedRecords, game);
  } catch {
    return game.records;
  }
}

export function saveRecords(gameKey: GameKey, records: AchievementItem[]): void {
  window.localStorage.setItem(getStorageKey(gameKey), JSON.stringify(records));
}

export function resetRecords(gameKey: GameKey): AchievementItem[] {
  const game = getGameDefinition(gameKey);
  saveRecords(game.key, game.records);
  return game.records;
}

function normalizeStoredRecord(item: Partial<AchievementItem>, game: GameDefinition): AchievementItem {
  const collection = cleanString(item.collection || item.category) || game.defaultCollection;
  const achievementType = cleanString(item.achievementType || item.subCategory) || game.defaultAchievementType;
  const version = cleanString(item.version) || game.defaultVersion;
  const legacyNote = cleanString(item.note);
  const legacyApiId =
    legacyNote.startsWith('StarRailStaticAPI ID:') || legacyNote.startsWith('Genshin Center ID:')
      ? legacyNote
      : '';

  return {
    id: cleanString(item.id) || crypto.randomUUID(),
    game: game.key,
    name: cleanString(item.name) || '未命名条目',
    englishName: cleanString(item.englishName),
    achievementType,
    version,
    collection,
    englishCollection: cleanString(item.englishCollection),
    category: collection,
    subCategory: cleanString(item.subCategory || achievementType),
    completed: Boolean(item.completed),
    apiId: cleanString(item.apiId) || legacyApiId,
    note: legacyApiId ? '' : legacyNote,
    source: cleanString(item.source) || '未填写来源',
    description: cleanString(item.description),
    englishDescription: cleanString(item.englishDescription),
    guide: cleanString(item.guide),
    reward: cleanString(item.reward),
    stellarJade: item.stellarJade ?? '',
    image: cleanString(item.image),
    completedAt: cleanString(item.completedAt),
    updatedAt: cleanString(item.updatedAt) || new Date().toISOString(),
  };
}

function mergeStoredRecordsWithSampleData(storedRecords: AchievementItem[], game: GameDefinition): AchievementItem[] {
  let changed = false;
  const sampleBySignature = new Map(game.records.map((record) => [recordSignature(record), record]));
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
  const missingSampleRecords = game.records.filter((record) => !seenSignatures.has(recordSignature(record)));

  if (missingSampleRecords.length === 0 && !changed) {
    return storedRecords;
  }

  const mergedRecords = [...mergedStoredRecords, ...missingSampleRecords];
  saveRecords(game.key, mergedRecords);
  return mergedRecords;
}

function mergeStoredRecordMetadata(storedRecord: AchievementItem, sampleRecord: AchievementItem): AchievementItem {
  const nextSource = sampleRecord.source || storedRecord.source;
  const nextApiId = sampleRecord.apiId || storedRecord.apiId;

  if (
    nextSource === storedRecord.source &&
    nextApiId === storedRecord.apiId &&
    sampleRecord.englishName === storedRecord.englishName &&
    sampleRecord.englishCollection === storedRecord.englishCollection &&
    sampleRecord.englishDescription === storedRecord.englishDescription
  ) {
    return storedRecord;
  }

  return {
    ...storedRecord,
    game: sampleRecord.game || storedRecord.game,
    englishName: sampleRecord.englishName || storedRecord.englishName,
    englishCollection: sampleRecord.englishCollection || storedRecord.englishCollection,
    englishDescription: sampleRecord.englishDescription || storedRecord.englishDescription,
    source: nextSource,
    apiId: nextApiId,
  };
}

function recordSignature(record: AchievementItem): string {
  return [record.name, record.version, record.collection].map((part) => cleanString(part).toLowerCase()).join('|');
}

function getStorageKey(gameKey: GameKey): string {
  return STORAGE_KEYS[gameKey];
}

function cleanString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}
