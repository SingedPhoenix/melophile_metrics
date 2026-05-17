# LastFM Data Update Handoff - 2026-05-13 ambient theme rotation

## active app
- `/Users/singedphoenix/Documents/Codex/2026-05-08/files-mentioned-by-the-user-lastfm/melophile_metrics_v2.html`
- Current preview URL: `file:///Users/singedphoenix/Documents/Codex/2026-05-08/files-mentioned-by-the-user-lastfm/melophile_metrics_v2.html`

## workflow reminder
- Future sessions should copy the latest app and latest handoff into the current writable `files-mentioned-by-the-user-lastfm` folder before editing.
- Treat the copied app in the current writable folder as source of truth.

## latest change
- Added the first-volume ambient theme library from `/Users/singedphoenix/Downloads/App Project Color Themes (1).csv`.
- The unnamed second palette was named `Orchid Smoke`.
- Added 40 theme seeds to `THEME_SEEDS`.
- Added a runtime theme derivation system that calculates:
  - dark app background
  - surface tones
  - primary/secondary accents
  - readable text and muted text
  - borders and background glows
- Added local theme persistence with `localStorage` under `melophile.theme.rotation.v1`.
- Themes rotate automatically on randomized intervals between 300 and 1000 minutes.
- On reload, the app keeps the current theme until its saved expiration time.

## implementation notes
- The app remains structurally dark even for light or pastel palettes.
- Palette colors are used as ingredients; backgrounds are darkened/mixed and brighter colors become accents/glows.
- Contrast validation was run against all 40 palettes; no text contrast issues were found in the derivation pass.
- Main chrome now responds to the generated CSS variables:
  - background glows
  - wordmark accent
  - active pills
  - upload zone
  - jump-off bento
  - NavHub bento tinting
  - icon glass tints

## next possible enhancements
- Add a small hidden/debug theme label or manual shuffle control.
- Add a “lock current theme” option.
- Expand theming into chart canvases and row bar gradients, which still use some local hard-coded colors.
- Move `THEME_SEEDS` to a dedicated JS module when the app is split out of the single HTML prototype.
