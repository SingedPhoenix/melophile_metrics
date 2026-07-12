import { useQuery } from '@tanstack/react-query';

export type DesktopDatabaseStatus = {
  path?: string;
  schemaVersion?: number;
  scrobbles?: number;
  revisions?: number;
  lastSync?: {
    source?: string;
    mode?: string;
    finished_at?: string;
    rows_seen?: number;
    rows_inserted?: number;
    rows_updated?: number;
    rows_unchanged?: number;
    status?: string;
    message?: string;
  } | null;
};

export type YearlyListeningRollup = {
  year: number;
  listens: number;
};

export type RankedYearlyListeningRollup = YearlyListeningRollup & {
  rank: number;
};

export type YearlyListeningRollups = {
  years: YearlyListeningRollup[];
  topYears: RankedYearlyListeningRollup[];
};

export type RankedArtistRollup = {
  rank: number;
  artist: string;
  listens: number;
};

export type RankedTrackRollup = {
  rank: number;
  artist: string;
  track: string;
  listens: number;
};

export type RankedAlbumRollup = {
  rank: number;
  artist: string;
  album: string;
  listens: number;
};

export type MonthlyListeningRollup = {
  month: string;
  listens: number;
};

export type ListeningRollups = {
  topArtists: RankedArtistRollup[];
  topTracks: RankedTrackRollup[];
  topAlbums: RankedAlbumRollup[];
  months: MonthlyListeningRollup[];
};

export type YearlyEntityRankingType = 'tracks' | 'artists' | 'albums';

export type YearlyEntityRankingRow = {
  rank: number;
  artist: string;
  track?: string;
  album?: string;
  listens: number;
};

export type YearlyEntityRankings = {
  year: number;
  type: YearlyEntityRankingType;
  rows: YearlyEntityRankingRow[];
};

export type EntityRankings = {
  type: YearlyEntityRankingType;
  rows: YearlyEntityRankingRow[];
};

export type RecentEntityRankingWindow = '1' | '3' | '6' | '12' | '30' | '60' | '120' | 'cy';

export type RecentEntityRankings = EntityRankings & {
  window: RecentEntityRankingWindow;
  label: string;
  cutoffUts: number;
  anchorUts: number;
};

export type RecentScrobble = {
  playedAtUts: number;
  playedAtIso: string;
  artist: string;
  track: string;
  album: string;
};

export type RecentListening = {
  scrobbles: RecentScrobble[];
};

export type GhostedType = 'tracks' | 'artists' | 'albums';
export type GhostedWindow = 6 | 12 | 24 | 36 | 48 | 60 | 120 | 'all';

export type GhostedEntry = {
  rank: number;
  key: string;
  type: GhostedType;
  artist: string;
  track: string;
  album: string;
  title: string;
  subtitle: string;
  listens: number;
  firstPlayedUts: number;
  lastPlayedUts: number;
  daysSinceLastPlayed: number;
};

export type GhostedTracks = {
  entries: GhostedEntry[];
  tracks: GhostedEntry[];
  type: GhostedType;
  window: GhostedWindow;
  minListens: number;
  anchorUts: number;
};

export type ApotheosisArtist = {
  rank: number;
  key: string;
  artist: string;
  listens: number;
  newestTrack: string;
  newestTrackUts: number;
  monthsSinceNewestTrack: number;
};

export type ApotheosisWatchlist = {
  artists: ApotheosisArtist[];
  anchorUts: number;
  windowMonths: number;
};

export type FreshAlbum = {
  rank: number;
  artist: string;
  album: string;
  listens: number;
  lastPlayedUts: number;
};

export type FreshQuietArtist = {
  rank: number;
  artist: string;
  listens: number;
  lastPlayedUts: number;
  daysSinceLastPlayed: number;
};

export type FreshRecentArtist = {
  rank: number;
  artist: string;
  listens: number;
  firstPlayedUts: number;
  lastPlayedUts: number;
};

