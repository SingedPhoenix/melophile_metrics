import { useEffect, useMemo, useState } from 'react';
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
import {
  clearGenreProfile,
  clearSpotifyCorrection,
  genreProfileCounts,
  genreProfileEntries,
  normalizeSpotifyManualLink,
  saveGenreProfile,
  saveSpotifyCorrection,
  splitGenreList,
  spotifyCorrectionEntries,
  type GenreProfile,
  type GenreProfileType,
  type SpotifyCorrectionType,
  type SpotifyLinkCorrection
} from './settingsCorrections';
import {
  fetchLastfmProfileCount,
  lastfmIntegrityState,
  lastfmProfileDelta,
  readLastfmCachedRows,
  readLastfmCacheSnapshot,
  syncLastfmHistory,
  type LastfmSyncMode,
  type LastfmCacheSnapshot
} from './settingsLastfm';
import { useDesktopStatus, useFreshOverview, useLocalServiceConfig } from '../../shared/useDesktopStatus';

type SettingsTab = 'accounts' | 'data' | 'corrections' | 'appearance';

const tabs: { value: SettingsTab; label: string }[] = [
  { value: 'accounts', label: 'accounts' },
  { value: 'data', label: 'data' },
  { value: 'corrections', label: 'corrections' },
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
  const [lastfmCacheSnapshot, setLastfmCacheSnapshot] = useState<LastfmCacheSnapshot>({ cacheCount: 0, latestUts: 0, lastSyncAt: '', lastRebuildAt: '' });
  const [lastfmProfileCount, setLastfmProfileCount] = useState<number | null>(null);
  const [lastfmIntegrityMessage, setLastfmIntegrityMessage] = useState('local cache status has not been checked yet.');
  const [lastfmActionState, setLastfmActionState] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [freshReleaseSnapshot, setFreshReleaseSnapshot] = useState<FreshReleaseSnapshot>(() => readFreshReleaseSnapshot());
  const [freshScanSchedule, setFreshScanSchedule] = useState<FreshScanSchedule>(() => readFreshScanSchedule());
  const [freshScanState, setFreshScanState] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [freshScanProgress, setFreshScanProgress] = useState<FreshReleaseProgress | null>(null);
  const [freshScanMessage, setFreshScanMessage] = useState('');
  const [spotifyCorrectionForm, setSpotifyCorrectionForm] = useState({
    type: 'track' as SpotifyCorrectionType,
    name: '',
    artist: '',
    url: ''
  });
  const [spotifyCorrectionMessage, setSpotifyCorrectionMessage] = useState('no correction selected.');
  const [spotifyCorrections, setSpotifyCorrections] = useState(() => spotifyCorrectionEntries());
  const [genreProfileForm, setGenreProfileForm] = useState({
    type: 'artist' as GenreProfileType,
    name: '',
    artist: '',
    family: '',
    primary: '',
    subgenres: '',
    notes: ''
  });
  const [genreProfileMessage, setGenreProfileMessage] = useState('no genre profile selected.');
  const [genreProfiles, setGenreProfiles] = useState(() => genreProfileEntries());
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
  const genreCounts = useMemo(() => genreProfileCounts(), [genreProfiles]);
  const lastfmDelta = lastfmProfileDelta(lastfmCacheSnapshot.cacheCount, lastfmProfileCount);
  const lastfmState = lastfmIntegrityState(lastfmCacheSnapshot.cacheCount, lastfmProfileCount);
  const refreshCorrections = () => {
    setSpotifyCorrections(spotifyCorrectionEntries());
    setGenreProfiles(genreProfileEntries());
  };
  const refreshLastfmCacheSnapshot = async () => {
    const snapshot = await readLastfmCacheSnapshot();
    setLastfmCacheSnapshot(snapshot);
    return snapshot;
  };
  useEffect(() => {
    window.addEventListener('storage', refreshCorrections);
    window.addEventListener('melophile:settings-corrections-updated', refreshCorrections);
    return () => {
      window.removeEventListener('storage', refreshCorrections);
      window.removeEventListener('melophile:settings-corrections-updated', refreshCorrections);
    };
  }, []);
  useEffect(() => {
    void refreshLastfmCacheSnapshot().catch(() => {
      setLastfmIntegrityMessage('the local Last.fm cache could not be opened.');
    });
  }, []);
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
  const checkLastfmIntegrity = async () => {
    setLastfmActionState('running');
    setLastfmIntegrityMessage('checking Last.fm profile count');
    try {
      const snapshot = await refreshLastfmCacheSnapshot();
      const profileCount = await fetchLastfmProfileCount(config?.lastfm?.username, config?.lastfm?.apiKey);
      setLastfmProfileCount(profileCount);
      const state = lastfmIntegrityState(snapshot.cacheCount, profileCount);
      setLastfmActionState('complete');
      setLastfmIntegrityMessage(profileCount === null
        ? 'Last.fm profile count could not be checked.'
        : state === 'rebuild'
          ? 'cache drift detected. rebuild or resync from the legacy/static app until React sync is wired.'
          : 'local cache matches the Last.fm profile count.');
    } catch (error) {
      setLastfmActionState('error');
      setLastfmIntegrityMessage(error instanceof Error ? error.message : 'Last.fm data integrity check failed.');
    }
  };
  const loadLastfmCache = async () => {
    setLastfmActionState('running');
    setLastfmIntegrityMessage('loading cached Last.fm history');
    try {
      const snapshot = await refreshLastfmCacheSnapshot();
      setLastfmActionState('complete');
      setLastfmIntegrityMessage(snapshot.cacheCount
        ? `${snapshot.cacheCount.toLocaleString()} cached scrobbles loaded.`
        : 'no cached Last.fm history was found for this app address.');
    } catch (error) {
      setLastfmActionState('error');
      setLastfmIntegrityMessage(error instanceof Error ? error.message : 'the cached history could not be opened.');
    }
  };
  const saveLastfmCacheToDatabase = async () => {
    setLastfmActionState('running');
    setLastfmIntegrityMessage('saving Last.fm cache to SQLite');
    try {
      const rows = await readLastfmCachedRows();
      if (!rows.length) {
        setLastfmActionState('error');
        setLastfmIntegrityMessage('no cached Last.fm rows were found to save.');
        return;
      }
      const result = await window.melophileDesktop?.importLastfmScrobbles(rows);
      const nextStatus = await window.melophileDesktop?.databaseStatus?.();
      desktopStatus.refetch();
      setLastfmCacheSnapshot({
        cacheCount: rows.length,
        latestUts: rows.reduce((max, row) => Math.max(max, Number(row.uts) || 0), 0),
        lastSyncAt: lastfmCacheSnapshot.lastSyncAt,
        lastRebuildAt: lastfmCacheSnapshot.lastRebuildAt
      });
      setLastfmActionState('complete');
      setLastfmIntegrityMessage(importSummary(result, nextStatus?.scrobbles));
    } catch (error) {
      setLastfmActionState('error');
      setLastfmIntegrityMessage(error instanceof Error ? error.message : 'Last.fm cache could not be saved to SQLite.');
    }
  };
  const syncLastfm = async (mode: LastfmSyncMode) => {
    setLastfmActionState('running');
    setLastfmIntegrityMessage(mode === 'full' ? 'rebuilding Last.fm cache' : 'syncing new Last.fm scrobbles');
    try {
      const result = await syncLastfmHistory({
        username: config?.lastfm?.username,
        apiKey: config?.lastfm?.apiKey,
        mode,
        onProgress: progress => {
          setLastfmIntegrityMessage(`syncing Last.fm page ${progress.page.toLocaleString()} of ${progress.totalPages.toLocaleString()}`);
        }
      });
      const rows = await readLastfmCachedRows();
      const importResult = rows.length ? await window.melophileDesktop?.importLastfmScrobbles(rows) : null;
      const nextStatus = await window.melophileDesktop?.databaseStatus?.();
      desktopStatus.refetch();
      setLastfmProfileCount(result.profileCount);
      setLastfmCacheSnapshot({
        cacheCount: result.cacheCount,
        latestUts: result.latestUts,
        lastSyncAt: new Date().toISOString(),
        lastRebuildAt: result.rebuilt ? new Date().toISOString() : lastfmCacheSnapshot.lastRebuildAt
      });
      const drift = lastfmProfileDelta(result.cacheCount, result.profileCount);
      const driftNote = drift ? ` · profile delta ${formatDelta(drift)}` : '';
      setLastfmActionState('complete');
      setLastfmIntegrityMessage(`${result.cacheCount.toLocaleString()} cached scrobbles synced from Last.fm${driftNote} · ${importSummary(importResult, nextStatus?.scrobbles)}`);
    } catch (error) {
      setLastfmActionState('error');
      setLastfmIntegrityMessage(error instanceof Error ? error.message : 'Last.fm sync failed before the cache could be verified.');
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
  const saveSpotifyLinkCorrection = () => {
    if (!spotifyCorrectionForm.name.trim()) {
      setSpotifyCorrectionMessage('enter the name exactly as it appears in the list.');
      return;
    }
    if (spotifyCorrectionForm.type !== 'artist' && !spotifyCorrectionForm.artist.trim()) {
      setSpotifyCorrectionMessage('enter the artist name for track and album corrections.');
      return;
    }
    const link = normalizeSpotifyManualLink(spotifyCorrectionForm.url, spotifyCorrectionForm.type);
    if (!link) {
      setSpotifyCorrectionMessage(`paste a valid spotify ${spotifyCorrectionForm.type} link.`);
      return;
    }
    saveSpotifyCorrection({
      type: spotifyCorrectionForm.type,
      name: spotifyCorrectionForm.name.trim(),
      artist: spotifyCorrectionForm.artist.trim(),
      url: link
    });
    setSpotifyCorrectionForm(form => ({ ...form, url: link }));
    setSpotifyCorrectionMessage(`correction saved for ${spotifyCorrectionForm.name.trim()}.`);
    refreshCorrections();
  };
  const clearCurrentSpotifyCorrection = () => {
    if (!spotifyCorrectionForm.name.trim()) {
      setSpotifyCorrectionMessage('enter the corrected item name to clear it.');
      return;
    }
    const cleared = clearSpotifyCorrection(spotifyCorrectionForm.type, spotifyCorrectionForm.name.trim(), spotifyCorrectionForm.artist.trim());
    setSpotifyCorrectionMessage(cleared ? `correction cleared for ${spotifyCorrectionForm.name.trim()}.` : 'spotify correction not found.');
    refreshCorrections();
  };
  const loadSpotifyCorrection = (correction: SpotifyLinkCorrection) => {
    setSpotifyCorrectionForm({
      type: correction.type || 'track',
      name: correction.name || '',
      artist: correction.artist || '',
      url: correction.url || ''
    });
    setSpotifyCorrectionMessage(`editing correction for ${correction.name || 'spotify item'}.`);
  };
  const saveManualGenreProfile = () => {
    const subgenres = splitGenreList(genreProfileForm.subgenres);
    if (!genreProfileForm.name.trim()) {
      setGenreProfileMessage('add a name before saving a genre profile.');
      return;
    }
    if (!genreProfileForm.family.trim() && !genreProfileForm.primary.trim() && !subgenres.length) {
      setGenreProfileMessage('add at least one genre family, primary genre, or subgenre.');
      return;
    }
    saveGenreProfile({
      type: genreProfileForm.type,
      name: genreProfileForm.name.trim(),
      artist: genreProfileForm.artist.trim(),
      family: genreProfileForm.family.trim(),
      primary: genreProfileForm.primary.trim(),
      subgenres,
      notes: genreProfileForm.notes.trim()
    });
    setGenreProfileMessage(`saved manual genre profile for ${genreProfileForm.name.trim()}.`);
    refreshCorrections();
  };
  const clearCurrentGenreProfile = () => {
    if (!genreProfileForm.name.trim()) {
      setGenreProfileMessage('enter the genre profile name to clear it.');
      return;
    }
    const cleared = clearGenreProfile(genreProfileForm.type, genreProfileForm.name.trim(), genreProfileForm.artist.trim());
    setGenreProfileMessage(cleared ? 'manual genre profile cleared.' : 'genre profile not found.');
    refreshCorrections();
  };
  const loadGenreProfile = (profile: GenreProfile) => {
    setGenreProfileForm({
      type: profile.type || 'artist',
      name: profile.name || '',
      artist: profile.artist || '',
      family: profile.family || '',
      primary: profile.primary || '',
      subgenres: (profile.subgenres || []).join(', '),
      notes: profile.notes || ''
    });
    setGenreProfileMessage(`loaded ${profile.name || 'genre profile'} for editing.`);
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
          <section className="settings-maintenance-panel" aria-labelledby="lastfm-integrity-title">
            <div>
              <h3 id="lastfm-integrity-title">last.fm data integrity</h3>
              <p>
                Last.fm remains the master dataset. React can inspect the local cache and copy it into SQLite.
              </p>
            </div>
            <div className="settings-maintenance-metrics wide">
              <DataMetric label="last.fm profile scrobbles" value={formatNumber(lastfmProfileCount ?? undefined)} />
              <DataMetric label="local cached scrobbles" value={formatNumber(lastfmCacheSnapshot.cacheCount)} />
              <DataMetric label="profile delta" value={formatDelta(lastfmDelta)} />
              <DataMetric label="cache status" value={lastfmState} />
            </div>
            <div className="settings-maintenance-metrics">
              <DataMetric label="latest cached scrobble" value={formatDateFromUts(lastfmCacheSnapshot.latestUts)} />
              <DataMetric label="last sync" value={formatDate(lastfmCacheSnapshot.lastSyncAt)} />
              <DataMetric label="last rebuild" value={formatDate(lastfmCacheSnapshot.lastRebuildAt)} />
            </div>
            <div className="settings-maintenance-actions">
              <button
                className="status-chip is-button"
                disabled={lastfmActionState === 'running'}
                type="button"
                onClick={checkLastfmIntegrity}
              >
                check integrity
              </button>
              <button
                className="status-chip is-button"
                disabled={lastfmActionState === 'running'}
                type="button"
                onClick={loadLastfmCache}
              >
                load cached history
              </button>
              <button
                className="status-chip is-button"
                disabled={lastfmActionState === 'running'}
                type="button"
                onClick={saveLastfmCacheToDatabase}
              >
                save cache to sqlite
              </button>
              <button
                className="status-chip is-button"
                disabled={lastfmActionState === 'running'}
                type="button"
                onClick={() => syncLastfm('recent')}
              >
                sync new scrobbles
              </button>
              <button
                className="status-chip is-button"
                disabled={lastfmActionState === 'running'}
                type="button"
                onClick={() => syncLastfm('full')}
              >
                rebuild last.fm cache
              </button>
            </div>
            <p className={`settings-maintenance-status ${lastfmActionState}`}>{lastfmIntegrityMessage}</p>
          </section>
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

      {activeTab === 'corrections' && (
        <div className="settings-corrections-grid">
          <article className="stats-panel settings-panel">
            <div className="panel-head">
              <div>
                <h2>spotify link corrections</h2>
                <p>manual overrides when fuzzy Spotify matching points at the wrong item</p>
              </div>
            </div>
            <div className="settings-form-grid">
              <select
                className="settings-input"
                value={spotifyCorrectionForm.type}
                onChange={event => setSpotifyCorrectionForm(form => ({ ...form, type: event.target.value as SpotifyCorrectionType }))}
              >
                <option value="track">track</option>
                <option value="artist">artist</option>
                <option value="album">album</option>
              </select>
              <input
                className="settings-input"
                placeholder="track, artist, or album name"
                value={spotifyCorrectionForm.name}
                onChange={event => setSpotifyCorrectionForm(form => ({ ...form, name: event.target.value }))}
              />
              <input
                className="settings-input"
                placeholder="artist name if needed"
                value={spotifyCorrectionForm.artist}
                onChange={event => setSpotifyCorrectionForm(form => ({ ...form, artist: event.target.value }))}
              />
            </div>
            <input
              className="settings-input"
              placeholder="correct open.spotify.com or spotify: url"
              value={spotifyCorrectionForm.url}
              onChange={event => setSpotifyCorrectionForm(form => ({ ...form, url: event.target.value }))}
            />
            <div className="settings-maintenance-actions">
              <button className="status-chip is-button" type="button" onClick={saveSpotifyLinkCorrection}>apply correction</button>
              <button className="status-chip is-button" type="button" onClick={clearCurrentSpotifyCorrection}>clear correction</button>
              <button className="status-chip is-button" type="button" onClick={refreshCorrections}>refresh list</button>
            </div>
            <p className="settings-maintenance-status">{spotifyCorrectionMessage}</p>
            <CorrectionList
              emptyText="no manual spotify corrections saved yet."
              entries={spotifyCorrections.slice(0, 20)}
              renderMeta={entry => entry.artist || entry.url || 'manual spotify override'}
              renderTags={entry => entry.type || 'item'}
              onEdit={loadSpotifyCorrection}
            />
          </article>

          <article className="stats-panel settings-panel">
            <div className="panel-head">
              <div>
                <h2>genre corrections</h2>
                <p>manual genre and subgenre profiles layered above API suggestions</p>
              </div>
            </div>
            <div className="settings-form-grid">
              <select
                className="settings-input"
                value={genreProfileForm.type}
                onChange={event => setGenreProfileForm(form => ({ ...form, type: event.target.value as GenreProfileType }))}
              >
                <option value="artist">artist</option>
                <option value="album">album</option>
                <option value="track">track</option>
              </select>
              <input
                className="settings-input"
                placeholder="artist, album, or track name"
                value={genreProfileForm.name}
                onChange={event => setGenreProfileForm(form => ({ ...form, name: event.target.value }))}
              />
              <input
                className="settings-input"
                placeholder="artist name if needed"
                value={genreProfileForm.artist}
                onChange={event => setGenreProfileForm(form => ({ ...form, artist: event.target.value }))}
              />
            </div>
            <div className="settings-form-grid">
              <input
                className="settings-input"
                placeholder="genre family"
                value={genreProfileForm.family}
                onChange={event => setGenreProfileForm(form => ({ ...form, family: event.target.value }))}
              />
              <input
                className="settings-input"
                placeholder="primary genre"
                value={genreProfileForm.primary}
                onChange={event => setGenreProfileForm(form => ({ ...form, primary: event.target.value }))}
              />
              <input
                className="settings-input"
                placeholder="subgenres, comma separated"
                value={genreProfileForm.subgenres}
                onChange={event => setGenreProfileForm(form => ({ ...form, subgenres: event.target.value }))}
              />
            </div>
            <input
              className="settings-input"
              placeholder="notes or source context"
              value={genreProfileForm.notes}
              onChange={event => setGenreProfileForm(form => ({ ...form, notes: event.target.value }))}
            />
            <div className="settings-maintenance-actions">
              <button className="status-chip is-button" type="button" onClick={saveManualGenreProfile}>save genre</button>
              <button className="status-chip is-button" type="button" onClick={clearCurrentGenreProfile}>clear genre</button>
              <button className="status-chip is-button" type="button" onClick={refreshCorrections}>refresh list</button>
            </div>
            <p className="settings-maintenance-status">
              {genreProfileMessage} · {genreCounts.total.toLocaleString()} saved · {genreCounts.artist} artists · {genreCounts.album} albums · {genreCounts.track} tracks
            </p>
            <CorrectionList
              emptyText="no manual genre profiles yet."
              entries={genreProfiles.slice(0, 20)}
              renderMeta={entry => [entry.artist && entry.type !== 'artist' ? entry.artist : '', entry.family, entry.primary].filter(Boolean).join(' · ') || 'manual genre profile'}
              renderTags={entry => (entry.subgenres || []).join(', ') || entry.primary || entry.family || 'manual'}
              onEdit={loadGenreProfile}
            />
          </article>
        </div>
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

function CorrectionList<T extends { key: string; name?: string; type?: string }>({
  emptyText,
  entries,
  renderMeta,
  renderTags,
  onEdit
}: {
  emptyText: string;
  entries: T[];
  renderMeta: (entry: T) => string;
  renderTags: (entry: T) => string;
  onEdit: (entry: T) => void;
}) {
  if (!entries.length) {
    return <div className="settings-correction-empty">{emptyText}</div>;
  }
  return (
    <div className="settings-correction-list">
      {entries.map(entry => (
        <section className="settings-correction-row" key={entry.key}>
          <span className="settings-correction-kind">{entry.type || 'item'}</span>
          <span className="settings-correction-name">
            <strong>{entry.name || 'corrected item'}</strong>
            <small>{renderMeta(entry)}</small>
          </span>
          <em>{renderTags(entry)}</em>
          <button className="status-chip is-button" type="button" onClick={() => onEdit(entry)}>edit</button>
        </section>
      ))}
    </div>
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

function formatDateFromUts(value: number | undefined) {
  if (!value) return 'pending';
  return formatDate(new Date(value * 1000).toISOString());
}

function formatDelta(value: number | null) {
  if (value === null) return 'pending';
  return `${value > 0 ? '+' : ''}${value.toLocaleString()}`;
}

function importSummary(result: unknown, scrobbles: number | undefined) {
  const details = result && typeof result === 'object' ? result as {
    rowsInserted?: number;
    rowsUpdated?: number;
    rowsUnchanged?: number;
    rows_inserted?: number;
    rows_updated?: number;
    rows_unchanged?: number;
    imported?: number;
  } : {};
  const rowsInserted = details.rowsInserted ?? details.rows_inserted;
  const rowsUpdated = details.rowsUpdated ?? details.rows_updated;
  const rowsUnchanged = details.rowsUnchanged ?? details.rows_unchanged;
  const changed = [
    typeof rowsInserted === 'number' ? `${rowsInserted.toLocaleString()} inserted` : '',
    typeof rowsUpdated === 'number' ? `${rowsUpdated.toLocaleString()} updated` : '',
    typeof rowsUnchanged === 'number' ? `${rowsUnchanged.toLocaleString()} unchanged` : ''
  ].filter(Boolean).join(' · ');
  if (changed) return `Last.fm cache saved to SQLite · ${changed}`;
  return `Last.fm cache saved to SQLite${typeof scrobbles === 'number' ? ` · ${scrobbles.toLocaleString()} stored scrobbles` : ''}`;
}

function scanScheduleStatus(schedule: FreshScanSchedule) {
  if (!schedule.enabled) return 'scheduled scans paused';
  const next = schedule.nextScanMs ? `next scan ${formatFreshScanDate(schedule.nextScanMs)}` : 'next scan not scheduled';
  return `${schedule.lastStatus || 'scheduled scans active'} · ${next}`;
}

export default SettingsScreen;
