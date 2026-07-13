import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import AppShell from './shared/AppShell';
import RouteErrorBoundary from './shared/RouteErrorBoundary';
import { applyThemeByName, readStoredThemeName } from './shared/themes';
import { useDesktopStatus, useListeningRollups, useRecentListening, useYearlyListeningRollups } from './shared/useDesktopStatus';
import './styles.css';

const routeLoaders = {
  dashboard: () => import('./features/dashboard/DashboardScreen'),
  fresh: () => import('./features/fresh/FreshScreen'),
  frisson: () => import('./features/frisson/FrissonScreen'),
  'gem-mines': () => import('./features/gem-mines/GemMinesScreen'),
  ghosted: () => import('./features/ghosted/GhostedScreen'),
  'past-tense': () => import('./features/past-tense/PastTenseScreen'),
  pulse: () => import('./features/pulse/PulseScreen'),
  settings: () => import('./features/settings/SettingsScreen')
};

const DashboardScreen = lazy(routeLoaders.dashboard);
const FreshScreen = lazy(routeLoaders.fresh);
const FrissonScreen = lazy(routeLoaders.frisson);
const GemMinesScreen = lazy(routeLoaders['gem-mines']);
const GhostedScreen = lazy(routeLoaders.ghosted);
const PastTenseScreen = lazy(routeLoaders['past-tense']);
const PulseScreen = lazy(routeLoaders.pulse);
const SettingsScreen = lazy(routeLoaders.settings);

const sections = [
  { key: 'fresh', name: 'fresh', description: 'new-release discovery and playlist harvesting', icon: '/assets/icons/cherries.svg' },
  { key: 'pulse', name: 'pulse', description: 'rolling listening rankings and recent momentum', icon: '/assets/icons/heartbeat-icon.svg' },
  { key: 'gem-mines', name: 'gem mines', description: 'tiered favorites across tracks, artists, and albums', icon: '/assets/icons/diamond-gem-icon.svg' },
  { key: 'past-tense', name: 'past tense', description: 'release-year playlist volumes and era analysis', icon: '/assets/icons/calendar-icon.svg' },
  { key: 'dashboard', name: 'dashboard', description: 'high-level listening health and visual summaries', icon: '/assets/icons/stats.svg' },
  { key: 'ghosted', name: 'ghosted', description: 'rediscovery queues for songs that fell quiet', icon: '/assets/icons/ghosted-clean.svg' },
  { key: 'frisson', name: 'frisson', description: 'emotion-forward listening and song attachment', icon: '/assets/icons/emotions.svg' },
  { key: 'settings', name: 'settings', description: 'connected accounts, local data, and appearance', icon: '/assets/icons/settings.svg' }
] as const;

type SectionKey = (typeof sections)[number]['key'];
type ActiveSection = SectionKey | 'home';

const sectionKeys = new Set<SectionKey>(sections.map(section => section.key));

function sectionFromHash(): ActiveSection {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  return sectionKeys.has(raw as SectionKey) ? raw as SectionKey : 'home';
}

function routeForSection(section: ActiveSection) {
  return section === 'home' ? '#/' : `#/${section}`;
}

