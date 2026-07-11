import type { PastTenseTrackRef, TrackPlayCountResult } from './features/past-tense/pastTenseData';
import type {
  DesktopDatabaseStatus,
  FreshOverview,
  FreshHarvestRankings,
  FreshHarvestRankType,
  FreshHarvestWindow,
  FrissonOverview,
  GhostedTracks,
  ListeningRollups,
  LocalServiceConfig,
  RecentListening,
  YearlyListeningRollups
} from './shared/useDesktopStatus';

export {};

declare global {
  interface Window {
    melophileDesktop?: {
      platform: string;
      isElectron: boolean;
      readLocalConfig: () => Promise<LocalServiceConfig | null>;
      databaseStatus: () => Promise<DesktopDatabaseStatus>;
      importLastfmScrobbles: (rows: unknown[]) => Promise<unknown>;
      trackPlayCounts: (tracks: PastTenseTrackRef[]) => Promise<TrackPlayCountResult>;
      yearlyListeningRollups: () => Promise<YearlyListeningRollups>;
      listeningRollups: () => Promise<ListeningRollups>;
      recentListening: (limit?: number) => Promise<RecentListening>;
      ghostedTracks: (options?: { limit?: number; minListens?: number }) => Promise<GhostedTracks>;
      freshOverview: (options?: { albumLimit?: number; artistLimit?: number }) => Promise<FreshOverview>;
      harvestRankings: (options?: {
        type?: FreshHarvestRankType;
        window?: FreshHarvestWindow;
        limit?: number;
      }) => Promise<FreshHarvestRankings>;
      frissonOverview: (options?: { limit?: number }) => Promise<FrissonOverview>;
      openSpotify: (url: string) => Promise<{ opened: boolean; url: string }>;
    };
  }
}
