const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_FILENAME = 'melophile.sqlite';
const SCHEMA_VERSION = 1;
const TRACK_GEM_RANGES = [
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
];

let db = null;
let dbPath = null;

function openMelophileDatabase(userDataPath) {
  if (db) return db;
  fs.mkdirSync(userDataPath, { recursive: true });
  dbPath = path.join(userDataPath, DB_FILENAME);
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  migrate();
  return db;
}

function closeMelophileDatabase() {
  if (!db) return;
  db.close();
  db = null;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scrobbles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL DEFAULT 'lastfm',
      source_key TEXT NOT NULL,
      played_at_uts INTEGER NOT NULL,
      played_at_iso TEXT NOT NULL,
      artist TEXT NOT NULL,
      track TEXT NOT NULL,
      album TEXT NOT NULL DEFAULT '',
      source_hash TEXT NOT NULL,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      missing_from_source INTEGER NOT NULL DEFAULT 0,
      UNIQUE(source, source_key)
    );

    CREATE INDEX IF NOT EXISTS idx_scrobbles_played_at ON scrobbles(played_at_uts);
    CREATE INDEX IF NOT EXISTS idx_scrobbles_artist ON scrobbles(artist);
    CREATE INDEX IF NOT EXISTS idx_scrobbles_track ON scrobbles(track);

    CREATE TABLE IF NOT EXISTS scrobble_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scrobble_id INTEGER NOT NULL,
      changed_at TEXT NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      change_source TEXT NOT NULL,
      FOREIGN KEY(scrobble_id) REFERENCES scrobbles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_scrobble_revisions_scrobble ON scrobble_revisions(scrobble_id);

    CREATE TABLE IF NOT EXISTS sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      mode TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      rows_seen INTEGER NOT NULL DEFAULT 0,
      rows_inserted INTEGER NOT NULL DEFAULT 0,
      rows_updated INTEGER NOT NULL DEFAULT 0,
      rows_unchanged INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'running',
      message TEXT NOT NULL DEFAULT ''
    );
  `);

  db.prepare(`
    INSERT INTO app_meta (key, value)
    VALUES ('schema_version', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(String(SCHEMA_VERSION));
}

function databaseStatus() {
  const openedDb = requireDb();
  const scrobbles = openedDb.prepare('SELECT COUNT(*) AS count FROM scrobbles WHERE missing_from_source = 0').get().count;
  const revisions = openedDb.prepare('SELECT COUNT(*) AS count FROM scrobble_revisions').get().count;
  const lastSync = openedDb.prepare(`
    SELECT source, mode, finished_at, rows_seen, rows_inserted, rows_updated, rows_unchanged, status, message
    FROM sync_runs
    ORDER BY id DESC
    LIMIT 1
  `).get() || null;
  return {
    path: dbPath,
    schemaVersion: SCHEMA_VERSION,
    scrobbles,
    revisions,
    lastSync
  };
}

function yearlyListeningRollups() {
  const openedDb = requireDb();
  const years = openedDb.prepare(`
    SELECT CAST(substr(played_at_iso, 1, 4) AS INTEGER) AS year, COUNT(*) AS listens
    FROM scrobbles
    WHERE missing_from_source = 0
    GROUP BY year
    ORDER BY year ASC
  `).all().map(row => ({
    year: Number(row.year || 0),
    listens: Number(row.listens || 0)
  })).filter(row => row.year > 0);

  const topYears = years
    .slice()
    .sort((a, b) => b.listens - a.listens || b.year - a.year)
    .slice(0, 10)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return { years, topYears };
}

function yearlyEntityRankings(options = {}) {
  const openedDb = requireDb();
  const year = Number.parseInt(options.year, 10);
  const type = ['tracks', 'artists', 'albums'].includes(options.type) ? options.type : 'tracks';
  const safeLimit = Math.max(1, Math.min(Number.parseInt(options.limit, 10) || 50, 500));
  if (!Number.isFinite(year) || year < 1900 || year > 3000) {
    return { year: 0, type, rows: [] };
  }

  if (type === 'artists') {
    const rows = rankRows(openedDb.prepare(`
      SELECT artist, COUNT(*) AS listens
      FROM scrobbles
      WHERE missing_from_source = 0 AND CAST(substr(played_at_iso, 1, 4) AS INTEGER) = ?
      GROUP BY artist
      ORDER BY listens DESC, artist ASC
      LIMIT ?
    `).all(year, safeLimit).map(row => ({
      artist: row.artist,
      listens: Number(row.listens || 0)
    })));
    return { year, type, rows };
  }

  if (type === 'albums') {
    const rows = rankRows(openedDb.prepare(`
      SELECT artist, album, COUNT(*) AS listens
      FROM scrobbles
      WHERE missing_from_source = 0
        AND CAST(substr(played_at_iso, 1, 4) AS INTEGER) = ?
        AND trim(album) <> ''
      GROUP BY artist, album
      ORDER BY listens DESC, artist ASC, album ASC
      LIMIT ?
    `).all(year, safeLimit).map(row => ({
      artist: row.artist,
      album: row.album,
      listens: Number(row.listens || 0)
    })));
    return { year, type, rows };
  }

  const rows = rankRows(openedDb.prepare(`
    SELECT artist, track, COUNT(*) AS listens
    FROM scrobbles
    WHERE missing_from_source = 0 AND CAST(substr(played_at_iso, 1, 4) AS INTEGER) = ?
    GROUP BY artist, track
    ORDER BY listens DESC, artist ASC, track ASC
    LIMIT ?
  `).all(year, safeLimit).map(row => ({
    artist: row.artist,
    track: row.track,
    listens: Number(row.listens || 0)
  })));

  return { year, type, rows };
}

