# Legacy Recovery Map

This file tracks behavior from the single-file app that should survive the React/Electron migration. The old implementation remains in `melophile_metrics_v2.html`; this map turns that source into a migration checklist so missing pieces can be restored deliberately.

## Current Migration Baseline

- Electron loads the Vite React renderer from `dist/renderer/index.html` when built, with `melophile_metrics_v2.html` still available as the legacy fallback and reference.
- React routing uses hash routes for the main sections: home, Fresh, Pulse, Gem Mines, Past Tense, Dashboard, Ghosted, Frisson, and Settings.
- Shared React pieces now cover the app shell, section navigation, metric toggles, status panels, Spotify opening helpers, and ranked bar lists.
- Live SQLite-backed data is flowing into the React renderer through the Electron bridge for database status, yearly rollups, listening rollups, recent listening, Fresh overview, and Past Tense track/listen matching.

## Past Tense Legacy Inventory

Legacy source anchors:

- Markup: `screenYearsReview`, `screenPastTenseYear`
- Data/constants: `PAST_TENSE_PLAYLISTS`, `PAST_TENSE_PLAYLIST_CACHE_KEY`, `PAST_TENSE_TRACK_CACHE_KEY`, `PAST_TENSE_ARTIST_GENRE_CACHE_KEY`
- Main render functions: `renderPastTenseStats`, `renderPastTenseTrendChart`, `renderPastTensePlaylists`, `renderPastTensePlaylistDetail`
- Cache/update functions: `hydratePastTensePlaylists`, `loadPastTensePlaylistTracks`, `refreshPastTensePlaylistContents`
- Detail helpers: `summarizePastTenseTracks`, `pastTensePlaylistTrackRank`, `topPastTenseGenre`, `topPastTenseArtists`, `renderPastTenseTopArtists`

Restored in React:

- Release-year playlist directory from 1970 through 2026.
- Spotify playlist ids and cached playlist metadata lookup.
- Top-ten year ranking with songs/scrobbles metric toggle.
- Annual trend panel with the same songs/scrobbles metric.
- Ten-per-row capable playlist grid on wider screens.
- Spotify opening for playlist cards and unmatched sample searches.
- SQLite scrobble counts matched against cached playlist tracks.
- Match watchlist for low-coverage cached playlists.
- Smoke coverage for React Past Tense route, metric toggle, cached playlist counts, Spotify open hook, and match watchlist.

Still To Recover:

- Playlist drill-in route/view when a release-year card is clicked.
- Playlist detail hero with cover art, open-in-Spotify action, loading state, and error state.
- Per-playlist summary cards: tracks, artists, albums, rank among years, total duration, and top genre.
- Per-playlist top artists panel with songs/scrobbles toggle and artist images from Spotify artist genre cache.
- Per-playlist track list with rank, title, artists, album, duration, scrobble count, and gem badge.
- Spotify artist genre/image hydration for Past Tense detail views.
- Manual and scheduled Past Tense cache refresh controls in the React Settings/Data area.

Recommended migration order:

1. Add a React Past Tense selected-year detail view using the existing cached tracks in localStorage.
2. Restore detail summary calculations without making new network calls.
3. Restore the per-playlist top artists panel and metric toggle.
4. Restore the full track list and Spotify open/play behavior for tracks.
5. Reconnect artist genre/image hydration after the detail view is stable.
6. Move cache refresh controls from legacy Settings into React Settings/Data.

## Broader Legacy Areas To Inventory Next

- Fresh: release discovery shelves, seed/harvest playlist families, pruning/decision workflow, scheduled scanning.
- Pulse: current-year, last-period, momentous, and recent-listening ranking modes.
- Gem Mines: track/artist/album rankings, gem badges, metallurgy-style album panels.
- Ghosted: not-heard queues, thresholds, skip controls, Spotify playback.
- Frisson: emotional attachment rankings and shared ranked-bar styling.
- Settings: Spotify/Last.fm/MusicBrainz connectivity, SQLite database controls, local config, theme selection, scheduled jobs.
