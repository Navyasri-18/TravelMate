export type ExpenseCategory = 'food' | 'travel' | 'accommodation' | 'activity' | 'shopping' | 'other';
// Note: 'settlement' is a valid backend category but hidden from the UI

export type SplitMode = 'equal' | 'exact';

export interface ExpenseShare {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  settled: boolean;
  settled_at: string | null;
  created_at: string;
}

export interface ExpenseProfile {
  name: string;
  avatar_url: string | null;
}

export interface Expense {
  id: string;
  trip_id: string;
  created_by: string;
  payer_id: string;
  amount: number;
  description: string;
  category: ExpenseCategory | 'settlement';
  split_mode: SplitMode;
  created_at: string;
  updated_at: string;
  // Joined data
  payer?: ExpenseProfile | null;
  shares?: ExpenseShare[];
}

export interface CreateExpenseShareInput {
  user_id: string;
  amount_owed: number;
}

export interface CreateExpenseInput {
  tripId: string;
  payerId: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  splitMode: SplitMode;
  shares: CreateExpenseShareInput[];
}
