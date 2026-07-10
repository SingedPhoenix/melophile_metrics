import { useState } from 'react';
import DashboardScreen from './features/dashboard/DashboardScreen';
import FreshScreen from './features/fresh/FreshScreen';
import FrissonScreen from './features/frisson/FrissonScreen';
import GemMinesScreen from './features/gem-mines/GemMinesScreen';
import GhostedScreen from './features/ghosted/GhostedScreen';
import PastTenseScreen from './features/past-tense/PastTenseScreen';
import PulseScreen from './features/pulse/PulseScreen';
import SettingsScreen from './features/settings/SettingsScreen';
import { useDesktopStatus, useListeningRollups, useRecentListening, useYearlyListeningRollups } from './shared/useDesktopStatus';
import './styles.css';

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

function App() {
  const [activeSection, setActiveSection] = useState<SectionKey | 'home'>('home');
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

  return (
    <main className="app-shell">
      <header className="brand-header">
        <p className="brand-name">melophile metrics</p>
        <p className="brand-subtitle">your listening, quantified</p>
        <p className="brand-note">desktop listening archive</p>
      </header>

      {activeSection !== 'home' && (
        <button className="back-button" type="button" onClick={() => setActiveSection('home')}>
          sections
        </button>
      )}

      {activeSection === 'fresh' ? (
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
              <button className="section-card" key={section.name} type="button" onClick={() => setActiveSection(section.key)}>
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
      )}
    </main>
  );
}

export default App;
