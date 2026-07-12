export type ThemeDefinition = {
  name: string;
  family: string;
  colors: string[];
};

export const themeStorageKey = 'melophile.react.theme.v1';

export const themes: ThemeDefinition[] = [
  { name: 'amethyst dusk', family: 'purple', colors: ['#130a21', '#4b3173', '#b58bd4', '#d8bedf'] },
  { name: 'plum signal', family: 'purple', colors: ['#1b0717', '#6d184d', '#f21f98', '#cab0bb'] },
  { name: 'midnight current', family: 'blue', colors: ['#071023', '#17335e', '#6ca4cf', '#c9d5dd'] },
  { name: 'topaz mine', family: 'blue', colors: ['#09151b', '#1d5366', '#d5a12f', '#dad1bd'] },
  { name: 'forest static', family: 'green', colors: ['#07130f', '#2e4b3e', '#adbaa0', '#d9d7cd'] },
  { name: 'moss radio', family: 'green', colors: ['#10170f', '#637320', '#c7e441', '#d4d0b8'] },
  { name: 'ember archive', family: 'orange', colors: ['#190b05', '#7c2a08', '#ff6f31', '#d8b9a8'] },
  { name: 'silver room', family: 'neutral', colors: ['#0d0d0d', '#2d3131', '#8b8f91', '#eeeeee'] }
];

export function readStoredThemeName() {
  if (typeof window === 'undefined') return themes[0].name;
  return window.localStorage.getItem(themeStorageKey) || themes[4].name;
}

export function saveThemeName(name: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(themeStorageKey, name);
}

export function themeByName(name: string) {
  return themes.find(theme => theme.name === name) || themes[4];
}

export function applyThemeByName(name: string) {
  const theme = themeByName(name);
  if (typeof document === 'undefined') return theme;
  const [bg, surface, primary, text] = theme.colors;
  const secondary = theme.colors[1] || primary;
  const root = document.documentElement;
  root.style.setProperty('--mm-bg-start', mixHex(bg, surface, 0.18));
  root.style.setProperty('--mm-bg-mid', bg);
  root.style.setProperty('--mm-bg-end', mixHex(bg, '#000000', 0.18));
  root.style.setProperty('--mm-surface-tint-a', rgbaFromHex(primary, 0.07));
  root.style.setProperty('--mm-surface-tint-b', rgbaFromHex(secondary, 0.06));
  root.style.setProperty('--mm-glow-a', rgbaFromHex(primary, 0.32));
  root.style.setProperty('--mm-glow-b', rgbaFromHex(secondary, 0.22));
  root.style.setProperty('--mm-accent-primary', primary);
  root.style.setProperty('--mm-accent-secondary', secondary);
  root.style.setProperty('--mm-accent-primary-soft', rgbaFromHex(primary, 0.18));
  root.style.setProperty('--mm-accent-secondary-soft', rgbaFromHex(secondary, 0.14));
  root.style.setProperty('--mm-accent-border', rgbaFromHex(primary, 0.38));
  root.style.setProperty('--mm-accent-outline', rgbaFromHex(primary, 0.58));
  root.style.setProperty('--mm-accent-text', rgbaFromHex(primary, 0.78));
  root.style.setProperty('--mm-accent-alt-text', rgbaFromHex(secondary, 0.78));
  root.style.setProperty('--mm-bar-gradient', `linear-gradient(90deg, ${rgbaFromHex(primary, 0.9)}, ${rgbaFromHex(secondary, 0.78)})`);
  root.style.setProperty('--mm-text-bright', text || '#eeeeee');
  root.dataset.themeName = theme.name;
  return theme;
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return { r: 204, g: 204, b: 204 };
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function mixHex(a: string, b: string, weight = 0.5) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex({
    r: ca.r * (1 - weight) + cb.r * weight,
    g: ca.g * (1 - weight) + cb.g * weight,
    b: ca.b * (1 - weight) + cb.b * weight
  });
}

function rgbaFromHex(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
