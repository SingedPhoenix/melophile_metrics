import { useEffect, useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import RankedBarList from '../../shared/RankedBarList';
import { openSpotifySearch } from '../../shared/spotifyLinks';
import StatusPanel from '../../shared/StatusPanel';
import {
  RecentScrobble,
  RecentEntityRankingWindow,
  RecentListeningAnalytics,
  useListeningRollups,
  useRecentEntityRankings,
  useRecentListening,
  useRecentListeningAnalytics,
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
  const lastAnalytics = useRecentListeningAnalytics(lastWindow);
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
              <LastAnalyticsPanel analytics={lastAnalytics.data} isFetching={lastAnalytics.isFetching} />

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

function LastAnalyticsPanel({ analytics, isFetching }: { analytics: RecentListeningAnalytics | null | undefined; isFetching: boolean }) {
  if (!analytics) {
    return (
      <StatusPanel
        detail="Last analytical panels appear after the local database can summarize the selected listening window."
        title={isFetching ? 'loading listening analytics' : 'no listening analytics yet'}
        variant={isFetching ? 'loading' : 'empty'}
      />
    );
  }

  const current = analytics.current;
  const busiestHour = current.hourCounts.reduce((best, count, hour) => count > current.hourCounts[best] ? hour : best, 0);
  const busiestDay = current.dowCounts.reduce((best, count, day) => count > current.dowCounts[best] ? day : best, 0);
  const maxHour = Math.max(...current.hourCounts, ...analytics.hourAverages, 1);
  const maxDow = Math.max(...current.dowCounts, ...analytics.dowAverages, 1);
  const maxPace = Math.max(...analytics.pace.buckets.map(bucket => bucket.count), analytics.pace.average, 1);

  return (
    <section className="last-analytics-grid" aria-label="Last listening analytics">
      <article className="stats-panel last-rate-panel">
        <div className="panel-head">
          <div>
            <h3>listening rates</h3>
            <p>{analytics.label} · compared with recent prior windows</p>
          </div>
        </div>
        <div className="last-rate-grid">
          <RateMetric label="listens per day" value={current.values.perDay} baseline={analytics.baseline.perDay} />
          <RateMetric label="listens per active day" value={current.values.perActiveDay} baseline={analytics.baseline.perActiveDay} />
          <RateMetric label="listens per week" value={current.values.perWeek} baseline={analytics.baseline.perWeek} />
          <RateMetric label="active days per week" value={current.values.activeDaysPerWeek} baseline={analytics.baseline.activeDaysPerWeek} />
        </div>
      </article>

      <article className="stats-panel last-clock-panel-react">
        <div className="panel-head">
          <div>
            <h3>listening clock</h3>
            <p>busiest hour · {formatHourLabel(busiestHour)}</p>
          </div>
        </div>
        <div className="last-hour-strip">
          {current.hourCounts.map((count, hour) => {
            const height = Math.max(6, Math.round((count / maxHour) * 100));
            const above = count > (analytics.hourAverages[hour] || 0) && count > 0;
            return (
              <span
                className={above ? 'above' : ''}
                key={hour}
                style={{ height: `${height}%` }}
                title={`${formatHourLabel(hour)} · ${count.toLocaleString()} listens`}
              />
            );
          })}
        </div>
        <p className="last-insight">{hourInsight(current.hourCounts[busiestHour] || 0, busiestHour, analytics.hourAverages[busiestHour] || 0)}</p>
      </article>

      <article className="stats-panel last-week-panel-react">
        <div className="panel-head">
          <div>
            <h3>week shape</h3>
            <p>busiest day · {weekdayLabel(busiestDay)}</p>
          </div>
        </div>
        <div className="last-week-bars">
          {current.dowCounts.map((count, day) => {
            const height = Math.max(6, Math.round((count / maxDow) * 100));
            const baseline = Math.max(4, Math.round(((analytics.dowAverages[day] || 0) / maxDow) * 100));
            return (
              <div className="last-week-column" key={day}>
                <div className="last-week-track">
                  <span className="baseline" style={{ bottom: `${baseline}%` }} />
                  <span className={count > (analytics.dowAverages[day] || 0) ? 'bar above' : 'bar'} style={{ height: `${height}%` }} />
                </div>
                <small>{weekdayShortLabel(day)}</small>
              </div>
            );
          })}
        </div>
      </article>

      <article className="stats-panel last-pace-panel-react">
        <div className="panel-head">
          <div>
            <h3>window pace</h3>
            <p>{analytics.pace.label}</p>
          </div>
        </div>
        <div className="last-pace-bars">
          {analytics.pace.buckets.map((bucket, index) => {
            const height = Math.max(5, Math.round((bucket.count / maxPace) * 100));
            return (
              <span
                className={bucket.count > analytics.pace.average ? 'above' : ''}
                key={`${bucket.label}-${index}`}
                style={{ height: `${height}%` }}
                title={`${bucket.label} · ${bucket.count.toLocaleString()} listens`}
              />
            );
          })}
        </div>
        <p className="last-insight">
          {analytics.pace.peak
            ? `${analytics.pace.peak.label} leads this window with ${analytics.pace.peak.count.toLocaleString()} listens. ${analytics.pace.aboveAverageCount.toLocaleString()} columns sit above average.`
            : 'pace data is waiting for listening rows'}
        </p>
      </article>
    </section>
  );
}

function RateMetric({ label, value, baseline }: { label: string; value: number; baseline: number }) {
  const delta = baseline ? ((value - baseline) / baseline) * 100 : 0;
  const direction = Math.abs(delta) < 0.05 ? 'even' : delta > 0 ? 'up' : 'down';
  return (
    <div className="last-rate-card">
      <strong>{formatRate(value)}</strong>
      <span>{label}</span>
      <small className={direction}>{baseline ? `${delta > 0 ? '+' : ''}${formatRate(delta)}% vs baseline` : 'baseline pending'}</small>
    </div>
  );
}

function formatRate(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 100) return Math.round(value).toLocaleString();
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function formatHourLabel(hour: number) {
  if (hour === 0) return '12:00am';
  if (hour === 12) return '12:00pm';
  return hour < 12 ? `${hour}:00am` : `${hour - 12}:00pm`;
}

function weekdayLabel(day: number) {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day] || 'unknown';
}

function weekdayShortLabel(day: number) {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day] || '';
}

function hourInsight(count: number, hour: number, baseline: number) {
  if (!count) return 'no hour is carrying this listening window yet.';
  const delta = count - baseline;
  if (delta > 0) return `${formatHourLabel(hour)} is rising above the recent baseline by ${formatRate(delta)} listens.`;
  return `${formatHourLabel(hour)} is the busiest hour, but it is close to the recent baseline.`;
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
