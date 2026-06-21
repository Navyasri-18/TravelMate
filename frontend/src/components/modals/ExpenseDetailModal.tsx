import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, Utensils, Plane, Hotel, MapPin, ShoppingBag, MoreHorizontal, ArrowRightLeft, Check, Loader2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useToggleShareSettled } from '@/hooks/useToggleShareSettled';
import { cn } from '@/lib/utils';
import type { Expense } from '@/types/expense';

const CATEGORY_ICONS: Record<string, any> = {
  food: Utensils,
  travel: Plane,
  accommodation: Hotel,
  activity: MapPin,
  shopping: ShoppingBag,
  settlement: ArrowRightLeft,
  other: MoreHorizontal,
};

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  travel: 'Travel',
  accommodation: 'Stay',
  activity: 'Activity',
  shopping: 'Shopping',
  settlement: 'Settlement',
  other: 'Other',
};

interface MemberLookup {
  user_id: string;
  profile: { name: string; avatar_url: string | null } | null;
}

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  tripId: string;
  currencySymbol: string;
  currentUserId: string;
  members: MemberLookup[];
}

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export function ExpenseDetailModal({
  isOpen,
  onClose,
  expense,
  tripId,
  currencySymbol,
  currentUserId,
  members,
}: ExpenseDetailModalProps) {
  const toggleMutation = useToggleShareSettled({ tripId });
  
  if (!expense) return null;
  
  const Icon = CATEGORY_ICONS[expense.category] || MoreHorizontal;
  const categoryLabel = CATEGORY_LABELS[expense.category] || 'Other';
  
  const isPayer = expense.payer_id === currentUserId;
  const payerName = isPayer ? 'You' : (expense.payer?.name || 'Unknown');
  
  const findMember = (userId: string) => members.find((m) => m.user_id === userId);
  
  const handleToggleShare = (shareId: string, newSettled: boolean) => {
    toggleMutation.mutate({
      shareId,
      expenseId: expense.id,
      newSettled,
    });
  };
  
  // A user can toggle a share's settled state if they are:
  //   (a) the share owner (it's their share)
  //   (b) the expense payer (they're owed the money)
  const canUserToggle = (shareUserId: string): boolean => {
    return shareUserId === currentUserId || isPayer;
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#111111]/90 backdrop-blur-2xl border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-[#a98467]/15 border border-[#a98467]/30 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-[#a98467]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white tracking-tight truncate">
                    {expense.description}
                  </h2>
                  <p className="text-[10px] text-white/40">
                    {categoryLabel} · {formatDateTime(expense.created_at)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Amount + Paid by block */}
              <div className="text-center py-4">
                <p className="text-4xl font-black text-white tracking-tight tabular-nums">
                  {currencySymbol}{expense.amount.toFixed(2)}
                </p>
                <p className="text-xs text-white/40 mt-2">
                  Paid by <span className="font-bold text-white/70">{payerName}</span>
                </p>
              </div>
              
              {/* Split header */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                    Split breakdown
                  </label>
                  <span className="text-[10px] text-white/40">
                    {expense.split_mode === 'equal' ? 'Equal split' : 'Custom amounts'}
                  </span>
                </div>
                
                {/* Shares list */}
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {(expense.shares || []).map((share) => {
                    const member = findMember(share.user_id);
                    const isSelf = share.user_id === currentUserId;
                    const isShareSettled = share.settled;
                    const canToggle = canUserToggle(share.user_id);
                    const isPayerSelfShare = share.user_id === expense.payer_id;
                    
                    return (
                      <div
                        key={share.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all",
                          isShareSettled
                            ? "bg-emerald-500/[0.04] border-emerald-500/15"
                            : "bg-white/[0.03] border-white/10"
                        )}
                      >
                        <Avatar
                          name={member?.profile?.name}
                          avatarUrl={member?.profile?.avatar_url || null}
                          size="sm"
                          isCurrentUser={isSelf}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-semibold truncate transition-all",
                            isShareSettled ? "text-white/40 line-through" : "text-white"
                          )}>
                            {member?.profile?.name || 'Unknown'}
                            {isSelf && <span className="text-white/40 ml-1.5 text-xs no-underline">(you)</span>}
                            {isPayerSelfShare && <span className="text-[#a98467] ml-1.5 text-[10px] no-underline">· payer</span>}
                          </p>
                          <p className={cn(
                            "text-[11px] tabular-nums mt-0.5 font-mono",
                            isShareSettled ? "text-emerald-400 font-sans" : "text-white/40"
                          )}>
                            {isShareSettled ? 'Settled' : `Owes ${currencySymbol}${share.amount_owed.toFixed(2)}`}
                          </p>
                        </div>
                        
                        {/* Amount (always shown) */}
                        <span className={cn(
                          "text-sm font-bold tabular-nums shrink-0 transition-all font-mono",
                          isShareSettled ? "text-white/30 line-through" : "text-white"
                        )}>
                          {currencySymbol}{share.amount_owed.toFixed(2)}
                        </span>
                        
                        {/* Toggle button — for payer's own share, show as auto-settled (no toggle) */}
                        {isPayerSelfShare ? (
                          <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0" title="Payer's share is automatically settled">
                            <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={3} />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => canToggle && handleToggleShare(share.id, !isShareSettled)}
                            disabled={!canToggle || toggleMutation.isPending}
                            className={cn(
                              "w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-all",
                              isShareSettled
                                ? "bg-emerald-500 border-emerald-500"
                                : "bg-transparent border-white/30 hover:border-white/50",
                              canToggle ? "cursor-pointer active:scale-95" : "cursor-not-allowed opacity-50"
                            )}
                            aria-label={isShareSettled ? 'Mark unsettled' : 'Mark settled'}
                            title={
                              !canToggle
                                ? 'Only the share owner or expense payer can toggle this'
                                : isShareSettled ? 'Mark as unsettled' : 'Mark as settled'
                            }
                          >
                            {isShareSettled && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <p className="text-[10px] text-white/30 mt-3 leading-relaxed">
                  Tap the checkbox to settle a share. You can toggle shares you owe, or shares owed to you (if you paid).
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02] shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest text-white/80 hover:text-white transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
