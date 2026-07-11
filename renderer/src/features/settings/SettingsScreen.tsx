import { useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import {
  readPastTenseLiveSnapshot,
  refreshPastTenseCache,
  type PastTenseRefreshProgress
} from '../past-tense/pastTenseData';
import {
  formatFreshScanDate,
  readFreshReleaseSnapshot,
  readFreshScanSchedule,
  refreshFreshReleaseDiscovery,
  updateFreshScanScheduleAfterRun,
  type FreshReleaseCandidate,
  type FreshReleaseProgress,
  type FreshReleaseSnapshot,
  type FreshScanSchedule
} from '../fresh/freshData';
import { useDesktopStatus, useFreshOverview, useLocalServiceConfig } from '../../shared/useDesktopStatus';

type SettingsTab = 'accounts' | 'data' | 'appearance';

const tabs: { value: SettingsTab; label: string }[] = [
  { value: 'accounts', label: 'accounts' },
  { value: 'data', label: 'data' },
  { value: 'appearance', label: 'appearance' }
];

const themes = [
  { name: 'amethyst dusk', family: 'purple', colors: ['#130a21', '#4b3173', '#b58bd4', '#d8bedf'] },
  { name: 'plum signal', family: 'purple', colors: ['#1b0717', '#6d184d', '#f21f98', '#cab0bb'] },
  { name: 'midnight current', family: 'blue', colors: ['#071023', '#17335e', '#6ca4cf', '#c9d5dd'] },
  { name: 'topaz mine', family: 'blue', colors: ['#09151b', '#1d5366', '#d5a12f', '#dad1bd'] },
  { name: 'forest static', family: 'green', colors: ['#07130f', '#2e4b3e', '#adbaa0', '#d9d7cd'] },
  { name: 'moss radio', family: 'green', colors: ['#10170f', '#637320', '#c7e441', '#d4d0b8'] },
  { name: 'ember archive', family: 'orange', colors: ['#190b05', '#7c2a08', '#ff6f31', '#d8b9a8'] },
  { name: 'silver room', family: 'neutral', colors: ['#0d0d0d', '#2d3131', '#8b8f91', '#eeeeee'] }
];

function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('accounts');
  const [pastTenseSnapshot, setPastTenseSnapshot] = useState(() => readPastTenseLiveSnapshot());
  const [pastTenseRefreshState, setPastTenseRefreshState] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [pastTenseProgress, setPastTenseProgress] = useState<PastTenseRefreshProgress | null>(null);
  const [pastTenseMessage, setPastTenseMessage] = useState('');
  const [freshReleaseSnapshot, setFreshReleaseSnapshot] = useState<FreshReleaseSnapshot>(() => readFreshReleaseSnapshot());
  const [freshScanSchedule, setFreshScanSchedule] = useState<FreshScanSchedule>(() => readFreshScanSchedule());
  const [freshScanState, setFreshScanState] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [freshScanProgress, setFreshScanProgress] = useState<FreshReleaseProgress | null>(null);
  const [freshScanMessage, setFreshScanMessage] = useState('');
  const desktopStatus = useDesktopStatus();
  const localConfig = useLocalServiceConfig();
  const freshOverview = useFreshOverview(16, 12);
  const status = desktopStatus.data;
  const config = localConfig.data;
  const freshCandidates = useMemo<FreshReleaseCandidate[]>(() => {
    const quietArtists = freshOverview.data?.quietArtists || [];
    const recentArtists = freshOverview.data?.recentArtists || [];
    const allTime = quietArtists.slice(0, 8).map(artist => ({ name: artist.artist, plays: artist.listens, pool: 'all-time' as const }));
    const recent = recentArtists.slice(0, 8).map(artist => ({ name: artist.artist, plays: artist.listens, pool: 'recent' as const }));
    const byName = new Map<string, FreshReleaseCandidate>();
    [...allTime, ...recent].forEach(candidate => {
      const key = candidate.name.toLowerCase();
      const existing = byName.get(key);
      if (!existing || candidate.plays > existing.plays) byName.set(key, candidate);
    });
    return Array.from(byName.values());
  }, [freshOverview.data?.quietArtists, freshOverview.data?.recentArtists]);
  const services = useMemo(() => ([
    {
      name: 'last.fm',
      state: config?.lastfm?.username && config?.lastfm?.apiKey ? 'ready' : 'needs config',
      detail: config?.lastfm?.username ? `signed as ${config.lastfm.username}` : 'username and api key'
    },
    {
      name: 'spotify',
      state: config?.spotify?.clientId && config?.spotify?.refreshToken ? 'ready' : 'needs auth',
      detail: config?.spotify?.clientId ? 'client id present' : 'client id and refresh token'
    },
    {
      name: 'listenbrainz',
      state: config?.listenbrainz?.username || config?.listenbrainz?.token ? 'optional ready' : 'optional',
      detail: config?.listenbrainz?.username || 'future open listening sync'
    },
    {
      name: 'musicbrainz',
      state: config?.musicbrainz?.contact ? 'ready' : 'needs contact',
      detail: config?.musicbrainz?.contact || 'contact string for catalog lookups'
    }
  ]), [config]);
  const refreshPastTense = async () => {
    setPastTenseRefreshState('running');
    setPastTenseMessage('starting past tense cache refresh');
    setPastTenseProgress(null);
    try {
      const result = await refreshPastTenseCache({
        clientId: config?.spotify?.clientId,
        force: true,
        onProgress: progress => {
          setPastTenseProgress(progress);
          setPastTenseMessage(`refreshing ${progress.label} · ${progress.current}/${progress.total}`);
        }
      });
      setPastTenseSnapshot(readPastTenseLiveSnapshot());
      setPastTenseRefreshState('complete');
      setPastTenseMessage(`${result.cachedPlaylists.toLocaleString()} playlists · ${result.cachedTracks.toLocaleString()} tracks cached`);
    } catch (error) {
      setPastTenseRefreshState('error');
      setPastTenseMessage(error instanceof Error ? error.message : 'past tense cache refresh failed');
    }
  };
  const scanFreshReleases = async () => {
    setFreshScanState('running');
    setFreshScanMessage('starting seed release scan');
    setFreshScanProgress(null);
    try {
      const result = await refreshFreshReleaseDiscovery({
        candidates: freshCandidates,
        clientId: config?.spotify?.clientId,
        onProgress: progress => {
          setFreshScanProgress(progress);
          setFreshScanMessage(`scanning ${progress.label} · ${progress.current}/${progress.total}`);
        }
      });
      const schedule = updateFreshScanScheduleAfterRun(result.releases.length);
      setFreshReleaseSnapshot(readFreshReleaseSnapshot());
      setFreshScanSchedule(schedule);
      setFreshScanState('complete');
      setFreshScanMessage(`${result.releases.length.toLocaleString()} seed releases stored`);
    } catch (error) {
      setFreshScanState('error');
      setFreshScanMessage(error instanceof Error ? error.message : 'seed release scan failed');
    }
  };

  return (
    <section className="settings-screen" aria-labelledby="settings-title">
      <div className="screen-title-block">
        <p className="eyebrow">private desktop configuration</p>
        <h1 id="settings-title">settings</h1>
        <p className="screen-data-note">
          {localConfig.isFetching ? 'checking local config' : 'accounts, data, and appearance'}
        </p>
      </div>

      <div className="settings-tab-row">
        <MetricToggle label="Settings sections" value={activeTab} options={tabs} onChange={setActiveTab} />
      </div>

      {activeTab === 'accounts' && (
        <article className="stats-panel settings-panel">
          <div className="panel-head">
            <div>
              <h2>connected accounts</h2>
              <p>safe readiness check from local private config</p>
            </div>
          </div>
          <div className="settings-service-grid">
            {services.map(service => (
              <section className="settings-service-card" key={service.name}>
                <span>{service.state}</span>
                <strong>{service.name}</strong>
                <small>{service.detail}</small>
              </section>
            ))}
          </div>
        </article>
      )}

      {activeTab === 'data' && (
        <article className="stats-panel settings-panel">
          <div className="panel-head">
            <div>
              <h2>local sqlite database</h2>
              <p>persistent storage for scrobbles and revision history</p>
            </div>
          </div>
          <div className="settings-data-grid">
            <DataMetric label="stored scrobbles" value={formatNumber(status?.scrobbles)} />
            <DataMetric label="stored revisions" value={formatNumber(status?.revisions)} />
            <DataMetric label="schema" value={status?.schemaVersion ? String(status.schemaVersion) : 'pending'} />
            <DataMetric label="last sync" value={formatDate(status?.lastSync?.finished_at)} />
          </div>
          <dl className="settings-sync-list">
            <div>
              <dt>source</dt>
              <dd>{status?.lastSync?.source || 'pending'}</dd>
            </div>
            <div>
              <dt>mode</dt>
              <dd>{status?.lastSync?.mode || 'pending'}</dd>
            </div>
            <div>
              <dt>rows updated</dt>
              <dd>{formatNumber(status?.lastSync?.rows_updated)}</dd>
            </div>
            <div>
              <dt>database file</dt>
              <dd>{status?.path || 'pending'}</dd>
            </div>
          </dl>
          <section className="settings-maintenance-panel" aria-labelledby="spotify-maintenance-title">
            <div>
              <h3 id="spotify-maintenance-title">spotify maintenance</h3>
              <p>
                Seed release scans and background playlist maintenance scheduled while the app is open.
              </p>
            </div>
            <div className="settings-maintenance-metrics wide">
              <DataMetric label="all-time artists audited" value={formatNumber(freshOverview.data?.quietArtists?.length)} />
              <DataMetric label="new artists audited" value={formatNumber(freshOverview.data?.recentArtists?.length)} />
              <DataMetric label="seed releases stored" value={formatNumber(freshReleaseSnapshot.releases.length)} />
              <DataMetric label="next seed scan" value={freshScanSchedule.enabled ? formatFreshScanDate(freshScanSchedule.nextScanMs) : 'paused'} />
            </div>
            {freshScanProgress && (
              <span className="settings-progress" aria-label="Seed release scan progress">
                <span style={{ width: `${Math.max(2, Math.round((freshScanProgress.current / freshScanProgress.total) * 100))}%` }} />
              </span>
            )}
            <div className="settings-maintenance-actions">
              <button
                className="status-chip is-button"
                disabled={freshScanState === 'running'}
                type="button"
                onClick={scanFreshReleases}
              >
                {freshScanState === 'running' ? 'scanning seed releases' : 'run seed scan now'}
              </button>
              <span className={`settings-maintenance-status ${freshScanState}`}>
                {freshScanMessage || scanScheduleStatus(freshScanSchedule)}
              </span>
            </div>
          </section>
          <section className="settings-maintenance-panel" aria-labelledby="past-tense-cache-title">
            <div>
              <h3 id="past-tense-cache-title">past tense cache</h3>
              <p>
                Spotify release-year playlist details and tracks used by the React Past Tense view.
              </p>
            </div>
            <div className="settings-maintenance-metrics">
              <DataMetric label="cached playlists" value={formatNumber(pastTenseSnapshot.stats.cachedPlaylists)} />
              <DataMetric label="cached tracks" value={formatNumber(pastTenseSnapshot.stats.cachedTracks)} />
              <DataMetric label="last refreshed" value={formatDateFromMs(pastTenseSnapshot.stats.updatedAtMs)} />
            </div>
            {pastTenseProgress && (
              <span className="settings-progress" aria-label="Past Tense refresh progress">
                <span style={{ width: `${Math.max(2, Math.round((pastTenseProgress.current / pastTenseProgress.total) * 100))}%` }} />
              </span>
            )}
            <div className="settings-maintenance-actions">
              <button
                className="status-chip is-button"
                disabled={pastTenseRefreshState === 'running'}
                type="button"
                onClick={refreshPastTense}
              >
                {pastTenseRefreshState === 'running' ? 'refreshing past tense cache' : 'refresh past tense cache'}
              </button>
              <span className={`settings-maintenance-status ${pastTenseRefreshState}`}>
                {pastTenseMessage || 'uses the existing local Spotify authorization cache'}
              </span>
            </div>
          </section>
        </article>
      )}

      {activeTab === 'appearance' && (
        <article className="stats-panel settings-panel">
          <div className="panel-head">
            <div>
              <h2>appearance</h2>
              <p>theme library preview before persistent theme selection</p>
            </div>
          </div>
          <div className="theme-library-grid">
            {themes.map(theme => (
              <button className="theme-preview-card" key={theme.name} type="button">
                <div className="theme-preview-strip" aria-hidden="true">
                  {theme.colors.map(color => <span key={color} style={{ background: color }} />)}
                </div>
                <strong>{theme.name}</strong>
                <small>{theme.family}</small>
              </button>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}

function DataMetric({ label, value }: { label: string; value: string }) {
  return (
    <section className="settings-data-metric">
      <span>{label}</span>
      <strong>{value}</strong>
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

function formatDateFromMs(value: number | undefined) {
  if (!value) return 'pending';
  return formatDate(new Date(value).toISOString());
}

function scanScheduleStatus(schedule: FreshScanSchedule) {
  if (!schedule.enabled) return 'scheduled scans paused';
  const next = schedule.nextScanMs ? `next scan ${formatFreshScanDate(schedule.nextScanMs)}` : 'next scan not scheduled';
  return `${schedule.lastStatus || 'scheduled scans active'} · ${next}`;
}

export default SettingsScreen;
