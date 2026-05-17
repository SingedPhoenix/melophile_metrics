# melophile metrics

Recovered single-file Last.fm listening dashboard.

## source of truth

- App: `melophile_metrics_v2.html`
- Latest handoff: `handoffs/LastFM Data Update Handoff - 2026-05-13 ambient theme rotation.md`
- Older recovered backup: `backups/LastFM Data Update Dashboard.backup.html`

## local preview

From this folder:

```sh
python3 -m http.server 8765
```

Then open:

```text
http://127.0.0.1:8765/melophile_metrics_v2.html
```

## save rule

After every meaningful app change, run:

```sh
scripts/autosave.sh "describe the change"
```

That script commits all changed project files and pushes to the configured GitHub remote when one exists.

## GitHub setup

Once an empty GitHub repository exists, connect it with:

```sh
git remote add origin git@github.com:OWNER/REPO.git
git push -u origin main
```

HTTPS remotes also work:

```sh
git remote add origin https://github.com/OWNER/REPO.git
git push -u origin main
```
