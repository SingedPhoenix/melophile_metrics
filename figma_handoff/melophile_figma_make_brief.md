# Melophile Metrics Figma Rework Brief

## Goal
Rework the design system and page flow for **Melophile Metrics**, a personal music-listening analytics app. Preserve the moody, nocturnal, glassy music-dashboard identity, but make the interface easier to navigate, less jumbled, and more suitable for future Spotify + Last.fm workflows.

## Product Context
Melophile Metrics analyzes Last.fm listening history and Spotify playlists. It currently supports:

- Last.fm listening history upload/API sync
- Spotify read-only playlist inventory
- recent listening windows
- current-year rankings
- all-time gem tiers
- ghosted/rediscovery suggestions
- artist, album, and track copy tools
- Spotify prompt-copy workflows for playlist creation
- time-of-day, weekday, pace, and annual analytics

## Design Direction
The app should feel like:

- late-night music intelligence dashboard
- archival listening journal
- playlist-building cockpit
- glassy, dim, atmospheric, but still readable
- personal, expressive, and tactile rather than corporate SaaS

Avoid:

- bright white dashboard styling
- generic startup gradients
- oversized marketing-page hero layout
- decorative cards inside cards
- overly beige, blue, or purple-only palettes

## Existing Visual Language

### Fonts
- Wordmark: `Neonderthaw`
- Primary UI headings: `Quicksand`
- Descriptions / labels / list names: `Afacad`
- Data / metadata / timestamps: `DM Mono`

### Core Colors
- Background: `#0A0A0A`
- Amethyst deep: `#24003D`
- Amethyst mid: `#3D0066`
- Charcoal: `#353D45`
- Charcoal light: `#4A5560`
- Cherry deep: `#520000`
- Cherry bright: `#A00000`
- Silver text: `#CCCCCC`
- Muted silver: `#777777`
- Hairline border: `rgba(204,204,204,0.08)`
- Hover border: `rgba(204,204,204,0.18)`

### Atmosphere
Use a near-black base with faint radial glow fields:

- amethyst glow near upper-left
- cherry glow near lower-right
- charcoal haze in center
- subtle grain/noise texture

## Suggested Information Architecture
The current app has grown organically. Reorganize around user jobs:

1. **Listening Windows**
   - current year
   - last 1/3/6/12/30/60/120 months
   - tracks / artists / albums / discoveries

2. **Playlist Lab**
   - Spotify playlist inventory
   - playlist family tagging
   - artist spotlight prompts
   - album spotlight prompts
   - ghosted listening prompts

3. **Rediscovery**
   - ghosted tracks
   - ghosted artists
   - ghosted albums
   - all-time gem mine

4. **Patterns**
   - listening clock
   - day-of-week analysis
   - pace chart
   - averages
   - heatmap/timeframe views

5. **History**
   - years in review
   - annual pulse
   - all-time statistics

## Primary Screens To Design

### 1. Home / Command Center
Include:

- app wordmark
- date stamp
- smart random suggestion bento
- primary nav to Listening Windows, Playlist Lab, Rediscovery, Patterns, History
- subtle Last.fm/Spotify connection status

### 2. Listening Windows
Include:

- timeframe selector
- content-type selector: tracks / artists / albums / discoveries
- dense ranked list
- action rail for copy tools and Spotify prompt tools
- count bars and play counts

### 3. Playlist Lab
Include:

- Spotify playlist inventory
- selected playlist detail view
- playlist family tags: mood, genre, artist, album, era, seasonal, utility
- top artists / recurring genre/mood signal summaries

### 4. Rediscovery
Include:

- ghosted time range selector
- tracks / artists / albums toggle
- reshuffle action
- gem mine / all-time tier view

### 5. Patterns
Include:

- cards for listens/day, active days, weekly average
- listening clock visualization
- pace chart
- weekday chart

## Component Notes

### Bento / Section Cards
- Square or rectangular glass surfaces
- Border radius around `20px` for large navigation cards
- 1px translucent border
- soft hover lift
- top accent hairline
- centered icon, title, description

### Typography
- UI titles should use Quicksand, medium weight.
- Descriptive support copy should use Afacad.
- Counts, dates, routes, metadata should use DM Mono.
- Keep all app copy lowercase by default.

### Buttons / Pills
- Rounded pills
- Afacad font
- inactive state: transparent/dim border
- active state: deep cherry fill
- hover state: brighter border and silver text

### Ranked Rows
- Dense, wide, scannable rows
- rank index at left
- title/artist stack
- horizontal play-count bar
- count at far right
- optional action icons near name/title

## Interaction Principles
- Every clickable-looking row must do something.
- Repeated flows should share one reusable list/table pattern.
- Navigation should show where the user is and what mode/window is active.
- Spotify/Last.fm integrations should appear as connected data sources, not separate disconnected utilities.
- Keep CSV upload as fallback, but API sync should feel primary once connected.

## Deliverable Request
Create a revised visual/layout system for the app using this brief plus the attached code reference files. Focus on design system, flow, and component structure first. Do not redesign it as a landing page. This is a working analytics and playlist tool.

