# Development Workflow

This file preserves the internal source-of-truth, recovery, autosave, backup, and Codex handoff instructions that previously lived in the public README.

## Source Of Truth

- App: `melophile_metrics_v2.html`
- Latest recovered handoff: `handoffs/LastFM Data Update Handoff - 2026-05-13 ambient theme rotation.md`
- Older recovered backup: `backups/LastFM Data Update Dashboard.backup.html`

## Local Preview

From the repository folder:

```sh
python3 -m http.server 8767
```

Then open:

```text
http://127.0.0.1:8767/melophile_metrics_v2.html
```

Older notes referenced port `8765`. The current working local preview convention is port `8767`, especially for Spotify redirect behavior.

## Save Rule

After every meaningful app change, run:

```sh
scripts/autosave.sh "describe the change"
```

That script commits all changed project files and pushes to the configured GitHub remote when one exists.

For future Codex work on this app:

1. Edit only the project source-of-truth files in this repository.
2. Verify the app after the change.
3. Run `scripts/autosave.sh "short change summary"` before ending the session.

## GitHub Setup Reference

This repository currently uses:

```text
https://github.com/SingedPhoenix/melophile_metrics.git
```

If the remote ever needs to be recreated, use:

```sh
git remote add origin https://github.com/SingedPhoenix/melophile_metrics.git
git push -u origin main
```

## Local Configuration

Use `melophile_config.example.json` as the public template.

Private local values should live in:

```text
melophile_config.local.json
```

That file is ignored by Git and should not be committed.

## Public Presentation Checklist

Before presenting the project publicly:

1. Confirm no real API keys, tokens, or private exports are tracked.
2. Confirm screenshot images do not expose anything the owner does not want public.
3. Confirm the app still loads through the localhost URL.
4. Confirm documentation links are not broken.
5. Keep internal notes in `docs/` rather than the public README.

## Repository Presentation Notes

Suggested GitHub description:

```text
AI-assisted personal music analytics app for Last.fm and Spotify listening data, discovery workflows, playlist systems, and data visualization.
```

Suggested topic tags:

```text
music-analytics, lastfm, spotify-api, data-visualization, personal-analytics, javascript, portfolio-project, ai-assisted-development
```
