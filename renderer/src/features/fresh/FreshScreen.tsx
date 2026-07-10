import { useMemo } from 'react';
import { useFreshOverview, useYearlyListeningRollups } from '../../shared/useDesktopStatus';

function FreshScreen() {
  const fresh = useFreshOverview(16, 12);
  const yearly = useYearlyListeningRollups();
  const overview = fresh.data;
  const currentYear = new Date().getFullYear();
  const yearRows = useMemo(() => {
    const rows = yearly.data?.years || [];
    return rows
      .slice()
      .sort((a, b) => b.listens - a.listens || b.year - a.year)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [yearly.data?.years]);
  const currentRow = yearRows.find(row => row.year === currentYear);
  const nextTarget = currentRow ? yearRows.find(row => row.rank === currentRow.rank - 1) : null;
  const quietArtists = overview?.quietArtists || [];
  const recentArtists = overview?.recentArtists || [];
  const topAlbums = overview?.topAlbums || [];

  return (
    <section className="fresh-screen" aria-labelledby="fresh-title">
      <div className="screen-title-block">
        <p className="eyebrow">discovery and return signals</p>
        <h1 id="fresh-title">fresh</h1>
        <p className="screen-data-note">
          {fresh.isFetching || yearly.isFetching ? 'refreshing local discovery signals' : 'sqlite-backed listening orbit'}
        </p>
      </div>

      <section className="fresh-summary-grid">
        <article className="stats-panel fresh-year-card">
          <span>current year rank</span>
          <strong>{currentRow ? `#${currentRow.rank}` : 'pending'}</strong>
          <small>
            {currentRow
              ? `${currentYear} · ${currentRow.listens.toLocaleString()} listens`
              : 'waiting for yearly rollups'}
          </small>
          {nextTarget && (
            <p>{(nextTarget.listens - (currentRow?.listens || 0) + 1).toLocaleString()} listens to pass {nextTarget.year}</p>
          )}
        </article>

        <article className="stats-panel fresh-year-list-panel">
          <div className="panel-head">
            <div>
              <h2>annual chase</h2>
              <p>top listening years</p>
            </div>
          </div>
          <ol className="fresh-year-list">
            {yearRows.slice(0, 6).map(row => (
              <li className={row.year === currentYear ? 'is-current' : ''} key={row.year}>
                <span className="rank">#{row.rank}</span>
                <strong>{row.year}{row.year === currentYear ? ' · current year' : ''}</strong>
                <span>{row.listens.toLocaleString()} listens</span>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="fresh-panel-grid">
        <article className="stats-panel">
          <div className="panel-head">
            <div>
              <h2>quiet favorite artists</h2>
              <p>high-listen artists missing from recent rotation</p>
            </div>
          </div>
          <ol className="fresh-signal-list">
            {quietArtists.map(artist => (
              <li key={artist.artist}>
                <span className="rank">#{artist.rank}</span>
                <span>
                  <strong>{artist.artist}</strong>
                  <small>{artist.daysSinceLastPlayed.toLocaleString()} days quiet</small>
                </span>
                <em>{artist.listens.toLocaleString()}</em>
              </li>
            ))}
          </ol>
        </article>

        <article className="stats-panel">
          <div className="panel-head">
            <div>
              <h2>recently discovered artists</h2>
              <p>first appeared in the last 18 months</p>
            </div>
          </div>
          <ol className="fresh-signal-list">
            {recentArtists.map(artist => (
              <li key={artist.artist}>
                <span className="rank">#{artist.rank}</span>
                <span>
                  <strong>{artist.artist}</strong>
                  <small>first logged {formatDate(artist.firstPlayedUts)}</small>
                </span>
                <em>{artist.listens.toLocaleString()}</em>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <article className="stats-panel fresh-album-panel">
        <div className="panel-head">
          <div>
            <h2>all-time album orbit</h2>
            <p>top albums from local scrobble history</p>
          </div>
        </div>
        <div className="fresh-album-orbit">
          {topAlbums.map(album => (
            <section className="fresh-album-tile" key={`${album.artist}-${album.album}`}>
              <div className="fresh-album-art" aria-hidden="true">#{album.rank}</div>
              <strong>{album.album}</strong>
              <small>{album.artist}</small>
              <span>{album.listens.toLocaleString()} plays</span>
            </section>
          ))}
        </div>
      </article>
    </section>
  );
}

function formatDate(uts: number) {
  if (!uts) return 'pending';
  return new Date(uts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default FreshScreen;
