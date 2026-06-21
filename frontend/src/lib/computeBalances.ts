import type { Expense } from '@/types/expense';

export interface PairBalance {
  otherUserId: string;
  // Positive = they owe you. Negative = you owe them. Zero = even.
  netAmount: number;
}

export interface BalancesResult {
  perPerson: PairBalance[];      // sorted by absolute amount descending
  totalOwedToYou: number;        // sum of positives
  totalYouOwe: number;           // absolute sum of negatives
  netOverall: number;            // totalOwedToYou - totalYouOwe
  isAllSettled: boolean;         // true when there are no unsettled, non-zero balances
}

export function computeBalances(
  expenses: Expense[],
  currentUserId: string,
): BalancesResult {
  // Map: otherUserId -> net amount (positive = they owe you, negative = you owe them)
  const pairBalances = new Map<string, number>();
  
  for (const expense of expenses) {
    const shares = expense.shares || [];
    
    if (expense.payer_id === currentUserId) {
      // YOU paid. Everyone else's unsettled share is money they owe you.
      for (const share of shares) {
        if (share.user_id === currentUserId) continue;  // don't count your own (auto-settled) share
        if (share.settled) continue;                    // settled — no longer outstanding
        const current = pairBalances.get(share.user_id) || 0;
        pairBalances.set(share.user_id, current + share.amount_owed);
      }
    } else {
      // SOMEONE ELSE paid. Find YOUR share. If unsettled, you owe them.
      const yourShare = shares.find((s) => s.user_id === currentUserId);
      if (!yourShare) continue;
      if (yourShare.settled) continue;
      
      const payerId = expense.payer_id;
      const current = pairBalances.get(payerId) || 0;
      pairBalances.set(payerId, current - yourShare.amount_owed);
    }
  }
  
  // Build sorted result
  const perPerson: PairBalance[] = Array.from(pairBalances.entries())
    .filter(([, net]) => Math.abs(net) > 0.005)  // ignore floating-point zeroes
    .map(([otherUserId, netAmount]) => ({
      otherUserId,
      netAmount: Number(netAmount.toFixed(2)),
    }))
    .sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount));
  
  const totalOwedToYou = perPerson
    .filter((p) => p.netAmount > 0)
    .reduce((sum, p) => sum + p.netAmount, 0);
  
  const totalYouOwe = perPerson
    .filter((p) => p.netAmount < 0)
    .reduce((sum, p) => sum + Math.abs(p.netAmount), 0);
  
  return {
    perPerson,
    totalOwedToYou: Number(totalOwedToYou.toFixed(2)),
    totalYouOwe: Number(totalYouOwe.toFixed(2)),
    netOverall: Number((totalOwedToYou - totalYouOwe).toFixed(2)),
    isAllSettled: perPerson.length === 0,
  };
}
