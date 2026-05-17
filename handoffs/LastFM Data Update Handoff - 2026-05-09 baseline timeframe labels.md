# LastFM Data Update Handoff - 2026-05-09 baseline timeframe labels

## Active App File

- Active workspace file: `/Users/singedphoenix/Documents/Codex/2026-05-08/files-mentioned-by-the-user-lastfm/melophile_metrics_v2.html`
- Current preview URL: `file:///Users/singedphoenix/Documents/Codex/2026-05-08/files-mentioned-by-the-user-lastfm/melophile_metrics_v2.html`

## Completed In This Pass

### Pulse / Last... / Averages

- Replaced generic `previous 5 period average` wording with actual month-span labels.
- Added `baselineWindowLabel()`.
- Baseline labels now scale with the selected `last...` window:
  - `1 month` -> `previous 5 months average`
  - `3 months` -> `previous 15 months average`
  - `6 months` -> `previous 30 months average`
  - `12 months` -> `previous 60 months average`
  - `30 months` -> `previous 150 months average`
  - `60 months` -> `previous 300 months average`
  - `120 months` -> `previous 600 months average`
- Applied the dynamic label to:
  - listening clock legend
  - weekday chart legend
  - supporting average cards
- Delta text now says `vs baseline`, with chart tooltips/stat callouts using `average line`.

## Validation

- Confirmed no remaining generic `previous 5 period` / `prev 5 avg` phrasing in the app file.
- Ran inline JavaScript syntax validation with Node.
- Reloaded the in-app browser preview.

