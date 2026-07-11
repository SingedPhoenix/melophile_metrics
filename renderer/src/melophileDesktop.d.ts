import type { PastTenseTrackRef, TrackPlayCountResult } from './features/past-tense/pastTenseData';
import type {
  DesktopDatabaseStatus,
  EntityRankings,
  FreshOverview,
  FreshHarvestRankings,
  FreshHarvestRankType,
  FreshHarvestWindow,
  FrissonOverview,
  GhostedTracks,
  ListeningRollups,
  LocalServiceConfig,
  RecentListening,
  YearlyEntityRankings,
  YearlyEntityRankingType,
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
      yearlyEntityRankings: (options?: {
        year?: number;
        type?: YearlyEntityRankingType;
        limit?: number;
      }) => Promise<YearlyEntityRankings>;
      listeningRollups: () => Promise<ListeningRollups>;
      entityRankings: (options?: {
        type?: YearlyEntityRankingType;
        limit?: number;
      }) => Promise<EntityRankings>;
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