export type FreshOverview = {
  topAlbums: FreshAlbum[];
  quietArtists: FreshQuietArtist[];
  recentArtists: FreshRecentArtist[];
};

export type FreshDiscoveryMetric = 'tracks' | 'artists' | 'albums';

export type FreshDiscoveryYear = {
  rank: number;
  year: number;
  value: number;
};

export type FreshDiscoveryYears = {
  metric: FreshDiscoveryMetric;
  currentYear: number;
  rows: FreshDiscoveryYear[];
};

export type FreshHarvestRankType = 'tracks' | 'artists' | 'albums';

export type FreshHarvestWindow = '1' | '3' | '6' | '12' | 'cy';

export type FreshHarvestRankingRow = {
  rank: number;
  name: string;
  artist: string;
  album: string;
  listens: number;
  firstPlayedUts: number;
};

export type FreshHarvestRankings = {
  type: FreshHarvestRankType;
  window: FreshHarvestWindow;
  label: string;
  cutoffUts: number;
  anchorUts: number;
  rows: FreshHarvestRankingRow[];
};

export type FrissonTrack = {
  rank: number;
  artist: string;
  track: string;
  album: string;
  listens: number;
  firstPlayedUts: number;
  lastPlayedUts: number;
  spanDays: number;
  daysSinceLastPlayed: number;
};

export type FrissonOverview = {
  repeatedTracks: FrissonTrack[];
  enduringTracks: FrissonTrack[];
  recentAnchors: FrissonTrack[];
};

export type LocalServiceConfig = {
  lastfm?: {
    username?: string;
    apiKey?: string;
  };
  spotify?: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    refreshToken?: string;
  };
  listenbrainz?: {
    username?: string;
    token?: string;
  };
  musicbrainz?: {
    contact?: string;
  };
};

export function useDesktopStatus() {
  return useQuery({
    queryKey: ['desktop', 'database-status'],
    queryFn: async (): Promise<DesktopDatabaseStatus | null> => {
      if (!window.melophileDesktop?.databaseStatus) return null;
      return window.melophileDesktop.databaseStatus();
    },
    staleTime: 15_000
  });
}

export function useLocalServiceConfig() {
  return useQuery({
    queryKey: ['desktop', 'local-service-config'],
    queryFn: async (): Promise<LocalServiceConfig | null> => {
      if (!window.melophileDesktop?.readLocalConfig) return null;
      return window.melophileDesktop.readLocalConfig();
    },
    staleTime: 60_000
  });
}

export function useYearlyListeningRollups() {
  return useQuery({
    queryKey: ['desktop', 'yearly-listening-rollups'],
    queryFn: async (): Promise<YearlyListeningRollups | null> => {
      if (!window.melophileDesktop?.yearlyListeningRollups) return null;
      return window.melophileDesktop.yearlyListeningRollups();
    },
    staleTime: 60_000
  });
}

export function useRecentListening(limit = 25) {
  return useQuery({
    queryKey: ['desktop', 'recent-listening', limit],
    queryFn: async (): Promise<RecentListening | null> => {
      if (!window.melophileDesktop?.recentListening) return null;
      return window.melophileDesktop.recentListening(limit);
    },
    staleTime: 30_000
  });
}

export function useListeningRollups() {
  return useQuery({
    queryKey: ['desktop', 'listening-rollups'],
    queryFn: async (): Promise<ListeningRollups | null> => {
      if (!window.melophileDesktop?.listeningRollups) return null;
      return window.melophileDesktop.listeningRollups();
    },
    staleTime: 60_000
  });
}

export function useEntityRankings(type: YearlyEntityRankingType = 'tracks', limit = 50) {
  return useQuery({
    queryKey: ['desktop', 'entity-rankings', type, limit],
    queryFn: async (): Promise<EntityRankings | null> => {
      if (!window.melophileDesktop?.entityRankings) return null;
      return window.melophileDesktop.entityRankings({ type, limit });
    },
    staleTime: 60_000
  });
}