function entityRankings(options = {}) {
  const openedDb = requireDb();
  const type = ['tracks', 'artists', 'albums'].includes(options.type) ? options.type : 'tracks';
  const safeLimit = Math.max(1, Math.min(Number.parseInt(options.limit, 10) || 50, 5000));

  if (type === 'artists') {
    const rows = rankRows(openedDb.prepare(`
      SELECT artist, COUNT(*) AS listens
      FROM scrobbles
      WHERE missing_from_source = 0
      GROUP BY artist
      ORDER BY listens DESC, artist ASC
      LIMIT ?
    `).all(safeLimit).map(row => ({
      artist: row.artist,
      listens: Number(row.listens || 0)
    })));
    return { type, rows };
  }

  if (type === 'albums') {
    const rows = rankRows(openedDb.prepare(`
      SELECT artist, album, COUNT(*) AS listens
      FROM scrobbles
      WHERE missing_from_source = 0 AND trim(album) <> ''
      GROUP BY artist, album
      ORDER BY listens DESC, artist ASC, album ASC
      LIMIT ?
    `).all(safeLimit).map(row => ({
      artist: row.artist,
      album: row.album,
      listens: Number(row.listens || 0)
    })));
    return { type, rows };
  }

  const rows = rankRows(openedDb.prepare(`
    SELECT artist, track, COUNT(*) AS listens
    FROM scrobbles
    WHERE missing_from_source = 0
    GROUP BY artist, track
    ORDER BY listens DESC, artist ASC, track ASC
    LIMIT ?
  `).all(safeLimit).map(row => ({
    artist: row.artist,
    track: row.track,
    listens: Number(row.listens || 0)
  })));

  return { type, rows };
}

function recentEntityRankings(options = {}) {
  const openedDb = requireDb();
  const type = ['tracks', 'artists', 'albums'].includes(options.type) ? options.type : 'tracks';
  const windowKey = ['1', '3', '6', '12', '30', '60', '120', 'cy'].includes(String(options.window)) ? String(options.window) : '1';
  const safeLimit = Math.max(1, Math.min(Number.parseInt(options.limit, 10) || 100, 2500));
  const anchorRow = openedDb.prepare(`
    SELECT MAX(played_at_uts) AS anchor_uts
    FROM scrobbles
    WHERE missing_from_source = 0
  `).get();
  const anchorUts = Number(anchorRow?.anchor_uts || Math.floor(Date.now() / 1000));
  const cutoffUts = recentRankingCutoffUts(anchorUts, windowKey);
  const rows = recentRankingRows(openedDb, type, cutoffUts, anchorUts, safeLimit);

  return {
    type,
    window: windowKey,
    label: recentRankingWindowLabel(windowKey),
    cutoffUts,
    anchorUts,
    rows
  };
}

function recentRankingRows(openedDb, type, cutoffUts, anchorUts, limit) {
  if (type === 'artists') {
    return rankRows(openedDb.prepare(`
      SELECT artist, COUNT(*) AS listens
      FROM scrobbles
      WHERE missing_from_source = 0 AND played_at_uts >= ? AND played_at_uts <= ? AND trim(artist) <> ''
      GROUP BY artist
      ORDER BY listens DESC, artist ASC
      LIMIT ?
    `).all(cutoffUts, anchorUts, limit).map(row => ({
      artist: row.artist,
      listens: Number(row.listens || 0)
    })));
  }

  if (type === 'albums') {
    return rankRows(openedDb.prepare(`
      SELECT artist, album, COUNT(*) AS listens
      FROM scrobbles
      WHERE missing_from_source = 0
        AND played_at_uts >= ?
        AND played_at_uts <= ?
        AND trim(artist) <> ''
        AND trim(album) <> ''
      GROUP BY artist, album
      ORDER BY listens DESC, artist ASC, album ASC
      LIMIT ?
    `).all(cutoffUts, anchorUts, limit).map(row => ({
      artist: row.artist,
      album: row.album,
      listens: Number(row.listens || 0)
    })));
  }

  return rankRows(openedDb.prepare(`
    SELECT artist, track, COUNT(*) AS listens
    FROM scrobbles
    WHERE missing_from_source = 0
      AND played_at_uts >= ?
      AND played_at_uts <= ?
      AND trim(artist) <> ''
      AND trim(track) <> ''
    GROUP BY artist, track
    ORDER BY listens DESC, artist ASC, track ASC
    LIMIT ?
  `).all(cutoffUts, anchorUts, limit).map(row => ({
    artist: row.artist,
    track: row.track,
    listens: Number(row.listens || 0)
  })));
}

