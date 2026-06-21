import { supabase } from '@/lib/supabase/client';
import type { Trip } from '@/types/trip';

export const fetchUserTrips = async (): Promise<Trip[]> => {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      trip_members (count)
    `)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error fetching trips:', error);
    throw error;
  }

  return (data as any as Trip[]) || [];
};

interface CreateTripInput {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
}

const generateInviteCode = (): string => {
  // 6-character alphanumeric code, uppercase, no ambiguous chars (0, O, 1, I, L)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

export const createTrip = async (input: CreateTripInput): Promise<Trip> => {
  const inviteCode = generateInviteCode();
  const { data, error } = await supabase.rpc('create_trip_with_admin', {
    trip_name: input.name,
    trip_destination: input.destination,
    trip_start_date: input.startDate,
    trip_end_date: input.endDate,
    trip_invite_code: inviteCode,
    p_currency: input.currency,
  });

  if (error) {
    console.error('Error creating trip:', error);
    throw error;
  }

  if (!data) {
    throw new Error('Trip creation returned no data');
  }

  // The RPC returns the created trip's ID (UUID string)
  const tripId = typeof data === 'string' ? data : (data as any).id;

  // Fetch the full trip details so we return a proper Trip object to the frontend
  const { data: tripData, error: fetchError } = await supabase
    .from('trips')
    .select(`
      *,
      trip_members (count)
    `)
    .eq('id', tripId)
    .single();

  if (fetchError || !tripData) {
    console.error('Error fetching newly created trip details:', fetchError);
    // Fallback if RLS or cache latency prevents immediate select
    return {
      id: tripId,
      name: input.name,
      destination: input.destination,
      start_date: input.startDate,
      end_date: input.endDate,
      invite_code: inviteCode,
      admin_id: '',
      currency: input.currency,
      created_at: new Date().toISOString(),
      trip_members: [{ count: 1 }],
    } as Trip;
  }

  return tripData as any as Trip;
};
export const joinTripByCode = async (inviteCode: string): Promise<string> => {
  const cleanCode = inviteCode.trim().toUpperCase();
  
  if (!cleanCode) {
    throw new Error('Invite code is required');
  }

  const { data, error } = await supabase.rpc('join_trip_via_code', {
    invite_code_param: cleanCode,
  });

  if (error) {
    console.error('Error joining trip:', error);
    throw error;
  }

  if (!data) {
    throw new Error('No trip found with that invite code');
  }

  return data as string;
};

export interface LeaveTripResponse {
  success: boolean;
  error?: 'ADMIN_CANNOT_LEAVE' | 'NOT_A_MEMBER' | string;
}

export const leaveTrip = async (tripId: string): Promise<LeaveTripResponse> => {
  const { data, error } = await supabase.rpc('leave_trip', {
    trip_id_param: tripId,
  });

  if (error) {
    console.error('Error leaving trip:', error);
    throw error;
  }

  return data as LeaveTripResponse;
};

