import type { PastTenseTrackRef, TrackPlayCountResult } from './features/past-tense/pastTenseData';
import type {
  ApotheosisWatchlist,
  DesktopDatabaseStatus,
  EntityRankings,
  FreshDiscoveryMetric,
  FreshDiscoveryYears,
  FreshOverview,
  FreshHarvestRankings,
  FreshHarvestRankType,
  FreshHarvestWindow,
  FrissonOverview,
  GhostedTracks,
  GhostedType,
  GhostedWindow,
  ListeningRollups,
  LocalServiceConfig,
  RecentListening,
  RecentEntityRankings,
  RecentEntityRankingWindow,
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
      recentEntityRankings: (options?: {
        type?: YearlyEntityRankingType;
        window?: RecentEntityRankingWindow;
        limit?: number;
      }) => Promise<RecentEntityRankings>;
      ghostedTracks: (options?: {
        limit?: number;
        minListens?: number;
        type?: GhostedType;
        window?: GhostedWindow;
      }) => Promise<GhostedTracks>;
      apotheosisWatchlist: (options?: {
        limit?: number;
        windowMonths?: number;
      }) => Promise<ApotheosisWatchlist>;
      freshOverview: (options?: { albumLimit?: number; artistLimit?: number }) => Promise<FreshOverview>;
      freshDiscoveryYears: (options?: { metric?: FreshDiscoveryMetric }) => Promise<FreshDiscoveryYears>;
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