function recentRankingCutoffUts(anchorUts, windowKey) {
  const anchor = new Date(anchorUts * 1000);
  if (windowKey === 'cy') {
    return Math.floor(Date.UTC(anchor.getUTCFullYear(), 0, 1) / 1000);
  }
  const cutoff = new Date(anchor.getTime());
  cutoff.setUTCMonth(cutoff.getUTCMonth() - (Number.parseInt(windowKey, 10) || 1));
  return Math.floor(cutoff.getTime() / 1000);
}

function recentRankingWindowLabel(windowKey) {
  if (windowKey === 'cy') return 'current year';
  const months = Number.parseInt(windowKey, 10) || 1;
  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

function listeningRollups() {
  const openedDb = requireDb();
  const topArtists = rankRows(openedDb.prepare(`
    SELECT artist, COUNT(*) AS listens
    FROM scrobbles
    WHERE missing_from_source = 0
    GROUP BY artist
    ORDER BY listens DESC, artist ASC
    LIMIT 50
  `).all().map(row => ({
    artist: row.artist,
    listens: Number(row.listens || 0)
  })));

  const topTracks = rankRows(openedDb.prepare(`
    SELECT artist, track, COUNT(*) AS listens
    FROM scrobbles
    WHERE missing_from_source = 0
    GROUP BY artist, track
    ORDER BY listens DESC, artist ASC, track ASC
    LIMIT 50
  `).all().map(row => ({
    artist: row.artist,
    track: row.track,
    listens: Number(row.listens || 0)
  })));

  const topAlbums = rankRows(openedDb.prepare(`
    SELECT artist, album, COUNT(*) AS listens
    FROM scrobbles
    WHERE missing_from_source = 0 AND trim(album) <> ''
    GROUP BY artist, album
    ORDER BY listens DESC, artist ASC, album ASC
    LIMIT 50
  `).all().map(row => ({
    artist: row.artist,
    album: row.album,
    listens: Number(row.listens || 0)
  })));

  const months = openedDb.prepare(`
    SELECT substr(played_at_iso, 1, 7) AS month, COUNT(*) AS listens
    FROM scrobbles
    WHERE missing_from_source = 0
    GROUP BY month
    ORDER BY month ASC
  `).all().map(row => ({
    month: row.month,
    listens: Number(row.listens || 0)
  })).filter(row => row.month);

  return { topArtists, topTracks, topAlbums, months };
}

function recentListening(limit = 50) {
  const openedDb = requireDb();
  const safeLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 50, 200));
  const scrobbles = openedDb.prepare(`
    SELECT played_at_uts, played_at_iso, artist, track, album
    FROM scrobbles
    WHERE missing_from_source = 0
    ORDER BY played_at_uts DESC, id DESC
    LIMIT ?
  `).all(safeLimit).map(row => ({
    playedAtUts: Number(row.played_at_uts || 0),
    playedAtIso: row.played_at_iso,
    artist: row.artist,
    track: row.track,
    album: row.album || ''
  }));

  return { scrobbles };
}

function ghostedTracks(options = {}) {
  const openedDb = requireDb();
  const safeLimit = Math.max(1, Math.min(Number.parseInt(options.limit, 10) || 50, 200));
  const minListens = Math.max(1, Math.min(Number.parseInt(options.minListens, 10) || 5, 1000));
  const type = ['tracks', 'artists', 'albums'].includes(options.type) ? options.type : 'tracks';
  const windowMonths = options.window === 'all'
    ? 'all'
    : Math.max(1, Math.min(Number.parseInt(options.window, 10) || 6, 240));
  const anchorUts = Number(openedDb.prepare(`
    SELECT MAX(played_at_uts) AS anchor_uts
    FROM scrobbles
    WHERE missing_from_source = 0
  `).get()?.anchor_uts || Math.floor(Date.now() / 1000));
  const cutoffUts = windowMonths === 'all' ? 0 : addUtcMonths(anchorUts, -windowMonths);

  let query;
  if (type === 'artists') {
    query = `
      SELECT artist, '' AS track, '' AS album, COUNT(*) AS listens, MIN(played_at_uts) AS first_played_uts, MAX(played_at_uts) AS last_played_uts
      FROM scrobbles
      WHERE missing_from_source = 0
      GROUP BY artist
      HAVING listens >= ? AND last_played_uts < ?
      ORDER BY listens DESC, artist ASC
      LIMIT ?
    `;
  } else if (type === 'albums') {
    query = `
      SELECT artist, '' AS track, album, COUNT(*) AS listens, MIN(played_at_uts) AS first_played_uts, MAX(played_at_uts) AS last_played_uts
      FROM scrobbles
      WHERE missing_from_source = 0 AND trim(album) <> ''
      GROUP BY artist, album
      HAVING listens >= ? AND last_played_uts < ?
      ORDER BY listens DESC, artist ASC, album ASC
      LIMIT ?
    `;
  } else {
    query = `
      SELECT artist, track, album, COUNT(*) AS listens, MIN(played_at_uts) AS first_played_uts, MAX(played_at_uts) AS last_played_uts
      FROM scrobbles
      WHERE missing_from_source = 0
      GROUP BY artist, track
      HAVING listens >= ? AND last_played_uts < ?
      ORDER BY listens DESC, artist ASC, track ASC
      LIMIT ?
    `;
  }

  const entries = openedDb.prepare(query).all(minListens, cutoffUts || anchorUts + 1, safeLimit).map((row, index) => ({
    rank: index + 1,
    key: `${type}|||${normalizeText(row.artist)}|||${normalizeText(row.track || row.album || '')}`,
    type,
    artist: row.artist,
    track: row.track || '',
    album: row.album || '',
    title: type === 'artists' ? row.artist : type === 'albums' ? row.album || 'untitled album' : row.track || 'untitled track',
    subtitle: type === 'artists' ? 'artist' : row.artist,
    listens: Number(row.listens || 0),
    firstPlayedUts: Number(row.first_played_uts || 0),
    lastPlayedUts: Number(row.last_played_uts || 0),
    daysSinceLastPlayed: Math.max(0, Math.floor((anchorUts - Number(row.last_played_uts || anchorUts)) / 86400))
  }));

  return { entries, tracks: type === 'tracks' ? entries : [], type, window: windowMonths, minListens, anchorUts };
}

