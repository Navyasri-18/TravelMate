import { motion } from 'framer-motion';
import { Utensils, Plane, Hotel, MapPin, ShoppingBag, MoreHorizontal, ArrowRightLeft, Pencil, Trash2, Check } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import type { Expense } from '@/types/expense';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, any> = {
  food: Utensils,
  travel: Plane,
  accommodation: Hotel,
  activity: MapPin,
  shopping: ShoppingBag,
  settlement: ArrowRightLeft,
  other: MoreHorizontal,
};

interface ExpenseListItemProps {
  expense: Expense;
  currentUserId: string;
  currencySymbol: string;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  onClick?: (expense: Expense) => void;
}

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export function ExpenseListItem({ expense, currentUserId, currencySymbol, onEdit, onDelete, onClick }: ExpenseListItemProps) {
  const Icon = CATEGORY_ICONS[expense.category] || MoreHorizontal;
  const isUserPayer = expense.payer_id === currentUserId;
  const payerName = isUserPayer ? 'You' : (expense.payer?.name || 'Unknown');
  const isCreator = expense.created_by === currentUserId;
  
  // Find current user's share in this expense
  const userShare = expense.shares?.find((s) => s.user_id === currentUserId);
  const userOwesUnsettled = userShare && !isUserPayer && !userShare.settled ? userShare.amount_owed : 0;
  const userOwesSettled = userShare && !isUserPayer && userShare.settled ? userShare.amount_owed : 0;

  // For payer: how much is OWED to them, minus what's been settled
  const unsettledOwedToPayer = isUserPayer
    ? (expense.shares?.filter((s) => s.user_id !== currentUserId && !s.settled).reduce((sum, s) => sum + s.amount_owed, 0) || 0)
    : 0;
  const settledOwedToPayer = isUserPayer
    ? (expense.shares?.filter((s) => s.user_id !== currentUserId && s.settled).reduce((sum, s) => sum + s.amount_owed, 0) || 0)
    : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      onClick={() => onClick?.(expense)}
      className={cn(
        "flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors",
        onClick && "cursor-pointer"
      )}
    >
      {/* Category icon */}
      <div className="w-11 h-11 rounded-2xl bg-[#a98467]/10 border border-[#a98467]/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-[#a98467]" />
      </div>
      
      {/* Description + payer */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-white truncate">
          {expense.description}
        </h3>
        <p className="text-[11px] text-white/40 mt-0.5 flex items-center gap-1.5">
          <span>Paid by {payerName}</span>
          <span className="text-white/20">·</span>
          <span>{formatDate(expense.created_at)}</span>
        </p>
      </div>
      
      {/* Amount block */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-white tabular-nums font-mono">
          {currencySymbol}{expense.amount.toFixed(2)}
        </p>
        
        {/* Payer side */}
        {isUserPayer && unsettledOwedToPayer > 0 && (
          <p className="text-[10px] text-emerald-400 mt-0.5 font-bold">
            +{currencySymbol}{unsettledOwedToPayer.toFixed(2)} owed to you
          </p>
        )}
        {isUserPayer && unsettledOwedToPayer === 0 && settledOwedToPayer > 0 && (
          <p className="text-[10px] text-emerald-400/70 mt-0.5 flex items-center justify-end gap-1 font-bold">
            <Check className="h-2.5 w-2.5" strokeWidth={3} /> All settled
          </p>
        )}
        
        {/* Non-payer side */}
        {!isUserPayer && userOwesUnsettled > 0 && (
          <p className="text-[10px] text-amber-400 mt-0.5 font-bold">
            You owe {currencySymbol}{userOwesUnsettled.toFixed(2)}
          </p>
        )}
        {!isUserPayer && userOwesSettled > 0 && (
          <p className="text-[10px] text-emerald-400/70 mt-0.5 flex items-center justify-end gap-1 font-bold">
            <Check className="h-2.5 w-2.5" strokeWidth={3} /> Settled
          </p>
        )}
        
        {/* Not involved */}
        {!userShare && !isUserPayer && (
          <p className="text-[10px] text-white/30 mt-0.5 italic">
            Not involved
          </p>
        )}
      </div>

      {/* Actions (Edit/Delete) */}
      {isCreator && (onEdit || onDelete) && (
        <div className="flex items-center gap-1 shrink-0 ml-2 border-l border-white/5 pl-2">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(expense);
              }}
              className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              aria-label="Edit expense"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(expense);
              }}
              className="p-2 rounded-xl hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              aria-label="Delete expense"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
