import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export const useCurrentProfile = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery<Profile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, created_at')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Failed to fetch profile:', error);
        throw error;
      }

      return data as Profile;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Profile rarely changes — cache for 5 minutes
    retry: false, // Don't retry on failure — backend might not have the profile yet
  });
};
