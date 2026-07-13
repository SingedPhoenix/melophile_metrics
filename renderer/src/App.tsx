import { Suspense, useCallback, useEffect, useState } from 'react';
import {
  type ActiveSection,
  preloadSection as preloadRouteSection,
  routeForSection,
  routeScreens,
  sectionFromHash,
  sections
} from './appRoutes';
import AppShell from './shared/AppShell';
import RouteErrorBoundary from './shared/RouteErrorBoundary';
import { applyThemeByName, readStoredThemeName } from './shared/themes';
import { useDesktopStatus, useListeningRollups, useRecentListening, useYearlyListeningRollups } from './shared/useDesktopStatus';
import './styles.css';

function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>(() => sectionFromHash());
  const navigateToSection = useCallback((section: ActiveSection) => {
    setActiveSection(section);
    const nextRoute = routeForSection(section);
    if (window.location.hash !== nextRoute) window.location.hash = nextRoute;
  }, []);
  const preloadSection = useCallback((section: ActiveSection) => {
    preloadRouteSection(section);
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

  const ActiveScreen = activeSection === 'home' ? null : routeScreens[activeSection];
  const screen = ActiveScreen ? (
    <ActiveScreen />
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
