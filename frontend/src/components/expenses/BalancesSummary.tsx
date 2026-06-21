import { motion } from 'framer-motion';
import { Check, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { computeBalances } from '@/lib/computeBalances';
import { cn } from '@/lib/utils';
import type { Expense } from '@/types/expense';

interface MemberLookup {
  user_id: string;
  profile: { name: string; avatar_url: string | null } | null;
}

interface BalancesSummaryProps {
  expenses: Expense[];
  members: MemberLookup[];
  currentUserId: string;
  currencySymbol: string;
}

export function BalancesSummary({
  expenses,
  members,
  currentUserId,
  currencySymbol,
}: BalancesSummaryProps) {
  const balances = computeBalances(expenses, currentUserId);
  
  // Don't render anything if there are no expenses at all
  if (expenses.length === 0) return null;
  
  const findMemberName = (userId: string): string => {
    const member = members.find((m) => m.user_id === userId);
    return member?.profile?.name || 'Unknown';
  };
  
  const findMemberAvatar = (userId: string): string | null => {
    const member = members.find((m) => m.user_id === userId);
    return member?.profile?.avatar_url || null;
  };
  
  // All settled state
  if (balances.isAllSettled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 px-5 py-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Check className="h-4 w-4 text-emerald-400" strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">All settled up!</h3>
            <p className="text-[11px] text-white/50 mt-0.5">No outstanding balances on this trip.</p>
          </div>
        </div>
      </motion.div>
    );
  }
  
  const isNetPositive = balances.netOverall > 0;
  const isNetNegative = balances.netOverall < 0;
  const isNetZero = Math.abs(balances.netOverall) < 0.005;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-2xl bg-white/[0.03] border border-white/10 mb-6 overflow-hidden"
    >
      {/* Net total header */}
      <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0",
              isNetPositive && "bg-emerald-500/15 border-emerald-500/30",
              isNetNegative && "bg-amber-500/15 border-amber-500/30",
              isNetZero && "bg-white/5 border-white/10"
            )}>
              {isNetPositive && <TrendingUp className="h-4 w-4 text-emerald-400" />}
              {isNetNegative && <TrendingDown className="h-4 w-4 text-amber-400" />}
              {isNetZero && <Check className="h-4 w-4 text-white/50" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                Overall
              </p>
              <p className={cn(
                "text-base font-black tracking-tight tabular-nums mt-0.5",
                isNetPositive && "text-emerald-300",
                isNetNegative && "text-amber-300",
                isNetZero && "text-white/70"
              )}>
                {isNetPositive && `You're owed ${currencySymbol}${balances.netOverall.toFixed(2)}`}
                {isNetNegative && `You owe ${currencySymbol}${Math.abs(balances.netOverall).toFixed(2)}`}
                {isNetZero && `You're even overall`}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Per-person breakdown */}
      <div className="px-5 py-3 space-y-1">
        {balances.perPerson.map((pair) => {
          const theyOweYou = pair.netAmount > 0;
          const name = findMemberName(pair.otherUserId);
          const avatar = findMemberAvatar(pair.otherUserId);
          const amount = Math.abs(pair.netAmount);
          
          return (
            <div
              key={pair.otherUserId}
              className="flex items-center gap-3 py-2"
            >
              <Avatar
                name={name}
                avatarUrl={avatar}
                size="sm"
                isCurrentUser={false}
              />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm text-white/80 truncate">
                  {name}
                </span>
                <ArrowRight className={cn(
                  "h-3 w-3 shrink-0",
                  theyOweYou ? "text-emerald-400 rotate-180" : "text-amber-400"
                )} />
                <span className="text-xs text-white/40 truncate">
                  {theyOweYou ? `owes you` : `you owe`}
                </span>
              </div>
              <span className={cn(
                "text-sm font-bold tabular-nums shrink-0 font-mono",
                theyOweYou ? "text-emerald-400" : "text-amber-400"
              )}>
                {currencySymbol}{amount.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
