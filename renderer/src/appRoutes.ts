import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export const sections = [
  { key: 'fresh', name: 'fresh', description: 'new-release discovery and playlist harvesting', icon: '/assets/icons/cherries.svg' },
  { key: 'pulse', name: 'pulse', description: 'rolling listening rankings and recent momentum', icon: '/assets/icons/heartbeat-icon.svg' },
  { key: 'gem-mines', name: 'gem mines', description: 'tiered favorites across tracks, artists, and albums', icon: '/assets/icons/diamond-gem-icon.svg' },
  { key: 'past-tense', name: 'past tense', description: 'release-year playlist volumes and era analysis', icon: '/assets/icons/calendar-icon.svg' },
  { key: 'dashboard', name: 'dashboard', description: 'high-level listening health and visual summaries', icon: '/assets/icons/stats.svg' },
  { key: 'ghosted', name: 'ghosted', description: 'rediscovery queues for songs that fell quiet', icon: '/assets/icons/ghosted-clean.svg' },
  { key: 'frisson', name: 'frisson', description: 'emotion-forward listening and song attachment', icon: '/assets/icons/emotions.svg' },
  { key: 'settings', name: 'settings', description: 'connected accounts, local data, and appearance', icon: '/assets/icons/settings.svg' }
] as const;

export type SectionKey = (typeof sections)[number]['key'];
export type ActiveSection = SectionKey | 'home';

type RouteModule = { default: ComponentType };
type RouteLoader = () => Promise<RouteModule>;

export const routeLoaders = {
  dashboard: () => import('./features/dashboard/DashboardScreen'),
  fresh: () => import('./features/fresh/FreshScreen'),
  frisson: () => import('./features/frisson/FrissonScreen'),
  'gem-mines': () => import('./features/gem-mines/GemMinesScreen'),
  ghosted: () => import('./features/ghosted/GhostedScreen'),
  'past-tense': () => import('./features/past-tense/PastTenseScreen'),
  pulse: () => import('./features/pulse/PulseScreen'),
  settings: () => import('./features/settings/SettingsScreen')
} satisfies Record<SectionKey, RouteLoader>;

export const routeScreens = {
  dashboard: lazy(routeLoaders.dashboard),
  fresh: lazy(routeLoaders.fresh),
  frisson: lazy(routeLoaders.frisson),
  'gem-mines': lazy(routeLoaders['gem-mines']),
  ghosted: lazy(routeLoaders.ghosted),
  'past-tense': lazy(routeLoaders['past-tense']),
  pulse: lazy(routeLoaders.pulse),
  settings: lazy(routeLoaders.settings)
} satisfies Record<SectionKey, LazyExoticComponent<ComponentType>>;

const sectionKeys = new Set<SectionKey>(sections.map(section => section.key));

export function sectionFromHash(hash = window.location.hash): ActiveSection {
  const raw = hash.replace(/^#\/?/, '').trim();
  return sectionKeys.has(raw as SectionKey) ? raw as SectionKey : 'home';
}

export function routeForSection(section: ActiveSection) {
  return section === 'home' ? '#/' : `#/${section}`;
}

export function preloadSection(section: ActiveSection) {
  if (section !== 'home') routeLoaders[section]();
}
