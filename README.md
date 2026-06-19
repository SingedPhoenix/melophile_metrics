# Melophile Metrics

**Melophile Metrics is an AI-assisted personal music analytics application that turns Last.fm and Spotify listening activity into ranked insights, discovery workflows, and visual listening history.**

## Portfolio Status Notice

Melophile Metrics is actively in development as a personal analytics portfolio project. The repository is being prepared for public presentation while privacy-sensitive screenshots, local credentials, and personal data exports remain excluded from version control.

## Project Overview

Melophile Metrics is an in-development portfolio project for exploring how personal listening data can become a richer analytics system. The app combines Last.fm scrobble history, Spotify playlist data, and user-defined classification rules to answer questions such as:

- What music has shaped my listening history most strongly?
- Which songs, artists, and albums are rising in recent periods?
- Which older favorites have been forgotten?
- Which new releases are worth exploring?
- How can personal taste be organized into meaningful playlist systems?

The project is intentionally personal, but the underlying work demonstrates transferable skills in data analysis, product thinking, information architecture, data quality, and iterative software development.

## Why I Built It

I built Melophile Metrics because standard music apps show listening history, but rarely explain it in a way that supports reflection, curation, or decision-making. I wanted a system that could combine listening counts, playlist structure, release years, discovery workflows, and custom ranking rules into one coherent analytics experience.

## Problems It Solves

- Converts raw listening history into browsable ranking systems.
- Helps distinguish short-term listening spikes from long-term favorites.
- Creates workflows for rediscovering forgotten music.
- Tracks new releases from artists already connected to my taste profile.
- Supports playlist families such as release-year playlists, fresh discovery playlists, and ranked gem tiers.
- Provides data-integrity checks so Last.fm profile totals and local app totals can be reconciled.

## Screenshots

Portfolio screenshots should be added after a final privacy review, because many app screens display personal listening history. Recommended captures and filenames are documented in [docs/images/README.md](docs/images/README.md).

Recommended visuals include:

- Main navigation or dashboard.
- Listening rankings.
- Trend or historical analysis.
- Data-integrity or synchronization screen.
- Discovery or new-release features.
- A distinctive visualization such as the listening clock.

## Key Features

- **Fresh**: discovery workflows for seed playlists, harvest playlists, and new-release indexing.
- **Pulse**: dynamic rankings for recent listening windows such as the last 1, 3, 6, or 12 months.
- **Gem Mines**: rank-banded classifications that group tracks, artists, and albums into custom gem tiers.
- **Past Tense**: release-year playlist portals that organize favorite music by the year it was released.
- **Dashboard**: visual summaries of listening patterns, averages, yearly views, and data health.
- **Ghosted and Apotheosis**: rediscovery tools for artists and music that have gone quiet in the listening record.
- **Settings and Sync**: local configuration for Last.fm, Spotify, ListenBrainz, and MusicBrainz integrations.

## Analytical Methods And Concepts Demonstrated

- Data cleaning and local cache management.
- Time-window analysis across dynamic and static periods.
- Ranking, thresholding, and classification systems.
- Percentile-inspired segmentation and custom tiering.
- Playlist-family mapping and taxonomy design.
- Recency, frequency, and first-seen/last-seen analysis.
- Data-integrity comparison between local cached data and Last.fm profile totals.
- Human-centered workflow design for discovery, curation, and review.

## Technologies And Tools

- HTML, CSS, and vanilla JavaScript.
- Last.fm API for listening-history sync and profile comparison.
- Spotify Web API for playlist inventory, playlist contents, and music links.
- ListenBrainz and MusicBrainz as planned/open metadata enrichment layers.
- Browser localStorage for local settings and cached data.
- Git and GitHub for version control.
- AI coding tools used during iterative development.

## My Role And Contributions

Melophile Metrics is an AI-assisted application that I conceived, specified, tested, refined, and developed through an iterative collaboration with coding tools.

My contributions include:

- Defining the product vision and feature philosophy.
- Creating the analytical questions the app is meant to answer.
- Designing classification rules, gem tiers, playlist families, and thresholds.
- Planning workflows for discovery, rediscovery, and data review.
- Evaluating generated code and identifying bugs.
- Testing app behavior across local browser sessions.
- Refining the visual direction, layout, and user experience.
- Deciding how Last.fm, Spotify, and other music metadata sources should support the app.

## AI-Assisted Development Disclosure

This project was built with significant AI-assisted coding support. I did not independently hand-code every line. My role was to direct the product, define the analytical logic, test and critique the implementation, make design decisions, and guide the development process through iterative prompts, reviews, and refinements.

## How To Run The Application Locally

From the repository folder:

```sh
python3 -m http.server 8767
```

Then open:

```text
http://127.0.0.1:8767/melophile_metrics_v2.html
```

The app can be opened directly as a local HTML file for some views, but API authentication flows such as Spotify work best through the localhost URL above.

Optional local configuration can be based on:

```text
melophile_config.example.json
```

Create a private local copy named `melophile_config.local.json` when needed. That local file is ignored by Git.

## Current Development Status

Melophile Metrics is actively in development. The application depends on user-provided data and/or API access. Some features require Last.fm credentials, Spotify authorization, or locally cached data to display meaningful results.

## Planned Improvements

- Continue refining the nine-bento information architecture.
- Add stronger metadata enrichment through ListenBrainz and MusicBrainz.
- Improve correction workflows for Spotify links and metadata mismatches.
- Expand playlist-family tagging and cached playlist analysis.
- Add more privacy-safe portfolio screenshots and visual demos.
- Continue improving data-integrity checks between Last.fm and local cache.
- Explore animation and transition polish once core workflows stabilize.

## Skills Demonstrated

- Product thinking and feature planning.
- Data analysis and classification design.
- User-centered workflow design.
- Information architecture.
- Data visualization planning.
- API integration planning and implementation.
- QA testing and bug reporting.
- Version control and repository hygiene.
- AI-assisted software development and evaluation.

## Contact Or LinkedIn

This project is intended to be shared from the owner's LinkedIn profile as a portfolio case study in personal analytics, workflow design, and AI-assisted application development.

## Affiliation And Trademark Disclaimer

Melophile Metrics is an independent personal portfolio project. It is not affiliated with, endorsed by, or sponsored by Last.fm, Spotify, ListenBrainz, MusicBrainz, or Epic. Product names, trademarks, and service names belong to their respective owners.
