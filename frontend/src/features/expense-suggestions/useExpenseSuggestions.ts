import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// >>> ADJUST THIS PATH to the project's existing Supabase client. <<<
import { supabase } from '@/lib/supabase/client';

import type { ExpenseSuggestion } from "./ExpenseSuggestionCard";
import { mapRowToSuggestion, type ExpenseSuggestionRow } from "./mapSuggestion";

const PENDING = "pending";

export function useExpenseSuggestions(tripId: string, tripCurrency: string) {
  const qc = useQueryClient();
  const key = ["expense-suggestions", tripId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<ExpenseSuggestion[]> => {
      const { data, error } = await supabase
        .from("expense_suggestions")
        .select("*")
        .eq("trip_id", tripId)
        .eq("status", PENDING)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as ExpenseSuggestionRow[]).map((r) =>
        mapRowToSuggestion(r, tripCurrency),
      );
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`expense_suggestions:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expense_suggestions",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const newRow = payload.new as ExpenseSuggestionRow | null;
          const oldRow = payload.old as ExpenseSuggestionRow | null;
          const id = newRow?.id ?? oldRow?.id;
          if (!id) return;

          qc.setQueryData<ExpenseSuggestion[]>(key, (prev = []) => {
            const without = prev.filter((s) => s.id !== id);
            const stillPending =
              payload.eventType !== "DELETE" && newRow?.status === PENDING;
            if (!stillPending) return without;
            return [
              mapRowToSuggestion(newRow as ExpenseSuggestionRow, tripCurrency),
              ...without,
            ];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, tripCurrency, qc]);

  async function approve(id: string) {
    const prev = qc.getQueryData<ExpenseSuggestion[]>(key);
    qc.setQueryData<ExpenseSuggestion[]>(key, (p = []) =>
      p.filter((s) => s.id !== id),
    );
    const { error } = await supabase.rpc("approve_expense_suggestion", {
      suggestion_id: id,
    });
    if (error) {
      qc.setQueryData(key, prev);
      toast.error(`Couldn't approve: ${error.message}`);
      throw error;
    }
    toast.success("Added to expenses");
  }

  async function reject(id: string) {
    const prev = qc.getQueryData<ExpenseSuggestion[]>(key);
    qc.setQueryData<ExpenseSuggestion[]>(key, (p = []) =>
      p.filter((s) => s.id !== id),
    );
    const { error } = await supabase
      .from("expense_suggestions")
      .update({ status: "rejected" })
      .eq("id", id);
    if (error) {
      qc.setQueryData(key, prev);
      toast.error(`Couldn't reject: ${error.message}`);
      throw error;
    }
    toast.success("Suggestion dismissed");
  }

  return {
    suggestions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    approve,
    reject,
  };
}