function apotheosisWatchlist(options = {}) {
  const openedDb = requireDb();
  const safeLimit = Math.max(1, Math.min(Number.parseInt(options.limit, 10) || 100, 200));
  const windowMonths = Math.max(1, Math.min(Number.parseInt(options.windowMonths, 10) || 6, 120));
  const anchorUts = Number(openedDb.prepare(`
    SELECT MAX(played_at_uts) AS anchor_uts
    FROM scrobbles
    WHERE missing_from_source = 0
  `).get()?.anchor_uts || Math.floor(Date.now() / 1000));
  const cutoffUts = addUtcMonths(anchorUts, -windowMonths);

  const rows = openedDb.prepare(`
    WITH artist_counts AS (
      SELECT artist, COUNT(*) AS listens
      FROM scrobbles
      WHERE missing_from_source = 0
      GROUP BY artist
    ),
    track_firsts AS (
      SELECT artist, track, MIN(played_at_uts) AS first_seen_uts
      FROM scrobbles
      WHERE missing_from_source = 0 AND trim(track) <> ''
      GROUP BY artist, track
    ),
    newest_track_dates AS (
      SELECT artist, MAX(first_seen_uts) AS newest_track_uts
      FROM track_firsts
      GROUP BY artist
    ),
    newest_tracks AS (
      SELECT tf.artist, MIN(tf.track) AS newest_track, ntd.newest_track_uts
      FROM track_firsts tf
      JOIN newest_track_dates ntd
        ON ntd.artist = tf.artist
       AND ntd.newest_track_uts = tf.first_seen_uts
      GROUP BY tf.artist, ntd.newest_track_uts
    )
    SELECT ac.artist, ac.listens, nt.newest_track, nt.newest_track_uts
    FROM artist_counts ac
    JOIN newest_tracks nt ON nt.artist = ac.artist
    WHERE nt.newest_track_uts < ?
    ORDER BY ac.listens DESC, ac.artist ASC
    LIMIT ?
  `).all(cutoffUts, safeLimit).map((row, index) => ({
    rank: index + 1,
    key: normalizeText(row.artist),
    artist: row.artist,
    listens: Number(row.listens || 0),
    newestTrack: row.newest_track || '',
    newestTrackUts: Number(row.newest_track_uts || 0),
    monthsSinceNewestTrack: Math.max(0, Math.floor((anchorUts - Number(row.newest_track_uts || anchorUts)) / 2629800))
  }));

  return { artists: rows, anchorUts, windowMonths };
}

function freshOverview(options = {}) {
  const openedDb = requireDb();
  const albumLimit = Math.max(1, Math.min(Number.parseInt(options.albumLimit, 10) || 16, 50));
  const artistLimit = Math.max(1, Math.min(Number.parseInt(options.artistLimit, 10) || 12, 50));
  const nowUts = Math.floor(Date.now() / 1000);
  const quietCutoff = nowUts - 180 * 86400;
  const recentCutoff = nowUts - 548 * 86400;

  const topAlbums = rankRows(openedDb.prepare(`
    SELECT artist, album, COUNT(*) AS listens, MAX(played_at_uts) AS last_played_uts
    FROM scrobbles
    WHERE missing_from_source = 0 AND trim(album) <> ''
    GROUP BY artist, album
    ORDER BY listens DESC, artist ASC, album ASC
    LIMIT ?
  `).all(albumLimit).map(row => ({
    artist: row.artist,
    album: row.album,
    listens: Number(row.listens || 0),
    lastPlayedUts: Number(row.last_played_uts || 0)
  })));

  const quietArtists = rankRows(openedDb.prepare(`
    SELECT artist, COUNT(*) AS listens, MAX(played_at_uts) AS last_played_uts
    FROM scrobbles
    WHERE missing_from_source = 0
    GROUP BY artist
    HAVING listens >= 25 AND last_played_uts < ?
    ORDER BY listens DESC, last_played_uts ASC, artist ASC
    LIMIT ?
  `).all(quietCutoff, artistLimit).map(row => ({
    artist: row.artist,
    listens: Number(row.listens || 0),
    lastPlayedUts: Number(row.last_played_uts || 0),
    daysSinceLastPlayed: Math.max(0, Math.floor((nowUts - Number(row.last_played_uts || nowUts)) / 86400))
  })));

  const recentArtists = rankRows(openedDb.prepare(`
    SELECT artist, COUNT(*) AS listens, MIN(played_at_uts) AS first_played_uts, MAX(played_at_uts) AS last_played_uts
    FROM scrobbles
    WHERE missing_from_source = 0
    GROUP BY artist
    HAVING listens >= 6 AND first_played_uts >= ?
    ORDER BY listens DESC, last_played_uts DESC, artist ASC
    LIMIT ?
  `).all(recentCutoff, artistLimit).map(row => ({
    artist: row.artist,
    listens: Number(row.listens || 0),
    firstPlayedUts: Number(row.first_played_uts || 0),
    lastPlayedUts: Number(row.last_played_uts || 0)
  })));

  return { topAlbums, quietArtists, recentArtists };
}

