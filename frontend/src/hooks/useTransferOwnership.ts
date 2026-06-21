import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transferTripOwnership } from '@/api/tripMembers';
import { toast } from 'sonner';

interface UseTransferOwnershipInput {
  tripId: string;
}

interface TransferVariables {
  newAdminId: string;
  newAdminName: string;
}

export const useTransferOwnership = ({ tripId }: UseTransferOwnershipInput) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (variables: TransferVariables) =>
      transferTripOwnership({
        tripId,
        newAdminId: variables.newAdminId,
      }),
    
    onSuccess: (_data, variables) => {
      // Invalidate the trip query so admin_id refreshes
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      // Members list doesn't structurally change but admin badge does — invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ['trip-members', tripId] });
      
      toast.success(`${variables.newAdminName} is now the admin`);
    },
    
    onError: (error: Error) => {
      const msg = error?.message || 'Failed to transfer ownership';
      toast.error(msg);
    },
  });
};
