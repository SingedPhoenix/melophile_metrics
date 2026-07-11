import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import RankedBarList from '../../shared/RankedBarList';
import { openSpotifySearch, SpotifyEntityType } from '../../shared/spotifyLinks';
import StatusPanel from '../../shared/StatusPanel';
import { useEntityRankings, YearlyEntityRankingRow, YearlyEntityRankingType } from '../../shared/useDesktopStatus';

type GemMode = YearlyEntityRankingType;

type GemBand = {
  name: string;
  label: string;
  from: number;
  to: number;
  color: string;
};

const allTimeGemBands: Record<GemMode, GemBand[]> = {
  tracks: [
    { name: 'blackOpal', label: 'black opal', from: 1, to: 30, color: '#151820' },
    { name: 'diamond', label: 'diamond', from: 26, to: 90, color: '#A8D8EA' },
    { name: 'ruby', label: 'ruby', from: 76, to: 180, color: '#C0392B' },
    { name: 'sapphire', label: 'sapphire', from: 176, to: 330, color: '#2980B9' },
    { name: 'emerald', label: 'emerald', from: 326, to: 570, color: '#27AE60' },
    { name: 'aquamarine', label: 'aquamarine', from: 551, to: 900, color: '#1ABC9C' },
    { name: 'topaz', label: 'topaz', from: 826, to: 1290, color: '#F39C12' },
    { name: 'amethyst', label: 'amethyst', from: 1151, to: 1800, color: '#9B59B6' },
    { name: 'citrine', label: 'citrine', from: 1526, to: 2370, color: '#E4A72D' },
    { name: 'tigerEye', label: "tiger's eye", from: 1951, to: 3000, color: '#B86B2B' }
  ],
  artists: [
    { name: 'blackOpal', label: 'black opal', from: 1, to: 13, color: '#151820' },
    { name: 'diamond', label: 'diamond', from: 14, to: 39, color: '#A8D8EA' },
    { name: 'ruby', label: 'ruby', from: 41, to: 78, color: '#C0392B' },
    { name: 'sapphire', label: 'sapphire', from: 79, to: 143, color: '#2980B9' },
    { name: 'emerald', label: 'emerald', from: 144, to: 247, color: '#27AE60' },
    { name: 'aquamarine', label: 'aquamarine', from: 248, to: 390, color: '#1ABC9C' },
    { name: 'topaz', label: 'topaz', from: 391, to: 559, color: '#F39C12' },
    { name: 'amethyst', label: 'amethyst', from: 560, to: 780, color: '#9B59B6' },
    { name: 'citrine', label: 'citrine', from: 781, to: 1027, color: '#E4A72D' },
    { name: 'tigerEye', label: "tiger's eye", from: 1028, to: 1300, color: '#B86B2B' }
  ],
  albums: [
    { name: 'blackOpal', label: 'black opal', from: 1, to: 10, color: '#151820' },
    { name: 'diamond', label: 'diamond', from: 11, to: 30, color: '#A8D8EA' },
    { name: 'ruby', label: 'ruby', from: 31, to: 60, color: '#C0392B' },
    { name: 'sapphire', label: 'sapphire', from: 61, to: 110, color: '#2980B9' },
    { name: 'emerald', label: 'emerald', from: 111, to: 190, color: '#27AE60' },
    { name: 'aquamarine', label: 'aquamarine', from: 191, to: 300, color: '#1ABC9C' },
    { name: 'topaz', label: 'topaz', from: 301, to: 430, color: '#F39C12' },
    { name: 'amethyst', label: 'amethyst', from: 431, to: 600, color: '#9B59B6' },
    { name: 'citrine', label: 'citrine', from: 601, to: 790, color: '#E4A72D' },
    { name: 'tigerEye', label: "tiger's eye", from: 791, to: 1000, color: '#B86B2B' }
  ]
};

const gemModes = [
  { value: 'tracks', label: 'tracks' },
  { value: 'artists', label: 'artists' },
  { value: 'albums', label: 'albums' }
] satisfies Array<{ value: GemMode; label: string }>;

type GemRow = {
  gem: GemBand;
  key: string;
  rank: number;
  title: string;
  subtitle: string;
  listens: number;
  spotifyType: SpotifyEntityType;
  spotifyName: string;
  spotifyArtist?: string;
};

