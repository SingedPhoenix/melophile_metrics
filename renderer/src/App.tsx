import { useState } from 'react';
import PastTenseScreen from './features/past-tense/PastTenseScreen';
import { useDesktopStatus, useListeningRollups, useRecentListening, useYearlyListeningRollups } from './shared/useDesktopStatus';
import './styles.css';

const sections = [
  { key: 'fresh', name: 'fresh', description: 'new-release discovery and playlist harvesting' },
  { key: 'pulse', name: 'pulse', description: 'rolling listening rankings and recent momentum' },
  { key: 'gem-mines', name: 'gem mines', description: 'tiered favorites across tracks, artists, and albums' },
  { key: 'past-tense', name: 'past tense', description: 'release-year playlist volumes and era analysis' },
  { key: 'dashboard', name: 'dashboard', description: 'high-level listening health and visual summaries' },
  { key: 'ghosted', name: 'ghosted', description: 'rediscovery queues for songs that fell quiet' },
  { key: 'frisson', name: 'frisson', description: 'emotion-forward listening and song attachment' },
  { key: 'settings', name: 'settings', description: 'connected accounts, local data, and appearance' }
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
        <p className="brand-note">react migration shell</p>
      </header>

      {activeSection !== 'home' && (
        <button className="back-button" type="button" onClick={() => setActiveSection('home')}>
          back to sections
        </button>
      )}

      {activeSection === 'past-tense' ? (
        <PastTenseScreen />
      ) : (
        <>
          <section className="migration-panel" aria-labelledby="migration-title">
            <div>
              <p className="eyebrow">parallel renderer</p>
              <h1 id="migration-title">the new architecture starts here</h1>
              <p className="intro">
                This React/Vite renderer is intentionally separate from the current app. It gives us a safe place to
                migrate screens into components while the vanilla HTML version remains available as the working fallback.
              </p>
            </div>
            <div className="status-card">
              <span className="status-label">current phase</span>
              <strong>{activeSection === 'home' ? 'first slice' : activeSection}</strong>
              <span className="status-detail">Past Tense is the first migrated component path</span>
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

          <section className="section-grid" aria-label="Planned app sections">
            {sections.map(section => (
              <button className="section-card" key={section.name} type="button" onClick={() => setActiveSection(section.key)}>
                <h2>{section.name}</h2>
                <p>{section.description}</p>
                <span>{section.key === 'past-tense' ? 'open migrated slice' : 'queued for migration'}</span>
              </button>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

export default App;