function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>(() => sectionFromHash());
  const navigateToSection = useCallback((section: ActiveSection) => {
    setActiveSection(section);
    const nextRoute = routeForSection(section);
    if (window.location.hash !== nextRoute) window.location.hash = nextRoute;
  }, []);
  const preloadSection = useCallback((section: ActiveSection) => {
    if (section !== 'home') routeLoaders[section]();
  }, []);
  const desktopStatus = useDesktopStatus();
  const yearlyRollups = useYearlyListeningRollups();
  const listeningRollups = useListeningRollups();
  const recentListening = useRecentListening(1);
  const scrobbleCount = desktopStatus.data?.scrobbles;
  const topListeningYear = yearlyRollups.data?.topYears?.[0];
  const topArtist = listeningRollups.data?.topArtists?.[0];
  const latestListen = recentListening.data?.scrobbles?.[0];
  const statusLabel = typeof scrobbleCount === 'number'
    ? `${scrobbleCount.toLocaleString()} sqlite scrobbles`
    : desktopStatus.isFetching
      ? 'checking sqlite'
      : 'browser fallback';

  useEffect(() => {
    const syncSectionFromHash = () => setActiveSection(sectionFromHash());
    window.addEventListener('hashchange', syncSectionFromHash);
    return () => window.removeEventListener('hashchange', syncSectionFromHash);
  }, []);
  useEffect(() => {
    applyThemeByName(readStoredThemeName());
  }, []);

  const screen = activeSection === 'fresh' ? (
        <FreshScreen />
      ) : activeSection === 'frisson' ? (
        <FrissonScreen />
      ) : activeSection === 'settings' ? (
        <SettingsScreen />
      ) : activeSection === 'ghosted' ? (
        <GhostedScreen />
      ) : activeSection === 'gem-mines' ? (
        <GemMinesScreen />
      ) : activeSection === 'dashboard' ? (
        <DashboardScreen />
      ) : activeSection === 'pulse' ? (
        <PulseScreen />
      ) : activeSection === 'past-tense' ? (
        <PastTenseScreen />
      ) : (
        <HomeScreen
          latestListen={latestListen}
          scrobbleCount={scrobbleCount}
          statusLabel={statusLabel}
          topArtist={topArtist}
          topListeningYear={topListeningYear}
          onNavigate={navigateToSection}
          onPreviewSection={preloadSection}
        />
      );

  return (
    <AppShell
      activeSection={activeSection}
      sections={sections}
      onNavigate={navigateToSection}
      onPreviewSection={preloadSection}
    >
      <RouteErrorBoundary resetKey={activeSection}>
        <Suspense fallback={<RouteLoadingPanel section={activeSection} />}>
          {screen}
        </Suspense>
      </RouteErrorBoundary>
    </AppShell>
  );
}

function RouteLoadingPanel({ section }: { section: ActiveSection }) {
  const label = section === 'home' ? 'sections' : section.replace('-', ' ');
  return (
    <section className="route-state-panel route-loading-panel" aria-label="Loading section">
      <span className="status-label">loading</span>
      <strong>{label}</strong>
      <span className="status-detail data-status">preparing this listening view</span>
    </section>
  );
}

function HomeScreen({
  latestListen,
  scrobbleCount,
  statusLabel,
  topArtist,
  topListeningYear,
  onNavigate,
  onPreviewSection
}: {
  latestListen?: { track: string; artist: string };
  scrobbleCount?: number;
  statusLabel: string;
  topArtist?: { artist: string; listens: number };
  topListeningYear?: { year: number; listens: number };
  onNavigate: (section: ActiveSection) => void;
  onPreviewSection: (section: ActiveSection) => void;
}) {
  return (
    <>
      <section className="home-overview" aria-labelledby="home-title">
        <div>
          <p className="eyebrow">listening command center</p>
          <h1 id="home-title">choose a listening lens</h1>
          <p className="intro">
            Browse your local scrobble history, release-year playlists, Spotify-linked rankings, and data settings
            from one desktop workspace.
          </p>
        </div>
        <div className="home-status-card">
          <span className="status-label">local archive</span>
          <strong>{typeof scrobbleCount === 'number' ? scrobbleCount.toLocaleString() : 'checking'}</strong>
          <span className="status-detail data-status">{statusLabel}</span>
          {topListeningYear && (
            <span className="status-detail data-status">
              top year {topListeningYear.year} · {topListeningYear.listens.toLocaleString()} listens
            </span>
          )}
          {topArtist && (
            <span className="status-detail data-status">
              top artist {topArtist.artist} · {topArtist.listens.toLocaleString()} listens
            </span>
          )}
          {latestListen && (
            <span className="status-detail data-status">
              latest {latestListen.track} · {latestListen.artist}
            </span>
          )}
        </div>
      </section>

      <section className="section-grid" aria-label="App sections">
        {sections.map(section => (
          <button
            className="section-card"
            key={section.name}
            type="button"
            onFocus={() => onPreviewSection(section.key)}
            onMouseEnter={() => onPreviewSection(section.key)}
            onClick={() => onNavigate(section.key)}
          >
            <span className="section-icon-wrap">
              <img src={section.icon} alt="" aria-hidden="true" />
            </span>
            <h2>{section.name}</h2>
            <p>{section.description}</p>
            <span className="section-card-action">open</span>
          </button>
        ))}
      </section>
    </>
  );
}

export default App;
