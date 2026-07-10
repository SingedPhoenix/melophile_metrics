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
