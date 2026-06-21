import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { fetchTripExpenses, fetchExpenseById } from '@/api/expenses';
import type { Expense } from '@/types/expense';

export const useTripExpenses = (tripId: string | undefined) => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['expenses', tripId],
    queryFn: () => fetchTripExpenses(tripId!),
    enabled: !!tripId,
    staleTime: 30_000,
  });
  
  // Realtime: refetch the affected expense on INSERT or UPDATE
  // We refetch the full expense (with joins) rather than constructing from payload,
  // because the realtime payload doesn't include joined profile/shares data.
  
  const handleExpenseChangeRef = useRef<((expenseId: string) => Promise<void>) | null>(null);
  
  const handleExpenseChange = useCallback(async (expenseId: string) => {
    const updated = await fetchExpenseById(expenseId);
    if (!updated) return;
    
    queryClient.setQueryData<Expense[]>(['expenses', tripId], (prev = []) => {
      const existingIdx = prev.findIndex((e) => e.id === expenseId);
      if (existingIdx === -1) {
        // New expense — prepend (newest first)
        return [updated, ...prev];
      }
      // Existing expense was updated
      const next = [...prev];
      next[existingIdx] = updated;
      return next;
    });
  }, [tripId, queryClient]);
  
  useEffect(() => {
    handleExpenseChangeRef.current = handleExpenseChange;
  }, [handleExpenseChange]);
  
  useEffect(() => {
    if (!tripId) return;
    
    const channel = supabase
      .channel(`trip_expenses_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'expenses',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload: any) => {
          if (handleExpenseChangeRef.current && payload.new?.id) {
            handleExpenseChangeRef.current(payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'expenses',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload: any) => {
          if (handleExpenseChangeRef.current && payload.new?.id) {
            handleExpenseChangeRef.current(payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'expenses',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload: any) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          
          queryClient.setQueryData<Expense[]>(['expenses', tripId], (prev = []) => {
            return prev.filter((e) => e.id !== deletedId);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'expense_shares',
        },
        async (payload: any) => {
          const updatedShare = payload.new;
          if (!updatedShare?.expense_id) return;
          
          // Check if this share belongs to one of our trip's expenses
          // by looking it up in cache, then update its share in-place.
          queryClient.setQueryData<Expense[]>(['expenses', tripId], (prev = []) => {
            const expenseIdx = prev.findIndex((e) => e.id === updatedShare.expense_id);
            if (expenseIdx === -1) return prev;  // share is for an expense we don't have in this trip — ignore
            
            const next = [...prev];
            next[expenseIdx] = {
              ...next[expenseIdx],
              shares: (next[expenseIdx].shares || []).map((s) =>
                s.id === updatedShare.id
                  ? {
                      ...s,
                      settled: updatedShare.settled,
                      settled_at: updatedShare.settled_at,
                    }
                  : s
              ),
            };
            return next;
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);
  
  return {
    expenses: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};