function freshDiscoveryYears(options = {}) {
  const openedDb = requireDb();
  const metric = ['tracks', 'artists', 'albums'].includes(options.metric) ? options.metric : 'tracks';
  const currentYear = new Date().getFullYear();
  const rows = rankRows(openedDb.prepare(freshDiscoveryYearSql(metric)).all().map(row => ({
    year: Number(row.year || 0),
    value: Number(row.value || 0)
  }))).filter(row => row.year > 0);

  return { metric, currentYear, rows };
}

function freshDiscoveryYearSql(metric) {
  if (metric === 'artists') {
    return `
      WITH first_seen AS (
        SELECT lower(trim(artist)) AS entity_key, MIN(played_at_uts) AS first_played_uts
        FROM scrobbles
        WHERE missing_from_source = 0 AND trim(artist) <> ''
        GROUP BY lower(trim(artist))
      )
      SELECT CAST(strftime('%Y', first_played_uts, 'unixepoch') AS INTEGER) AS year, COUNT(*) AS value
      FROM first_seen
      GROUP BY year
      ORDER BY value DESC, year DESC
    `;
  }

  if (metric === 'albums') {
    return `
      WITH first_seen AS (
        SELECT lower(trim(artist)) || '|' || lower(trim(album)) AS entity_key, MIN(played_at_uts) AS first_played_uts
        FROM scrobbles
        WHERE missing_from_source = 0 AND trim(artist) <> '' AND trim(album) <> ''
        GROUP BY lower(trim(artist)), lower(trim(album))
      )
      SELECT CAST(strftime('%Y', first_played_uts, 'unixepoch') AS INTEGER) AS year, COUNT(*) AS value
      FROM first_seen
      GROUP BY year
      ORDER BY value DESC, year DESC
    `;
  }

  return `
    WITH first_seen AS (
      SELECT lower(trim(artist)) || '|' || lower(trim(track)) AS entity_key, MIN(played_at_uts) AS first_played_uts
      FROM scrobbles
      WHERE missing_from_source = 0 AND trim(artist) <> '' AND trim(track) <> ''
      GROUP BY lower(trim(artist)), lower(trim(track))
    )
    SELECT CAST(strftime('%Y', first_played_uts, 'unixepoch') AS INTEGER) AS year, COUNT(*) AS value
    FROM first_seen
    GROUP BY year
    ORDER BY value DESC, year DESC
  `;
}

function harvestRankings(options = {}) {
  const openedDb = requireDb();
  const type = ['tracks', 'artists', 'albums'].includes(options.type) ? options.type : 'tracks';
  const windowKey = ['1', '3', '6', '12', 'cy'].includes(String(options.window)) ? String(options.window) : '1';
  const limit = Math.max(1, Math.min(Number.parseInt(options.limit, 10) || 50, 100));
  const anchorRow = openedDb.prepare(`
    SELECT MAX(played_at_uts) AS anchor_uts
    FROM scrobbles
    WHERE missing_from_source = 0
  `).get();
  const anchorUts = Number(anchorRow?.anchor_uts || Math.floor(Date.now() / 1000));
  const cutoffUts = harvestCutoffUts(anchorUts, windowKey);
  const params = [cutoffUts, anchorUts, cutoffUts, anchorUts, limit];
  const rows = rankRows(openedDb.prepare(harvestRankingSql(type)).all(...params).map(row => ({
    name: row.name || '',
    artist: row.artist || '',
    album: row.album || '',
    listens: Number(row.listens || 0),
    firstPlayedUts: Number(row.first_played_uts || 0)
  })));

  return {
    type,
    window: windowKey,
    label: harvestWindowLabel(windowKey),
    cutoffUts,
    anchorUts,
    rows
  };
}

function harvestCutoffUts(anchorUts, windowKey) {
  const anchor = new Date(anchorUts * 1000);
  if (windowKey === 'cy') {
    return Math.floor(Date.UTC(anchor.getUTCFullYear(), 0, 1) / 1000);
  }
  const months = Number.parseInt(windowKey, 10) || 1;
  const cutoff = new Date(anchor.getTime());
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return Math.floor(cutoff.getTime() / 1000);
}

