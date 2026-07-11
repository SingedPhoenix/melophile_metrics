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
- Last.fm data integrity panel in React Settings/Data with local IndexedDB cache inspection, profile-vs-cache delta checks, latest cached scrobble metadata, and cache-to-SQLite import action.
- Direct Last.fm recent sync and full cache rebuild actions in React Settings/Data, with refreshed cache rows copied into SQLite.
- Smoke coverage for React Past Tense route, metric toggle, cached playlist counts, Spotify open hook, and match watchlist.
- Smoke coverage for Past Tense detail drill-in, back navigation, playlist opening, track opening, top genre, artist image, and gem badge.
- Smoke coverage for Spotify artist genre/image hydration in Past Tense detail views.
- Smoke coverage for React Settings/Data Past Tense cache refresh.
- Smoke coverage for React Settings/Data scheduled Past Tense cache refresh controls.
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

- Pulse renders recent SQLite scrobbles, all-time top tracks/artists, monthly activity, and Spotify opening for rows.
- Gem Mines renders all-time top tracks/artists/albums, a current leader panel, shared ranked bars, and Spotify opening.
- Ghosted renders a SQLite-backed quiet-track queue with minimum-listen thresholds and Spotify opening.
- Frisson renders repeated, enduring, and recent attachment rankings from SQLite-backed overview data.

High-impact gaps still to recover:

- Pulse is missing the legacy Pulse sub-navigation relationship between `last...` and `momentous`.
- Momentous is not yet rebuilt in React: fixed-year rankings, year pills, track/artist/album toggle, top-500 cap, paging, and Spotify opening from year-specific rankings.
- Gem Mines is missing legacy metallurgy controls: all-time/year scope pills, gem-band filters, multiple gem selections, gem range labels, and rank-banded mine lists.
- Ghosted is missing the legacy hub split between `long time...no hear...` and `apotheosis`.
- Long Time...No Hear is missing window pills, track/artist/album mode, reshuffle, skip queue, top-100 queue labeling, and expansion watchlist.
- Apotheosis is not yet rebuilt in React: top-artist release watchlist, shuffle, skip/reset, and newest-track quiet-period detection.
- Frisson currently has useful SQLite-derived rankings, but needs a closer legacy/design pass after the Pulse/Gem/Ghosted recoveries because the legacy app primarily defined Frisson as an emotional-attachment destination from the home bento rather than a deeply developed subflow.

Recommended next slices:

1. Restore Momentous as a Pulse subview with fixed-year track/artist/album rankings.
2. Restore Gem Mines gem-band filters for all-time rankings, then add yearly scope once the backend exposes year-specific entity rollups.
3. Restore Ghosted window/type/skip controls for tracks first, then extend to artists/albums.
4. Restore Apotheosis as a favorite-artist watchlist after Ghosted queue behavior is stable.
5. Revisit Frisson design parity once the ranking/list surfaces are fully reusable.

Recommended migration order:

1. Restore Momentous as the next highest-impact missing Pulse behavior.
2. Restore Gem Mines gem-band filtering.
3. Restore Ghosted window/type/skip controls.
3. Inventory and recover Fresh seed/harvest workflows next.

## Broader Legacy Areas To Inventory Next

- Fresh: seed/harvest gateway restored in React with SQLite-backed path panels, Spotify playlist-family loading, playlist track audits with harvest pruning alerts, decision-index release filtering, release discovery shelves, scheduled scanning, and harvest rankings.
- Pulse: current-year, last-period, momentous, and recent-listening ranking modes.
- Gem Mines: track/artist/album rankings, gem badges, metallurgy-style album panels.
- Ghosted: not-heard queues, thresholds, skip controls, Spotify playback.
- Frisson: emotional attachment rankings and shared ranked-bar styling.
- Settings: Spotify/Last.fm/MusicBrainz connectivity, SQLite database controls, local config, theme selection, Spotify maintenance controls, Spotify link corrections, genre profiles, Last.fm cache inspection, Last.fm network sync/rebuild, and local SQLite import.
