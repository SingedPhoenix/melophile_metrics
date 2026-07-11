import { useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import RankedBarList from '../../shared/RankedBarList';
import { openSpotifySearch } from '../../shared/spotifyLinks';
import StatusPanel from '../../shared/StatusPanel';
import { GhostedEntry, GhostedType, GhostedWindow, useGhostedTracks } from '../../shared/useDesktopStatus';

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
  const ghosted = useGhostedTracks(100, minListens, type, windowKey);
  const entries = (ghosted.data?.entries || ghosted.data?.tracks || []).filter(entry => !skippedKeys.includes(entry.key));
  const longestGone = entries[0];
  const visibleEntries = entries.slice(0, 60);
  const maxListens = Math.max(...visibleEntries.map(entry => entry.listens), 1);
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
            <p>{windowKey === 'all' ? `all-time archive · top 100 queue · ${type}` : `not played in ${currentWindow} · top 100 queue · ${type}`}</p>
          </div>
        </div>
        {visibleEntries.length ? (
          <RankedBarList
            ariaLabel="Quiet favorites"
            maxValue={maxListens}
            rows={visibleEntries.map(entry => ({
              barLabel: entry.listens.toLocaleString(),
              key: entry.key,
              meta: <button className="ghost-skip" type="button" onClick={event => {
                event.stopPropagation();
                setSkippedKeys(current => [...current, entry.key]);
              }}>skip</button>,
              onOpen: () => openGhostedEntry(entry),
              rank: entry.rank,
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

export default GhostedScreen;
