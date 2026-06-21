import { useQuery } from '@tanstack/react-query';
import { fetchUserTrips } from '@/api/trips';
import { useAuthStore } from '@/stores/authStore';
import type { Trip, TripCardData } from '@/types/trip';

export const useTrips = () => {
  const user = useAuthStore((state) => state.user);

  const query = useQuery<Trip[], Error>({
    queryKey: ['trips', user?.id],
    queryFn: fetchUserTrips,
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });

  const trips: TripCardData[] = (query.data ?? []).map((trip) => ({
    ...trip,
    memberCount: (trip as any).trip_members?.[0]?.count ?? 0,
  }));

  return {
    trips,
    isLoading: query.isLoading || (!!user?.id && query.isFetching && !query.data),
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
