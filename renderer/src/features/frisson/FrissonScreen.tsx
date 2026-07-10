import { useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import RankedBarList from '../../shared/RankedBarList';
import { openSpotifySearch } from '../../shared/spotifyLinks';
import StatusPanel from '../../shared/StatusPanel';
import { useFrissonOverview } from '../../shared/useDesktopStatus';

type FrissonMode = 'repeats' | 'enduring' | 'recent';

const modes: { value: FrissonMode; label: string }[] = [
  { value: 'repeats', label: 'repeats' },
  { value: 'enduring', label: 'enduring' },
  { value: 'recent', label: 'recent' }
];

function FrissonScreen() {
  const [mode, setMode] = useState<FrissonMode>('repeats');
  const overview = useFrissonOverview(16);
  const data = overview.data;
  const repeated = data?.repeatedTracks || [];
  const enduring = data?.enduringTracks || [];
  const recent = data?.recentAnchors || [];
  const activeTracks = mode === 'enduring' ? enduring : mode === 'recent' ? recent : repeated;
  const heroTrack = activeTracks[0] || repeated[0] || enduring[0] || recent[0];
  const maxListens = Math.max(...activeTracks.map(track => track.listens), 1);
  const attachmentAverage = useMemo(() => {
    if (!repeated.length) return 0;
    return Math.round(repeated.slice(0, 8).reduce((sum, track) => sum + track.listens, 0) / Math.min(repeated.length, 8));
  }, [repeated]);

  return (
    <section className="frisson-screen" aria-labelledby="frisson-title">
      <div className="screen-title-block">
        <p className="eyebrow">song attachment index</p>
        <h1 id="frisson-title">frisson</h1>
        <p className="screen-data-note">
          {overview.isFetching ? 'measuring repeated song attachment' : 'where “i feel this song” becomes tangible'}
        </p>
      </div>

      <section className="frisson-summary">
        <article className="stats-panel frisson-hero">
          <span>strongest signal</span>
          <h2>{heroTrack?.track || 'pending'}</h2>
          <p>{heroTrack ? `${heroTrack.artist}${heroTrack.album ? ` · ${heroTrack.album}` : ''}` : 'sqlite rollup pending'}</p>
          <strong>{heroTrack ? heroTrack.listens.toLocaleString() : '-'}</strong>
          <small>lifetime listens</small>
        </article>

        <article className="stats-panel frisson-snapshot">
          <div className="panel-head">
            <div>
              <h2>attachment snapshot</h2>
              <p>repeat behavior from local history</p>
            </div>
          </div>
          <div className="frisson-stat-grid">
            <MiniStat label="repeat avg" value={attachmentAverage ? attachmentAverage.toLocaleString() : 'pending'} />
            <MiniStat label="longest span" value={formatDays(Math.max(...enduring.map(track => track.spanDays), 0))} />
            <MiniStat label="recent anchors" value={recent.length.toLocaleString()} />
          </div>
        </article>
      </section>

      <article className="stats-panel frisson-list-panel">
        <div className="panel-head">
          <div>
            <h2>{modeTitle(mode)}</h2>
            <p>{modeDetail(mode)}</p>
          </div>
          <MetricToggle label="Frisson ranking mode" value={mode} options={modes} onChange={setMode} />
        </div>
        {activeTracks.length ? (
          <RankedBarList
            ariaLabel={modeTitle(mode)}
            maxValue={maxListens}
            rows={activeTracks.map(track => ({
              barLabel: track.listens.toLocaleString(),
              key: `${track.rank}-${track.artist}-${track.track}`,
              meta: `${formatDays(track.spanDays)} span · ${track.daysSinceLastPlayed.toLocaleString()} days quiet`,
              onOpen: () => openSpotifySearch('track', track.track, track.artist),
              rank: track.rank,
              subtitle: `${track.artist}${track.album ? ` · ${track.album}` : ''}`,
              title: track.track,
              value: track.listens
            }))}
          />
        ) : (
          <StatusPanel
            detail="Frisson rankings need repeated-track patterns from the local listening archive."
            title={overview.isFetching ? 'measuring song attachment' : 'no frisson signals yet'}
            variant={overview.isFetching ? 'loading' : 'empty'}
          />
        )}
      </article>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <section className="frisson-mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function modeTitle(mode: FrissonMode) {
  if (mode === 'enduring') return 'enduring attachments';
  if (mode === 'recent') return 'recent anchors';
  return 'repeat-heavy tracks';
}

function modeDetail(mode: FrissonMode) {
  if (mode === 'enduring') return 'songs that stayed with you across the longest listening span';
  if (mode === 'recent') return 'tracks with repeat gravity in the last 30 days';
  return 'songs with the highest lifetime pull';
}

function formatDays(days: number) {
  if (!days) return 'pending';
  if (days >= 365) return `${Math.floor(days / 365).toLocaleString()} yr`;
  return `${days.toLocaleString()} d`;
}

export default FrissonScreen;
