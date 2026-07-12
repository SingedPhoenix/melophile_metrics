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

function recentListeningAnalytics(options = {}) {
  const openedDb = requireDb();
  const windowKey = ['1', '3', '6', '12', '30', '60', '120', 'cy'].includes(String(options.window)) ? String(options.window) : '1';
  const anchorRow = openedDb.prepare(`
    SELECT MAX(played_at_uts) AS anchor_uts
    FROM scrobbles
    WHERE missing_from_source = 0
  `).get();
  const anchorUts = Number(anchorRow?.anchor_uts || Math.floor(Date.now() / 1000));
  const anchor = new Date(anchorUts * 1000);
  const currentStart = new Date(recentRankingCutoffUts(anchorUts, windowKey) * 1000);
  const priorPeriods = buildPriorAnalyticsPeriods(currentStart, anchor, windowKey);
  const earliestUts = Math.floor((priorPeriods[priorPeriods.length - 1]?.start || currentStart).getTime() / 1000);
  const rows = openedDb.prepare(`
    SELECT artist, track, album, played_at_uts
    FROM scrobbles
    WHERE missing_from_source = 0 AND played_at_uts >= ? AND played_at_uts <= ?
    ORDER BY played_at_uts ASC
  `).all(earliestUts, anchorUts).map(row => ({
    artist: row.artist || '',
    track: row.track || '',
    album: row.album || '',
    playedAtUts: Number(row.played_at_uts || 0)
  }));

  const current = summarizeAnalyticsPeriod(rows, currentStart, anchor);
  const previous = priorPeriods.map(period => summarizeAnalyticsPeriod(rows, period.start, period.end));
  const pace = buildRecentPace(rows, currentStart, anchor, windowKey);

  return {
    window: windowKey,
    label: recentRankingWindowLabel(windowKey),
    anchorUts,
    cutoffUts: Math.floor(currentStart.getTime() / 1000),
    current,
    baseline: {
      perDay: averageAnalyticsValue(previous, 'perDay'),
      perActiveDay: averageAnalyticsValue(previous, 'perActiveDay'),
      perWeek: averageAnalyticsValue(previous, 'perWeek'),
      activeDaysPerWeek: averageAnalyticsValue(previous, 'activeDaysPerWeek')
    },
    hourAverages: averageCountArrays(previous, 'hourCounts', 24),
    dowAverages: averageCountArrays(previous, 'dowCounts', 7),
    pace
  };
}

function buildPriorAnalyticsPeriods(currentStart, anchor, windowKey) {
  const periods = [];
  if (windowKey === 'cy') {
    const anchorMonth = anchor.getUTCMonth();
    const anchorDate = anchor.getUTCDate();
    const anchorHours = anchor.getUTCHours();
    const anchorMinutes = anchor.getUTCMinutes();
    const anchorSeconds = anchor.getUTCSeconds();
    for (let i = 1; i <= 5; i++) {
      const year = anchor.getUTCFullYear() - i;
      periods.push({
        start: new Date(Date.UTC(year, 0, 1)),
        end: new Date(Date.UTC(year, anchorMonth, anchorDate, anchorHours, anchorMinutes, anchorSeconds))
      });
    }
    return periods;
  }

  const months = Number.parseInt(windowKey, 10) || 1;
  let periodEnd = new Date(currentStart);
  for (let i = 0; i < 5; i++) {
    const periodStart = addUtcMonthsDate(periodEnd, -months);
    periods.push({ start: periodStart, end: periodEnd });
    periodEnd = periodStart;
  }
  return periods;
}

function summarizeAnalyticsPeriod(rows, start, end) {
  const activeDays = new Set();
  const tracks = new Set();
  const artists = new Set();
  const albums = new Set();
  const hourCounts = Array(24).fill(0);
  const dowCounts = Array(7).fill(0);
  let scrobbles = 0;
  const startMs = start.getTime();
  const endMs = end.getTime();

  rows.forEach(row => {
    const played = new Date(row.playedAtUts * 1000);
    const playedMs = played.getTime();
    if (playedMs < startMs || playedMs > endMs) return;
    scrobbles++;
    activeDays.add(played.toISOString().slice(0, 10));
    hourCounts[played.getHours()]++;
    dowCounts[played.getDay()]++;
    if (row.track) tracks.add(`${normalizeText(row.artist)}|${normalizeText(row.track)}`);
    if (row.artist) artists.add(normalizeText(row.artist));
    if (row.album) albums.add(`${normalizeText(row.artist)}|${normalizeText(row.album)}`);
  });

  const elapsedDays = Math.max(1, Math.ceil((endMs - startMs) / 86400000));
  const elapsedWeeks = elapsedDays / 7;
  return {
    scrobbles,
    activeDays: activeDays.size,
    tracks: tracks.size,
    artists: artists.size,
    albums: albums.size,
    elapsedDays,
    hourCounts,
    dowCounts,
    values: {
      perDay: scrobbles / elapsedDays,
      perActiveDay: activeDays.size ? scrobbles / activeDays.size : 0,
      perWeek: scrobbles / elapsedWeeks,
      activeDaysPerWeek: activeDays.size / elapsedWeeks
    }
  };
}

