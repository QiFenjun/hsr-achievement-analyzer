import { useEffect, useRef, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { CategoryView } from './components/CategoryView';
import { Dashboard } from './components/Dashboard';
import { DataTable } from './components/DataTable';
import { ImportPanel } from './components/ImportPanel';
import { applyThemeMode, loadThemeMode, saveThemeMode } from './utils/theme';
import {
  chooseSourceWorkbook,
  clearStoredSourceHandle,
  getStoredSourceHandle,
  isSourceSyncSupported,
  loadAutoSyncPreference,
  saveAutoSyncPreference,
  syncRecordsToSourceWorkbook,
  type SourceFileHandle,
} from './utils/sourceSync';
import { loadRecords, resetRecords, saveRecords } from './utils/storage';
import type { AchievementItem, FocusedGroup, GroupDimension, ImportMode, SourceSyncUiState, ThemeMode } from './types';

type ViewKey = 'dashboard' | 'table' | 'categories' | 'import';

function App() {
  const [records, setRecords] = useState<AchievementItem[]>(() => loadRecords());
  const [activeView, setActiveView] = useState<ViewKey>('dashboard');
  const [focusedGroup, setFocusedGroup] = useState<FocusedGroup | null>(null);
  const [importModeHint, setImportModeHint] = useState<ImportMode>('merge');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [sourceHandle, setSourceHandle] = useState<SourceFileHandle | null>(null);
  const [sourceSync, setSourceSync] = useState<SourceSyncUiState>(() => ({
    supported: isSourceSyncSupported(),
    bound: false,
    fileName: '',
    autoSync: loadAutoSyncPreference(),
    status: isSourceSyncSupported() ? 'idle' : 'unsupported',
    message: isSourceSyncSupported() ? '未绑定源表' : '当前浏览器不支持直接写回本地文件',
  }));
  const sourceHandleRef = useRef<SourceFileHandle | null>(null);
  const autoSyncRef = useRef(sourceSync.autoSync);
  const syncTimerRef = useRef<number | undefined>();
  const latestRecordsRef = useRef(records);

  useEffect(() => {
    saveRecords(records);
    latestRecordsRef.current = records;
  }, [records]);

  useEffect(() => {
    saveThemeMode(themeMode);
    return applyThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    autoSyncRef.current = sourceSync.autoSync;
  }, [sourceSync.autoSync]);

  useEffect(() => {
    sourceHandleRef.current = sourceHandle;
  }, [sourceHandle]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSourceHandle() {
      const handle = await getStoredSourceHandle();
      if (cancelled || !handle) {
        return;
      }

      setSourceHandle(handle);
      setSourceSync((current) => ({
        ...current,
        bound: true,
        fileName: handle.name,
        status: 'idle',
        message: `已绑定 ${handle.name}`,
      }));
    }

    void restoreSourceHandle();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleUpdateRecord(id: string, patch: Partial<AchievementItem>) {
    commitRecords((current) =>
      current.map((record) => {
        if (record.id !== id) {
          return record;
        }

        const next = {
          ...record,
          ...patch,
          updatedAt: new Date().toISOString(),
        };

        if (patch.collection !== undefined) {
          next.category = patch.collection;
        }

        if (patch.achievementType !== undefined) {
          next.subCategory = patch.achievementType;
        }

        return next;
      }),
    );
  }

  function handleImportedRecords(imported: AchievementItem[], mode: ImportMode) {
    commitRecords((current) => {
      if (mode === 'replace') {
        return imported;
      }

      if (mode === 'merge') {
        return mergeImportedRecords(current, imported);
      }

      const seenIds = new Set(current.map((record) => record.id));
      const safeImported = imported.map((record) => {
        if (!seenIds.has(record.id)) {
          seenIds.add(record.id);
          return record;
        }

        const nextId = makeAppendId(record.id, seenIds);
        seenIds.add(nextId);
        return { ...record, id: nextId };
      });

      return [...current, ...safeImported];
    });
    setFocusedGroup(null);
    setActiveView('table');
  }

  function handleDeleteRecord(id: string) {
    const target = latestRecordsRef.current.find((record) => record.id === id);
    const confirmed = window.confirm(`确定删除“${target?.name || id}”吗？删除后会同步到已绑定的源表。`);

    if (!confirmed) {
      return;
    }

    commitRecords((current) => current.filter((record) => record.id !== id));
  }

  function handleAddRecord() {
    const now = new Date().toISOString();
    const newRecord: AchievementItem = {
      id: createNextId(latestRecordsRef.current),
      name: '新成就',
      achievementType: '非隐藏成就',
      version: '4.2',
      collection: '与你同行的回忆',
      category: '与你同行的回忆',
      subCategory: '非隐藏成就',
      completed: false,
      note: '',
      source: '网页新增',
      description: '',
      guide: '',
      reward: '',
      stellarJade: '',
      image: '',
      completedAt: '',
      updatedAt: now,
    };

    commitRecords((current) => [newRecord, ...current]);
    setFocusedGroup(null);
    setActiveView('table');
  }

  function handleOpenGroup(dimension: GroupDimension, value: string) {
    setFocusedGroup({ dimension, value });
    setActiveView('table');
  }

  function handleOpenImport(mode: ImportMode = 'merge') {
    setImportModeHint(mode);
    setActiveView('import');
  }

  function handleReset() {
    const confirmed = window.confirm('确定要恢复到 4.2 成就大全数据吗？当前本地修改会被覆盖。');
    if (!confirmed) {
      return;
    }

    const nextRecords = resetRecords();
    latestRecordsRef.current = nextRecords;
    setRecords(nextRecords);
    queueSourceSync(nextRecords);
    setFocusedGroup(null);
    setActiveView('dashboard');
  }

  async function handleBindSource() {
    try {
      const handle = await chooseSourceWorkbook();
      setSourceHandle(handle);
      setSourceSync((current) => ({
        ...current,
        bound: true,
        fileName: handle.name,
        status: 'idle',
        message: '已绑定源表，后续编辑会自动同步',
      }));
    } catch (err) {
      setSourceSync((current) => ({
        ...current,
        status: current.supported ? 'error' : 'unsupported',
        message: err instanceof Error ? err.message : '绑定源表失败',
      }));
    }
  }

  async function handleManualSync() {
    await syncNow(latestRecordsRef.current);
  }

  async function handleUnbindSource() {
    await clearStoredSourceHandle();
    setSourceHandle(null);
    setSourceSync((current) => ({
      ...current,
      bound: false,
      fileName: '',
      status: current.supported ? 'idle' : 'unsupported',
      message: current.supported ? '已取消源表绑定' : current.message,
    }));
  }

  function handleToggleAutoSync() {
    setSourceSync((current) => {
      const nextAutoSync = !current.autoSync;
      saveAutoSyncPreference(nextAutoSync);
      return {
        ...current,
        autoSync: nextAutoSync,
        message: nextAutoSync ? '自动同步已开启' : '自动同步已关闭',
      };
    });
  }

  function commitRecords(updater: (current: AchievementItem[]) => AchievementItem[]) {
    setRecords((current) => {
      const next = updater(current);
      latestRecordsRef.current = next;
      queueSourceSync(next);
      return next;
    });
  }

  function queueSourceSync(nextRecords: AchievementItem[]) {
    if (!sourceHandleRef.current || !autoSyncRef.current) {
      return;
    }

    window.clearTimeout(syncTimerRef.current);
    setSourceSync((current) => ({
      ...current,
      status: 'pending',
      message: '等待自动同步...',
    }));
    syncTimerRef.current = window.setTimeout(() => {
      void syncNow(nextRecords);
    }, 1200);
  }

  async function syncNow(recordsToSync: AchievementItem[]) {
    const handle = sourceHandleRef.current;
    if (!handle) {
      setSourceSync((current) => ({
        ...current,
        status: current.supported ? 'idle' : 'unsupported',
        message: current.supported ? '请先绑定源 Excel 文件' : current.message,
      }));
      return;
    }

    window.clearTimeout(syncTimerRef.current);
    setSourceSync((current) => ({
      ...current,
      status: 'syncing',
      message: '正在写回源表...',
    }));

    try {
      await syncRecordsToSourceWorkbook(handle, recordsToSync);
      const lastSyncedAt = new Date().toISOString();
      setSourceSync((current) => ({
        ...current,
        status: 'saved',
        lastSyncedAt,
        message: `已同步到 ${handle.name}`,
      }));
    } catch (err) {
      setSourceSync((current) => ({
        ...current,
        status: 'error',
        message: err instanceof Error ? err.message : '同步源表失败',
      }));
    }
  }

  return (
    <div className="app-shell">
      <AppHeader
        activeView={activeView}
        records={records}
        sourceSync={sourceSync}
        themeMode={themeMode}
        onBindSource={handleBindSource}
        onChangeThemeMode={setThemeMode}
        onChangeView={(view) => {
          if (view === 'import') {
            setImportModeHint('merge');
          }
          setActiveView(view);
        }}
        onManualSync={handleManualSync}
        onReset={handleReset}
        onToggleAutoSync={handleToggleAutoSync}
        onUnbindSource={handleUnbindSource}
      />

      <main className="app-main">
        {activeView === 'dashboard' && (
          <Dashboard records={records} onOpenGroup={handleOpenGroup} onOpenImport={() => handleOpenImport('merge')} />
        )}

        {activeView === 'table' && (
          <DataTable
            records={records}
            focusedGroup={focusedGroup}
            onAddRecord={handleAddRecord}
            onClearFocusedGroup={() => setFocusedGroup(null)}
            onDeleteRecord={handleDeleteRecord}
            onOpenImport={() => handleOpenImport('merge')}
            onUpdateRecord={handleUpdateRecord}
          />
        )}

        {activeView === 'categories' && <CategoryView records={records} onOpenGroup={handleOpenGroup} />}

        {activeView === 'import' && <ImportPanel initialMode={importModeHint} onImported={handleImportedRecords} />}
      </main>
    </div>
  );
}

function makeAppendId(baseId: string, seenIds: Set<string>): string {
  let index = 2;
  let candidate = `${baseId}-${index}`;

  while (seenIds.has(candidate)) {
    index += 1;
    candidate = `${baseId}-${index}`;
  }

  return candidate;
}

function createNextId(records: AchievementItem[]): string {
  const numericIds = records.map((record) => Number(record.id)).filter(Number.isFinite);

  if (numericIds.length > 0) {
    return String(Math.max(...numericIds) + 1);
  }

  return `web-${Date.now()}`;
}

function mergeImportedRecords(current: AchievementItem[], imported: AchievementItem[]): AchievementItem[] {
  const now = new Date().toISOString();
  const bySignature = new Map(current.map((record) => [recordSignature(record), record]));
  const byUniqueName = createUniqueNameIndex(current);
  const mergedById = new Map(current.map((record) => [record.id, record]));

  for (const record of imported) {
    const existing =
      bySignature.get(recordSignature(record)) ||
      (isHsrAchievementImport(record) ? byUniqueName.get(normalizeRecordName(record.name)) : undefined);

    if (existing) {
      if (isHsrAchievementImport(record)) {
        mergedById.set(existing.id, mergeHsrAchievementCompletion(existing, record, now));
        continue;
      }

      mergedById.set(existing.id, {
        ...existing,
        ...record,
        id: existing.id,
        completed: existing.completed,
        note: existing.note,
        completedAt: existing.completedAt || record.completedAt,
        updatedAt: now,
      });
      continue;
    }

    let nextRecord = record;
    if (mergedById.has(nextRecord.id)) {
      nextRecord = {
        ...nextRecord,
        id: makeAppendId(nextRecord.id, new Set(mergedById.keys())),
      };
    }
    mergedById.set(nextRecord.id, nextRecord);
  }

  return Array.from(mergedById.values());
}

function mergeHsrAchievementCompletion(
  existing: AchievementItem,
  imported: AchievementItem,
  updatedAt: string,
): AchievementItem {
  return {
    ...existing,
    completed: imported.completed || existing.completed,
    description: existing.description || imported.description,
    completedAt: existing.completedAt || imported.completedAt,
    updatedAt,
  };
}

function createUniqueNameIndex(records: AchievementItem[]): Map<string, AchievementItem> {
  const buckets = records.reduce<Map<string, AchievementItem[]>>((acc, record) => {
    const name = normalizeRecordName(record.name);
    if (!name) {
      return acc;
    }

    const bucket = acc.get(name) || [];
    bucket.push(record);
    acc.set(name, bucket);
    return acc;
  }, new Map<string, AchievementItem[]>());

  return new Map(
    Array.from(buckets.entries())
      .filter(([, recordsWithName]) => recordsWithName.length === 1)
      .map(([name, recordsWithName]) => [name, recordsWithName[0]]),
  );
}

function recordSignature(record: AchievementItem): string {
  return [record.name, record.version, record.collection].map((part) => part.trim().toLowerCase()).join('|');
}

function normalizeRecordName(name: string): string {
  return name.normalize('NFKC').replace(/\s+/g, '').trim().toLowerCase();
}

function isHsrAchievementImport(record: AchievementItem): boolean {
  return record.source === 'hsr_achievements' || record.id.startsWith('hsr-');
}

export default App;
