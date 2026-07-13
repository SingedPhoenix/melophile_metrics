import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import AppShell from './shared/AppShell';
import RouteErrorBoundary from './shared/RouteErrorBoundary';
import { applyThemeByName, readStoredThemeName } from './shared/themes';
import { useDesktopStatus, useListeningRollups, useRecentListening, useYearlyListeningRollups } from './shared/useDesktopStatus';
import './styles.css';

const DashboardScreen = lazy(() => import('./features/dashboard/DashboardScreen'));
const FreshScreen = lazy(() => import('./features/fresh/FreshScreen'));
const FrissonScreen = lazy(() => import('./features/frisson/FrissonScreen'));
const GemMinesScreen = lazy(() => import('./features/gem-mines/GemMinesScreen'));
const GhostedScreen = lazy(() => import('./features/ghosted/GhostedScreen'));
const PastTenseScreen = lazy(() => import('./features/past-tense/PastTenseScreen'));
const PulseScreen = lazy(() => import('./features/pulse/PulseScreen'));
const SettingsScreen = lazy(() => import('./features/settings/SettingsScreen'));

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
        />
      );

  return (
    <AppShell activeSection={activeSection} sections={sections} onNavigate={navigateToSection}>
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
  onNavigate
}: {
  latestListen?: { track: string; artist: string };
  scrobbleCount?: number;
  statusLabel: string;
  topArtist?: { artist: string; listens: number };
  topListeningYear?: { year: number; listens: number };
  onNavigate: (section: ActiveSection) => void;
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
          <button className="section-card" key={section.name} type="button" onClick={() => onNavigate(section.key)}>
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
