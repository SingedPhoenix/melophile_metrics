import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  applyTrackPlayCounts,
  readPastTenseLiveSnapshot,
  readPastTenseTrackRefs,
  summarizeTrackMatches,
  TrackPlayCountResult
} from './pastTenseData';

const pastTenseSnapshotQueryKey = ['past-tense', 'snapshot'];
const pastTenseTrackCountsQueryKey = (cachedTracks: number, updatedAtMs: number) => [
  'past-tense',
  'track-play-counts',
  cachedTracks,
  updatedAtMs
];

export function usePastTenseData() {
  const queryClient = useQueryClient();
  const snapshotQuery = useQuery({
    queryKey: pastTenseSnapshotQueryKey,
    queryFn: readPastTenseLiveSnapshot,
    initialData: readPastTenseLiveSnapshot
  });

  useEffect(() => {
    const refreshSnapshot = () => {
      queryClient.invalidateQueries({ queryKey: pastTenseSnapshotQueryKey });
    };
    window.addEventListener('storage', refreshSnapshot);
    return () => window.removeEventListener('storage', refreshSnapshot);
  }, [queryClient]);

  const snapshot = snapshotQuery.data;
  const trackCountQuery = useQuery({
    queryKey: pastTenseTrackCountsQueryKey(snapshot.stats.cachedTracks, snapshot.stats.updatedAtMs),
    enabled: Boolean(window.melophileDesktop?.trackPlayCounts && snapshot.stats.cachedTracks),
    queryFn: async (): Promise<TrackPlayCountResult | null> => {
      const bridge = window.melophileDesktop;
      if (!bridge?.trackPlayCounts) return null;
      const trackRefs = readPastTenseTrackRefs();
      if (!trackRefs.length) return null;
      return bridge.trackPlayCounts(trackRefs);
    }
  });

  const playlists = useMemo(
    () => applyTrackPlayCounts(snapshot.playlists, trackCountQuery.data),
    [snapshot.playlists, trackCountQuery.data]
  );
  const matchStats = useMemo(
    () => summarizeTrackMatches(snapshot, trackCountQuery.data),
    [snapshot, trackCountQuery.data]
  );

  return {
    invalidate: () => queryClient.invalidateQueries({ queryKey: pastTenseSnapshotQueryKey }),
    isLoadingScrobbles: trackCountQuery.isFetching,
    matchStats,
    playlists,
    snapshot
  };
}
