# Electron Migration

This migration is intentionally gradual. The first checkpoint keeps `melophile_metrics_v2.html` as the renderer source of truth and adds an Electron shell around it.

## Current Scope

- Load the existing app through Electron.
- Keep the single-file renderer as the UI source of truth while adding desktop services.
- Route Spotify and `open.spotify.com` links through Electron external-link handling.
- Serve the renderer from `http://127.0.0.1:8767` so Spotify redirect auth keeps working.
- Store Last.fm scrobbles in a local SQLite database through a narrow preload bridge.
- Set the desktop app identity to `melophile metrics` with tracked PNG/ICNS app icon assets.
- Keep private data and generated datasets out of the public repository.

## SQLite Checkpoint

The desktop app creates `melophile.sqlite` in Electron's user data directory, not in the public repository. The first schema includes:

- `scrobbles`: active Last.fm scrobble rows copied from the existing app cache.
- `scrobble_revisions`: field-level changes detected when an existing scrobble row changes.
- `sync_runs`: import/sync summaries for database status and troubleshooting.
- `app_meta`: schema metadata.

The current renderer still uses IndexedDB for its active in-memory load path. SQLite is now a permanent desktop copy and audit foundation; later checkpoints can read directly from SQLite and move Last.fm reconciliation into the Electron main process.

## Near-Term Architecture

- Electron main process: local filesystem, API sync, SQLite, scheduled refreshes, native external links.
- Renderer: existing Melophile Metrics UI, charts, navigation, and workflows.
- Preload bridge: narrow, explicit APIs from renderer to main process.
- SQLite: canonical local store for scrobbles, tracks, artists, albums, rollups, sync status, and metadata caches.

## Migration Order

1. Add minimal Electron shell.
2. Add SQLite and migrations.
3. Import yearly partitioned listening-history files into SQLite.
4. Move Last.fm sync to the Electron main process.
5. Move Spotify auth/opening and MusicBrainz enrichment to the main process.
6. Gradually split the single HTML file into maintainable modules.

## Runtime Commands

```sh
npm install
npm start
```

Development mode still launches through Electron's generic app bundle on macOS. To build and open the named local app bundle:

```sh
npm run start:mac
```

That creates `dist/melophile metrics.app` with the app name, bundle id, and icon applied.

The existing static local server remains valid:

```sh
python3 -m http.server 8767
```
