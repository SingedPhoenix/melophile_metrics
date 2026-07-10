import { useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import { openSpotifySearch, openSpotifyUrl } from '../../shared/spotifyLinks';
import { useDesktopStatus, useYearlyListeningRollups } from '../../shared/useDesktopStatus';
import {
  labelForMetric,
  PastTenseCachedTrack,
  PastTenseCacheStats,
  PastTenseMatchStats,
  PastTenseMetric,
  PastTensePlaylist,
  readPastTensePlaylistTracks,
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
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const { invalidate, isLoadingScrobbles, matchStats, playlists, snapshot, trackPlayCounts } = usePastTenseData();
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
  const weakMatches = useMemo(
    () => playlists
      .filter(playlist => Number(playlist.sqliteMatchTrackTotal || 0) > 0)
      .sort((a, b) => matchRate(a) - matchRate(b) || b.year - a.year)
      .slice(0, 6),
    [playlists]
  );
  const selectedPlaylist = selectedPlaylistId
    ? playlists.find(playlist => playlist.id === selectedPlaylistId) || null
    : null;
  const selectedTracks = useMemo(
    () => selectedPlaylistId ? readPastTensePlaylistTracks(selectedPlaylistId) : [],
    [selectedPlaylistId, snapshot.stats.cachedTracks, snapshot.stats.updatedAtMs]
  );

  if (selectedPlaylist) {
    return (
      <PastTenseDetail
        playlist={selectedPlaylist}
        playlistRank={playlistRank(selectedPlaylist, playlists)}
        trackPlayCounts={trackPlayCounts}
        tracks={selectedTracks}
        onBack={() => setSelectedPlaylistId(null)}
      />
    );
  }

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

      {weakMatches.length > 0 && <MatchWatchlistPanel playlists={weakMatches} />}

      <section className="playlist-family" aria-labelledby="release-year-volumes">
        <div className="section-heading">
          <div>
            <h2 id="release-year-volumes">release-year volumes</h2>
            <p>{playlists.length} release-year playlists loaded</p>
          </div>
          <CacheStatus
            hasSqliteCounts={playlists.some(playlist => playlist.scrobbleCountSource === 'sqlite')}
            isLoadingScrobbles={isLoadingScrobbles}
            matchStats={matchStats}
            stats={snapshot.stats}
            onRefresh={invalidate}
          />
        </div>
        <div className="playlist-grid">
          {playlists.map(playlist => (
            <PlaylistCard key={playlist.year} playlist={playlist} onOpenDetail={setSelectedPlaylistId} />
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
  matchStats,
  stats,
  onRefresh
}: {
  hasSqliteCounts: boolean;
  isLoadingScrobbles: boolean;
  matchStats: PastTenseMatchStats | null;
  stats: PastTenseCacheStats;
  onRefresh: () => void;
}) {
  const cacheLabel = stats.cachedPlaylists
    ? `${stats.cachedPlaylists} playlists · ${stats.cachedTracks.toLocaleString()} cached tracks`
    : `${stats.playlistDetails} playlist records · cache pending`;
  const sqliteLabel = sqliteMatchLabel(isLoadingScrobbles, hasSqliteCounts, matchStats);

  return (
    <button className="status-chip is-button" type="button" onClick={onRefresh}>
      {cacheLabel}{sqliteLabel}
    </button>
  );
}

function sqliteMatchLabel(isLoadingScrobbles: boolean, hasSqliteCounts: boolean, matchStats: PastTenseMatchStats | null) {
  if (isLoadingScrobbles) return ' · loading sqlite';
  if (matchStats?.totalTracks) {
    return ` · ${matchStats.matchedTracks.toLocaleString()}/${matchStats.totalTracks.toLocaleString()} sqlite-matched tracks`;
  }
  return hasSqliteCounts ? ' · sqlite listens' : '';
}

function MatchWatchlistPanel({ playlists }: { playlists: PastTensePlaylist[] }) {
  return (
    <section className="stats-panel match-watchlist" aria-labelledby="match-watchlist-title">
      <div className="panel-head">
        <div>
          <h2 id="match-watchlist-title">match watchlist</h2>
          <p>lowest SQLite coverage among cached playlists</p>
        </div>
      </div>
      <ol className="match-watchlist-grid">
        {playlists.map(playlist => {
          const matched = playlist.sqliteMatchedTracks || 0;
          const total = playlist.sqliteMatchTrackTotal || 0;
          const percent = total ? Math.round((matched / total) * 100) : 0;
          return (
            <li key={playlist.id}>
              <span>
                <strong>{playlist.year}</strong>
                <small>{playlist.name}</small>
              </span>
              <span className="match-meter" aria-label={`${matched} of ${total} tracks matched`}>
                <span style={{ width: `${Math.max(4, percent)}%` }} />
              </span>
              <span className="metric-value">{matched}/{total} · {percent}%</span>
              {Boolean(playlist.sqliteUnmatchedSamples?.length) && (
                <span className="match-samples">
                  {playlist.sqliteUnmatchedSamples?.map(sample => (
                    <button
                      key={`${playlist.id}-${sample.label}`}
                      type="button"
                      onClick={() => openSpotifySearch('track', sample.trackName, sample.artists[0] || '')}
                    >
                      {sample.label}
                    </button>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function matchRate(playlist: PastTensePlaylist) {
  const total = playlist.sqliteMatchTrackTotal || 0;
  return total ? (playlist.sqliteMatchedTracks || 0) / total : 1;
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

function PlaylistCard({ playlist, onOpenDetail }: { playlist: PastTensePlaylist; onOpenDetail: (playlistId: string) => void }) {
  const decadeClass = `decade-${Math.floor((playlist.year % 100) / 10)}`;
  const cover = playlist.imageUrl
    ? <img className="playlist-cover" src={playlist.imageUrl} alt="" />
    : <div className={`playlist-cover ${decadeClass}`} aria-hidden="true">'{String(playlist.year).slice(2)}</div>;

  return (
    <button
      className="playlist-card"
      type="button"
      aria-label={`open ${playlist.name} details`}
      onClick={() => onOpenDetail(playlist.id)}
    >
      {cover}
      <strong>{playlist.name}</strong>
      <span>{playlist.year} · {playlist.songCount.toLocaleString()} tracks · {songCountSourceLabel(playlist.songCountSource)}</span>
    </button>
  );
}

function songCountSourceLabel(source: PastTensePlaylist['songCountSource']) {
  if (source === 'cached-tracks') return 'track cache';
  if (source === 'spotify-playlist') return 'spotify total';
  return 'fallback';
}

function PastTenseDetail({
  playlist,
  playlistRank,
  trackPlayCounts,
  tracks,
  onBack
}: {
  playlist: PastTensePlaylist;
  playlistRank: string;
  trackPlayCounts: Record<string, number>;
  tracks: PastTenseCachedTrack[];
  onBack: () => void;
}) {
  const [artistMetric, setArtistMetric] = useState<PastTenseMetric>('songs');
  const summary = useMemo(() => summarizePlaylistTracks(tracks), [tracks]);
  const topArtists = useMemo(
    () => topPlaylistArtists(tracks, trackPlayCounts, playlist.id, artistMetric),
    [artistMetric, playlist.id, trackPlayCounts, tracks]
  );
  const cover = playlist.imageUrl
    ? <img className="past-tense-detail-cover" src={playlist.imageUrl} alt="" />
    : <div className="past-tense-detail-cover playlist-cover" aria-hidden="true">'{String(playlist.year).slice(2)}</div>;

  return (
    <section className="past-tense-detail-screen" aria-labelledby="past-tense-detail-title">
      <div className="detail-action-row">
        <button className="back-button" type="button" onClick={onBack}>back to years</button>
        <button className="status-chip is-button" type="button" onClick={() => openSpotifyUrl(playlist.url)}>
          open playlist in spotify
        </button>
      </div>

      <div className="past-tense-detail-hero">
        {cover}
        <div className="past-tense-detail-main">
          <p className="eyebrow">release-year volume</p>
          <h1 id="past-tense-detail-title">{playlist.name}</h1>
          <p className="screen-data-note">
            {tracks.length
              ? `${tracks.length.toLocaleString()} cached tracks from ${playlist.year}`
              : 'cached track details are pending for this playlist'}
          </p>
          <div className="past-tense-detail-metrics">
            <DetailMetric label="tracks" value={tracks.length.toLocaleString()} />
            <DetailMetric label="artists" value={summary.artistCount.toLocaleString()} />
            <DetailMetric label="albums" value={summary.albumCount.toLocaleString()} />
            <DetailMetric label="year rank" value={playlistRank} />
            <DetailMetric label="duration" value={formatLongDuration(summary.durationMs)} />
            <DetailMetric label="sqlite listens" value={playlist.scrobbleCount.toLocaleString()} />
          </div>
        </div>
      </div>

      {topArtists.length > 0 && (
        <section className="stats-panel past-tense-artist-panel" aria-labelledby="past-tense-artists-title">
          <div className="panel-head">
            <div>
              <h2 id="past-tense-artists-title">top artists of {playlist.year}</h2>
              <p>ranked by cached playlist {labelForMetric(artistMetric)}</p>
            </div>
            <MetricToggle label="past tense artist metric" value={artistMetric} options={metricOptions} onChange={setArtistMetric} />
          </div>
          <ol className="past-tense-artist-grid">
            {topArtists.map((artist, index) => (
              <li
                className="spotify-open-row"
                key={artist.key}
                role="button"
                tabIndex={0}
                title="open artist in spotify"
                onClick={() => openSpotifySearch('artist', artist.name)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openSpotifySearch('artist', artist.name);
                  }
                }}
              >
                <span className="rank">#{index + 1}</span>
                <strong>{artist.name}</strong>
                <span>{artist.value.toLocaleString()} {labelForMetric(artistMetric)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="stats-panel past-tense-track-panel" aria-labelledby="past-tense-tracks-title">
        <div className="panel-head">
          <div>
            <h2 id="past-tense-tracks-title">playlist tracks</h2>
            <p>{tracks.length ? 'cached Spotify track detail' : 'refresh the Past Tense cache to populate this list'}</p>
          </div>
        </div>
        {tracks.length ? (
          <ol className="past-tense-track-list">
            {tracks.map((track, index) => {
              const artists = trackArtists(track);
              const scrobbles = Number(trackPlayCounts[`${playlist.id}|||${index}`]) || 0;
              const spotifyUrl = track.uri || track.external_urls?.spotify || '';
              return (
                <li
                  className="spotify-open-row"
                  key={`${playlist.id}-${index}-${track.name || 'track'}`}
                  role="button"
                  tabIndex={0}
                  title="open track in spotify"
                  onClick={() => openTrack(track, artists, spotifyUrl)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openTrack(track, artists, spotifyUrl);
                    }
                  }}
                >
                  <span className="rank">#{index + 1}</span>
                  <span className="track-title-block">
                    <strong>{track.name || 'untitled track'}</strong>
                    <small>{artists.join(', ') || 'unknown artist'}{track.album?.name ? ` · ${track.album.name}` : ''}</small>
                  </span>
                  <span className="metric-value">{scrobbles.toLocaleString()} scrobbles</span>
                  <span className="track-duration">{formatDuration(track.duration_ms)}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="status-panel">
            <span className="status-panel-kicker">cache pending</span>
            <strong>track details are not cached yet</strong>
            <p>Use the Past Tense cache refresh from the legacy settings while this control is being migrated into React.</p>
          </div>
        )}
      </section>
    </section>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="past-tense-detail-metric">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function summarizePlaylistTracks(tracks: PastTenseCachedTrack[]) {
  const artists = new Set<string>();
  const albums = new Set<string>();
  const durationMs = tracks.reduce((sum, track) => {
    trackArtists(track).forEach(artist => artists.add(artist.toLowerCase()));
    const albumName = String(track.album?.name || '').trim();
    if (albumName) albums.add(`${trackArtists(track)[0] || ''}|||${albumName}`.toLowerCase());
    return sum + (Number(track.duration_ms) || 0);
  }, 0);

  return {
    albumCount: albums.size,
    artistCount: artists.size,
    durationMs
  };
}

function topPlaylistArtists(
  tracks: PastTenseCachedTrack[],
  trackPlayCounts: Record<string, number>,
  playlistId: string,
  metric: PastTenseMetric
) {
  const artists = tracks.reduce<Record<string, { key: string; name: string; songs: number; scrobbles: number }>>((result, track, index) => {
    const scrobbles = Number(trackPlayCounts[`${playlistId}|||${index}`]) || 0;
    trackArtists(track).forEach(name => {
      const key = name.toLowerCase();
      const current = result[key] || { key, name, songs: 0, scrobbles: 0 };
      current.songs += 1;
      current.scrobbles += scrobbles;
      result[key] = current;
    });
    return result;
  }, {});
  const metricKey = metric === 'scrobbles' ? 'scrobbles' : 'songs';
  return Object.values(artists)
    .map(artist => ({ ...artist, value: artist[metricKey] }))
    .sort((a, b) => b.value - a.value || b.songs - a.songs || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function playlistRank(playlist: PastTensePlaylist, playlists: PastTensePlaylist[]) {
  const current = playlist.songCount;
  if (!current) return 'pending';
  const rank = 1 + playlists.filter(row => row.songCount > current).length;
  const tie = playlists.filter(row => row.songCount === current).length > 1;
  return `#${rank.toLocaleString()}${tie ? ' tie' : ''}`;
}

function trackArtists(track: PastTenseCachedTrack) {
  return (track.artists || [])
    .map(artist => String(artist.name || '').trim())
    .filter(Boolean);
}

function openTrack(track: PastTenseCachedTrack, artists: string[], spotifyUrl: string) {
  if (spotifyUrl) {
    openSpotifyUrl(spotifyUrl);
    return;
  }
  openSpotifySearch('track', track.name || '', artists[0] || '');
}

function formatDuration(ms?: number) {
  const totalSeconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatLongDuration(ms: number) {
  let totalSeconds = Math.max(0, Math.round(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  return `${days}d : ${hours}h : ${minutes}m`;
}

export default PastTenseScreen;