function harvestWindowLabel(windowKey) {
  if (windowKey === 'cy') return 'current year';
  const months = Number.parseInt(windowKey, 10) || 1;
  return `last ${months} ${months === 1 ? 'month' : 'months'}`;
}

function harvestRankingSql(type) {
  if (type === 'artists') {
    return `
      WITH first_seen AS (
        SELECT lower(artist) AS artist_key, artist AS name, MIN(played_at_uts) AS first_played_uts
        FROM scrobbles
        WHERE missing_from_source = 0 AND trim(artist) <> ''
        GROUP BY lower(artist)
      )
      SELECT s.artist AS name, '' AS artist, '' AS album, fs.first_played_uts, COUNT(*) AS listens
      FROM scrobbles s
      JOIN first_seen fs ON lower(s.artist) = fs.artist_key
      WHERE s.missing_from_source = 0
        AND s.played_at_uts BETWEEN ? AND ?
        AND fs.first_played_uts BETWEEN ? AND ?
      GROUP BY lower(s.artist)
      ORDER BY listens DESC, fs.first_played_uts DESC, name ASC
      LIMIT ?
    `;
  }

  if (type === 'albums') {
    return `
      WITH first_seen AS (
        SELECT lower(artist) AS artist_key, lower(album) AS album_key, MIN(played_at_uts) AS first_played_uts
        FROM scrobbles
        WHERE missing_from_source = 0 AND trim(album) <> ''
        GROUP BY lower(artist), lower(album)
      )
      SELECT s.album AS name, s.artist AS artist, s.album AS album, fs.first_played_uts, COUNT(*) AS listens
      FROM scrobbles s
      JOIN first_seen fs ON lower(s.artist) = fs.artist_key AND lower(s.album) = fs.album_key
      WHERE s.missing_from_source = 0
        AND trim(s.album) <> ''
        AND s.played_at_uts BETWEEN ? AND ?
        AND fs.first_played_uts BETWEEN ? AND ?
      GROUP BY lower(s.artist), lower(s.album)
      ORDER BY listens DESC, fs.first_played_uts DESC, name ASC
      LIMIT ?
    `;
  }

  return `
    WITH first_seen AS (
      SELECT lower(artist) AS artist_key, lower(track) AS track_key, MIN(played_at_uts) AS first_played_uts
      FROM scrobbles
      WHERE missing_from_source = 0 AND trim(track) <> ''
      GROUP BY lower(artist), lower(track)
    )
    SELECT s.track AS name, s.artist AS artist, s.album AS album, fs.first_played_uts, COUNT(*) AS listens
    FROM scrobbles s
    JOIN first_seen fs ON lower(s.artist) = fs.artist_key AND lower(s.track) = fs.track_key
    WHERE s.missing_from_source = 0
      AND trim(s.track) <> ''
      AND s.played_at_uts BETWEEN ? AND ?
      AND fs.first_played_uts BETWEEN ? AND ?
    GROUP BY lower(s.artist), lower(s.track)
    ORDER BY listens DESC, fs.first_played_uts DESC, name ASC
    LIMIT ?
  `;
}

function frissonOverview(options = {}) {
  const openedDb = requireDb();
  const limit = Math.max(1, Math.min(Number.parseInt(options.limit, 10) || 12, 50));
  const nowUts = Math.floor(Date.now() / 1000);
  const recentCutoff = nowUts - 30 * 86400;

  const repeatedTracks = rankRows(openedDb.prepare(`
    SELECT artist, track, album, COUNT(*) AS listens, MIN(played_at_uts) AS first_played_uts, MAX(played_at_uts) AS last_played_uts
    FROM scrobbles
    WHERE missing_from_source = 0
    GROUP BY artist, track
    ORDER BY listens DESC, last_played_uts DESC, artist ASC, track ASC
    LIMIT ?
  `).all(limit).map(row => attachTrackMetrics(row, nowUts)));

  const enduringTracks = rankRows(openedDb.prepare(`
    SELECT artist, track, album, COUNT(*) AS listens, MIN(played_at_uts) AS first_played_uts, MAX(played_at_uts) AS last_played_uts
    FROM scrobbles
    WHERE missing_from_source = 0
    GROUP BY artist, track
    HAVING listens >= 10
    ORDER BY (last_played_uts - first_played_uts) DESC, listens DESC, artist ASC, track ASC
    LIMIT ?
  `).all(limit).map(row => attachTrackMetrics(row, nowUts)));

  const recentAnchors = rankRows(openedDb.prepare(`
    SELECT artist, track, album, COUNT(*) AS listens, MIN(played_at_uts) AS first_played_uts, MAX(played_at_uts) AS last_played_uts
    FROM scrobbles
    WHERE missing_from_source = 0 AND played_at_uts >= ?
    GROUP BY artist, track
    ORDER BY listens DESC, last_played_uts DESC, artist ASC, track ASC
    LIMIT ?
  `).all(recentCutoff, limit).map(row => attachTrackMetrics(row, nowUts)));

  return { repeatedTracks, enduringTracks, recentAnchors };
}

