import type { PastTenseTrackRef, TrackPlayCountResult } from './features/past-tense/pastTenseData';

export {};

declare global {
  interface Window {
    melophileDesktop?: {
      platform: string;
      isElectron: boolean;
      readLocalConfig: () => Promise<unknown>;
      databaseStatus: () => Promise<unknown>;
      importLastfmScrobbles: (rows: unknown[]) => Promise<unknown>;
      trackPlayCounts: (tracks: PastTenseTrackRef[]) => Promise<TrackPlayCountResult>;
    };
  }
}
