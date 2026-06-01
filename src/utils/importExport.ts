import type { AchievementItem, FieldMapping, ImportDraft, ImportableFieldKey } from '../types';

const FIELD_ALIASES: Record<ImportableFieldKey, string[]> = {
  id: ['id', 'uuid', 'key', '唯一编号', '唯一id'],
  name: ['name', 'title', 'achievement', 'item', 'task', '成就名称', '名称', '标题', '成就', '条目', '任务'],
  englishName: ['englishName', 'english_name', 'enName', 'en_name', '英文名称', '英文名'],
  achievementType: ['achievementType', 'achievement_type', 'type', '成就类型', '类型', '隐藏类型'],
  version: ['version', '版本', '版本号'],
  collection: ['collection', 'album', 'set', '合集', '成就合集', '分类', '类别'],
  englishCollection: ['englishCollection', 'english_collection', '英文合集', '英文分类'],
  completed: ['completed', 'complete', 'done', 'finished', 'status', '完成度', '状态', '完成', '已完成', '是否完成'],
  apiId: ['apiId', 'api_id', 'API ID', '接口ID', '数据ID'],
  note: ['note', 'notes', 'comment', 'memo', 'remark', '备注', '说明', '笔记'],
  source: ['source', 'origin', 'from', 'sourceGroup', 'source_group', '来源', '来源分组', '出处', '数据来源'],
  description: ['description', 'desc', '成就描述', '描述'],
  englishDescription: ['englishDescription', 'english_description', 'enDescription', 'en_description', '英文描述'],
  guide: ['guide', 'method', 'strategy', '攻略/达成方法', '攻略', '达成方法', '方法'],
  reward: ['reward', '奖励'],
  stellarJade: ['stellarJade', 'stellar_jade', 'jade', '星琼数', '星琼'],
  image: ['image', 'picture', '图片', '图'],
  completedAt: ['completedAt', 'completed_at', 'time', '完成时间', '时间'],
  updatedAt: ['updatedAt', 'updated_at', 'updated', 'modified', 'date', '更新时间', '修改时间', '日期'],
};

const FIELD_ORDER: ImportableFieldKey[] = [
  'id',
  'name',
  'achievementType',
  'version',
  'collection',
  'description',
  'guide',
  'reward',
  'stellarJade',
  'source',
  'image',
  'completed',
  'apiId',
  'note',
  'completedAt',
  'updatedAt',
];

const STAR_RAIL_ACHIEVEMENTS_CN_URL = 'https://vizualabstract.github.io/StarRailStaticAPI/db/cn/achievements.json';

interface StarRailAchievementEntry {
  id: string;
  series_id?: string;
  title?: string;
  desc?: string;
  hide_desc?: string;
  hide?: boolean;
}

type StarRailAchievementMap = Record<string, StarRailAchievementEntry>;

let starRailAchievementCache: StarRailAchievementMap | null = null;

export const SOURCE_HEADERS = [
  '序号',
  '成就名称',
  '成就类型',
  '版本',
  '合集',
  '成就描述',
  '攻略/达成方法',
  '奖励',
  '星琼数',
  '来源分组',
  '图片',
  '完成度',
  'API ID',
  '时间',
  '备注',
  '更新时间',
] as const;

export const FIELD_LABELS: Record<ImportableFieldKey, string> = {
  id: '内部ID',
  name: '成就名称',
  englishName: '英文名称',
  achievementType: '成就类型',
  version: '版本',
  collection: '合集',
  englishCollection: '英文合集',
  description: '成就描述',
  englishDescription: '英文描述',
  guide: '攻略/达成方法',
  reward: '奖励',
  stellarJade: '星琼数',
  source: '来源',
  image: '图片',
  completed: '完成度',
  apiId: 'API ID',
  note: '备注',
  completedAt: '时间',
  updatedAt: '更新时间',
};

export const REQUIRED_FIELDS: ImportableFieldKey[] = ['name'];

export async function parseImportFile(file: File): Promise<ImportDraft> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'json' || extension === 'txt') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const payload = await normalizeJsonPayload(parsed);
    return createDraft(file.name, payload.rows, payload.notice);
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const XLSX = await loadXlsx();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error('Excel 文件中没有可读取的工作表。');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });

    return createDraft(file.name, rows);
  }

  throw new Error('仅支持 .xlsx、.xls、.json 或包含 JSON 文本的 .txt 文件。');
}

