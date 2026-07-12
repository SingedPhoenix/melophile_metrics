# Legacy Recovery Map

This file tracks behavior from the single-file app that should survive the React/Electron migration. The old implementation remains in `melophile_metrics_v2.html`; this map turns that source into a migration checklist so missing pieces can be restored deliberately.

## Current Migration Baseline

- Electron loads the Vite React renderer from `dist/renderer/index.html` when built, with `melophile_metrics_v2.html` still available as the legacy fallback and reference.
- React routing uses hash routes for the main sections: home, Fresh, Pulse, Gem Mines, Past Tense, Dashboard, Ghosted, Frisson, and Settings.
- Shared React pieces now cover the app shell, section navigation, metric toggles, status panels, Spotify opening helpers, and ranked bar lists.
- Live SQLite-backed data is flowing into the React renderer through the Electron bridge for database status, yearly rollups, listening rollups, recent listening, recent rolling rankings, recent listening analytics, Fresh overview, Fresh discovery-year comparison, and Past Tense track/listen matching.

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
- Playlist drill-in view from release-year cards using cached Spotify track data.
- Playlist detail hero with cover art, back navigation, open-in-Spotify action, and cache-pending state.
- Per-playlist summary cards for tracks, artists, albums, rank among years, duration, and top genre.
- Per-playlist top artists panel with songs/scrobbles toggle.
- Per-playlist track list with rank, title, artist, album, duration, scrobble count, and Spotify opening.
- Per-playlist top genre summary from cached Spotify artist genre data.
- Per-playlist top artist images from cached Spotify artist data.
- Spotify artist genre/image hydration for Past Tense detail views.
- Per-playlist track gem badges from SQLite all-time rank bands.
- Manual Past Tense cache refresh controls in the React Settings/Data area.
- Scheduled Past Tense cache refresh controls in the React Settings/Data area.
- Legacy Settings/Automation tab restored in React with Spotify/Fresh scan and Past Tense scheduled maintenance panels.
- Legacy Settings/Accounts edit forms restored in React for Last.fm, Spotify, ListenBrainz, and MusicBrainz local settings.
- React Settings/Appearance theme selection now persists locally and applies selected theme tokens to the app shell.
- React Settings/Appearance theme library expanded with legacy-inspired palettes grouped by color family.
- React Settings section tabs now wrap cleanly on narrow/mobile viewports.
- Shared React ranked bars now keep fill widths strictly proportional while pinning value labels to the shaded edge.
- Past Tense stats density tightened while preserving the ten-card decade row layout on wide screens.
- Past Tense cache-pending copy now points to the restored React Settings/Data refresh workflow instead of legacy settings.
- Last.fm data integrity panel in React Settings/Data with local IndexedDB cache inspection, profile-vs-cache delta checks, latest cached scrobble metadata, and cache-to-SQLite import action.
- Direct Last.fm recent sync and full cache rebuild actions in React Settings/Data, with refreshed cache rows copied into SQLite.
- Smoke coverage for React Past Tense route, metric toggle, cached playlist counts, Spotify open hook, and match watchlist.
- Smoke coverage for Past Tense detail drill-in, back navigation, playlist opening, track opening, top genre, artist image, and gem badge.
- Smoke coverage for Spotify artist genre/image hydration in Past Tense detail views.
- Smoke coverage for React Settings/Data Past Tense cache refresh.
- Smoke coverage for React Settings/Data scheduled Past Tense cache refresh controls.
- Smoke coverage for React Settings/Automation scheduler panels.
- Smoke coverage for React Settings/Accounts local credential field hydration and localStorage saves.
- Smoke coverage for React Settings/Appearance persistent theme selection and applied CSS variables.
- Smoke coverage for legacy-inspired expanded React theme catalog visibility.
- Smoke coverage for migrated top-level route horizontal overflow on desktop and mobile viewports.
- Smoke coverage for proportional ranked-bar fill/value alignment.
- Smoke coverage for Past Tense ten-card desktop playlist rows.
- Smoke coverage against stale legacy-settings cache refresh copy in Past Tense.
- Smoke coverage for React Settings/Data Last.fm cache loading and local SQLite import.
- Smoke coverage for React Settings/Data Last.fm network sync, cache update, and SQLite import.

