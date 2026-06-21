import { supabase } from '@/lib/supabase/client';

interface TransferOwnershipInput {
  tripId: string;
  newAdminId: string;
}

export const transferTripOwnership = async (input: TransferOwnershipInput): Promise<void> => {
  const { data, error } = await supabase.rpc('transfer_trip_ownership', {
    p_trip_id: input.tripId,
    p_new_admin_id: input.newAdminId,
  });
  
  if (error) {
    console.error('Failed to transfer ownership:', error);
    throw new Error(error.message || 'Failed to transfer ownership');
  }
  
  // RPC returns { success: true } — verify
  if (!data?.success) {
    throw new Error('Transfer did not complete successfully');
  }
};