export function normalizeImportedRows(rows: Record<string, unknown>[], mapping: FieldMapping): AchievementItem[] {
  const now = new Date().toISOString();
  const seenIds = new Set<string>();

  return rows
    .map((row, index) => {
      const id = cleanString(readMappedValue(row, mapping.id)) || createGeneratedId(index);
      const safeId = makeUniqueId(id, seenIds);
      const name = cleanString(readMappedValue(row, mapping.name)) || `未命名成就 ${index + 1}`;
      const achievementType = cleanString(readMappedValue(row, mapping.achievementType)) || '未分类型';
      const version = cleanString(readMappedValue(row, mapping.version)) || '未标记版本';
      const collection = cleanString(readMappedValue(row, mapping.collection)) || '未分合集';
      const completedAt = normalizeDate(readMappedValue(row, mapping.completedAt));
      const updatedAt = normalizeDate(readMappedValue(row, mapping.updatedAt)) || now;

      return {
        id: safeId,
        name,
        achievementType,
        version,
        collection,
        category: collection,
        subCategory: achievementType,
        completed: parseCompleted(readMappedValue(row, mapping.completed)),
        apiId: cleanString(readMappedValue(row, mapping.apiId)),
        note: cleanString(readMappedValue(row, mapping.note)),
        source: cleanString(readMappedValue(row, mapping.source)) || '未填写来源',
        description: cleanString(readMappedValue(row, mapping.description)),
        guide: cleanString(readMappedValue(row, mapping.guide)),
        reward: cleanString(readMappedValue(row, mapping.reward)),
        stellarJade: parseStellarJade(readMappedValue(row, mapping.stellarJade)),
        image: cleanString(readMappedValue(row, mapping.image)),
        completedAt,
        updatedAt,
      };
    })
    .filter((record) => record.name.trim().length > 0);
}

export async function exportRecordsToExcel(records: AchievementItem[]): Promise<void> {
  const XLSX = await loadXlsx();
  const rows = recordsToSourceRows(records);

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [...SOURCE_HEADERS],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '成就攻略');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(buildSummaryRows(records)), '汇总');
  XLSX.writeFile(workbook, `star-rail-achievements-${formatFileDate(new Date())}.xlsx`);
}

export async function downloadSampleTemplate(): Promise<void> {
  const XLSX = await loadXlsx();
  const rows = [
    {
      序号: 1,
      成就名称: '隐藏成就示例',
      成就类型: '隐藏成就',
      版本: '4.2',
      合集: '与你同行的回忆',
      成就描述: '这里填写成就描述',
      '攻略/达成方法': '这里填写达成方法',
      奖励: '星琼*5',
      星琼数: 5,
      来源: '4.0及以后成就',
      图片: '',
      完成度: '未完成',
      'API ID': '',
      备注: '这里填写个人备注',
      时间: '',
      更新时间: new Date().toISOString(),
    },
    {
      序号: 2,
      成就名称: '非隐藏成就示例',
      成就类型: '非隐藏成就',
      版本: '4.2',
      合集: '通往群星的轨道',
      成就描述: '导入后可以继续编辑',
      '攻略/达成方法': '完成指定剧情',
      奖励: '星琼*10',
      星琼数: 10,
      来源: '4.0及以后成就',
      图片: '',
      完成度: '完成',
      'API ID': '',
      备注: '',
      时间: new Date().toISOString(),
      更新时间: new Date().toISOString(),
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  XLSX.writeFile(workbook, 'star-rail-achievements-template.xlsx');
}

export function getFieldOrder(): ImportableFieldKey[] {
  return FIELD_ORDER;
}

export function recordsToSourceRows(records: AchievementItem[]): Array<Record<string, string | number>> {
  return records.map((record, index) => ({
    序号: index + 1,
    成就名称: record.name,
    成就类型: record.achievementType,
    版本: record.version,
    合集: record.collection,
    成就描述: record.description || '',
    '攻略/达成方法': record.guide || '',
    奖励: record.reward || '',
    星琼数: record.stellarJade || '',
    来源分组: record.source || '',
    图片: record.image || '',
    完成度: record.completed ? '完成' : '未完成',
    'API ID': record.apiId || '',
    时间: record.completedAt || '',
    备注: record.note || '',
    更新时间: record.updatedAt || '',
  }));
}

export function buildSummaryRows(records: AchievementItem[]): Array<Array<string | number>> {
  const total = records.length;
  const hidden = records.filter((record) => record.achievementType === '隐藏成就').length;
  const visible = records.filter((record) => record.achievementType === '非隐藏成就').length;
  const completed = records.filter((record) => record.completed).length;
  const incomplete = total - completed;
  const guideCount = records.filter((record) => Boolean(record.guide?.trim())).length;
  const jadeTotal = records.reduce((sum, record) => sum + (Number(record.stellarJade) || 0), 0);
  const now = new Date().toLocaleString('zh-CN');
  const collections = countBy(records, (record) => record.collection);
  const versions = countBy(records, (record) => record.version, compareVersionAsc);
  const types = countBy(records, (record) => record.achievementType);
  const sources = countBy(records, (record) => record.source || '未填写来源');
  const maxRows = Math.max(collections.length, versions.length, types.length, sources.length, 7);
  const rows: Array<Array<string | number>> = [
    ['项目', '值', '', '合集', '数量', '', '版本', '数量', '', '成就类型', '数量', '', '来源', '数量'],
  ];
  const overallRows: Array<[string, string | number]> = [
    ['成就总数', total],
    ['隐藏成就数', hidden],
    ['非隐藏成就数', visible],
    ['已完成数', completed],
    ['未完成数', incomplete],
    ['带攻略/达成方法条数', guideCount],
    ['星琼合计', jadeTotal],
    ['来源更新时间', now],
  ];

  for (let index = 0; index < maxRows; index += 1) {
    rows.push([
      overallRows[index]?.[0] || '',
      overallRows[index]?.[1] || '',
      '',
      collections[index]?.[0] || '',
      collections[index]?.[1] || '',
      '',
      versions[index]?.[0] || '',
      versions[index]?.[1] || '',
      '',
      types[index]?.[0] || '',
      types[index]?.[1] || '',
      '',
      sources[index]?.[0] || '',
      sources[index]?.[1] || '',
    ]);
  }

  return rows;
}

function createDraft(fileName: string, rows: Record<string, unknown>[], notice?: string): ImportDraft {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('没有找到可导入的数据行。');
  }

  const headers = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>()),
  );

  if (headers.length === 0) {
    throw new Error('没有找到表头字段。');
  }

  return {
    fileName,
    headers,
    notice,
    rows,
    mappings: inferFieldMapping(headers),
  };
}

