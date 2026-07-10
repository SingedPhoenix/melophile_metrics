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

export type GhostedTrack = {
  rank: number;
  artist: string;
  track: string;
  album: string;
  listens: number;
  firstPlayedUts: number;
  lastPlayedUts: number;
  daysSinceLastPlayed: number;
};

export type GhostedTracks = {
  tracks: GhostedTrack[];
  minListens: number;
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

export function useGhostedTracks(limit = 50, minListens = 5) {
  return useQuery({
    queryKey: ['desktop', 'ghosted-tracks', limit, minListens],
    queryFn: async (): Promise<GhostedTracks | null> => {
      if (!window.melophileDesktop?.ghostedTracks) return null;
      return window.melophileDesktop.ghostedTracks({ limit, minListens });
    },
    staleTime: 60_000
  });
}
