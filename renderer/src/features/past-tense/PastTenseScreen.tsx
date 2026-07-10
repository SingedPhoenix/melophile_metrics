import { useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import { useDesktopStatus, useYearlyListeningRollups } from '../../shared/useDesktopStatus';
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

type AnnualMetricRow = {
  year: number;
  name: string;
  value: number;
};

function PastTenseScreen() {
  const [metric, setMetric] = useState<PastTenseMetric>('songs');
  const { invalidate, isLoadingScrobbles, playlists, snapshot } = usePastTenseData();
  const desktopStatus = useDesktopStatus();
  const yearlyRollups = useYearlyListeningRollups();
  const scrobbleCount = desktopStatus.data?.scrobbles;
  const label = labelForMetric(metric);
  const sqliteYearlyRows = useMemo(
    () => (yearlyRollups.data?.years || []).map(row => ({
      year: row.year,
      name: 'Last.fm listening year',
      value: row.listens
    })),
    [yearlyRollups.data?.years]
  );
  const playlistMetricRows = useMemo(
    () => playlists.map(playlist => ({
      year: playlist.year,
      name: playlist.name,
      value: valueForMetric(playlist, metric)
    })),
    [metric, playlists]
  );
  const metricRows = metric === 'scrobbles' && sqliteYearlyRows.length ? sqliteYearlyRows : playlistMetricRows;
  const metricSource = metric === 'scrobbles' && sqliteYearlyRows.length
    ? 'annual listening'
    : 'playlist';
  const ranked = useMemo(
    () => [...metricRows].sort((a, b) => b.value - a.value || b.year - a.year).slice(0, 10),
    [metricRows]
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
        <TopYearsPanel label={label} metricSource={metricSource} rows={ranked} />
        <TrendPanel label={label} metricSource={metricSource} rows={metricRows} metric={metric} onMetricChange={setMetric} />
      </div>

      <section className="playlist-family" aria-labelledby="release-year-volumes">
        <div className="section-heading">
          <div>
            <h2 id="release-year-volumes">release-year volumes</h2>
            <p>{playlists.length} release-year playlists loaded</p>
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
  metricSource: string;
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

function TopYearsPanel({ label, metricSource, rows }: MetricPanelProps & { rows: AnnualMetricRow[] }) {
  return (
    <article className="stats-panel">
      <div className="panel-head">
        <div>
          <h2>top years</h2>
          <p>ranked by {metricSource} {label}</p>
        </div>
      </div>
      <ol className="top-year-list">
        {rows.map((row, index) => (
          <li className={row.year === currentYear ? 'is-current' : ''} key={row.year}>
            <span className="rank">#{index + 1}</span>
            <span>
              <strong>{row.year}{row.year === currentYear ? ' · current year' : ''}</strong>
              <small>{row.name}</small>
            </span>
            <span className="metric-value">{row.value.toLocaleString()} {label}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

function TrendPanel({
  label,
  metricSource,
  metric,
  rows,
  onMetricChange
}: MetricPanelProps & { metric: PastTenseMetric; rows: AnnualMetricRow[]; onMetricChange: (metric: PastTenseMetric) => void }) {
  const max = Math.max(...rows.map(row => row.value), 1);
  const visibleTicks = rows.filter(row => row.year % 5 === 0 || row.year === currentYear);

  return (
    <article className="stats-panel trend-panel">
      <div className="panel-head">
        <div>
          <h2>annual preference trend</h2>
          <p>{metricSource} {label} by year</p>
        </div>
        <MetricToggle label="past tense metric" value={metric} options={metricOptions} onChange={onMetricChange} />
      </div>
      <div className="trend-chart" aria-label={`Past Tense ${label} trend`}>
        {rows.map(row => {
          const value = row.value;
          const height = Math.max(6, Math.round((value / max) * 100));
          return (
            <div className="trend-bar-wrap" key={row.year}>
              <div className={row.year === currentYear ? 'trend-bar is-current' : 'trend-bar'} style={{ height: `${height}%` }}>
                <span>{value.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="trend-axis">
        {visibleTicks.map(row => (
          <span key={row.year}>{row.year}</span>
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
