import {
  BarChart3,
  Download,
  FolderKanban,
  Link,
  Monitor,
  Moon,
  RotateCcw,
  Save,
  Sheet,
  Sun,
  Table2,
  ToggleLeft,
  ToggleRight,
  Unlink,
  Upload,
} from 'lucide-react';
import type { AchievementItem, GameDefinition, GameKey, SourceSyncUiState, ThemeMode } from '../types';
import { downloadSampleTemplate, exportRecordsToExcel } from '../utils/importExport';

type ViewKey = 'dashboard' | 'table' | 'categories' | 'import';

interface AppHeaderProps {
  activeView: ViewKey;
  activeGame: GameKey;
  games: GameDefinition[];
  records: AchievementItem[];
  sourceSync: SourceSyncUiState;
  themeMode: ThemeMode;
  onBindSource: () => void;
  onChangeGame: (game: GameKey) => void;
  onChangeThemeMode: (mode: ThemeMode) => void;
  onChangeView: (view: ViewKey) => void;
  onManualSync: () => void;
  onReset: () => void;
  onToggleAutoSync: () => void;
  onUnbindSource: () => void;
}

const navItems: Array<{ key: ViewKey; label: string; icon: typeof BarChart3 }> = [
  { key: 'dashboard', label: '总览', icon: BarChart3 },
  { key: 'table', label: '数据表', icon: Table2 },
  { key: 'categories', label: '分组', icon: FolderKanban },
  { key: 'import', label: '导入', icon: Upload },
];

export function AppHeader({
  activeView,
  activeGame,
  games,
  records,
  sourceSync,
  themeMode,
  onBindSource,
  onChangeGame,
  onChangeThemeMode,
  onChangeView,
  onManualSync,
  onReset,
  onToggleAutoSync,
  onUnbindSource,
}: AppHeaderProps) {
  const currentGame = games.find((game) => game.key === activeGame) || games[0];

  return (
    <header className="app-header">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <Sheet size={20} />
        </div>
        <div>
          <p className="eyebrow">Game Achievement Analyzer v{__APP_VERSION__}</p>
          <h1>{currentGame.title}</h1>
        </div>
      </div>

      <div className="header-toolbar">
        <div className="header-control-strip">
          <div className="segmented-control game-switcher" title="游戏">
            {games.map((game) => (
              <button
                key={game.key}
                className={activeGame === game.key ? 'is-active' : ''}
                type="button"
                onClick={() => onChangeGame(game.key)}
              >
                {game.shortLabel}
              </button>
            ))}
          </div>

          <nav className="nav-tabs" aria-label="主视图">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  aria-label={item.label}
                  className={`nav-tab ${activeView === item.key ? 'is-active' : ''}`}
                  title={item.label}
                  type="button"
                  onClick={() => onChangeView(item.key)}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="segmented-control theme-toggle" title="主题">
            <button
              aria-label="跟随系统主题"
              className={themeMode === 'system' ? 'is-active' : ''}
              type="button"
              onClick={() => onChangeThemeMode('system')}
            >
              <Monitor size={16} />
            </button>
            <button
              aria-label="深色主题"
              className={themeMode === 'dark' ? 'is-active' : ''}
              type="button"
              onClick={() => onChangeThemeMode('dark')}
            >
              <Moon size={16} />
            </button>
            <button
              aria-label="浅色主题"
              className={themeMode === 'light' ? 'is-active' : ''}
              type="button"
              onClick={() => onChangeThemeMode('light')}
            >
              <Sun size={16} />
            </button>
          </div>
          <button
            className={`icon-button ${sourceSync.bound ? 'is-bound' : ''}`}
            type="button"
            onClick={onBindSource}
            title={sourceSync.bound ? `已绑定：${sourceSync.fileName}` : sourceSync.message}
            disabled={!sourceSync.supported}
          >
            <Link size={18} />
            <span>{sourceSync.bound ? '源表' : '绑定源表'}</span>
          </button>
          {sourceSync.bound && (
            <>
              <button
                className="icon-button"
                type="button"
                onClick={onManualSync}
                title={sourceSync.message || '立即同步到源表'}
                disabled={sourceSync.status === 'syncing'}
              >
                <Save size={18} />
                <span>{sourceSync.status === 'syncing' ? '同步中' : '同步'}</span>
              </button>
              <button
                className={`icon-button ${sourceSync.autoSync ? 'is-bound' : ''}`}
                type="button"
                onClick={onToggleAutoSync}
                title={sourceSync.autoSync ? '自动同步已开启' : '自动同步已关闭'}
              >
                {sourceSync.autoSync ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                <span>自动</span>
              </button>
              <button className="icon-button muted" type="button" onClick={onUnbindSource} title="取消源表绑定">
                <Unlink size={18} />
              </button>
            </>
          )}
          <button className="icon-button" type="button" onClick={() => void downloadSampleTemplate()} title="下载 Excel 模板">
            <Download size={18} />
            <span>模板</span>
          </button>
          <button className="icon-button" type="button" onClick={() => void exportRecordsToExcel(records)} title="导出 Excel">
            <Download size={18} />
            <span>导出</span>
          </button>
          <button className="icon-button muted" type="button" onClick={onReset} title={`恢复${currentGame.resetLabel}`}>
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
