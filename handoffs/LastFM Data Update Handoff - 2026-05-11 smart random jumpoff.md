# LastFM Data Update Handoff - 2026-05-11 smart random jumpoff

## active app
- `/Users/singedphoenix/Documents/Codex/2026-05-08/files-mentioned-by-the-user-lastfm/melophile_metrics_v2.html`
- Current preview URL: `file:///Users/singedphoenix/Documents/Codex/2026-05-08/files-mentioned-by-the-user-lastfm/melophile_metrics_v2.html`

## workflow reminder
- In future sessions, copy the active app and latest handoff into the current writable `files-mentioned-by-the-user-lastfm` folder before editing.
- Treat the copied app in the current writable folder as the source of truth.

## latest change
- Added a compact smart-random jump-off bento to the main section-select page, positioned above the `pulse / crate / chronicle` cards.
- The jump-off card includes:
  - route/icon chain for the suggested destination
  - small kicker describing the suggestion type
  - one large human-readable actionable prompt
  - shuffle button that skips the current smart choice and chooses another weighted suggestion
- Clicking the card jumps directly to the destination and configures that destination screen.

## smart random logic
- Builds a weighted pool from live dataset availability.
- Includes:
  - current-year gem mine suggestions for artists/tracks
  - last-window suggestions for artists/tracks across existing last... windows
  - all-time metallurgy mine suggestions for artists/tracks
  - ghosted station suggestions for artists/tracks/albums across 6 months, 1-5 years, 10 years, and all-time
  - apotheosis suggestion when eligible artists exist
- Empty destinations are skipped from the pool.
- Shuffle avoids repeating the current suggestion when other suggestions exist.

## verification
- JavaScript syntax checked successfully with `new Function(...)` against the page script.
- In-app browser reloaded the app at the current file URL.
- Browser automation could not programmatically attach a throwaway CSV because the exposed locator API did not include `setInputFiles`; manual upload is still needed for visual review with a populated dataset.

## next design questions
- Whether route icons should eventually use distinct subsection icons beyond the current pulse/crate/chronicle/gem/time/type set.
- Whether the card should auto-rotate, remain static until shuffled, or rotate only after returning to the home screen.
- Whether future smart weighting should account for listening context, such as current time of day, recent listening pace, or neglected favorite clusters.
