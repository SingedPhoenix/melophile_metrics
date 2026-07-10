import { useMemo, useState } from 'react';
import StatusPanel from '../../shared/StatusPanel';
import { useFreshOverview, useYearlyListeningRollups } from '../../shared/useDesktopStatus';

type FreshPath = 'hub' | 'seed' | 'harvest';

function FreshScreen() {
  const [activePath, setActivePath] = useState<FreshPath>('hub');
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

      <section className="fresh-gate-grid" aria-label="fresh section paths">
        <button
          className={`fresh-gate-card ${activePath === 'seed' ? 'active' : ''}`}
          type="button"
          onClick={() => setActivePath('seed')}
        >
          <img className="fresh-gate-icon" src="/assets/icons/seed.svg" alt="" aria-hidden="true" />
          <span>seed</span>
          <small>new releases and first-growth discoveries</small>
        </button>
        <button
          className={`fresh-gate-card ${activePath === 'harvest' ? 'active' : ''}`}
          type="button"
          onClick={() => setActivePath('harvest')}
        >
          <img className="fresh-gate-icon" src="/assets/icons/harvest.svg" alt="" aria-hidden="true" />
          <span>harvest</span>
          <small>survivors from discovery into rotation</small>
        </button>
      </section>

      {activePath !== 'hub' && (
        <FreshPathPanel
          activePath={activePath}
          freshIsFetching={fresh.isFetching}
          quietArtists={quietArtists}
          recentArtists={recentArtists}
          topAlbums={topAlbums}
          onBack={() => setActivePath('hub')}
        />
      )}

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
          {yearRows.length ? (
            <ol className="fresh-year-list">
              {yearRows.slice(0, 6).map(row => (
                <li className={row.year === currentYear ? 'is-current' : ''} key={row.year}>
                  <span className="rank">#{row.rank}</span>
                  <strong>{row.year}{row.year === currentYear ? ' · current year' : ''}</strong>
                  <span>{row.listens.toLocaleString()} listens</span>
                </li>
              ))}
            </ol>
          ) : (
            <StatusPanel
              detail="Yearly listening rollups will appear after the local database has scrobble history."
              title={yearly.isFetching ? 'loading annual rankings' : 'no annual rankings yet'}
              variant={yearly.isFetching ? 'loading' : 'empty'}
            />
          )}
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
          {quietArtists.length ? (
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
          ) : (
            <StatusPanel
              detail="Quiet favorites appear once the database can compare lifetime listens against recent play history."
              title={fresh.isFetching ? 'checking quiet favorites' : 'no quiet favorites yet'}
              variant={fresh.isFetching ? 'loading' : 'empty'}
            />
          )}
        </article>

        <article className="stats-panel">
          <div className="panel-head">
            <div>
              <h2>recently discovered artists</h2>
              <p>first appeared in the last 18 months</p>
            </div>
          </div>
          {recentArtists.length ? (
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
          ) : (
            <StatusPanel
              detail="Recent discoveries need first-play dates from the local listening archive."
              title={fresh.isFetching ? 'checking recent discoveries' : 'no recent discoveries yet'}
              variant={fresh.isFetching ? 'loading' : 'empty'}
            />
          )}
        </article>
      </section>

      <article className="stats-panel fresh-album-panel">
        <div className="panel-head">
          <div>
            <h2>all-time album orbit</h2>
            <p>top albums from local scrobble history</p>
          </div>
        </div>
        {topAlbums.length ? (
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
        ) : (
          <StatusPanel
            detail="Album rankings appear after album names are present in local scrobble history."
            title={fresh.isFetching ? 'loading album orbit' : 'no album rankings yet'}
            variant={fresh.isFetching ? 'loading' : 'empty'}
          />
        )}
      </article>
    </section>
  );
}

function FreshPathPanel({
  activePath,
  freshIsFetching,
  quietArtists,
  recentArtists,
  topAlbums,
  onBack
}: {
  activePath: Exclude<FreshPath, 'hub'>;
  freshIsFetching: boolean;
  quietArtists: { rank: number; artist: string; listens: number; daysSinceLastPlayed: number }[];
  recentArtists: { rank: number; artist: string; listens: number; firstPlayedUts: number }[];
  topAlbums: { rank: number; artist: string; album: string; listens: number }[];
  onBack: () => void;
}) {
  const isSeed = activePath === 'seed';
  const pathItems = isSeed
    ? recentArtists.slice(0, 8).map(artist => ({
        key: artist.artist,
        rank: artist.rank,
        title: artist.artist,
        meta: `first logged ${formatDate(artist.firstPlayedUts)}`,
        value: artist.listens
      }))
    : quietArtists.slice(0, 8).map(artist => ({
        key: artist.artist,
        rank: artist.rank,
        title: artist.artist,
        meta: `${artist.daysSinceLastPlayed.toLocaleString()} days quiet`,
        value: artist.listens
      }));

  return (
    <section className="fresh-path-panel">
      <div className="panel-head">
        <div>
          <h2>{isSeed ? 'seed playlists' : 'harvest playlists'}</h2>
          <p>{isSeed ? 'new-to-you discovery candidates' : 'longer-tail return candidates'}</p>
        </div>
        <button className="status-chip is-button" type="button" onClick={onBack}>fresh home</button>
      </div>
      <div className="fresh-path-grid">
        <article className="stats-panel fresh-path-list-panel">
          <div className="panel-head">
            <div>
              <h3>{isSeed ? 'recent discovery queue' : 'expansion watchlist'}</h3>
              <p>{isSeed ? 'artists first found inside the recent window' : 'favorite artists outside recent rotation'}</p>
            </div>
          </div>
          {pathItems.length ? (
            <ol className="fresh-signal-list">
              {pathItems.map(item => (
                <li key={item.key}>
                  <span className="rank">#{item.rank}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.meta}</small>
                  </span>
                  <em>{item.value.toLocaleString()}</em>
                </li>
              ))}
            </ol>
          ) : (
            <StatusPanel
              detail={isSeed ? 'Recent discovery signals need first-play dates from the local archive.' : 'Quiet favorites appear when lifetime listens can be compared with recent plays.'}
              title={freshIsFetching ? 'loading fresh path' : isSeed ? 'no seed queue yet' : 'no harvest queue yet'}
              variant={freshIsFetching ? 'loading' : 'empty'}
            />
          )}
        </article>

        <article className="stats-panel fresh-path-list-panel">
          <div className="panel-head">
            <div>
              <h3>{isSeed ? 'album starts' : 'album returns'}</h3>
              <p>{isSeed ? 'albums with enough signal to inspect next' : 'albums with durable listen weight'}</p>
            </div>
          </div>
          {topAlbums.length ? (
            <ol className="fresh-signal-list">
              {topAlbums.slice(0, 8).map(album => (
                <li key={`${album.artist}-${album.album}`}>
                  <span className="rank">#{album.rank}</span>
                  <span>
                    <strong>{album.album}</strong>
                    <small>{album.artist}</small>
                  </span>
                  <em>{album.listens.toLocaleString()}</em>
                </li>
              ))}
            </ol>
          ) : (
            <StatusPanel
              detail="Album path signals appear after album names are available in local scrobble history."
              title={freshIsFetching ? 'loading album signals' : 'no album path yet'}
              variant={freshIsFetching ? 'loading' : 'empty'}
            />
          )}
        </article>
      </div>
    </section>
  );
}

function formatDate(uts: number) {
  if (!uts) return 'pending';
  return new Date(uts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default FreshScreen;
