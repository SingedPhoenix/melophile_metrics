import { useMemo } from 'react';
import {
  useDesktopStatus,
  useListeningRollups,
  useRecentListening,
  useYearlyListeningRollups
} from '../../shared/useDesktopStatus';

function DashboardScreen() {
  const desktopStatus = useDesktopStatus();
  const listeningRollups = useListeningRollups();
  const yearlyRollups = useYearlyListeningRollups();
  const recentListening = useRecentListening(5);
  const status = desktopStatus.data;
  const topArtist = listeningRollups.data?.topArtists[0];
  const topTrack = listeningRollups.data?.topTracks[0];
  const topAlbum = listeningRollups.data?.topAlbums[0];
  const topYear = yearlyRollups.data?.topYears[0];
  const latestListen = recentListening.data?.scrobbles[0];
  const monthBars = useMemo(() => (listeningRollups.data?.months || []).slice(-12), [listeningRollups.data?.months]);
  const maxMonth = Math.max(...monthBars.map(month => month.listens), 1);

  return (
    <section className="dashboard-screen" aria-labelledby="dashboard-title">
      <div className="screen-title-block">
        <p className="eyebrow">local listening command center</p>
        <h1 id="dashboard-title">dashboard</h1>
        <p className="screen-data-note">
          {desktopStatus.isFetching ? 'checking sqlite database' : 'sqlite-backed summary'}
        </p>
      </div>

      <section className="dashboard-metrics" aria-label="Database summary">
        <MetricTile label="stored scrobbles" value={formatNumber(status?.scrobbles)} />
        <MetricTile label="revision records" value={formatNumber(status?.revisions)} />
        <MetricTile label="top year" value={topYear ? String(topYear.year) : 'pending'} detail={topYear ? `${formatNumber(topYear.listens)} listens` : undefined} />
        <MetricTile label="latest listen" value={latestListen?.track || 'pending'} detail={latestListen?.artist} />
      </section>

      <div className="dashboard-grid">
        <article className="stats-panel dashboard-feature-card">
          <div className="panel-head">
            <div>
              <h2>listening leaders</h2>
              <p>all-time sqlite rollups</p>
            </div>
          </div>
          <div className="leader-grid">
            <LeaderBlock label="artist" title={topArtist?.artist} detail={topArtist ? `${formatNumber(topArtist.listens)} listens` : undefined} />
            <LeaderBlock label="track" title={topTrack?.track} detail={topTrack?.artist} />
            <LeaderBlock label="album" title={topAlbum?.album} detail={topAlbum?.artist} />
          </div>
        </article>

        <article className="stats-panel dashboard-sync-card">
          <div className="panel-head">
            <div>
              <h2>last database sync</h2>
              <p>{status?.lastSync?.status || 'sync status pending'}</p>
            </div>
          </div>
          <dl className="sync-detail-list">
            <div>
              <dt>source</dt>
              <dd>{status?.lastSync?.source || 'pending'}</dd>
            </div>
            <div>
              <dt>mode</dt>
              <dd>{status?.lastSync?.mode || 'pending'}</dd>
            </div>
            <div>
              <dt>finished</dt>
              <dd>{formatDate(status?.lastSync?.finished_at)}</dd>
            </div>
            <div>
              <dt>rows seen</dt>
              <dd>{formatNumber(status?.lastSync?.rows_seen)}</dd>
            </div>
          </dl>
        </article>
      </div>

      <article className="stats-panel">
        <div className="panel-head">
          <div>
            <h2>monthly listening contour</h2>
            <p>last 12 stored months</p>
          </div>
        </div>
        <div className="dashboard-month-row" aria-label="Monthly listening contour">
          {monthBars.map(month => {
            const width = Math.max(4, Math.round((month.listens / maxMonth) * 100));
            return (
              <div className="dashboard-month" key={month.month}>
                <span>{month.month}</span>
                <div className="dashboard-month-track">
                  <div style={{ width: `${width}%` }}>{formatNumber(month.listens)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}

function MetricTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="dashboard-metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function LeaderBlock({ label, title, detail }: { label: string; title?: string; detail?: string }) {
  return (
    <section className="leader-block">
      <span>{label}</span>
      <strong>{title || 'pending'}</strong>
      {detail && <small>{detail}</small>}
    </section>
  );
}

function formatNumber(value: number | undefined) {
  return typeof value === 'number' ? value.toLocaleString() : 'pending';
}

function formatDate(value: string | undefined) {
  if (!value) return 'pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'pending';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default DashboardScreen;
