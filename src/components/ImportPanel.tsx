import { AlertCircle, Check, FileSpreadsheet, Upload } from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import type { AchievementItem, ImportDraft, ImportMode, ImportableFieldKey } from '../types';
import {
  FIELD_LABELS,
  REQUIRED_FIELDS,
  downloadSampleTemplate,
  getFieldOrder,
  normalizeImportedRows,
  parseImportFile,
} from '../utils/importExport';

interface ImportPanelProps {
  initialMode?: ImportMode;
  onImported: (records: AchievementItem[], mode: ImportMode) => void;
}

export function ImportPanel({ initialMode = 'merge', onImported }: ImportPanelProps) {
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<ImportMode>(initialMode);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const previewRecords = useMemo(() => {
    if (!draft) {
      return [];
    }

    return normalizeImportedRows(draft.rows.slice(0, 5), draft.mappings);
  }, [draft]);

  const canImport = Boolean(draft && REQUIRED_FIELDS.every((field) => draft.mappings[field]));

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsParsing(true);
    setError('');

    try {
      const nextDraft = await parseImportFile(file);
      setDraft(nextDraft);
    } catch (err) {
      setDraft(null);
      setError(err instanceof Error ? err.message : '导入失败，请检查文件格式。');
    } finally {
      setIsParsing(false);
      event.target.value = '';
    }
  }

  function updateMapping(field: ImportableFieldKey, header: string) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        mappings: {
          ...current.mappings,
          [field]: header || undefined,
        },
      };
    });
  }

  function applyImport() {
    if (!draft || !canImport) {
      return;
    }

    const imported = normalizeImportedRows(draft.rows, draft.mappings);
    onImported(imported, mode);
  }

  return (
    <section className="import-view">
      <div className="view-title-row">
        <div>
          <p className="eyebrow">Import</p>
          <h2>导入成就数据</h2>
        </div>
        <button className="ghost-button" type="button" onClick={() => void downloadSampleTemplate()}>
          <FileSpreadsheet size={18} />
          下载模板
        </button>
      </div>

      <div className="import-layout">
        <section className="panel import-drop-panel">
          <label className="drop-zone">
            <Upload size={30} />
            <strong>{isParsing ? '正在解析文件...' : '选择 Excel 或 JSON 文件'}</strong>
            <span>支持 .xlsx、.xls、.json、.txt，文件只在本地浏览器中读取。</span>
            <input type="file" accept=".xlsx,.xls,.json,.txt" onChange={handleFileChange} disabled={isParsing} />
          </label>

          {error && (
            <div className="alert-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="import-mode">
            <span>导入方式</span>
            <div className="segmented-control">
              <button className={mode === 'merge' ? 'is-active' : ''} type="button" onClick={() => setMode('merge')}>
                合并新增
              </button>
              <button className={mode === 'replace' ? 'is-active' : ''} type="button" onClick={() => setMode('replace')}>
                替换当前数据
              </button>
              <button className={mode === 'append' ? 'is-active' : ''} type="button" onClick={() => setMode('append')}>
                直接追加
              </button>
            </div>
            <p className="helper-text">
              合并新增会按“成就名称+版本+合集”匹配已有记录，表格里的序号只作为行号处理。
            </p>
          </div>
        </section>

        <section className="panel mapping-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Mapping</p>
              <h3>{draft ? draft.fileName : '字段映射'}</h3>
            </div>
            {draft && <span className="badge">{draft.rows.length} 行</span>}
          </div>

          {!draft && (
            <div className="empty-state compact">
              <strong>等待导入文件</strong>
              <span>Excel 会按表头解析；JSON 或 TXT 文件需要包含合法 JSON 数组或数据对象。</span>
            </div>
          )}

          {draft && (
            <>
              {draft.notice && (
                <div className="alert-message info-message">
                  <AlertCircle size={18} />
                  <span>{draft.notice}</span>
                </div>
              )}

              <div className="mapping-grid">
                {getFieldOrder().map((field) => (
                  <label className="mapping-field" key={field}>
                    <span>
                      {FIELD_LABELS[field]}
                      {REQUIRED_FIELDS.includes(field) && <em>必填</em>}
                    </span>
                    <select value={draft.mappings[field] || ''} onChange={(event) => updateMapping(field, event.target.value)}>
                      <option value="">不导入</option>
                      {draft.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              {!canImport && (
                <div className="alert-message">
                  <AlertCircle size={18} />
                  <span>至少需要映射“成就名称”字段才能导入。</span>
                </div>
              )}

              <div className="preview-table-shell">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>成就名称</th>
                      <th>成就类型</th>
                      <th>版本</th>
                      <th>合集</th>
                      <th>来源</th>
                      <th>完成</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{record.name}</td>
                        <td>{record.achievementType}</td>
                        <td>{record.version}</td>
                        <td>{record.collection}</td>
                        <td>{record.source || '-'}</td>
                        <td>{record.completed ? '完成' : '未完成'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="primary-button full-width" type="button" disabled={!canImport} onClick={applyImport}>
                <Check size={18} />
                应用导入
              </button>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
