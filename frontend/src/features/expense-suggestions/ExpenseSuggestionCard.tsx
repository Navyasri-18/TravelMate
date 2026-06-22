import { useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  UtensilsCrossed,
  Car,
  BedDouble,
  Ticket,
  ShoppingBag,
  Receipt,
  Sparkles,
  Check,
  X,
  Loader2,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Custom inline Badge component to avoid missing shadcn/ui badge dependency
function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "destructive" | "outline" }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === "default" && "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        variant === "secondary" && "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "destructive" && "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        variant === "outline" && "text-foreground",
        className
      )}
      {...props}
    />
  );
}

export type ExpenseCategory =
  | "food"
  | "transport"
  | "accommodation"
  | "activities"
  | "shopping"
  | "other";

export type SuggestionStatus = "pending" | "approved" | "rejected";

export interface ExpenseSuggestion {
  id: string;
  description: string;
  amount: number;
  currency: string; // ISO 4217 code, e.g. "INR", "USD"
  category: ExpenseCategory;
  splitCount: number | null;
  perPerson: number | null;
  status: SuggestionStatus;
  createdAt: string; // ISO timestamp
}

export interface ExpenseSuggestionCardProps {
  suggestion: ExpenseSuggestion;
  onApprove: (id: string) => Promise<void> | void;
  onReject: (id: string) => Promise<void> | void;
  isAdmin?: boolean;
  className?: string;
}

const CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; Icon: typeof Receipt }
> = {
  food: { label: "Food", Icon: UtensilsCrossed },
  transport: { label: "Transport", Icon: Car },
  accommodation: { label: "Stay", Icon: BedDouble },
  activities: { label: "Activities", Icon: Ticket },
  shopping: { label: "Shopping", Icon: ShoppingBag },
  other: { label: "Other", Icon: Receipt },
};

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function splitLabel(
  splitCount: number | null,
  perPerson: number | null,
  currency: string,
): string | null {
  if (!splitCount || splitCount <= 1) return null;
  if (perPerson != null) {
    return `Split ${splitCount} ways · ${formatCurrency(perPerson, currency)} each`;
  }
  return `Split ${splitCount} ways`;
}

export function ExpenseSuggestionCard({
  suggestion,
  onApprove,
  onReject,
  isAdmin = false,
  className,
}: ExpenseSuggestionCardProps) {
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  const {
    id,
    description,
    amount,
    currency,
    category,
    splitCount,
    perPerson,
    status,
    createdAt,
  } = suggestion;

  const { label: categoryLabel, Icon: CategoryIcon } =
    CATEGORY_META[category] ?? CATEGORY_META.other;
  const split = splitLabel(splitCount, perPerson, currency);
  const busy = pending !== null;

  async function handle(action: "approve" | "reject") {
    if (busy) return;
    setPending(action);
    try {
      await (action === "approve" ? onApprove(id) : onReject(id));
    } catch {
      setPending(null);
    }
  }

  const actionable = status === "pending" && isAdmin;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "relative overflow-hidden border-border/70 p-4",
          "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary/60",
          className,
        )}
      >
        <div className="flex items-start gap-3 pl-2">
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <CategoryIcon className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="gap-1 px-2 py-0 text-[11px] font-medium text-muted-foreground"
              >
                <Sparkles className="size-3" />
                AI suggested
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </span>
            </div>

            <p
              className="mt-1.5 truncate text-sm font-medium text-foreground"
              title={description}
            >
              {description}
            </p>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              <span className="font-semibold tabular-nums text-foreground">
                {formatCurrency(amount, currency)}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{categoryLabel}</span>
              {split && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Users className="size-3.5" />
                    {split}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 pl-2">
          {status === "approved" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-500">
              <Check className="size-3.5" /> Added to expenses
            </span>
          )}
          {status === "rejected" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <X className="size-3.5" /> Dismissed
            </span>
          )}

          {status === "pending" && !isAdmin && (
            <span className="text-xs text-muted-foreground">
              Pending admin approval
            </span>
          )}

          {actionable && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => handle("reject")}
                className="h-8 gap-1.5"
              >
                {pending === "reject" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
                Reject
              </Button>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => handle("approve")}
                className="h-8 gap-1.5"
              >
                {pending === "approve" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Approve
              </Button>
            </>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export default ExpenseSuggestionCard;