## Pulse / Gem Mines / Ghosted / Frisson Gap Inventory

Legacy source anchors:

- Pulse hub markup: `screenPulse`
- Momentous markup/state/rendering: `screenMomentous`, `initMomentous`, `renderMomentousList`
- Gem Mines markup/state/rendering: `screenMetallurgy`, `metallurgyScopePills`, `metallurgyGemPills`, `buildMetallurgyEntries`, `renderMetallurgyLab`
- Ghosted hub and long-time queue: `screenGhosted`, `screenLongTimeNoHear`, `ghostedWindowPills`, `ghostedTypePills`, `renderGhostedList`
- Apotheosis artist watchlist: `screenApotheosis`, `renderApotheosis`

React coverage now:

- Pulse renders the legacy `last...` / `momentous` path split, recent SQLite scrobbles, all-time top tracks/artists, monthly activity, and Spotify opening for rows.
- Last renders SQLite-backed rolling-window track/artist/album rankings with legacy windows, legacy page limits, 50-row paging, Spotify opening, average-rate cards, listening-clock distribution, weekday shape, and window pace analysis.
- Momentous renders fixed-year SQLite rankings inside Pulse with year pills, track/artist/album mode, shared ranked bars, top-500 pagination, and Spotify opening.
- Gem Mines renders all-time and yearly track/artist/album rankings, a current leader panel, shared ranked bars, Spotify opening, and legacy rank-banded gem mine filters with colored gem chips.
- Ghosted renders the legacy hub split between `long time...no hear...` and `apotheosis`, plus a SQLite-backed quiet queue with window pills, track/artist/album mode, minimum-listen thresholds, reshuffle, local skip/reset controls, expansion watchlist, and Spotify opening.
- Apotheosis renders a SQLite-backed artist watchlist for top artists whose newest first-seen track is outside the quiet-period window, with shuffle, skip/reset, and Spotify artist search opening.
- Frisson renders repeated, enduring, and recent attachment rankings from SQLite-backed overview data with signal-path cards for repeat pull, long arc, and recent spark.

Framework stabilization status:

- Core React/Electron migration paths are restored for the major legacy destinations: Fresh, Pulse, Gem Mines, Past Tense, Ghosted, Frisson, Dashboard, and Settings.
- Shared UI contracts are in place for routing, section navigation, metric toggles, empty/loading states, Spotify opening, ranked bars, local settings, theme selection, and SQLite-backed data reads.
- Smoke coverage now exercises every migrated top-level destination plus the most regression-prone behaviors: Past Tense drill-in, Spotify opening, Settings accounts/data/automation/appearance, Fresh path panels, Ghosted path split, Gem Mines filters, Pulse paging, Frisson modes, empty states, and desktop/mobile visual layout guards.
- Remaining work should shift from framework recovery to targeted design polish, performance hardening, and new feature slices.

Recommended next slices:

1. Do a final visual QA sweep of the migrated React app against the latest legacy screenshots.
2. Begin a small new feature/design slice now that the framework migration is stable.
3. Start performance work around large dataset loading and derived rollup caching.

Recommended migration order:

1. Final visual QA sweep.
2. New feature/design slice.
3. Performance and large-dataset partitioning work.

## Broader Legacy Areas To Inventory Next

- Fresh: refine release cards, scan progress ergonomics, and harvest/seed decision controls.
- Pulse: refine dense ranking readability, chart polish, and navigation between rolling and fixed-year analysis.
- Gem Mines: add richer metallurgy-style detail panels and compare gem bands across time.
- Ghosted: refine skip/recovery controls, queue history, and Spotify playback feedback.
- Frisson: expand emotional attachment views beyond the current SQLite-derived ranking modes.
- Settings: continue simplifying account/data/automation/appearance sections as the app grows.