async function loadXlsx() {
  return import('xlsx');
}

async function normalizeJsonPayload(payload: unknown): Promise<{ rows: Record<string, unknown>[]; notice?: string }> {
  if (isRecord(payload) && Array.isArray(payload.hsr_achievements)) {
    const ids = Array.from(
      new Set(
        payload.hsr_achievements
          .map((value) => cleanString(value))
          .filter((value) => value.length > 0),
      ),
    );

    try {
      const achievementMap = await loadStarRailAchievementMap();
      const rows = ids.map((id) => {
        const entry = achievementMap[id];
        const description = entry?.desc || entry?.hide_desc || '';

        return {
          id: `hsr-${id}`,
          name: entry?.title || `成就ID ${id}`,
          achievementType: entry ? (entry.hide ? '隐藏成就' : '非隐藏成就') : 'ID清单',
          version: '',
          collection: '',
          description,
          completed: '完成',
          source: 'hsr_achievements',
          apiId: entry ? `StarRailStaticAPI ID: ${id}` : '',
          note: entry ? '' : `未在 StarRailStaticAPI 中找到ID: ${id}`,
        };
      });
      const mappedCount = rows.filter((row) => !String(row.name).startsWith('成就ID ')).length;

      return {
        notice: `检测到 hsr_achievements 已完成ID清单。已用 StarRailStaticAPI 中文成就数据映射 ${mappedCount}/${ids.length} 个ID；合并导入时会按成就名称匹配并勾选现有记录，未命中的ID会作为单独记录导入。`,
        rows,
      };
    } catch (err) {
      return {
        notice:
          err instanceof Error
            ? `检测到 hsr_achievements 已完成ID清单，但读取 StarRailStaticAPI 中文数据失败：${err.message}。本次会退回为ID记录导入。`
            : '检测到 hsr_achievements 已完成ID清单，但读取 StarRailStaticAPI 中文数据失败。本次会退回为ID记录导入。',
        rows: ids.map((id) => ({
          id: `hsr-${id}`,
          name: `成就ID ${id}`,
          achievementType: 'ID清单',
          version: '',
          collection: '',
          completed: '完成',
          source: 'hsr_achievements',
          apiId: '',
          note: `原始ID: ${id}`,
        })),
      };
    }
  }

  const candidate =
    Array.isArray(payload)
      ? payload
      : isRecord(payload) && Array.isArray(payload.data)
        ? payload.data
        : isRecord(payload) && Array.isArray(payload.records)
          ? payload.records
          : isRecord(payload) && Array.isArray(payload.items)
            ? payload.items
            : null;

  if (!candidate) {
    throw new Error('JSON 需要是数组，或包含 data、records、items 数组字段，也可以是 hsr_achievements ID 清单。');
  }

  const rows = candidate.filter(isRecord);

  if (rows.length === 0) {
    throw new Error('JSON 数组需要包含对象记录；如果是 ID 清单，请使用 {"hsr_achievements":[...]} 格式。');
  }

  return { rows };
}

