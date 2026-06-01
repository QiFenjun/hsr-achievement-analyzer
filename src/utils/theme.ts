import type { ThemeMode } from '../types';

const THEME_STORAGE_KEY = 'game-completion-analyzer.theme.v1';
let themeTransitionTimer: number | undefined;

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
    const previousTheme = document.documentElement.dataset.theme;

    if (previousTheme && previousTheme !== resolved) {
      window.clearTimeout(themeTransitionTimer);
      document.documentElement.classList.add('theme-transitioning');
      themeTransitionTimer = window.setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 320);
    }

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
