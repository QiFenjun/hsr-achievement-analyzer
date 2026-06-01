import { ChevronLeft, ChevronRight, FileUp, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AchievementItem, FocusedGroup, GroupDimension } from '../types';
import { GROUP_DIMENSIONS, GROUP_DIMENSION_LABELS, getGroupStats, getGroupValue } from '../utils/stats';

interface DataTableProps {
  records: AchievementItem[];
  focusedGroup: FocusedGroup | null;
  onAddRecord: () => void;
  onClearFocusedGroup: () => void;
  onDeleteRecord: (id: string) => void;
  onOpenImport: () => void;
  onUpdateRecord: (id: string, patch: Partial<AchievementItem>) => void;
}

type StatusFilter = 'all' | 'completed' | 'incomplete';
type EditableField =
  | 'name'
  | 'achievementType'
  | 'version'
  | 'collection'
  | 'source'
  | 'stellarJade'
  | 'note';

export function DataTable({
  records,
  focusedGroup,
  onAddRecord,
  onClearFocusedGroup,
  onDeleteRecord,
  onOpenImport,
  onUpdateRecord,
}: DataTableProps) {
  const [search, setSearch] = useState('');
  const [groupDimension, setGroupDimension] = useState<GroupDimension>(focusedGroup?.dimension || 'collection');
  const [groupFilter, setGroupFilter] = useState(focusedGroup?.value || 'all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const pageSize = 80;

  useEffect(() => {
    if (focusedGroup) {
      setGroupDimension(focusedGroup.dimension);
      setGroupFilter(focusedGroup.value);
    }
  }, [focusedGroup]);

  const groupOptions = useMemo(() => getGroupStats(records, groupDimension), [groupDimension, records]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          record.name,
          record.achievementType,
          record.version,
          record.collection,
          record.source,
          record.description,
          record.guide,
          record.reward,
          record.note,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      const matchesGroup = groupFilter === 'all' || getGroupValue(record, groupDimension) === groupFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && record.completed) ||
        (statusFilter === 'incomplete' && !record.completed);

      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [groupDimension, groupFilter, records, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [groupDimension, groupFilter, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRecords = filteredRecords.slice(pageStart, pageStart + pageSize);
  const pageEnd = Math.min(pageStart + pageSize, filteredRecords.length);

  function handleGroupDimensionChange(value: GroupDimension) {
    setGroupDimension(value);
    setGroupFilter('all');
    onClearFocusedGroup();
  }

  function handleGroupFilterChange(value: string) {
    setGroupFilter(value);
    if (focusedGroup && value !== focusedGroup.value) {
      onClearFocusedGroup();
    }
  }

  return (
    <section className="table-view">
      <div className="view-title-row">
        <div>
          <p className="eyebrow">Records</p>
          <h2>成就数据表</h2>
        </div>
        <div className="view-actions">
          <button className="ghost-button" type="button" onClick={onOpenImport}>
            <FileUp size={18} />
            批量导入
          </button>
          <button className="primary-button" type="button" onClick={onAddRecord}>
            <Plus size={18} />
            新增成就
          </button>
          <div className="table-count">
            {filteredRecords.length} / {records.length} 条
          </div>
        </div>
      </div>

      <div className="filter-bar expanded">
        <label className="search-field">
          <Search size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索成就名称、合集、攻略、备注或来源"
          />
        </label>

        <label className="select-field">
          <SlidersHorizontal size={18} />
          <select value={groupDimension} onChange={(event) => handleGroupDimensionChange(event.target.value as GroupDimension)}>
            {GROUP_DIMENSIONS.map((dimension) => (
              <option key={dimension} value={dimension}>
                {GROUP_DIMENSION_LABELS[dimension]}
              </option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <select value={groupFilter} onChange={(event) => handleGroupFilterChange(event.target.value)}>
            <option value="all">全部{GROUP_DIMENSION_LABELS[groupDimension]}</option>
            {groupOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value}（{option.total}）
              </option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="all">全部状态</option>
            <option value="completed">已完成</option>
            <option value="incomplete">未完成</option>
          </select>
        </label>

        {(search || groupFilter !== 'all' || statusFilter !== 'all') && (
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setSearch('');
              setGroupFilter('all');
              setStatusFilter('all');
              onClearFocusedGroup();
            }}
          >
            <X size={16} />
            清除筛选
          </button>
        )}
      </div>

      <div className="pagination-bar">
        <span>
          显示 {filteredRecords.length === 0 ? 0 : pageStart + 1}-{pageEnd} / {filteredRecords.length}
        </span>
        <div>
          <button className="ghost-button square-button" type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
            <ChevronLeft size={16} />
          </button>
          <strong>
            {safePage} / {totalPages}
          </strong>
          <button
            className="ghost-button square-button"
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="table-shell">
        <table className="record-table achievement-table">
          <thead>
            <tr>
              <th>完成</th>
              <th>成就名称</th>
              <th>成就类型</th>
              <th>版本</th>
              <th>合集</th>
              <th>来源</th>
              <th>星琼</th>
              <th>备注</th>
              <th>更新时间/时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pageRecords.map((record) => (
              <tr key={record.id}>
                <td>
                  <label className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={record.completed}
                      onChange={(event) => onUpdateRecord(record.id, { completed: event.target.checked })}
                    />
                    <span>{record.completed ? '完成' : '未完成'}</span>
                  </label>
                </td>
                <EditableCell record={record} field="name" onUpdateRecord={onUpdateRecord} wide />
                <EditableCell record={record} field="achievementType" onUpdateRecord={onUpdateRecord} />
                <EditableCell record={record} field="version" onUpdateRecord={onUpdateRecord} compact />
                <EditableCell record={record} field="collection" onUpdateRecord={onUpdateRecord} />
                <EditableCell record={record} field="source" onUpdateRecord={onUpdateRecord} />
                <EditableCell record={record} field="stellarJade" onUpdateRecord={onUpdateRecord} compact />
                <EditableCell record={record} field="note" onUpdateRecord={onUpdateRecord} wide />
                <td className="date-cell">{formatDate(record.completedAt || record.updatedAt)}</td>
                <td className="action-cell">
                  <button className="icon-button danger" type="button" onClick={() => onDeleteRecord(record.id)} title="删除成就">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRecords.length === 0 && (
          <div className="empty-state">
            <strong>没有匹配的成就</strong>
            <span>调整搜索词或筛选条件后再试。</span>
          </div>
        )}
      </div>
    </section>
  );
}

function EditableCell({
  record,
  field,
  onUpdateRecord,
  wide = false,
  compact = false,
}: {
  record: AchievementItem;
  field: EditableField;
  onUpdateRecord: (id: string, patch: Partial<AchievementItem>) => void;
  wide?: boolean;
  compact?: boolean;
}) {
  const className = [wide ? 'wide-cell' : '', compact ? 'compact-cell' : ''].filter(Boolean).join(' ');

  return (
    <td className={className}>
      <input
        className="cell-input"
        value={String(record[field] || '')}
        onChange={(event) => onUpdateRecord(record.id, { [field]: event.target.value })}
        aria-label={`${record.name} ${field}`}
      />
    </td>
  );
}

function formatDate(value?: string): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
