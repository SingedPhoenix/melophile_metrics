import { useEffect, useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import RankedBarList from '../../shared/RankedBarList';
import { openSpotifySearch } from '../../shared/spotifyLinks';
import StatusPanel from '../../shared/StatusPanel';
import {
  RecentScrobble,
  useListeningRollups,
  useRecentListening,
  useYearlyEntityRankings,
  useYearlyListeningRollups,
  YearlyEntityRankingType
} from '../../shared/useDesktopStatus';

const momentousModes = [
  { value: 'tracks', label: 'tracks' },
  { value: 'artists', label: 'artists' },
  { value: 'albums', label: 'albums' }
] satisfies Array<{ value: YearlyEntityRankingType; label: string }>;

const momentousPageSize = 50;

function PulseScreen() {
  const [momentousType, setMomentousType] = useState<YearlyEntityRankingType>('tracks');
  const [momentousYear, setMomentousYear] = useState<number | undefined>();
  const [momentousPage, setMomentousPage] = useState(0);
  const rollups = useListeningRollups();
  const yearly = useYearlyListeningRollups();
  const recent = useRecentListening(12);
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
    </section>
  );
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
