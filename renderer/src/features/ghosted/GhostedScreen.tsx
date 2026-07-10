import { useMemo, useState } from 'react';
import { useGhostedTracks } from '../../shared/useDesktopStatus';

const thresholds = [3, 5, 10, 25];

function GhostedScreen() {
  const [minListens, setMinListens] = useState(5);
  const ghosted = useGhostedTracks(60, minListens);
  const tracks = ghosted.data?.tracks || [];
  const longestGone = tracks[0];
  const visibleTracks = tracks.slice(0, 30);
  const maxDays = Math.max(...visibleTracks.map(track => track.daysSinceLastPlayed), 1);
  const averageDays = useMemo(() => {
    if (!visibleTracks.length) return 0;
    return Math.round(visibleTracks.reduce((sum, track) => sum + track.daysSinceLastPlayed, 0) / visibleTracks.length);
  }, [visibleTracks]);

  return (
    <section className="ghosted-screen" aria-labelledby="ghosted-title">
      <div className="screen-title-block">
        <p className="eyebrow">rediscovery queue</p>
        <h1 id="ghosted-title">ghosted</h1>
        <p className="screen-data-note">
          {ghosted.isFetching ? 'searching quiet corners of sqlite history' : `tracks with at least ${minListens} listens`}
        </p>
      </div>

      <section className="ghosted-summary">
        <article className="stats-panel ghosted-hero">
          <p className="eyebrow">longest unheard favorite</p>
          <h2>{longestGone?.track || 'pending'}</h2>
          <p>{longestGone ? `${longestGone.artist}${longestGone.album ? ` · ${longestGone.album}` : ''}` : 'sqlite rollup pending'}</p>
          <strong>{longestGone ? longestGone.daysSinceLastPlayed.toLocaleString() : '-'}</strong>
          <span>days quiet</span>
        </article>

        <article className="stats-panel ghosted-controls">
          <div className="panel-head">
            <div>
              <h2>queue filter</h2>
              <p>minimum lifetime listens</p>
            </div>
          </div>
          <div className="threshold-row" role="group" aria-label="Minimum listens">
            {thresholds.map(threshold => (
              <button
                className={threshold === minListens ? 'pill active' : 'pill'}
                key={threshold}
                type="button"
                onClick={() => setMinListens(threshold)}
              >
                {threshold}+
              </button>
            ))}
          </div>
          <div className="ghosted-mini-stat">
            <span>average quiet span</span>
            <strong>{averageDays.toLocaleString()} days</strong>
          </div>
        </article>
      </section>

      <article className="stats-panel ghosted-list-panel">
        <div className="panel-head">
          <div>
            <h2>quiet favorites</h2>
            <p>oldest last-played tracks first</p>
          </div>
        </div>
        <ol className="ghosted-list">
          {visibleTracks.map(track => {
            const width = Math.max(8, Math.round((track.daysSinceLastPlayed / maxDays) * 100));
            return (
              <li key={`${track.rank}-${track.artist}-${track.track}`}>
                <span className="rank">#{track.rank}</span>
                <span className="ghosted-title-block">
                  <strong>{track.track}</strong>
                  <small>{track.artist}{track.album ? ` · ${track.album}` : ''}</small>
                </span>
                <span className="ghosted-listens">{track.listens.toLocaleString()} listens</span>
                <span className="ghosted-silence-track">
                  <span className="ghosted-silence-fill" style={{ width: `${width}%` }}>
                    <span>{track.daysSinceLastPlayed.toLocaleString()} days</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </article>
    </section>
  );
}

export default GhostedScreen;
