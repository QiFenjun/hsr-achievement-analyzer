import type { ThemeMode } from '../types';

const THEME_STORAGE_KEY = 'game-completion-analyzer.theme.v1';

export function loadThemeMode(): ThemeMode {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
}

export function saveThemeMode(mode: ThemeMode): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function applyThemeMode(mode: ThemeMode): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function apply() {
    const resolved = mode === 'system' ? (media.matches ? 'dark' : 'light') : mode;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themeMode = mode;
  }

  apply();

  if (mode !== 'system') {
    return () => undefined;
  }

  media.addEventListener('change', apply);
  return () => media.removeEventListener('change', apply);
}