function attachTrackMetrics(row, nowUts) {
  const firstPlayedUts = Number(row.first_played_uts || 0);
  const lastPlayedUts = Number(row.last_played_uts || 0);
  const spanDays = firstPlayedUts && lastPlayedUts
    ? Math.max(0, Math.floor((lastPlayedUts - firstPlayedUts) / 86400))
    : 0;
  return {
    artist: row.artist,
    track: row.track,
    album: row.album || '',
    listens: Number(row.listens || 0),
    firstPlayedUts,
    lastPlayedUts,
    spanDays,
    daysSinceLastPlayed: Math.max(0, Math.floor((nowUts - Number(row.last_played_uts || nowUts)) / 86400))
  };
}

function trackPlayCounts(trackRefs = []) {
  const openedDb = requireDb();
  const refs = Array.isArray(trackRefs) ? trackRefs.map(normalizeTrackRef).filter(Boolean) : [];
  const uniqueKeys = new Set(refs.flatMap(ref =>
    ref.artistKeys.flatMap(artistKey => ref.trackKeys.map(trackKey => artistKey + '|||' + trackKey))
  ));
  if (!uniqueKeys.size) return { trackCounts: {}, playlistCounts: {} };

  const rows = openedDb.prepare(`
    SELECT artist, track, COUNT(*) AS count
    FROM scrobbles
    WHERE missing_from_source = 0
    GROUP BY artist, track
    ORDER BY count DESC, artist ASC, track ASC
  `).all();

  const sourceCounts = new Map();
  const sourceGems = new Map();
  rows.forEach((row, index) => {
    const artistKey = normalizeText(row.artist);
    const rank = index + 1;
    const gemRange = TRACK_GEM_RANGES.find(range => rank >= range.from && rank <= range.to);
    normalizeTrackKeys(row.track).forEach(trackKey => {
      const key = artistKey + '|||' + trackKey;
      if (!uniqueKeys.has(key)) return;
      sourceCounts.set(key, (sourceCounts.get(key) || 0) + Number(row.count || 0));
      if (!gemRange) return;
      const gem = {
        name: gemRange.name,
        label: gemRange.label,
        color: gemRange.color,
        rank,
        count: Number(row.count || 0)
      };
      const currentGem = sourceGems.get(key);
      if (!currentGem || gem.rank < currentGem.rank) sourceGems.set(key, gem);
    });
  });

  const trackCounts = {};
  const trackGems = {};
  const playlistCounts = {};
  refs.forEach(ref => {
    const count = ref.artistKeys.reduce((sum, artistKey) => {
      const bestTrackCount = ref.trackKeys.reduce((best, trackKey) =>
        Math.max(best, sourceCounts.get(artistKey + '|||' + trackKey) || 0), 0);
      return sum + bestTrackCount;
    }, 0);
    const gem = ref.artistKeys
      .flatMap(artistKey => ref.trackKeys.map(trackKey => sourceGems.get(artistKey + '|||' + trackKey)).filter(Boolean))
      .sort((a, b) => a.rank - b.rank)[0];
    trackCounts[ref.key] = count;
    if (gem) trackGems[ref.key] = gem;
    playlistCounts[ref.playlistId] = (playlistCounts[ref.playlistId] || 0) + count;
  });

  return { trackCounts, trackGems, playlistCounts };
}

