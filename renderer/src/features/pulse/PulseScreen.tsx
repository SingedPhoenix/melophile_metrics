import { useMemo } from 'react';
import { openSpotifySearch } from '../../shared/spotifyLinks';
import { RecentScrobble, useListeningRollups, useRecentListening } from '../../shared/useDesktopStatus';

function PulseScreen() {
  const rollups = useListeningRollups();
  const recent = useRecentListening(12);
  const topTracks = rollups.data?.topTracks.slice(0, 8) || [];
  const topArtists = rollups.data?.topArtists.slice(0, 8) || [];
  const recentScrobbles = recent.data?.scrobbles || [];
  const monthBars = useMemo(() => {
    const months = rollups.data?.months || [];
    return months.slice(-18);
  }, [rollups.data?.months]);
  const maxMonth = Math.max(...monthBars.map(month => month.listens), 1);

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
    </section>
  );
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
