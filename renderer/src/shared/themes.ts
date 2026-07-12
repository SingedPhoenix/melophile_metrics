export type ThemeDefinition = {
  name: string;
  family: string;
  colors: string[];
};

export const themeStorageKey = 'melophile.react.theme.v1';

export const themes: ThemeDefinition[] = [
  { name: 'amethyst dusk', family: 'purple', colors: ['#130a21', '#4b3173', '#b58bd4', '#d8bedf'] },
  { name: 'plum signal', family: 'purple', colors: ['#1b0717', '#6d184d', '#f21f98', '#cab0bb'] },
  { name: 'orchid smoke', family: 'purple', colors: ['#170d15', '#42243d', '#b77bad', '#fbf6fa'] },
  { name: 'electric orchid gradient', family: 'purple', colors: ['#240015', '#66003d', '#ff0099', '#fff4fc'] },
  { name: 'blush indigo', family: 'purple', colors: ['#47126b', '#6411ad', '#ea698b', '#fff4fa'] },
  { name: 'deep lagoon plum', family: 'purple', colors: ['#1b3a4b', '#4d194d', '#006466', '#f5fbfc'] },
  { name: 'lavender ink', family: 'purple', colors: ['#192a51', '#967aa1', '#d5c6e0', '#fdf8fa'] },
  { name: 'electric aqua violet', family: 'purple', colors: ['#480355', '#9448bc', '#90fcf9', '#f5ffff'] },
  { name: 'violet candyfloss', family: 'purple', colors: ['#6e44ff', '#b892ff', '#ff90b3', '#fbf7ff'] },
  { name: 'midnight current', family: 'blue', colors: ['#071023', '#17335e', '#6ca4cf', '#c9d5dd'] },
  { name: 'topaz mine', family: 'blue', colors: ['#09151b', '#1d5366', '#d5a12f', '#dad1bd'] },
  { name: 'regal navy', family: 'blue', colors: ['#000e23', '#023e97', '#68a4fd', '#f6faff'] },
  { name: 'federal blue scale', family: 'blue', colors: ['#001233', '#023e7d', '#0466c8', '#f6faff'] },
  { name: 'powder blue bloom', family: 'blue', colors: ['#64a6bd', '#90a8c3', '#d7b9d5', '#f7fcff'] },
  { name: 'glacier harbor', family: 'blue', colors: ['#16425b', '#2f6690', '#81c3d7', '#f6fbfd'] },
  { name: 'midnight cyan bloom', family: 'blue', colors: ['#36213e', '#63768d', '#8ac6d0', '#f8fdff'] },
  { name: 'harbor sage', family: 'blue', colors: ['#011936', '#465362', '#9fc490', '#f7faf6'] },
  { name: 'forest static', family: 'green', colors: ['#07130f', '#2e4b3e', '#adbaa0', '#d9d7cd'] },
  { name: 'moss radio', family: 'green', colors: ['#10170f', '#637320', '#c7e441', '#d4d0b8'] },
  { name: 'enchanted forest', family: 'green', colors: ['#10170c', '#456336', '#8fb87a', '#f8fcf6'] },
  { name: 'ash grey', family: 'green', colors: ['#101412', '#43564f', '#8ca69d', '#f8faf9'] },
  { name: 'sage meadow', family: 'green', colors: ['#4a7c59', '#68b0ab', '#c8d5b9', '#fffcf4'] },
  { name: 'willow smoke', family: 'green', colors: ['#567568', '#7f9172', '#c9b1bd', '#f8fafb'] },
  { name: 'earthen laurel', family: 'green', colors: ['#04724d', '#56876d', '#d2ab99', '#fbf7f4'] },
  { name: 'moss charcoal', family: 'green', colors: ['#28112b', '#453643', '#8daa91', '#f7faf7'] },
  { name: 'evergreen seafoam', family: 'green', colors: ['#364958', '#55828b', '#87bba2', '#f7fcf8'] },
  { name: 'prismatic harvest', family: 'green', colors: ['#006699', '#669900', '#ff9900', '#fcfff2'] },
  { name: 'golden grove twilight', family: 'gold', colors: ['#5d4a66', '#749c75', '#e9d985', '#fffcf1'] },
  { name: 'harvest olive sunset', family: 'gold', colors: ['#797d62', '#997b66', '#ffcb69', '#fff9ec'] },
  { name: 'ember archive', family: 'orange', colors: ['#190b05', '#7c2a08', '#ff6f31', '#d8b9a8'] },
  { name: 'neon tropic', family: 'orange', colors: ['#4b0082', '#2e8b57', '#ff4500', '#fff7f3'] },
  { name: 'woodland umber', family: 'orange', colors: ['#333d29', '#7f4f24', '#b6ad90', '#fbf8f1'] },
  { name: 'soft terracotta linen', family: 'orange', colors: ['#cb997e', '#a5a58d', '#ddbea9', '#fff9f4'] },
  { name: 'desert sage cream', family: 'orange', colors: ['#6b705c', '#725c50', '#ddbea9', '#fffaf2'] },
  { name: 'storm rose canyon', family: 'orange', colors: ['#355070', '#6d597a', '#eaac8b', '#fff7f2'] },
  { name: 'ember merlot', family: 'orange', colors: ['#4f000b', '#720026', '#ff7f51', '#fff6f2'] },
  { name: 'cocoa cream gradient', family: 'orange', colors: ['#503f32', '#765c4a', '#f1d7c4', '#fff8f2'] },
  { name: 'pastel blossom sky', family: 'pink', colors: ['#cdb4db', '#ffafcc', '#a2d2ff', '#fff6fa'] },
  { name: 'crimson petal gradient', family: 'pink', colors: ['#590d22', '#a4133c', '#ff8fa3', '#fff7f9'] },
  { name: 'pastel candy cloud', family: 'pink', colors: ['#ff99c8', '#a9def9', '#e4c1f9', '#fffbfd'] },
  { name: 'dusty rosewood', family: 'pink', colors: ['#735d78', '#b392ac', '#f7d1cd', '#fdf7f9'] },
  { name: 'bubblegum sunset', family: 'pink', colors: ['#ff69eb', '#ff86c8', '#ffdc5e', '#fffaf4'] },
  { name: 'sorbet plumfire', family: 'pink', colors: ['#311847', '#a01a7d', '#ef5d60', '#fff6f4'] },
  { name: 'verdant raspberry', family: 'pink', colors: ['#185e2c', '#632552', '#eb28b3', '#fff4fc'] },
  { name: 'silver room', family: 'neutral', colors: ['#0d0d0d', '#2d3131', '#8b8f91', '#eeeeee'] },
  { name: 'nocturne rose', family: 'neutral', colors: ['#22223b', '#4a4e69', '#c9ada7', '#fbf8f6'] },
  { name: 'linen taupe', family: 'neutral', colors: ['#2d2925', '#6f6259', '#d6ccc2', '#fdfbf8'] }
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
