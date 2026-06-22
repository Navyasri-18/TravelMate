import type {
  ExpenseSuggestion,
  ExpenseCategory,
  SuggestionStatus,
} from "./ExpenseSuggestionCard";

/** Raw row shape of public.expense_suggestions. */
export interface ExpenseSuggestionRow {
  id: string;
  trip_id: string;
  message_id: string | null;
  status: string; // 'pending' | 'approved' | 'rejected'
  suggested_amount: number | null;
  suggested_description: string | null;
  suggested_category: string | null;
  suggested_payer_id: string | null;
  suggested_shares: unknown | null; // jsonb
  created_expense_id: string | null;
  created_at: string;
  updated_at: string;
}

const VALID_CATEGORIES: ExpenseCategory[] = [
  "food",
  "transport",
  "accommodation",
  "activities",
  "shopping",
  "other",
];

function toCategory(value: string | null): ExpenseCategory {
  return VALID_CATEGORIES.includes(value as ExpenseCategory)
    ? (value as ExpenseCategory)
    : "other";
}

function toStatus(value: string): SuggestionStatus {
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  return "pending";
}

/**
 * @param row  raw expense_suggestions row
 * @param tripCurrency  ISO code from the trip (the suggestion has no currency column)
 */
export function mapRowToSuggestion(
  row: ExpenseSuggestionRow,
  tripCurrency: string,
): ExpenseSuggestion {
  return {
    id: row.id,
    description: row.suggested_description ?? "Unnamed expense",
    amount: row.suggested_amount ?? 0,
    currency: tripCurrency,
    category: toCategory(row.suggested_category),
    splitCount: null,
    perPerson: null,
    status: toStatus(row.status),
    createdAt: row.created_at,
  };
}
