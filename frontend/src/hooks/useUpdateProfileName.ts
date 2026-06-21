import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfileName } from '@/api/profile';
import { toast } from 'sonner';

interface UseUpdateProfileNameInput {
  userId: string;
}

export const useUpdateProfileName = ({ userId }: UseUpdateProfileNameInput) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (newName: string) => updateProfileName({ userId, name: newName }),
    
    onSuccess: () => {
      // Invalidate profile-related queries so updated name shows up everywhere
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['current-profile'] });
      // Trip members lists also include profile names
      queryClient.invalidateQueries({ queryKey: ['trip-members'] });
      
      toast.success('Profile updated');
    },
    
    onError: (error: Error) => {
      const msg = error?.message || 'Failed to update profile';
      toast.error(msg);
    },
  });
};
