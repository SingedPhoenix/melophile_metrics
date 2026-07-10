import { useState } from 'react';
import PastTenseScreen from './features/past-tense/PastTenseScreen';
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
