import type { AchievementItem, GroupDimension, GroupStat, SummaryStats } from '../types';

export const GROUP_DIMENSION_LABELS: Record<GroupDimension, string> = {
  achievementType: '成就类型',
  version: '版本',
  collection: '合集',
  source: '来源',
};

export const GROUP_DIMENSIONS: GroupDimension[] = ['achievementType', 'version', 'collection', 'source'];

export function getSummaryStats(records: AchievementItem[]): SummaryStats {
  const total = records.length;
  const completed = records.filter((record) => record.completed).length;
  const incomplete = total - completed;
  const rate = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;

  return {
    total,
    completed,
    incomplete,
    rate,
  };
}

export function getGroupStats(records: AchievementItem[], dimension: GroupDimension): GroupStat[] {
  const grouped = records.reduce<Record<string, AchievementItem[]>>((acc, record) => {
    const value = getGroupValue(record, dimension);
    acc[value] = acc[value] || [];
    acc[value].push(record);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([value, items]) => {
      const total = items.length;
      const completed = items.filter((item) => item.completed).length;
      const incomplete = total - completed;
      const rate = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;

      return {
        dimension,
        label: GROUP_DIMENSION_LABELS[dimension],
        value,
        total,
        completed,
        incomplete,
        rate,
      };
    })
    .sort((a, b) => compareGroupStats(a, b, dimension));
}

export function getGroupValue(record: AchievementItem, dimension: GroupDimension): string {
  const raw = record[dimension];
  return String(raw || '未填写').trim() || '未填写';
}

function compareGroupStats(a: GroupStat, b: GroupStat, dimension: GroupDimension): number {
  if (dimension === 'version') {
    return compareVersionDesc(a.value, b.value);
  }

  return b.total - a.total || b.rate - a.rate || a.value.localeCompare(b.value, 'zh-CN');
}

function compareVersionDesc(a: string, b: string): number {
  const aParts = a.split('.').map((part) => Number(part));
  const bParts = b.split('.').map((part) => Number(part));
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const aPart = Number.isFinite(aParts[index]) ? aParts[index] : -1;
    const bPart = Number.isFinite(bParts[index]) ? bParts[index] : -1;

    if (aPart !== bPart) {
      return bPart - aPart;
    }
  }

  return a.localeCompare(b, 'zh-CN');
}