async function loadStarRailAchievementMap(): Promise<StarRailAchievementMap> {
  if (starRailAchievementCache) {
    return starRailAchievementCache;
  }

  const response = await fetch(STAR_RAIL_ACHIEVEMENTS_CN_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!isRecord(data)) {
    throw new Error('接口返回格式不是对象');
  }

  starRailAchievementCache = Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => isRecord(value))
      .map(([id, value]) => {
        const entry = value as Record<string, unknown>;

        return [
          id,
          {
            id: cleanString(entry.id) || id,
            series_id: cleanString(entry.series_id),
            title: cleanString(entry.title),
            desc: cleanString(entry.desc),
            hide_desc: cleanString(entry.hide_desc),
            hide: typeof entry.hide === 'boolean' ? entry.hide : undefined,
          },
        ];
      }),
  );

  return starRailAchievementCache;
}

function inferFieldMapping(headers: string[]): FieldMapping {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  return FIELD_ORDER.reduce<FieldMapping>((mapping, field) => {
    const aliases = FIELD_ALIASES[field].map(normalizeHeader);
    const exact = normalizedHeaders.find((header) => aliases.includes(header.normalized));
    const fuzzy = normalizedHeaders.find((header) =>
      aliases.some((alias) => header.normalized.includes(alias) || alias.includes(header.normalized)),
    );
    const match = exact || fuzzy;

    if (match) {
      mapping[field] = match.original;
    }

    return mapping;
  }, {});
}

function readMappedValue(row: Record<string, unknown>, header?: string): unknown {
  if (!header) {
    return undefined;
  }

  return row[header];
}

function cleanString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function parseCompleted(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  const normalized = cleanString(value).toLowerCase();

  if (!normalized) {
    return false;
  }

  if (['false', '0', 'no', 'n', '未完成', '否', '待完成', 'incomplete', 'pending'].includes(normalized)) {
    return false;
  }

  return ['true', '1', 'yes', 'y', 'done', 'complete', 'completed', 'finished', '已完成', '完成', '是'].includes(
    normalized,
  );
}

function parseStellarJade(value: unknown): number | string {
  const raw = cleanString(value);

  if (!raw) {
    return '';
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : raw;
}

function normalizeDate(value: unknown): string {
  const raw = cleanString(value);

  if (!raw) {
    return '';
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toISOString();
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\s_\-./\\:：()[\]{}]/g, '')
    .trim();
}

function createGeneratedId(index: number): string {
  return `import-${Date.now()}-${index + 1}`;
}

function makeUniqueId(id: string, seenIds: Set<string>): string {
  let candidate = id;
  let suffix = 2;

  while (seenIds.has(candidate)) {
    candidate = `${id}-${suffix}`;
    suffix += 1;
  }

  seenIds.add(candidate);
  return candidate;
}

function formatFileDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function countBy(
  records: AchievementItem[],
  getValue: (record: AchievementItem) => string,
  compare?: (a: string, b: string) => number,
): Array<[string, number]> {
  const counts = records.reduce<Map<string, number>>((acc, record) => {
    const value = getValue(record).trim() || '未填写';
    acc.set(value, (acc.get(value) || 0) + 1);
    return acc;
  }, new Map<string, number>());

  return Array.from(counts.entries()).sort((a, b) => {
    if (compare) {
      return compare(a[0], b[0]);
    }

    return b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN');
  });
}

function compareVersionAsc(a: string, b: string): number {
  const aParts = a.split('.').map((part) => Number(part));
  const bParts = b.split('.').map((part) => Number(part));
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const aPart = Number.isFinite(aParts[index]) ? aParts[index] : -1;
    const bPart = Number.isFinite(bParts[index]) ? bParts[index] : -1;

    if (aPart !== bPart) {
      return aPart - bPart;
    }
  }

  return a.localeCompare(b, 'zh-CN');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