function averageAnalyticsValue(periods, key) {
  const usable = periods.filter(period => period.scrobbles > 0 && Number.isFinite(period.values[key]));
  if (!usable.length) return 0;
  return usable.reduce((sum, period) => sum + period.values[key], 0) / usable.length;
}

function averageCountArrays(periods, key, count) {
  const usable = periods.filter(period => period.scrobbles > 0);
  if (!usable.length) return Array(count).fill(0);
  return Array.from({ length: count }, (_, index) =>
    usable.reduce((sum, period) => sum + Number(period[key][index] || 0), 0) / usable.length
  );
}

function buildRecentPace(rows, start, anchor, windowKey) {
  const config = paceConfigForWindowKey(windowKey);
  const buckets = [];
  if (config.unit === 'day') {
    for (let i = 0; i < config.count; i++) {
      buckets.push({ start: addUtcDays(start, i), end: addUtcDays(start, i + 1), count: 0 });
    }
  } else if (config.unit === 'week') {
    for (let i = 0; i < config.count; i++) {
      buckets.push({ start: addUtcDays(start, i * 7), end: addUtcDays(start, (i + 1) * 7), count: 0 });
    }
  } else if (config.unit === 'month') {
    for (let i = 0; i < config.count; i++) {
      buckets.push({ start: addUtcMonthsDate(start, i), end: addUtcMonthsDate(start, i + 1), count: 0 });
    }
  } else {
    const span = anchor.getTime() - start.getTime();
    for (let i = 0; i < config.count; i++) {
      buckets.push({
        start: new Date(start.getTime() + span * (i / config.count)),
        end: new Date(start.getTime() + span * ((i + 1) / config.count)),
        count: 0
      });
    }
  }

  rows.forEach(row => {
    const playedMs = row.playedAtUts * 1000;
    if (playedMs < start.getTime() || playedMs > anchor.getTime()) return;
    const bucket = buckets.find((candidate, index) =>
      playedMs >= candidate.start.getTime() &&
      (playedMs < candidate.end.getTime() || index === buckets.length - 1)
    );
    if (bucket) bucket.count++;
  });

  const labeledBuckets = buckets.map((bucket, index) => ({
    label: paceBucketLabel(bucket.start, index, config),
    rangeLabel: paceBucketRange(bucket.start, bucket.end),
    count: bucket.count
  }));
  const average = labeledBuckets.length
    ? labeledBuckets.reduce((sum, bucket) => sum + bucket.count, 0) / labeledBuckets.length
    : 0;
  const peak = labeledBuckets.reduce((best, bucket) => bucket.count > best.count ? bucket : best, labeledBuckets[0] || null);
  return {
    label: config.label,
    averageLabel: config.average,
    average,
    aboveAverageCount: labeledBuckets.filter(bucket => bucket.count > average).length,
    peak,
    buckets: labeledBuckets
  };
}

function paceConfigForWindowKey(windowKey) {
  if (windowKey === '1') return { count: 30, unit: 'day', label: 'daily columns', average: 'average per day' };
  if (windowKey === '3') return { count: 12, unit: 'week', label: 'weekly columns', average: 'average per week' };
  if (windowKey === '6') return { count: 24, unit: 'week', label: 'weekly columns', average: 'average per week' };
  if (windowKey === '12' || windowKey === 'cy') return { count: 12, unit: 'month', label: 'monthly columns', average: 'average per month' };
  if (windowKey === '30') return { count: 30, unit: 'month', label: 'monthly columns', average: 'average per month' };
  if (windowKey === '60') return { count: 15, unit: 'season-block', label: 'seasonal-block columns', average: 'average per seasonal block' };
  return { count: 12, unit: 'year-block', label: 'long-range year columns', average: 'average per long-range year' };
}

function paceBucketLabel(start, index, config) {
  if (config.unit === 'day') return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
  if (config.unit === 'week') return `week ${index + 1}`;
  if (config.unit === 'month') return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toLowerCase();
  if (config.unit === 'season-block') return `q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
  return String(start.getFullYear());
}

function paceBucketRange(start, end) {
  const inclusiveEnd = new Date(end.getTime() - 1);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase()} - ${inclusiveEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase()}`;
}

function addUtcDays(date, days) {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function addUtcMonthsDate(date, months) {
  const shifted = new Date(date);
  shifted.setUTCMonth(shifted.getUTCMonth() + months);
  return shifted;
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
  recentListeningAnalytics,
  trackPlayCounts,
  yearlyEntityRankings,
  yearlyListeningRollups
};
