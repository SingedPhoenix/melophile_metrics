import { useMemo, useState } from 'react';
import MetricToggle from '../../shared/MetricToggle';
import { useDesktopStatus, useLocalServiceConfig } from '../../shared/useDesktopStatus';

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
  const desktopStatus = useDesktopStatus();
  const localConfig = useLocalServiceConfig();
  const status = desktopStatus.data;
  const config = localConfig.data;
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

export default SettingsScreen;
