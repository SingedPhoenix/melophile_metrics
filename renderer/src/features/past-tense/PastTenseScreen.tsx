import { useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import { labelForMetric, pastTensePlaylists, PastTenseMetric, PastTensePlaylist, valueForMetric } from './pastTenseData';

const currentYear = new Date().getFullYear();
const metricOptions = [
  { value: 'songs', label: 'songs' },
  { value: 'scrobbles', label: 'scrobbles' }
] satisfies Array<{ value: PastTenseMetric; label: string }>;

function PastTenseScreen() {
  const [metric, setMetric] = useState<PastTenseMetric>('songs');
  const label = labelForMetric(metric);
  const ranked = useMemo(
    () => [...pastTensePlaylists].sort((a, b) => valueForMetric(b, metric) - valueForMetric(a, metric)).slice(0, 10),
    [metric]
  );

  return (
    <section className="past-tense-screen" aria-labelledby="past-tense-title">
      <div className="screen-title-block">
        <p className="eyebrow">release-date playlist family</p>
        <h1 id="past-tense-title">past tense</h1>
      </div>

      <div className="past-tense-stats">
        <TopYearsPanel label={label} metric={metric} playlists={ranked} />
        <TrendPanel label={label} metric={metric} onMetricChange={setMetric} />
      </div>

      <section className="playlist-family" aria-labelledby="release-year-volumes">
        <div className="section-heading">
          <div>
            <h2 id="release-year-volumes">release-year volumes</h2>
            <p>{pastTensePlaylists.length} release-year playlists mapped for migration</p>
          </div>
          <span className="status-chip">10-per-row grid target</span>
        </div>
        <div className="playlist-grid">
          {pastTensePlaylists.map(playlist => (
            <PlaylistCard key={playlist.year} playlist={playlist} />
          ))}
        </div>
      </section>
    </section>
  );
}

type MetricPanelProps = {
  label: string;
  metric: PastTenseMetric;
};

function TopYearsPanel({ label, metric, playlists }: MetricPanelProps & { playlists: PastTensePlaylist[] }) {
  return (
    <article className="stats-panel">
      <div className="panel-head">
        <div>
          <h2>top release years</h2>
          <p>ranked by playlist {label}</p>
        </div>
      </div>
      <ol className="top-year-list">
        {playlists.map((playlist, index) => (
          <li className={playlist.year === currentYear ? 'is-current' : ''} key={playlist.year}>
            <span className="rank">#{index + 1}</span>
            <span>
              <strong>{playlist.year}{playlist.year === currentYear ? ' · current year' : ''}</strong>
              <small>{playlist.name}</small>
            </span>
            <span className="metric-value">{valueForMetric(playlist, metric).toLocaleString()} {label}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

function TrendPanel({ label, metric, onMetricChange }: MetricPanelProps & { onMetricChange: (metric: PastTenseMetric) => void }) {
  const max = Math.max(...pastTensePlaylists.map(playlist => valueForMetric(playlist, metric)));
  const visibleTicks = pastTensePlaylists.filter(playlist => playlist.year % 5 === 0 || playlist.year === currentYear);

  return (
    <article className="stats-panel trend-panel">
      <div className="panel-head">
        <div>
          <h2>annual preference trend</h2>
          <p>playlist {label} by release year</p>
        </div>
        <MetricToggle label="past tense metric" value={metric} options={metricOptions} onChange={onMetricChange} />
      </div>
      <div className="trend-chart" aria-label={`Past Tense ${label} trend`}>
        {pastTensePlaylists.map(playlist => {
          const value = valueForMetric(playlist, metric);
          const height = Math.max(6, Math.round((value / max) * 100));
          return (
            <div className="trend-bar-wrap" key={playlist.year}>
              <div className={playlist.year === currentYear ? 'trend-bar is-current' : 'trend-bar'} style={{ height: `${height}%` }}>
                <span>{value.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="trend-axis">
        {visibleTicks.map(playlist => (
          <span key={playlist.year}>{playlist.year}</span>
        ))}
      </div>
    </article>
  );
}

function PlaylistCard({ playlist }: { playlist: PastTensePlaylist }) {
  const decadeClass = `decade-${Math.floor((playlist.year % 100) / 10)}`;

  return (
    <a className="playlist-card" href={playlist.url} aria-label={`${playlist.name} on Spotify`}>
      <div className={`playlist-cover ${decadeClass}`} aria-hidden="true">
        '{String(playlist.year).slice(2)}
      </div>
      <strong>{playlist.name}</strong>
      <span>{playlist.year} · {playlist.songCount.toLocaleString()} tracks</span>
    </a>
  );
}

export default PastTenseScreen;
