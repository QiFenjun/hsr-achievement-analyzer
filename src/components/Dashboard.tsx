import { CheckCircle2, CircleDashed, Database, Percent, Upload } from 'lucide-react';
import type { AchievementItem, GroupDimension, GroupStat } from '../types';
import { GROUP_DIMENSIONS, GROUP_DIMENSION_LABELS, getGroupStats, getSummaryStats } from '../utils/stats';

interface DashboardProps {
  records: AchievementItem[];
  onOpenGroup: (dimension: GroupDimension, value: string) => void;
  onOpenImport: () => void;
}

export function Dashboard({ records, onOpenGroup, onOpenImport }: DashboardProps) {
  const summary = getSummaryStats(records);

  return (
    <section className="dashboard-view">
      <div className="view-title-row">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>星穹铁道成就完成度</h2>
        </div>
        <button className="primary-button" type="button" onClick={onOpenImport}>
          <Upload size={18} />
          导入数据
        </button>
      </div>

      <div className="summary-grid">
        <MetricCard label="成就总数" value={summary.total} icon={<Database size={20} />} tone="blue" />
        <MetricCard label="已完成" value={summary.completed} icon={<CheckCircle2 size={20} />} tone="green" />
        <MetricCard label="未完成" value={summary.incomplete} icon={<CircleDashed size={20} />} tone="orange" />
        <MetricCard label="完成率" value={`${summary.rate}%`} icon={<Percent size={20} />} tone="rose" />
      </div>

      <div className="dashboard-grid">
        <section className="panel wide-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Groups</p>
              <h3>分类统计</h3>
            </div>
          </div>

          <div className="group-stat-grid">
            {GROUP_DIMENSIONS.map((dimension) => (
              <GroupStatsPanel
                key={dimension}
                dimension={dimension}
                stats={getGroupStats(records, dimension)}
                onOpenGroup={onOpenGroup}
              />
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Signal</p>
              <h3>当前状态</h3>
            </div>
          </div>
          <div className="completion-ring" style={{ '--rate': `${summary.rate}%` } as React.CSSProperties}>
            <div>
              <strong>{summary.rate}%</strong>
              <span>完成率</span>
            </div>
          </div>
          <p className="panel-note">
            当前示例数据来自 4.3 版本成就大全。勾选完成状态或编辑备注后会自动保存到浏览器本地。
          </p>
        </section>
      </div>
    </section>
  );
}

function GroupStatsPanel({
  dimension,
  stats,
  onOpenGroup,
}: {
  dimension: GroupDimension;
  stats: GroupStat[];
  onOpenGroup: (dimension: GroupDimension, value: string) => void;
}) {
  return (
    <div className="group-stat-panel">
      <div className="group-stat-title">
        <strong>{GROUP_DIMENSION_LABELS[dimension]}</strong>
        <span>{stats.length} 组</span>
      </div>
      <div className="category-progress-list compact-list">
        {stats.map((stat) => (
          <button
            className="category-progress-row"
            key={`${dimension}-${stat.value}`}
            type="button"
            onClick={() => onOpenGroup(dimension, stat.value)}
          >
            <div className="progress-row-top">
              <span>{stat.value}</span>
              <strong>{stat.rate}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <span className="progress-fill" style={{ width: `${stat.rate}%` }} />
            </div>
            <div className="progress-meta">
              <span>{stat.completed} 已完成</span>
              <span>{stat.incomplete} 未完成</span>
              <span>{stat.total} 条</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: 'blue' | 'green' | 'orange' | 'rose';
}) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
