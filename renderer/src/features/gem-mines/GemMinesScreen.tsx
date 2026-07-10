import { useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import { useListeningRollups } from '../../shared/useDesktopStatus';

type GemMode = 'tracks' | 'artists' | 'albums';

const gemModes = [
  { value: 'tracks', label: 'tracks' },
  { value: 'artists', label: 'artists' },
  { value: 'albums', label: 'albums' }
] satisfies Array<{ value: GemMode; label: string }>;

type GemRow = {
  key: string;
  rank: number;
  title: string;
  subtitle: string;
  listens: number;
};

function GemMinesScreen() {
  const [mode, setMode] = useState<GemMode>('tracks');
  const rollups = useListeningRollups();
  const rows = useMemo(() => {
    const data = rollups.data;
    if (!data) return [];
    if (mode === 'artists') {
      return data.topArtists.slice(0, 24).map(artist => ({
        key: `artist-${artist.rank}-${artist.artist}`,
        rank: artist.rank,
        title: artist.artist,
        subtitle: 'artist',
        listens: artist.listens
      }));
    }
    if (mode === 'albums') {
      return data.topAlbums.slice(0, 24).map(album => ({
        key: `album-${album.rank}-${album.artist}-${album.album}`,
        rank: album.rank,
        title: album.album,
        subtitle: album.artist,
        listens: album.listens
      }));
    }
    return data.topTracks.slice(0, 24).map(track => ({
      key: `track-${track.rank}-${track.artist}-${track.track}`,
      rank: track.rank,
      title: track.track,
      subtitle: track.artist,
      listens: track.listens
    }));
  }, [mode, rollups.data]);
  const maxListens = Math.max(...rows.map(row => row.listens), 1);
  const leadGem = rows[0];

  return (
    <section className="gem-mines-screen" aria-labelledby="gem-mines-title">
      <div className="screen-title-block">
        <p className="eyebrow">ranked listening treasure</p>
        <h1 id="gem-mines-title">gem mines</h1>
        <p className="screen-data-note">
          {rollups.isFetching ? 'loading sqlite ranking rollups' : `top ${mode} from local listening history`}
        </p>
      </div>

      <section className="gem-hero stats-panel" aria-label="Current gem leader">
        <div>
          <p className="eyebrow">current top {mode.slice(0, -1)}</p>
          <h2>{leadGem?.title || 'pending'}</h2>
          <p>{leadGem?.subtitle || 'sqlite rollup pending'}</p>
        </div>
        <div className="gem-hero-count">
          <strong>{leadGem ? leadGem.listens.toLocaleString() : '-'}</strong>
          <span>listens</span>
        </div>
      </section>

      <section className="stats-panel gem-list-panel" aria-labelledby="gem-ranking-title">
        <div className="panel-head">
          <div>
            <h2 id="gem-ranking-title">ranked gems</h2>
            <p>all-time sqlite {mode}</p>
          </div>
          <MetricToggle label="gem mine mode" value={mode} options={gemModes} onChange={setMode} />
        </div>

        <ol className="gem-list">
          {rows.map(row => (
            <li key={row.key}>
              <span className="rank">#{row.rank}</span>
              <span className="gem-title-block">
                <strong>{row.title}</strong>
                <small>{row.subtitle}</small>
              </span>
              <span className="gem-bar-track">
                <span className="gem-bar-fill" style={{ width: `${Math.max(6, Math.round((row.listens / maxListens) * 100))}%` }}>
                  <span>{row.listens.toLocaleString()}</span>
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}

export default GemMinesScreen;
