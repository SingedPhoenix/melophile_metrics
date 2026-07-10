const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_FILENAME = 'melophile.sqlite';
const SCHEMA_VERSION = 1;

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

function trackPlayCounts(trackRefs = []) {
  const openedDb = requireDb();
  const refs = Array.isArray(trackRefs) ? trackRefs.map(normalizeTrackRef).filter(Boolean) : [];
  const uniqueKeys = new Set(refs.flatMap(ref => ref.artistKeys.map(artistKey => artistKey + '|||' + ref.trackKey)));
  if (!uniqueKeys.size) return { trackCounts: {}, playlistCounts: {} };

  const rows = openedDb.prepare(`
    SELECT artist, track, COUNT(*) AS count
    FROM scrobbles
    WHERE missing_from_source = 0
    GROUP BY artist, track
  `).all();

  const sourceCounts = new Map();
  rows.forEach(row => {
    const key = normalizeText(row.artist) + '|||' + normalizeText(row.track);
    if (!uniqueKeys.has(key)) return;
    sourceCounts.set(key, (sourceCounts.get(key) || 0) + Number(row.count || 0));
  });

  const trackCounts = {};
  const playlistCounts = {};
  refs.forEach(ref => {
    const count = ref.artistKeys.reduce((sum, artistKey) =>
      sum + (sourceCounts.get(artistKey + '|||' + ref.trackKey) || 0), 0);
    trackCounts[ref.key] = count;
    playlistCounts[ref.playlistId] = (playlistCounts[ref.playlistId] || 0) + count;
  });

  return { trackCounts, playlistCounts };
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
  const trackKey = normalizeText(ref.trackName);
  if (!artistKeys.length || !trackKey) return null;
  const key = String(ref.key || `${ref.playlistId}|||${artistKeys.join('|')}|||${trackKey}`);
  return {
    key,
    playlistId: String(ref.playlistId),
    artistKeys,
    trackKey
  };
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
  closeMelophileDatabase,
  databaseStatus,
  importLastfmScrobbles,
  openMelophileDatabase,
  trackPlayCounts
};
