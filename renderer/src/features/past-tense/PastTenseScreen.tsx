import { useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import { useDesktopStatus } from '../../shared/useDesktopStatus';
import {
  labelForMetric,
  PastTenseCacheStats,
  PastTenseMetric,
  PastTensePlaylist,
  valueForMetric
} from './pastTenseData';
import { usePastTenseData } from './usePastTenseData';

const currentYear = new Date().getFullYear();
const metricOptions = [
  { value: 'songs', label: 'songs' },
  { value: 'scrobbles', label: 'scrobbles' }
] satisfies Array<{ value: PastTenseMetric; label: string }>;

function PastTenseScreen() {
  const [metric, setMetric] = useState<PastTenseMetric>('songs');
  const { invalidate, isLoadingScrobbles, playlists, snapshot } = usePastTenseData();
  const desktopStatus = useDesktopStatus();
  const scrobbleCount = desktopStatus.data?.scrobbles;
  const label = labelForMetric(metric);
  const ranked = useMemo(
    () => [...playlists].sort((a, b) => valueForMetric(b, metric) - valueForMetric(a, metric)).slice(0, 10),
    [metric, playlists]
  );

  return (
    <section className="past-tense-screen" aria-labelledby="past-tense-title">
      <div className="screen-title-block">
        <p className="eyebrow">release-date playlist family</p>
        <h1 id="past-tense-title">past tense</h1>
        <p className="screen-data-note">
          {typeof scrobbleCount === 'number'
            ? `${scrobbleCount.toLocaleString()} sqlite scrobbles available`
            : 'sqlite listening history pending'}
        </p>
      </div>

      <div className="past-tense-stats">
        <TopYearsPanel label={label} metric={metric} playlists={ranked} />
        <TrendPanel label={label} metric={metric} playlists={playlists} onMetricChange={setMetric} />
      </div>

      <section className="playlist-family" aria-labelledby="release-year-volumes">
        <div className="section-heading">
          <div>
            <h2 id="release-year-volumes">release-year volumes</h2>
            <p>{playlists.length} release-year playlists mapped for migration</p>
          </div>
          <CacheStatus
            hasSqliteCounts={playlists.some(playlist => playlist.scrobbleCountSource === 'sqlite')}
            isLoadingScrobbles={isLoadingScrobbles}
            stats={snapshot.stats}
            onRefresh={invalidate}
          />
        </div>
        <div className="playlist-grid">
          {playlists.map(playlist => (
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

function CacheStatus({
  hasSqliteCounts,
  isLoadingScrobbles,
  stats,
  onRefresh
}: {
  hasSqliteCounts: boolean;
  isLoadingScrobbles: boolean;
  stats: PastTenseCacheStats;
  onRefresh: () => void;
}) {
  const cacheLabel = stats.cachedPlaylists
    ? `${stats.cachedPlaylists} playlists · ${stats.cachedTracks.toLocaleString()} cached tracks`
    : `${stats.playlistDetails} playlist records · cache pending`;
  const sqliteLabel = isLoadingScrobbles ? ' · loading sqlite' : hasSqliteCounts ? ' · sqlite listens' : '';

  return (
    <button className="status-chip is-button" type="button" onClick={onRefresh}>
      {cacheLabel}{sqliteLabel}
    </button>
  );
}

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

function TrendPanel({
  label,
  metric,
  playlists,
  onMetricChange
}: MetricPanelProps & { playlists: PastTensePlaylist[]; onMetricChange: (metric: PastTenseMetric) => void }) {
  const max = Math.max(...playlists.map(playlist => valueForMetric(playlist, metric)));
  const visibleTicks = playlists.filter(playlist => playlist.year % 5 === 0 || playlist.year === currentYear);

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
        {playlists.map(playlist => {
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
  const cover = playlist.imageUrl
    ? <img className="playlist-cover" src={playlist.imageUrl} alt="" />
    : <div className={`playlist-cover ${decadeClass}`} aria-hidden="true">'{String(playlist.year).slice(2)}</div>;

  return (
    <a className="playlist-card" href={playlist.url} aria-label={`${playlist.name} on Spotify`}>
      {cover}
      <strong>{playlist.name}</strong>
      <span>{playlist.year} · {playlist.songCount.toLocaleString()} tracks · {songCountSourceLabel(playlist.songCountSource)}</span>
    </a>
  );
}

function songCountSourceLabel(source: PastTensePlaylist['songCountSource']) {
  if (source === 'cached-tracks') return 'track cache';
  if (source === 'spotify-playlist') return 'spotify total';
  return 'fallback';
}

export default PastTenseScreen;