function GemMinesScreen() {
  const [mode, setMode] = useState<GemMode>('tracks');
  const [activeGemNames, setActiveGemNames] = useState<string[]>(['blackOpal']);
  const gemBands = allTimeGemBands[mode];
  const maxRank = Math.max(...gemBands.map(band => band.to), 50);
  const rankings = useEntityRankings(mode, maxRank);
  const rows = useMemo<GemRow[]>(() => {
    const activeBands = gemBands.filter(band => activeGemNames.includes(band.name));
    const dataRows = rankings.data?.rows || [];
    return dataRows
      .map(row => toGemRow(row, mode, activeBands))
      .filter((row): row is GemRow => Boolean(row))
      .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));
  }, [activeGemNames, gemBands, mode, rankings.data?.rows]);
  const allRows = rankings.data?.rows || [];
  const maxListens = Math.max(...rows.map(row => row.listens), 1);
  const leadGem = allRows[0] ? toGemRow(allRows[0], mode, gemBands) : null;
  const activeBands = gemBands.filter(band => activeGemNames.includes(band.name));

  return (
    <section className="gem-mines-screen" aria-labelledby="gem-mines-title">
      <div className="screen-title-block">
        <p className="eyebrow">ranked listening treasure</p>
        <h1 id="gem-mines-title">gem mines</h1>
        <p className="screen-data-note">
          {rankings.isFetching ? 'loading sqlite ranking rollups' : `all-time rank-banded ${mode}`}
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
            <p>{gemRangeLabel(activeBands, mode)}</p>
          </div>
          <MetricToggle label="gem mine mode" value={mode} options={gemModes} onChange={setMode} />
        </div>

        <div className="gem-band-row" role="group" aria-label="Gem bands">
          {gemBands.map(band => (
            <button
              className={activeGemNames.includes(band.name) ? 'pill pill-gem active' : 'pill pill-gem'}
              key={band.name}
              type="button"
              onClick={() => {
                setActiveGemNames(current =>
                  current.includes(band.name)
                    ? current.filter(name => name !== band.name)
                    : [...current, band.name]
                );
              }}
            >
              <span className="gem-dot" style={{ '--gem-color': band.color } as CSSProperties} />
              {band.label}
            </button>
          ))}
        </div>

        {rows.length ? (
          <RankedBarList
            ariaLabel={`Top ${mode}`}
            maxValue={maxListens}
            rows={rows.map(row => ({
              barLabel: row.listens.toLocaleString(),
              barStyle: {
                background: `linear-gradient(90deg, ${row.gem.color}, rgba(10, 10, 10, 0.2))`
              },
              key: row.key,
              meta: <span className="gem-row-meta"><span className="gem-dot" style={{ '--gem-color': row.gem.color } as CSSProperties} />{row.gem.label}</span>,
              onOpen: () => openSpotifySearch(row.spotifyType, row.spotifyName, row.spotifyArtist),
              rank: row.rank,
              subtitle: row.subtitle,
              title: row.title,
              value: row.listens
            }))}
          />
        ) : (
          <StatusPanel
            detail={activeGemNames.length ? 'Try another gem band, or import more listening history so deeper ranks can be mined.' : 'Select one or more gem bands to populate this mine.'}
            title={rankings.isFetching ? `loading ${mode} mines` : activeGemNames.length ? 'no entries found in this mine' : 'select a gem mine'}
            variant={rankings.isFetching ? 'loading' : 'empty'}
          />
        )}
      </section>
    </section>
  );
}

export default GemMinesScreen;

function toGemRow(row: YearlyEntityRankingRow, mode: GemMode, activeBands: GemBand[]): GemRow | null {
  const gem = activeBands.find(band => row.rank >= band.from && row.rank <= band.to);
  if (!gem) return null;
  if (mode === 'artists') {
    return {
      gem,
      key: `artist-${row.rank}-${row.artist}`,
      rank: row.rank,
      title: row.artist,
      subtitle: 'artist',
      listens: row.listens,
      spotifyType: 'artist',
      spotifyName: row.artist
    };
  }
  if (mode === 'albums') {
    return {
      gem,
      key: `album-${row.rank}-${row.artist}-${row.album || ''}`,
      rank: row.rank,
      title: row.album || 'untitled album',
      subtitle: row.artist,
      listens: row.listens,
      spotifyType: 'album',
      spotifyName: row.album || '',
      spotifyArtist: row.artist
    };
  }
  return {
    gem,
    key: `track-${row.rank}-${row.artist}-${row.track || ''}`,
    rank: row.rank,
    title: row.track || 'untitled track',
    subtitle: row.artist,
    listens: row.listens,
    spotifyType: 'track',
    spotifyName: row.track || '',
    spotifyArtist: row.artist
  };
}

function gemRangeLabel(activeBands: GemBand[], mode: GemMode) {
  if (!activeBands.length) return `all-time ${mode} · select one or more gem mines`;
  const bandLabels = activeBands.map(band => `${band.label} (#${band.from.toLocaleString()}-#${band.to.toLocaleString()})`);
  return `all-time ${mode} · ${bandLabels.join(' · ')}`;
}
