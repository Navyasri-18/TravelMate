import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { leaveTrip } from '@/api/trips';

interface UseLeaveTripOptions {
  tripName: string;
}

export const useLeaveTrip = ({ tripName }: UseLeaveTripOptions) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tripId: string) => leaveTrip(tripId),
    onSuccess: (data) => {
      if (!data.success) {
        if (data.error === 'ADMIN_CANNOT_LEAVE') {
          toast.error('You must transfer ownership before leaving this trip.');
        } else if (data.error === 'NOT_A_MEMBER') {
          toast.error('You are not a member of this trip.');
        } else {
          toast.error('Could not leave trip. Please try again.');
        }
        return;
      }

      // Success — invalidate trips list, show toast, navigate to dashboard
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.removeQueries({ queryKey: ['trip'] });
      queryClient.removeQueries({ queryKey: ['messages'] });
      queryClient.removeQueries({ queryKey: ['trip-members'] });
      toast.success(`You left "${tripName}"`);
      navigate('/dashboard', { replace: true });
    },
    onError: (error: Error) => {
      console.error('Leave trip mutation error:', error);
      toast.error(error?.message || 'Could not leave trip. Please try again.');
    },
  });
};
