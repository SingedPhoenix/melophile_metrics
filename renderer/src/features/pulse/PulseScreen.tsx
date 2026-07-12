import { useEffect, useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import RankedBarList from '../../shared/RankedBarList';
import { openSpotifySearch } from '../../shared/spotifyLinks';
import StatusPanel from '../../shared/StatusPanel';
import {
  RecentScrobble,
  RecentEntityRankingWindow,
  useListeningRollups,
  useRecentEntityRankings,
  useRecentListening,
  useYearlyEntityRankings,
  useYearlyListeningRollups,
  YearlyEntityRankingType
} from '../../shared/useDesktopStatus';

type PulsePath = 'hub' | 'last' | 'momentous';

const momentousModes = [
  { value: 'tracks', label: 'tracks' },
  { value: 'artists', label: 'artists' },
  { value: 'albums', label: 'albums' }
] satisfies Array<{ value: YearlyEntityRankingType; label: string }>;

const lastWindowOptions = [
  { value: '1', label: '1 month' },
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
  { value: '30', label: '30 months' },
  { value: '60', label: '60 months' },
  { value: '120', label: '120 months' },
  { value: 'cy', label: 'current year' }
] satisfies Array<{ value: RecentEntityRankingWindow; label: string }>;

const lastPageSize = 50;
const momentousPageSize = 50;

function PulseScreen() {
  const [activePath, setActivePath] = useState<PulsePath>('hub');
  const [lastType, setLastType] = useState<YearlyEntityRankingType>('tracks');
  const [lastWindow, setLastWindow] = useState<RecentEntityRankingWindow>('1');
  const [lastPage, setLastPage] = useState(0);
  const [momentousType, setMomentousType] = useState<YearlyEntityRankingType>('tracks');
  const [momentousYear, setMomentousYear] = useState<number | undefined>();
  const [momentousPage, setMomentousPage] = useState(0);
  const rollups = useListeningRollups();
  const yearly = useYearlyListeningRollups();
  const recent = useRecentListening(12);
  const last = useRecentEntityRankings(lastType, lastWindow, lastRankingLimit(lastType, lastWindow));
  const momentous = useYearlyEntityRankings(momentousYear, momentousType, 500);
  const topTracks = rollups.data?.topTracks.slice(0, 8) || [];
  const topArtists = rollups.data?.topArtists.slice(0, 8) || [];
  const recentScrobbles = recent.data?.scrobbles || [];
  const years = useMemo(() => yearly.data?.years.map(row => row.year) || [], [yearly.data?.years]);
  const monthBars = useMemo(() => {
    const months = rollups.data?.months || [];
    return months.slice(-18);
  }, [rollups.data?.months]);
  const maxMonth = Math.max(...monthBars.map(month => month.listens), 1);
  const lastRows = last.data?.rows || [];
  const lastPageCount = Math.max(1, Math.ceil(lastRows.length / lastPageSize));
  const visibleLastRows = lastRows.slice(lastPage * lastPageSize, lastPage * lastPageSize + lastPageSize);
  const maxLast = Math.max(...visibleLastRows.map(row => row.listens), 1);
  const lastStartRank = visibleLastRows[0]?.rank || 0;
  const lastEndRank = visibleLastRows[visibleLastRows.length - 1]?.rank || 0;
  const momentousRows = momentous.data?.rows || [];
  const momentousPageCount = Math.max(1, Math.ceil(momentousRows.length / momentousPageSize));
  const visibleMomentousRows = momentousRows.slice(
    momentousPage * momentousPageSize,
    momentousPage * momentousPageSize + momentousPageSize
  );
  const maxMomentous = Math.max(...visibleMomentousRows.map(row => row.listens), 1);
  const momentousStartRank = visibleMomentousRows[0]?.rank || 0;
  const momentousEndRank = visibleMomentousRows[visibleMomentousRows.length - 1]?.rank || 0;

  useEffect(() => {
    if (momentousYear || !years.length) return;
    const currentYear = new Date().getFullYear();
    setMomentousYear(years.includes(currentYear) ? currentYear : years[years.length - 1]);
  }, [momentousYear, years]);

  useEffect(() => {
    setLastPage(0);
  }, [lastWindow, lastType]);

  useEffect(() => {
    if (lastPage < lastPageCount) return;
    setLastPage(lastPageCount - 1);
  }, [lastPage, lastPageCount]);

  useEffect(() => {
    setMomentousPage(0);
  }, [momentousYear, momentousType]);

  useEffect(() => {
    if (momentousPage < momentousPageCount) return;
    setMomentousPage(momentousPageCount - 1);
  }, [momentousPage, momentousPageCount]);

  return (
    <section className="pulse-screen" aria-labelledby="pulse-title">
      <div className="screen-title-block">
        <p className="eyebrow">live listening signal</p>
        <h1 id="pulse-title">pulse</h1>
        <p className="screen-data-note">
          {rollups.isFetching || recent.isFetching ? 'refreshing sqlite listening rollups' : 'sqlite rollups online'}
        </p>
      </div>

      <section className="pulse-path-grid" aria-label="Pulse paths">
        <button
          className={activePath === 'last' ? 'pulse-path-card active' : 'pulse-path-card'}
          type="button"
          onClick={() => setActivePath('last')}
        >
          <span>last...</span>
          <small>dynamic rankings from rolling listening windows</small>
        </button>
        <button
          className={activePath === 'momentous' ? 'pulse-path-card active' : 'pulse-path-card'}
          type="button"
          onClick={() => setActivePath('momentous')}
        >
          <span>momentous</span>
          <small>static rankings from specific listening years</small>
        </button>
      </section>

      {activePath === 'hub' && (
        <div className="pulse-layout">
        <article className="stats-panel pulse-recent-panel">
          <div className="panel-head">
            <div>
              <h2>recent listens</h2>
              <p>latest stored Last.fm scrobbles</p>
            </div>
          </div>
          <ol className="pulse-list">
            {recentScrobbles.map(scrobble => (
              <RecentListenItem key={`${scrobble.playedAtUts}-${scrobble.artist}-${scrobble.track}`} scrobble={scrobble} />
            ))}
          </ol>
        </article>

        <div className="pulse-side-stack">
          <article className="stats-panel">
            <div className="panel-head">
              <div>
                <h2>top tracks</h2>
                <p>all-time sqlite rankings</p>
              </div>
            </div>
            <ol className="pulse-list compact">
              {topTracks.map(track => (
                <li
                  className="spotify-open-row"
                  key={`${track.rank}-${track.artist}-${track.track}`}
                  role="button"
                  tabIndex={0}
                  title="open track in spotify"
                  onClick={() => openSpotifySearch('track', track.track, track.artist)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openSpotifySearch('track', track.track, track.artist);
                    }
                  }}
                >
                  <span className="rank">#{track.rank}</span>
                  <span>
                    <strong>{track.track}</strong>
                    <small>{track.artist}</small>
                  </span>
                  <span className="metric-value">{track.listens.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          </article>

          <article className="stats-panel">
            <div className="panel-head">
              <div>
                <h2>top artists</h2>
                <p>all-time sqlite rankings</p>
              </div>
            </div>
            <ol className="pulse-list compact">
              {topArtists.map(artist => (
                <li
                  className="spotify-open-row"
                  key={`${artist.rank}-${artist.artist}`}
                  role="button"
                  tabIndex={0}
                  title="open artist in spotify"
                  onClick={() => openSpotifySearch('artist', artist.artist)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openSpotifySearch('artist', artist.artist);
                    }
                  }}
                >
                  <span className="rank">#{artist.rank}</span>
                  <span>
                    <strong>{artist.artist}</strong>
                    <small>{artist.listens.toLocaleString()} listens</small>
                  </span>
                </li>
              ))}
            </ol>
          </article>
        </div>
        </div>
      )}

      {activePath === 'hub' && (
        <article className="stats-panel pulse-month-panel">
        <div className="panel-head">
          <div>
            <h2>monthly activity</h2>
            <p>last 18 stored months</p>
          </div>
        </div>
        <div className="pulse-month-chart" aria-label="Monthly listening activity">
          {monthBars.map(month => {
            const height = Math.max(7, Math.round((month.listens / maxMonth) * 100));
            return (
              <div className="pulse-month" key={month.month}>
                <div className="pulse-month-bar" style={{ height: `${height}%` }}>
                  <span>{month.listens.toLocaleString()}</span>
                </div>
                <small>{month.month.slice(2)}</small>
              </div>
            );
          })}
        </div>
        </article>
      )}

      {activePath === 'last' && (
        <article className="stats-panel pulse-momentous-panel" aria-labelledby="last-title">
          <div className="panel-head">
            <div>
              <h2 id="last-title">last...</h2>
              <p>{last.data?.label ? `${last.data.label === 'current year' ? 'current year' : `last ${last.data.label}`} · top ${lastType}` : 'rolling-window rankings'}</p>
            </div>
            <MetricToggle
              label="Last ranking mode"
              value={lastType}
              options={momentousModes}
              onChange={setLastType}
            />
          </div>

          <div className="momentous-year-row" role="group" aria-label="Last listening window">
            {lastWindowOptions.map(option => (
              <button
                className={option.value === lastWindow ? 'pill active' : 'pill'}
                key={option.value}
                type="button"
                onClick={() => setLastWindow(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {visibleLastRows.length ? (
            <>
              <div className="momentous-page-row" aria-live="polite">
                <span>
                  showing #{lastStartRank.toLocaleString()}-#{lastEndRank.toLocaleString()} of {lastRows.length.toLocaleString()}
                </span>
                <div className="momentous-page-actions">
                  <button
                    className="pill"
                    type="button"
                    disabled={lastPage === 0}
                    onClick={() => setLastPage(page => Math.max(0, page - 1))}
                  >
                    previous 50
                  </button>
                  <button
                    className="pill"
                    type="button"
                    disabled={lastPage >= lastPageCount - 1}
                    onClick={() => setLastPage(page => Math.min(lastPageCount - 1, page + 1))}
                  >
                    next 50
                  </button>
                </div>
              </div>

              <RankedBarList
                ariaLabel={`Top ${lastType} for ${last.data?.label || lastWindow}`}
                maxValue={maxLast}
                rows={visibleLastRows.map(row => ({
                  barLabel: row.listens.toLocaleString(),
                  key: `last-${lastType}-${lastWindow}-${row.rank}-${row.artist}-${row.track || row.album || ''}`,
                  onOpen: () => {
                    if (lastType === 'artists') {
                      openSpotifySearch('artist', row.artist);
                    } else if (lastType === 'albums') {
                      openSpotifySearch('album', row.album || '', row.artist);
                    } else {
                      openSpotifySearch('track', row.track || '', row.artist);
                    }
                  },
                  rank: row.rank,
                  subtitle: lastType === 'artists' ? 'artist' : row.artist,
                  title: momentousTitle(row, lastType),
                  value: row.listens
                }))}
              />
            </>
          ) : (
            <StatusPanel
              detail="Last rankings appear after the local SQLite archive has listening rows inside the selected window."
              title={last.isFetching ? 'loading rolling rankings' : 'no last rows found'}
              variant={last.isFetching ? 'loading' : 'empty'}
            />
          )}
        </article>
      )}

      {activePath === 'momentous' && (
        <article className="stats-panel pulse-momentous-panel" aria-labelledby="momentous-title">
        <div className="panel-head">
          <div>
            <h2 id="momentous-title">momentous</h2>
            <p>{momentousYear ? `${momentousYear === new Date().getFullYear() ? 'current year' : momentousYear} · top ${momentousType}` : 'fixed-year rankings'}</p>
          </div>
          <MetricToggle
            label="Momentous ranking mode"
            value={momentousType}
            options={momentousModes}
            onChange={setMomentousType}
          />
        </div>

        <div className="momentous-year-row" role="group" aria-label="Momentous year">
          {years.map(year => (
            <button
              className={year === momentousYear ? 'pill active' : 'pill'}
              key={year}
              type="button"
              onClick={() => setMomentousYear(year)}
            >
              {year === new Date().getFullYear() ? 'current year' : year}
            </button>
          ))}
        </div>

        {visibleMomentousRows.length ? (
          <>
            <div className="momentous-page-row" aria-live="polite">
              <span>
                showing #{momentousStartRank.toLocaleString()}-#{momentousEndRank.toLocaleString()} of {momentousRows.length.toLocaleString()}
              </span>
              <div className="momentous-page-actions">
                <button
                  className="pill"
                  type="button"
                  disabled={momentousPage === 0}
                  onClick={() => setMomentousPage(page => Math.max(0, page - 1))}
                >
                  previous 50
                </button>
                <button
                  className="pill"
                  type="button"
                  disabled={momentousPage >= momentousPageCount - 1}
                  onClick={() => setMomentousPage(page => Math.min(momentousPageCount - 1, page + 1))}
                >
                  next 50
                </button>
              </div>
            </div>

            <RankedBarList
              ariaLabel={`Top ${momentousType} for ${momentousYear}`}
              maxValue={maxMomentous}
              rows={visibleMomentousRows.map(row => ({
                barLabel: row.listens.toLocaleString(),
                key: `${momentousType}-${momentousYear}-${row.rank}-${row.artist}-${row.track || row.album || ''}`,
                onOpen: () => {
                  if (momentousType === 'artists') {
                    openSpotifySearch('artist', row.artist);
                  } else if (momentousType === 'albums') {
                    openSpotifySearch('album', row.album || '', row.artist);
                  } else {
                    openSpotifySearch('track', row.track || '', row.artist);
                  }
                },
                rank: row.rank,
                subtitle: momentousType === 'artists' ? 'artist' : row.artist,
                title: momentousTitle(row, momentousType),
                value: row.listens
              }))}
            />
          </>
        ) : (
          <StatusPanel
            detail="Momentous rankings appear after yearly listening rows are available in the local SQLite archive."
            title={momentous.isFetching ? 'loading fixed-year rankings' : 'no momentous rows found'}
            variant={momentous.isFetching ? 'loading' : 'empty'}
          />
        )}
        </article>
      )}
    </section>
  );
}

function lastRankingLimit(type: YearlyEntityRankingType, windowKey: RecentEntityRankingWindow) {
  if (windowKey === 'cy') return 2500;
  const limits: Record<YearlyEntityRankingType, Partial<Record<RecentEntityRankingWindow, number>>> = {
    tracks: { '1': 100, '3': 150, '6': 250, '12': 500, '30': 1250, '60': 1750, '120': 2500 },
    artists: { '1': 100, '3': 150, '6': 250, '12': 500, '30': 1000, '60': 1250, '120': 1500 },
    albums: { '1': 100, '3': 150, '6': 250, '12': 500, '30': 750, '60': 1000, '120': 1250 }
  };
  return limits[type][windowKey] || 100;
}

function momentousTitle(
  row: { artist: string; track?: string; album?: string },
  type: YearlyEntityRankingType
) {
  if (type === 'artists') return row.artist;
  if (type === 'albums') return row.album || 'untitled album';
  return row.track || 'untitled track';
}

function RecentListenItem({ scrobble }: { scrobble: RecentScrobble }) {
  const playedAt = new Date(scrobble.playedAtIso);
  const dateLabel = Number.isNaN(playedAt.getTime())
    ? 'date pending'
    : playedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <li
      className="spotify-open-row"
      role="button"
      tabIndex={0}
      title="open track in spotify"
      onClick={() => openSpotifySearch('track', scrobble.track, scrobble.artist)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openSpotifySearch('track', scrobble.track, scrobble.artist);
        }
      }}
    >
      <span className="rank">{dateLabel}</span>
      <span>
        <strong>{scrobble.track}</strong>
        <small>{scrobble.artist}{scrobble.album ? ` · ${scrobble.album}` : ''}</small>
      </span>
    </li>
  );
}

export default PulseScreen;
