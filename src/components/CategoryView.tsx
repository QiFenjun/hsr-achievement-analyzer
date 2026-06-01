import { ArrowRight, CheckCircle2, CircleDashed, FolderOpen } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AchievementItem, GroupDimension } from '../types';
import { GROUP_DIMENSIONS, GROUP_DIMENSION_LABELS, getGroupStats, getGroupValue } from '../utils/stats';

interface CategoryViewProps {
  records: AchievementItem[];
  onOpenGroup: (dimension: GroupDimension, value: string) => void;
}

export function CategoryView({ records, onOpenGroup }: CategoryViewProps) {
  const [activeDimension, setActiveDimension] = useState<GroupDimension>('collection');
  const stats = getGroupStats(records, activeDimension);
  const [selectedValue, setSelectedValue] = useState(stats[0]?.value || '');

  useEffect(() => {
    setSelectedValue(getGroupStats(records, activeDimension)[0]?.value || '');
  }, [activeDimension, records]);

  const activeValue = selectedValue || stats[0]?.value || '';
  const activeItems = useMemo(
    () => records.filter((record) => getGroupValue(record, activeDimension) === activeValue),
    [activeDimension, activeValue, records],
  );

  return (
    <section className="category-view">
      <div className="view-title-row">
        <div>
          <p className="eyebrow">Groups</p>
          <h2>分组视图</h2>
        </div>
        {activeValue && (
          <button className="primary-button" type="button" onClick={() => onOpenGroup(activeDimension, activeValue)}>
            <ArrowRight size={18} />
            在表格中查看
          </button>
        )}
      </div>

      <div className="segmented-control dimension-tabs" aria-label="分组维度">
        {GROUP_DIMENSIONS.map((dimension) => (
          <button
            className={activeDimension === dimension ? 'is-active' : ''}
            key={dimension}
            type="button"
            onClick={() => setActiveDimension(dimension)}
          >
            {GROUP_DIMENSION_LABELS[dimension]}
          </button>
        ))}
      </div>

      <div className="category-layout">
        <div className="category-card-grid">
          {stats.map((stat) => (
            <button
              className={`category-card ${activeValue === stat.value ? 'is-selected' : ''}`}
              key={stat.value}
              type="button"
              onClick={() => setSelectedValue(stat.value)}
            >
              <div className="category-card-icon">
                <FolderOpen size={20} />
              </div>
              <div className="category-card-main">
                <div className="category-card-title">
                  <strong>{stat.value}</strong>
                  <span>{stat.rate}%</span>
                </div>
                <div className="progress-track" aria-hidden="true">
                  <span className="progress-fill" style={{ width: `${stat.rate}%` }} />
                </div>
                <div className="progress-meta">
                  <span>{stat.completed}/{stat.total}</span>
                  <span>{stat.incomplete} 未完成</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <aside className="panel category-detail">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Detail</p>
              <h3>{activeValue || '暂无分组'}</h3>
            </div>
          </div>

          <div className="category-item-list">
            {activeItems.map((item) => (
              <div className="category-item" key={item.id}>
                <div className={`status-dot ${item.completed ? 'is-done' : ''}`}>
                  {item.completed ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}
                </div>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.achievementType} · {item.version} · {item.collection} · {item.completed ? '完成' : '未完成'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
