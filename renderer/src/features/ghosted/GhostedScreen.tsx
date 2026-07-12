import { useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import RankedBarList from '../../shared/RankedBarList';
import { openSpotifySearch } from '../../shared/spotifyLinks';
import StatusPanel from '../../shared/StatusPanel';
import {
  ApotheosisArtist,
  GhostedEntry,
  GhostedType,
  GhostedWindow,
  useApotheosisWatchlist,
  useGhostedTracks
} from '../../shared/useDesktopStatus';

const thresholds = [3, 5, 10, 25];
const ghostedTypes = [
  { value: 'tracks', label: 'tracks' },
  { value: 'artists', label: 'artists' },
  { value: 'albums', label: 'albums' }
] satisfies Array<{ value: GhostedType; label: string }>;

const ghostedWindows = [
  { value: 6, label: '6 months' },
  { value: 12, label: '1 year' },
  { value: 24, label: '2 years' },
  { value: 36, label: '3 years' },
  { value: 48, label: '4 years' },
  { value: 60, label: '5 years' },
  { value: 120, label: '10 years' },
  { value: 'all', label: 'all-time' }
] satisfies Array<{ value: GhostedWindow; label: string }>;

function GhostedScreen() {
  const [minListens, setMinListens] = useState(5);
  const [type, setType] = useState<GhostedType>('tracks');
  const [windowKey, setWindowKey] = useState<GhostedWindow>(6);
  const [skippedKeys, setSkippedKeys] = useState<string[]>([]);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [apotheosisSkipped, setApotheosisSkipped] = useState<string[]>([]);
  const [apotheosisShuffleSeed, setApotheosisShuffleSeed] = useState(0);
  const ghosted = useGhostedTracks(100, minListens, type, windowKey);
  const expansion = useGhostedTracks(60, 1, 'artists', 6);
  const apotheosis = useApotheosisWatchlist(100, 6);
  const entries = useMemo(() => {
    const baseEntries = (ghosted.data?.entries || ghosted.data?.tracks || []).filter(entry => !skippedKeys.includes(entry.key));
    if (!shuffleSeed) return baseEntries;
    return baseEntries
      .slice()
      .sort((a, b) => seededSortValue(a.key, shuffleSeed) - seededSortValue(b.key, shuffleSeed));
  }, [ghosted.data?.entries, ghosted.data?.tracks, shuffleSeed, skippedKeys]);
  const expansionArtists = (expansion.data?.entries || []).slice(0, 12);
  const apotheosisArtists = useMemo(() => {
    const artists = (apotheosis.data?.artists || []).filter(artist => !apotheosisSkipped.includes(artist.key));
    if (!apotheosisShuffleSeed) return artists;
    return artists
      .slice()
      .sort((a, b) => seededSortValue(a.key, apotheosisShuffleSeed) - seededSortValue(b.key, apotheosisShuffleSeed));
  }, [apotheosis.data?.artists, apotheosisShuffleSeed, apotheosisSkipped]);
  const longestGone = entries[0];
  const visibleEntries = entries.slice(0, 60);
  const visibleApotheosis = apotheosisArtists.slice(0, 60);
  const maxListens = Math.max(...visibleEntries.map(entry => entry.listens), 1);
  const maxApotheosisListens = Math.max(...visibleApotheosis.map(artist => artist.listens), 1);
  const averageDays = useMemo(() => {
    if (!visibleEntries.length) return 0;
    return Math.round(visibleEntries.reduce((sum, entry) => sum + entry.daysSinceLastPlayed, 0) / visibleEntries.length);
  }, [visibleEntries]);
  const currentWindow = ghostedWindows.find(option => option.value === windowKey)?.label || String(windowKey);

  return (
    <section className="ghosted-screen" aria-labelledby="ghosted-title">
      <div className="screen-title-block">
        <p className="eyebrow">rediscovery queue</p>
        <h1 id="ghosted-title">ghosted</h1>
        <p className="screen-data-note">
          {ghosted.isFetching ? 'searching quiet corners of sqlite history' : `${type} not heard in ${currentWindow} · ${minListens}+ listens`}
        </p>
      </div>

      <section className="ghosted-summary">
        <article className="stats-panel ghosted-hero">
          <p className="eyebrow">quiet queue leader</p>
          <h2>{longestGone?.title || 'pending'}</h2>
          <p>{longestGone?.subtitle || 'sqlite rollup pending'}</p>
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
          <MetricToggle label="Ghosted entity type" value={type} options={ghostedTypes} onChange={nextType => {
            setType(nextType);
            setSkippedKeys([]);
            setShuffleSeed(0);
          }} />
          <div className="ghosted-window-row" role="group" aria-label="Ghosted window">
            {ghostedWindows.map(option => (
              <button
                className={option.value === windowKey ? 'pill active' : 'pill'}
                key={option.value}
                type="button"
                onClick={() => {
                  setWindowKey(option.value);
                  setSkippedKeys([]);
                  setShuffleSeed(0);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="threshold-row" role="group" aria-label="Minimum listens">
            {thresholds.map(threshold => (
              <button
                className={threshold === minListens ? 'pill active' : 'pill'}
                key={threshold}
                type="button"
                onClick={() => {
                  setMinListens(threshold);
                  setSkippedKeys([]);
                  setShuffleSeed(0);
                }}
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
            <p>{shuffleSeed ? `shuffled 100 queue · ${type}` : windowKey === 'all' ? `all-time archive · top 100 queue · ${type}` : `not played in ${currentWindow} · top 100 queue · ${type}`}</p>
          </div>
          <div className="ghosted-list-actions">
            <button
              className={shuffleSeed ? 'pill active' : 'pill'}
              type="button"
              onClick={() => setShuffleSeed(Date.now())}
            >
              reshuffle
            </button>
            <button
              className="pill"
              type="button"
              onClick={() => {
                setSkippedKeys([]);
                setShuffleSeed(0);
              }}
            >
              reset
            </button>
          </div>
        </div>
        {visibleEntries.length ? (
          <RankedBarList
            ariaLabel="Quiet favorites"
            maxValue={maxListens}
            rows={visibleEntries.map((entry, index) => ({
              barLabel: entry.listens.toLocaleString(),
              key: entry.key,
              meta: <button className="ghost-skip" type="button" onClick={event => {
                event.stopPropagation();
                setSkippedKeys(current => [...current, entry.key]);
              }}>skip</button>,
              onOpen: () => openGhostedEntry(entry),
              rank: shuffleSeed ? index + 1 : entry.rank,
              subtitle: `${entry.subtitle} · last heard ${entry.daysSinceLastPlayed.toLocaleString()} days ago`,
              title: entry.title,
              value: entry.listens
            }))}
          />
        ) : (
          <StatusPanel
            detail="Try another window, lower the listen threshold, reset skipped entries, or import more scrobble history."
            title={ghosted.isFetching ? 'building rediscovery queue' : 'no quiet favorites found'}
            variant={ghosted.isFetching ? 'loading' : 'empty'}
          />
        )}
        {skippedKeys.length > 0 && (
          <button className="pill ghosted-reset-skips" type="button" onClick={() => setSkippedKeys([])}>
            reset skipped
          </button>
        )}
      </article>

      <article className="stats-panel ghosted-expansion-panel" aria-labelledby="ghosted-expansion-title">
        <div className="panel-head">
          <div>
            <h2 id="ghosted-expansion-title">expansion watchlist</h2>
            <p>favorite artists whose recent listening record looks quiet</p>
          </div>
        </div>
        {expansionArtists.length ? (
          <div className="ghosted-expansion-list">
            {expansionArtists.map(artist => (
              <button
                className="ghosted-expansion-row spotify-open-row"
                key={artist.key}
                type="button"
                onClick={() => openSpotifySearch('artist', artist.artist)}
              >
                <span>
                  <strong>{artist.artist}</strong>
                  <small>last heard in your records · {formatGhostedDate(artist.lastPlayedUts)}</small>
                </span>
                <span className="fresh-release-tag">{artist.listens.toLocaleString()} plays</span>
              </button>
            ))}
          </div>
        ) : (
          <StatusPanel
            detail="Quiet favorite artists appear here when the six-month artist queue has rows."
            title={expansion.isFetching ? 'building expansion watchlist' : 'no quiet favorite artists found yet'}
            variant={expansion.isFetching ? 'loading' : 'empty'}
          />
        )}
      </article>

      <article className="stats-panel apotheosis-panel" aria-labelledby="apotheosis-title">
        <div className="panel-head">
          <div>
            <h2 id="apotheosis-title">apotheosis</h2>
            <p>{apotheosisShuffleSeed ? 'shuffled 100 artists' : 'top 100 artists'} · no newly-added track in the last 6 months</p>
          </div>
          <div className="apotheosis-actions">
            <button
              className={apotheosisShuffleSeed ? 'pill active' : 'pill'}
              type="button"
              onClick={() => setApotheosisShuffleSeed(Date.now())}
            >
              shuffle
            </button>
            <button
              className="pill"
              type="button"
              onClick={() => {
                setApotheosisSkipped([]);
                setApotheosisShuffleSeed(0);
              }}
            >
              reset skipped
            </button>
          </div>
        </div>

        {visibleApotheosis.length ? (
          <RankedBarList
            ariaLabel="Apotheosis artist watchlist"
            maxValue={maxApotheosisListens}
            rows={visibleApotheosis.map((artist, index) => ({
              barLabel: artist.listens.toLocaleString(),
              key: artist.key,
              meta: <button className="ghost-skip" type="button" onClick={event => {
                event.stopPropagation();
                setApotheosisSkipped(current => [...current, artist.key]);
              }}>skip</button>,
              onOpen: () => openSpotifySearch('artist', artist.artist),
              rank: apotheosisShuffleSeed ? index + 1 : artist.rank,
              subtitle: apotheosisSubtitle(artist),
              title: artist.artist,
              value: artist.listens
            }))}
          />
        ) : (
          <StatusPanel
            detail="Artists appear here when their newest first-seen track is older than the watchlist window."
            title={apotheosis.isFetching ? 'building artist watchlist' : 'no artists found for this watchlist'}
            variant={apotheosis.isFetching ? 'loading' : 'empty'}
          />
        )}
      </article>
    </section>
  );
}

function openGhostedEntry(entry: GhostedEntry) {
  if (entry.type === 'artists') {
    openSpotifySearch('artist', entry.artist);
  } else if (entry.type === 'albums') {
    openSpotifySearch('album', entry.album, entry.artist);
  } else {
    openSpotifySearch('track', entry.track, entry.artist);
  }
}

function apotheosisSubtitle(artist: ApotheosisArtist) {
  const months = artist.monthsSinceNewestTrack;
  const age = months ? `${months.toLocaleString()} months ago` : 'recently';
  return `newest track logged ${age} · ${artist.newestTrack}`;
}

function formatGhostedDate(uts: number) {
  if (!uts) return 'date pending';
  return new Date(uts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function seededSortValue(key: string, seed: number) {
  let hash = seed || 1;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export default GhostedScreen;
