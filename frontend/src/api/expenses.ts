import { supabase } from '@/lib/supabase/client';
import type { Expense, CreateExpenseInput } from '@/types/expense';

export const fetchTripExpenses = async (tripId: string): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id,
      trip_id,
      created_by,
      payer_id,
      amount,
      description,
      category,
      split_mode,
      created_at,
      updated_at,
      payer:profiles!payer_id(name, avatar_url),
      shares:expense_shares(
        id,
        expense_id,
        user_id,
        amount_owed,
        settled,
        settled_at,
        created_at
      )
    `)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch expenses:', error);
    throw error;
  }
  
  return (data || []) as unknown as Expense[];
};

export const fetchExpenseById = async (expenseId: string): Promise<Expense | null> => {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id,
      trip_id,
      created_by,
      payer_id,
      amount,
      description,
      category,
      split_mode,
      created_at,
      updated_at,
      payer:profiles!payer_id(name, avatar_url),
      shares:expense_shares(
        id,
        expense_id,
        user_id,
        amount_owed,
        settled,
        settled_at,
        created_at
      )
    `)
    .eq('id', expenseId)
    .single();
  
  if (error) {
    console.error('Failed to fetch expense:', error);
    return null;
  }
  
  return data as unknown as Expense;
};

export const createExpense = async (input: CreateExpenseInput): Promise<string> => {
  // Convert numbers to ensure they serialize cleanly to JSONB
  const sharesPayload = input.shares.map((s) => ({
    user_id: s.user_id,
    amount_owed: Number(s.amount_owed.toFixed(2)),
  }));
  
  const { data, error } = await supabase.rpc('create_expense_with_shares', {
    p_trip_id: input.tripId,
    p_payer_id: input.payerId,
    p_amount: Number(input.amount.toFixed(2)),
    p_description: input.description.trim(),
    p_category: input.category,
    p_split_mode: input.splitMode,
    p_shares: sharesPayload,
  });
  
  if (error) {
    console.error('Failed to create expense:', error);
    throw error;
  }
  
  if (!data?.success) {
    throw new Error('Expense creation did not complete');
  }
  
  return data.expense_id as string;
};

export interface UpdateExpenseInput extends CreateExpenseInput {
  expenseId: string;
}

export const updateExpense = async (input: UpdateExpenseInput): Promise<void> => {
  const sharesPayload = input.shares.map((s) => ({
    user_id: s.user_id,
    amount_owed: Number(s.amount_owed.toFixed(2)),
  }));
  
  const { data, error } = await supabase.rpc('update_expense_with_shares', {
    p_expense_id: input.expenseId,
    p_payer_id: input.payerId,
    p_amount: Number(input.amount.toFixed(2)),
    p_description: input.description.trim(),
    p_category: input.category,
    p_split_mode: input.splitMode,
    p_shares: sharesPayload,
  });
  
  if (error) {
    console.error('Failed to update expense:', error);
    throw error;
  }
  
  if (data && data.success === false) {
    throw new Error(data.error || 'Update did not complete');
  }
};

export const deleteExpense = async (expenseId: string): Promise<void> => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);
  
  if (error) {
    console.error('Failed to delete expense:', error);
    throw error;
  }
};

export const toggleShareSettled = async (shareId: string, settled: boolean): Promise<void> => {
  const { data, error } = await supabase.rpc('toggle_expense_share_settled', {
    p_share_id: shareId,
    p_settled: settled,
  });
  
  if (error) {
    console.error('Failed to toggle share:', error);
    throw error;
  }
  
  if (data && data.success === false) {
    throw new Error(data.error || 'Toggle failed');
  }
};
