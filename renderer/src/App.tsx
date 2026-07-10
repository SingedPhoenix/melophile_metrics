import './styles.css';

const sections = [
  { name: 'fresh', description: 'new-release discovery and playlist harvesting' },
  { name: 'pulse', description: 'rolling listening rankings and recent momentum' },
  { name: 'gem mines', description: 'tiered favorites across tracks, artists, and albums' },
  { name: 'past tense', description: 'release-year playlist volumes and era analysis' },
  { name: 'dashboard', description: 'high-level listening health and visual summaries' },
  { name: 'ghosted', description: 'rediscovery queues for songs that fell quiet' },
  { name: 'frisson', description: 'emotion-forward listening and song attachment' },
  { name: 'settings', description: 'connected accounts, local data, and appearance' }
];

function App() {
  return (
    <main className="app-shell">
      <header className="brand-header">
        <p className="brand-name">melophile metrics</p>
        <p className="brand-subtitle">your listening, quantified</p>
        <p className="brand-note">react migration shell</p>
      </header>

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
          <strong>shell scaffold</strong>
          <span className="status-detail">no production route switched yet</span>
        </div>
      </section>

      <section className="section-grid" aria-label="Planned app sections">
        {sections.map(section => (
          <article className="section-card" key={section.name}>
            <h2>{section.name}</h2>
            <p>{section.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
