import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { joinTripByCode } from '@/api/trips';

interface UseJoinTripOptions {
  onSuccess?: (tripId: string) => void;
}

export const useJoinTrip = (options?: UseJoinTripOptions) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinTripByCode,
    onSuccess: (tripId) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Joined trip successfully!');
      if (options?.onSuccess) {
        options.onSuccess(tripId);
      } else {
        navigate(`/trip/${tripId}/chat`);
      }
    },
    onError: (error: Error & { code?: string; message?: string }) => {
      const message = error?.message || '';
      
      if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('invalid')) {
        toast.error('Invalid or expired invite code');
      } else if (message.toLowerCase().includes('already')) {
        toast.error('You are already a member of this trip');
      } else if (message.includes('row-level security') || error?.code === '42501') {
        toast.error('Permission denied. Please log in again.');
      } else {
        toast.error(message || 'Failed to join trip. Please try again.');
      }
    },
  });
};
