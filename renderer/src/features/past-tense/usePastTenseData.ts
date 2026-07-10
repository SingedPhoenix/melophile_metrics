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
    window.addEventListener('melophile:past-tense-cache-updated', refreshSnapshot);
    return () => {
      window.removeEventListener('storage', refreshSnapshot);
      window.removeEventListener('melophile:past-tense-cache-updated', refreshSnapshot);
    };
  }, [queryClient]);

  const snapshot = snapshotQuery.data;
  const trackRefs = useMemo(
    () => readPastTenseTrackRefs(),
    [snapshot.stats.cachedTracks, snapshot.stats.updatedAtMs]
  );
  const trackCountQuery = useQuery({
    queryKey: pastTenseTrackCountsQueryKey(snapshot.stats.cachedTracks, snapshot.stats.updatedAtMs),
    enabled: Boolean(window.melophileDesktop?.trackPlayCounts && snapshot.stats.cachedTracks),
    queryFn: async (): Promise<TrackPlayCountResult | null> => {
      const bridge = window.melophileDesktop;
      if (!bridge?.trackPlayCounts) return null;
      if (!trackRefs.length) return null;
      return bridge.trackPlayCounts(trackRefs);
    }
  });

  const playlists = useMemo(
    () => applyTrackPlayCounts(snapshot.playlists, trackCountQuery.data, trackRefs),
    [snapshot.playlists, trackCountQuery.data, trackRefs]
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
    snapshot,
    trackGems: trackCountQuery.data?.trackGems || {},
    trackPlayCounts: trackCountQuery.data?.trackCounts || {}
  };
}