export function useRecentEntityRankings(
  type: YearlyEntityRankingType = 'tracks',
  windowKey: RecentEntityRankingWindow = '1',
  limit = 100
) {
  return useQuery({
    queryKey: ['desktop', 'recent-entity-rankings', type, windowKey, limit],
    queryFn: async (): Promise<RecentEntityRankings | null> => {
      if (!window.melophileDesktop?.recentEntityRankings) return null;
      return window.melophileDesktop.recentEntityRankings({ type, window: windowKey, limit });
    },
    staleTime: 60_000
  });
}

export function useYearlyEntityRankings(year?: number, type: YearlyEntityRankingType = 'tracks', limit = 50) {
  return useQuery({
    enabled: Boolean(year),
    queryKey: ['desktop', 'yearly-entity-rankings', year, type, limit],
    queryFn: async (): Promise<YearlyEntityRankings | null> => {
      if (!window.melophileDesktop?.yearlyEntityRankings || !year) return null;
      return window.melophileDesktop.yearlyEntityRankings({ year, type, limit });
    },
    staleTime: 60_000
  });
}

export function useGhostedTracks(limit = 50, minListens = 5, type: GhostedType = 'tracks', windowKey: GhostedWindow = 6) {
  return useQuery({
    queryKey: ['desktop', 'ghosted-tracks', limit, minListens, type, windowKey],
    queryFn: async (): Promise<GhostedTracks | null> => {
      if (!window.melophileDesktop?.ghostedTracks) return null;
      return window.melophileDesktop.ghostedTracks({ limit, minListens, type, window: windowKey });
    },
    staleTime: 60_000
  });
}

export function useApotheosisWatchlist(limit = 100, windowMonths = 6) {
  return useQuery({
    queryKey: ['desktop', 'apotheosis-watchlist', limit, windowMonths],
    queryFn: async (): Promise<ApotheosisWatchlist | null> => {
      if (!window.melophileDesktop?.apotheosisWatchlist) return null;
      return window.melophileDesktop.apotheosisWatchlist({ limit, windowMonths });
    },
    staleTime: 60_000
  });
}

export function useFreshOverview(albumLimit = 16, artistLimit = 12) {
  return useQuery({
    queryKey: ['desktop', 'fresh-overview', albumLimit, artistLimit],
    queryFn: async (): Promise<FreshOverview | null> => {
      if (!window.melophileDesktop?.freshOverview) return null;
      return window.melophileDesktop.freshOverview({ albumLimit, artistLimit });
    },
    staleTime: 60_000
  });
}

export function useFreshDiscoveryYears(metric: FreshDiscoveryMetric = 'tracks') {
  return useQuery({
    queryKey: ['desktop', 'fresh-discovery-years', metric],
    queryFn: async (): Promise<FreshDiscoveryYears | null> => {
      if (!window.melophileDesktop?.freshDiscoveryYears) return null;
      return window.melophileDesktop.freshDiscoveryYears({ metric });
    },
    staleTime: 60_000
  });
}

export function useFreshHarvestRankings(type: FreshHarvestRankType = 'tracks', windowKey: FreshHarvestWindow = '1', limit = 50) {
  return useQuery({
    queryKey: ['desktop', 'fresh-harvest-rankings', type, windowKey, limit],
    queryFn: async (): Promise<FreshHarvestRankings | null> => {
      if (!window.melophileDesktop?.harvestRankings) return null;
      return window.melophileDesktop.harvestRankings({ type, window: windowKey, limit });
    },
    staleTime: 60_000
  });
}

export function useFrissonOverview(limit = 12) {
  return useQuery({
    queryKey: ['desktop', 'frisson-overview', limit],
    queryFn: async (): Promise<FrissonOverview | null> => {
      if (!window.melophileDesktop?.frissonOverview) return null;
      return window.melophileDesktop.frissonOverview({ limit });
    },
    staleTime: 60_000
  });
}
