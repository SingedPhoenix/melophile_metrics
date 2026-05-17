# LastFM Data Update Handoff - 2026-05-08 last averages

## Active App File

- Active workspace file: `/Users/singedphoenix/Documents/Codex/2026-05-03/files-mentioned-by-the-user-lastfm/melophile_metrics_v2.html`
- Current preview URL: `file:///Users/singedphoenix/Documents/Codex/2026-05-03/files-mentioned-by-the-user-lastfm/melophile_metrics_v2.html`
- Prototype remains a single self-contained HTML file with embedded CSS and JavaScript.

## Completed In This Pass

### Pulse / Last...

- Added an `averages` pill next to `tracks`, `artists`, and `albums`.
- When `averages` is selected, the normal top-100 table is hidden and replaced with a rates dashboard for the selected month window.
- The averages view currently shows four headline cards:
  - scrobbles per day
  - scrobbles per active day
  - scrobbles per week
  - active days per week
- Added supporting rate rows:
  - scrobbles per month
  - unique tracks per week
  - unique artists per week
  - unique albums per week
  - listening day coverage
  - repeat depth
- Averages use the same selected `lastWindow` cutoff and latest-scrobble anchor as the existing `last...` rankings.

## Validation

- Ran inline JavaScript syntax validation with Node.
- Checked for duplicate IDs.
- Checked new `last...` averages IDs exist.
- Reloaded the in-app browser preview.

## Notes

- Reloading the file preview resets any locally uploaded CSV state, so the dataset may need to be uploaded again in the browser after code changes.
- The next refinement could make `averages` more visual by adding small comparison copy between windows, but the first version intentionally stays compact and stat-forward.

