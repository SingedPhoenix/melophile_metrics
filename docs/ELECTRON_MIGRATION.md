# Electron Migration

This migration is intentionally gradual. The first checkpoint keeps `melophile_metrics_v2.html` as the renderer source of truth and adds an Electron shell around it.

## Current Scope

- Load the existing app through Electron.
- Keep renderer code unchanged for the first shell checkpoint.
- Route Spotify and `open.spotify.com` links through Electron external-link handling.
- Keep private data and generated datasets out of the public repository.

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

The existing static local server remains valid:

```sh
python3 -m http.server 8767
```