function importLastfmScrobbles(rows, mode = 'manual') {
  const openedDb = requireDb();
  const startedAt = new Date().toISOString();

  const stats = {
    rowsSeen: 0,
    rowsInserted: 0,
    rowsUpdated: 0,
    rowsUnchanged: 0
  };

  const insertScrobble = openedDb.prepare(`
    INSERT INTO scrobbles (
      source, source_key, played_at_uts, played_at_iso, artist, track, album,
      source_hash, first_seen_at, last_seen_at, updated_at, missing_from_source
    )
    VALUES ('lastfm', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  const findScrobble = openedDb.prepare(`
    SELECT id, source_key, artist, track, album, source_hash
    FROM scrobbles
    WHERE source = 'lastfm' AND source_key = ?
  `);
  const findTimestampCandidates = openedDb.prepare(`
    SELECT id, source_key, artist, track, album, source_hash
    FROM scrobbles
    WHERE source = 'lastfm' AND played_at_uts = ?
  `);
  const updateScrobble = openedDb.prepare(`
    UPDATE scrobbles
    SET source_key = ?, artist = ?, track = ?, album = ?, source_hash = ?, last_seen_at = ?, updated_at = ?, missing_from_source = 0
    WHERE id = ?
  `);
  const touchScrobble = openedDb.prepare(`
    UPDATE scrobbles
    SET last_seen_at = ?, missing_from_source = 0
    WHERE id = ?
  `);
  const insertRevision = openedDb.prepare(`
    INSERT INTO scrobble_revisions (scrobble_id, changed_at, field_name, old_value, new_value, change_source)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const finishSync = openedDb.prepare(`
    UPDATE sync_runs
    SET finished_at = ?, rows_seen = ?, rows_inserted = ?, rows_updated = ?, rows_unchanged = ?, status = ?, message = ?
    WHERE id = ?
  `);

  openedDb.exec('BEGIN IMMEDIATE;');
  try {
    const syncRun = openedDb.prepare(`
      INSERT INTO sync_runs (source, mode, started_at)
      VALUES ('lastfm', ?, ?)
    `).run(mode, startedAt);

    rows.forEach(row => {
      const normalized = normalizeLastfmRow(row);
      if (!normalized) return;
      stats.rowsSeen++;
      const existingByKey = findScrobble.get(normalized.sourceKey);
      const existing = existingByKey || findCorrectionCandidate(findTimestampCandidates.all(normalized.playedAtUts));
      if (!existing) {
        insertScrobble.run(
          normalized.sourceKey,
          normalized.playedAtUts,
          normalized.playedAtIso,
          normalized.artist,
          normalized.track,
          normalized.album,
          normalized.sourceHash,
          startedAt,
          startedAt,
          startedAt
        );
        stats.rowsInserted++;
        return;
      }

      if (existing.source_hash === normalized.sourceHash) {
        touchScrobble.run(startedAt, existing.id);
        stats.rowsUnchanged++;
        return;
      }

      [
        ['source_key', existing.source_key, normalized.sourceKey],
        ['artist', existing.artist, normalized.artist],
        ['track', existing.track, normalized.track],
        ['album', existing.album, normalized.album]
      ].forEach(([field, oldValue, newValue]) => {
        if ((oldValue || '') !== (newValue || '')) {
          insertRevision.run(existing.id, startedAt, field, oldValue || '', newValue || '', mode);
        }
      });
      updateScrobble.run(
        normalized.sourceKey,
        normalized.artist,
        normalized.track,
        normalized.album,
        normalized.sourceHash,
        startedAt,
        startedAt,
        existing.id
      );
      stats.rowsUpdated++;
    });

    finishSync.run(
      new Date().toISOString(),
      stats.rowsSeen,
      stats.rowsInserted,
      stats.rowsUpdated,
      stats.rowsUnchanged,
      'complete',
      'last.fm scrobbles imported',
      syncRun.lastInsertRowid
    );
    openedDb.exec('COMMIT;');
  } catch (error) {
    openedDb.exec('ROLLBACK;');
    throw error;
  }
  return { ...stats, status: databaseStatus() };
}

function findCorrectionCandidate(candidates) {
  return candidates.length === 1 ? candidates[0] : null;
}

function normalizeLastfmRow(row) {
  if (!row || !row.uts || !row.artist || !row.track) return null;
  const playedAtUts = Number.parseInt(row.uts, 10);
  if (!Number.isFinite(playedAtUts) || playedAtUts <= 0) return null;
  const artist = String(row.artist || '').trim();
  const track = String(row.track || '').trim();
  const album = String(row.album || '').trim();
  if (!artist || !track) return null;
  const sourceKey = String(row.id || `${playedAtUts}|${artist.toLowerCase()}|${track.toLowerCase()}`);
  const playedAtIso = new Date(playedAtUts * 1000).toISOString();
  const sourceHash = hashParts([playedAtUts, artist, track, album]);
  return { sourceKey, playedAtUts, playedAtIso, artist, track, album, sourceHash };
}

function normalizeTrackRef(ref) {
  if (!ref || !ref.playlistId || !ref.trackName) return null;
  const artistKeys = (Array.isArray(ref.artists) ? ref.artists : [])
    .map(artist => normalizeText(typeof artist === 'string' ? artist : artist && artist.name))
    .filter(Boolean);
  const trackKeys = normalizeTrackKeys(ref.trackName);
  if (!artistKeys.length || !trackKeys.length) return null;
  const key = String(ref.key || `${ref.playlistId}|||${artistKeys.join('|')}|||${trackKeys[0]}`);
  return {
    key,
    playlistId: String(ref.playlistId),
    artistKeys,
    trackKeys
  };
}

function rankRows(rows) {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeTrackKeys(value) {
  const base = normalizeText(value);
  if (!base) return [];
  const aliases = new Set([base]);
  const stripped = base
    .replace(/\b(feat|featuring|ft|with)\b.*$/g, '')
    .replace(/\b(remaster|remastered|remix|radio edit|single version|album version|deluxe edition|bonus track)\b.*$/g, '')
    .replace(/\b\d{4}\s+remaster(ed)?\b.*$/g, '')
    .replace(/\s+-\s+.*$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  if (stripped) aliases.add(stripped);
  return [...aliases];
}

function addUtcMonths(uts, deltaMonths) {
  const date = new Date(Number(uts || 0) * 1000);
  date.setUTCMonth(date.getUTCMonth() + deltaMonths);
  return Math.floor(date.getTime() / 1000);
}

function hashParts(parts) {
  return crypto
    .createHash('sha256')
    .update(parts.map(part => String(part || '')).join('\u001f'))
    .digest('hex');
}

function requireDb() {
  if (!db) throw new Error('database is not open');
  return db;
}

module.exports = {
  apotheosisWatchlist,
  closeMelophileDatabase,
  databaseStatus,
  entityRankings,
  freshDiscoveryYears,
  freshOverview,
  frissonOverview,
  ghostedTracks,
  harvestRankings,
  importLastfmScrobbles,
  listeningRollups,
  openMelophileDatabase,
  recentListening,
  recentEntityRankings,
  trackPlayCounts,
  yearlyEntityRankings,
  yearlyListeningRollups
};
