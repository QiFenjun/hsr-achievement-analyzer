import type { AchievementItem, GameKey } from '../types';
import { SOURCE_HEADERS, buildSummaryRows, recordsToSourceRows } from './importExport';

const DB_NAME = 'game-completion-analyzer.source-file.v1';
const STORE_NAME = 'handles';
const AUTO_SYNC_KEY = 'game-completion-analyzer.source-auto-sync.v1';

type PermissionMode = 'read' | 'readwrite';
export type SourceFileHandle = {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
  queryPermission?: (descriptor: { mode: PermissionMode }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: PermissionMode }) => Promise<PermissionState>;
};

type OpenFilePicker = (options?: {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<SourceFileHandle[]>;

export function isSourceSyncSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window && 'indexedDB' in window;
}

export function loadAutoSyncPreference(game: GameKey): boolean {
  const stored = window.localStorage.getItem(getAutoSyncKey(game));
  return stored === null ? true : stored === 'true';
}

export function saveAutoSyncPreference(game: GameKey, enabled: boolean): void {
  window.localStorage.setItem(getAutoSyncKey(game), String(enabled));
}

export async function chooseSourceWorkbook(game: GameKey): Promise<SourceFileHandle> {
  if (!isSourceSyncSupported()) {
    throw new Error('当前浏览器不支持直接写回本地文件。请使用 Chromium / Edge，并通过导出 Excel 手动保存。');
  }

  const picker = (window as unknown as { showOpenFilePicker: OpenFilePicker }).showOpenFilePicker;
  const [handle] = await picker({
    multiple: false,
    excludeAcceptAllOption: false,
    types: [
      {
        description: 'Excel 工作簿',
        accept: {
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'application/vnd.ms-excel': ['.xls'],
        },
      },
    ],
  });

  await ensureWritePermission(handle);
  await storeSourceHandle(game, handle);
  return handle;
}

export async function getStoredSourceHandle(game: GameKey): Promise<SourceFileHandle | null> {
  if (!isSourceSyncSupported()) {
    return null;
  }

  return readHandleFromDb(game);
}

export async function clearStoredSourceHandle(game: GameKey): Promise<void> {
  if (!isSourceSyncSupported()) {
    return;
  }

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(getHandleKey(game));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function syncRecordsToSourceWorkbook(handle: SourceFileHandle, records: AchievementItem[]): Promise<void> {
  await ensureWritePermission(handle);

  const XLSX = await import('xlsx');
  const file = await handle.getFile();
  const workbook =
    file.size > 0
      ? XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      : XLSX.utils.book_new();

  const achievementSheet = XLSX.utils.json_to_sheet(recordsToSourceRows(records), {
    header: [...SOURCE_HEADERS],
  });
  achievementSheet['!cols'] = [
    { wch: 8 },
    { wch: 26 },
    { wch: 14 },
    { wch: 10 },
    { wch: 20 },
    { wch: 40 },
    { wch: 44 },
    { wch: 14 },
    { wch: 10 },
    { wch: 18 },
    { wch: 16 },
    { wch: 10 },
    { wch: 18 },
    { wch: 28 },
    { wch: 22 },
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(buildSummaryRows(records));
  summarySheet['!cols'] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 3 },
    { wch: 22 },
    { wch: 10 },
    { wch: 3 },
    { wch: 10 },
    { wch: 10 },
    { wch: 3 },
    { wch: 14 },
    { wch: 10 },
    { wch: 3 },
    { wch: 20 },
    { wch: 10 },
  ];

  replaceSheet(workbook, '成就攻略', achievementSheet, 0);
  replaceSheet(workbook, '汇总', summarySheet, workbook.SheetNames.includes('汇总') ? undefined : 1);

  const output = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });
  const blob = new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function ensureWritePermission(handle: SourceFileHandle): Promise<void> {
  const descriptor = { mode: 'readwrite' as const };

  if (handle.queryPermission) {
    const current = await handle.queryPermission(descriptor);
    if (current === 'granted') {
      return;
    }
  }

  if (!handle.requestPermission) {
    return;
  }

  const next = await handle.requestPermission(descriptor);
  if (next !== 'granted') {
    throw new Error('没有获得写入源 Excel 文件的权限。');
  }
}

function replaceSheet(workbook: { SheetNames: string[]; Sheets: Record<string, unknown> }, name: string, sheet: unknown, index?: number) {
  workbook.Sheets[name] = sheet;

  if (workbook.SheetNames.includes(name)) {
    return;
  }

  if (index === undefined || index >= workbook.SheetNames.length) {
    workbook.SheetNames.push(name);
    return;
  }

  workbook.SheetNames.splice(Math.max(index, 0), 0, name);
}

function getHandleKey(game: GameKey): string {
  return `source-workbook:${game}`;
}

function getAutoSyncKey(game: GameKey): string {
  return `${AUTO_SYNC_KEY}:${game}`;
}

async function storeSourceHandle(game: GameKey, handle: SourceFileHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(handle, getHandleKey(game));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function readHandleFromDb(game: GameKey): Promise<SourceFileHandle | null> {
  const db = await openDb();
  const handle = await new Promise<SourceFileHandle | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(getHandleKey(game));
    request.onsuccess = () => resolve((request.result as SourceFileHandle | undefined) || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return handle;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
