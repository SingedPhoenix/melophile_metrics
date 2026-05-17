# LastFM Data Update Handoff - 2026-05-08

## Active App File

- Active workspace file: `/Users/singedphoenix/Documents/Codex/2026-05-03/files-mentioned-by-the-user-lastfm/melophile_metrics_v2.html`
- Active preview URL: `file:///Users/singedphoenix/Documents/Codex/2026-05-03/files-mentioned-by-the-user-lastfm/melophile_metrics_v2.html`
- Current prototype format: single self-contained HTML file with embedded CSS and JavaScript.
- No separate stylesheet or JavaScript files currently exist for this iteration.

## Working Agreement

- Treat the workspace file above as the source of truth.
- Avoid editing old Downloads copies unless explicitly requested.
- Continue working section by section.
- After major revisions or when context reaches roughly 75-85%, create a fresh handoff markdown.
- If a new chat begins, upload the latest handoff and point the agent at the active workspace file.

## Design Rules

- All app UI text should remain lowercase.
- Keep the dark glassy visual language.
- Brand colors currently in use:
  - onyx: `#0A0A0A`
  - amethyst: `#24003D`
  - amethyst-mid: `#3D0066`
  - charcoal: `#353D45`
  - charcoal-light: `#4A5560`
  - cherry: `#520000`
  - cherry-bright: `#A00000`
  - silver: `#CCCCCC`
  - silver-dim: `#777777`
- Fonts:
  - Neonderthaw for the wordmark only.
  - Quicksand for section titles and large stat numbers.
  - Afacad for UI labels, buttons, and body labels.
  - DM Mono for ranks, data, timestamps, and small numeric details.
- Back button remains centered at the bottom of each section.
- Long scrolling pages have floating up/down jump buttons.

## Current Navigation Structure

- Main nav:
  - pulse
  - crate
  - chronicle

- Pulse:
  - current year
  - last...

- Current year:
  - stat boxes for current-year totals
  - rankings
  - timeframe
  - fresh

- Crate:
  - metallurgy lab
  - ghosted
  - apotheosis

- Chronicle:
  - years in review
  - analytics

## Recently Completed Changes

### General UX

- Primary list names are clickable and copy the name to the system clipboard.
- A bottom toast appears after copy actions: `copied · [name]`.
- Floating up/down arrows appear only on scrollable pages.
- Crate bento boxes were placed on one desktop row.
- Apotheosis crate bento uses the app's amethyst/purple hue.

### Pulse / Last...

- Added `10 years`, then renamed long-window labels for visual consistency:
  - `60 months`
  - `120 months`
- Last window calculations remain month-based.

### Crate / Metallurgy Lab

- Supports tracks and artists.
- Gem order:
  - amethyst
  - topaz
  - aquamarine
  - opal
  - emerald
  - sapphire
  - ruby
  - diamond
- Gem pills are multi-select toggles.
- Diamond entries are included and not capped at 100.
- Artist gem ranges:
  - amethyst: 0-99
  - topaz: 100-199
  - aquamarine: 200-299
  - opal: 300-399
  - emerald: 400-499
  - sapphire: 500-699
  - ruby: 700-999
  - diamond: 1000+

### Crate / Ghosted

- Supports tracks, artists, and albums.
- Supports multiple ghost windows including 6 months, 1 year through 5 years, 10 years, and all-time.
- Uses a top-100 queue.
- Entries can be skipped, allowing the next eligible item to slide up.

### Crate / Apotheosis

- Tracks top 100 all-time artists who have not had a newly logged track in the last 6 months.
- "Newly logged track" means first scrobbled by the user, not external release data.
- Added skip and shuffle controls.

### Chronicle / Years In Review

- Chronicle now has its own sub-nav screen.
- Added `years in review` bento.
- Years are shown in ascending order from oldest to newest.
- Year pills are split into balanced rows.
- Added mode pills:
  - scrobble logging
  - tracks
  - artists
  - albums
- Added pagination:
  - 100 entries per page
  - prev / next buttons
  - page number input
  - jump button
  - Enter key in page input jumps pages
- Scrobble logging now shows the actual chronological ledger:
  - first scrobble of the selected year to last scrobble of the selected year.
- Tracks/artists/albums expose the full yearly list through pagination, not just top 100.

### Chronicle / Analytics

- Added analytics bento to Chronicle.
- Analytics page was reset to a clean foundation:
  - total scrobbles
  - unique tracks
  - unique artists
  - unique albums
  - active years
  - active days
  - avg per active day
  - peak year
- Added an all-time timeframe section below the analytics stat bentos.
- All-time timeframe modes:
  - time of day
  - day of week
  - by month
  - full history
- These use all scrobbles across the full archive rather than current-year data.
- Day-of-week charts were converted from doughnut charts to horizontal bar charts.
- That conversion was applied to both:
  - analytics all-time timeframe
  - pulse/current-year timeframe

## Current Data Handling

- App currently expects CSV upload.
- Main normalized data structure is `allScrobbles`, with fields:
  - `uts`
  - `playedAt`
  - `artist`
  - `track`
  - `album`
  - `tKey`
  - `aKey`
- Current-year-specific data is stored in `cyData`.
- The app is still a prototype using uploaded local data, not API storage.

## JSON Discussion

- Raw Last.fm JSON export was measured at about 129 MB.
- Existing CSV was about 58 MB.
- A compact normalized JSON with only app-needed fields would be much smaller:
  - object JSON roughly 16.7 MB
  - tuple-style JSON roughly 11.5 MB
  - gzipped compact JSON roughly 3.5-4 MB
- Recommendation remains: when ready, move to compact normalized JSON or API-derived local storage, not raw Last.fm API response shape.

## Known Technical Notes

- The app is still one large HTML file.
- This is acceptable for prototyping, but eventually split into:
  - `index.html`
  - `styles.css`
  - `app.js`
  - `data/`
  - `handoffs/`
- Browser preview uses the file URL above.
- After edits, run a syntax/ID validation check and refresh the preview.
- The app currently uses Chart.js from CDN.
- Network may not always be available in future app contexts; Electron packaging should eventually vendor or bundle dependencies.

## Current Best Next Step

Continue building the analytics page section by section.

Likely next analytics additions:

- Decide what hard-stat subsection comes after all-time timeframe.
- Add deeper all-time breakdowns only after the stat bento foundation and timeframe charts feel right.
- Avoid adding large tables back to analytics until the intended layout is clear.

## Handoff Reminder

Create a new handoff markdown after:

- completing another major analytics subsection,
- restructuring data handling,
- switching from CSV toward JSON/API,
- or when the context window reaches about 75-85% again.

