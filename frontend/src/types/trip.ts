export interface Trip {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  invite_code: string;
  admin_id: string;
  currency: string;
  created_at: string;
  trip_members: { count: number }[];
}

export interface TripCardData extends Trip {
  memberCount: number;
}
