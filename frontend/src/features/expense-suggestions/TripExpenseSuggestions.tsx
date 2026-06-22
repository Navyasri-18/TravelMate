import { AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import { ExpenseSuggestionCard } from "./ExpenseSuggestionCard";
import { useExpenseSuggestions } from "./useExpenseSuggestions";

interface TripExpenseSuggestionsProps {
  tripId: string;
  tripCurrency: string;
  isAdmin?: boolean;
}

export function TripExpenseSuggestions({
  tripId,
  tripCurrency,
  isAdmin = false,
}: TripExpenseSuggestionsProps) {
  const { suggestions, isLoading, isError, refetch, approve, reject } =
    useExpenseSuggestions(tripId, tripCurrency);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-4 text-sm text-muted-foreground">
        <span>Couldn&apos;t load suggestions.</span>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        No expense suggestions yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {suggestions.map((s) => (
          <ExpenseSuggestionCard
            key={s.id}
            suggestion={s}
            isAdmin={isAdmin}
            onApprove={approve}
            onReject={reject}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default TripExpenseSuggestions;
