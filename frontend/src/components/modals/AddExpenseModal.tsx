import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, Utensils, Plane, Hotel, MapPin, ShoppingBag, MoreHorizontal, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateExpense } from '@/hooks/useCreateExpense';
import { useUpdateExpense } from '@/hooks/useUpdateExpense';
import { Avatar } from '@/components/ui/Avatar';
import type { ExpenseCategory, SplitMode, CreateExpenseShareInput, Expense } from '@/types/expense';

interface MemberProfile {
  user_id: string;
  profile: {
    name: string;
    avatar_url: string | null;
  } | null;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripCurrency: string;
  currencySymbol: string;
  members: MemberProfile[];
  currentUserId: string;
  expenseToEdit?: Expense | null;
}

const CATEGORY_OPTIONS: { id: ExpenseCategory; label: string; icon: any }[] = [
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'travel', label: 'Travel', icon: Plane },
  { id: 'accommodation', label: 'Stay', icon: Hotel },
  { id: 'activity', label: 'Activity', icon: MapPin },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
];

interface ShareInput {
  userId: string;
  included: boolean;       // toggle for whether this user is in this expense
  exactAmount: string;     // string for input control, parsed at submit
}

export function AddExpenseModal({
  isOpen,
  onClose,
  tripId,
  tripCurrency,
  currencySymbol,
  members,
  currentUserId,
  expenseToEdit,
}: AddExpenseModalProps) {
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [payerId, setPayerId] = useState<string>(currentUserId);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [shares, setShares] = useState<ShareInput[]>([]);
  
  const createMutation = useCreateExpense({ tripId });
  const updateMutation = useUpdateExpense({ tripId });
  
  const isEditMode = !!expenseToEdit;
  const activeMutation = isEditMode ? updateMutation : createMutation;
  
  // Reset and initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        // EDIT MODE: pre-populate
        setDescription(expenseToEdit.description);
        setAmount(String(expenseToEdit.amount));
        setCategory(expenseToEdit.category === 'settlement' ? 'other' : (expenseToEdit.category as ExpenseCategory));
        setPayerId(expenseToEdit.payer_id);
        setSplitMode(expenseToEdit.split_mode);
        
        const existingShares = expenseToEdit.shares || [];
        const existingShareUserIds = new Set(existingShares.map((s) => s.user_id));
        
        setShares(
          members.map((m) => {
            const matched = existingShares.find((s) => s.user_id === m.user_id);
            return {
              userId: m.user_id,
              included: existingShareUserIds.has(m.user_id),
              exactAmount: matched ? String(matched.amount_owed) : '',
            };
          })
        );
      } else {
        // CREATE MODE: defaults
        setDescription('');
        setAmount('');
        setCategory('food');
        setPayerId(currentUserId);
        setSplitMode('equal');
        setShares(
          members.map((m) => ({
            userId: m.user_id,
            included: true,        // default: everyone is in
            exactAmount: '',
          }))
        );
      }
    }
  }, [isOpen, members, currentUserId, expenseToEdit]);
  
  // Derived values
  const numericAmount = parseFloat(amount) || 0;
  const includedShares = shares.filter((s) => s.included);
  const includedCount = includedShares.length;
  
  // Equal split: compute each person's amount
  const equalShareAmount = useMemo(() => {
    if (splitMode !== 'equal' || includedCount === 0 || numericAmount <= 0) return 0;
    return numericAmount / includedCount;
  }, [splitMode, includedCount, numericAmount]);
  
  // Exact split: validate that sum equals total
  const exactSharesSum = useMemo(() => {
    if (splitMode !== 'exact') return 0;
    return includedShares.reduce((sum, s) => sum + (parseFloat(s.exactAmount) || 0), 0);
  }, [splitMode, includedShares]);
  
  const exactSplitMismatch = useMemo(() => {
    if (splitMode !== 'exact') return null;
    const diff = numericAmount - exactSharesSum;
    if (Math.abs(diff) < 0.01) return null;
    return diff;
  }, [splitMode, numericAmount, exactSharesSum]);
  
  // Form validation
  const validation = useMemo(() => {
    if (!description.trim()) return { valid: false, message: 'Description is required' };
    if (description.trim().length > 200) return { valid: false, message: 'Description too long (max 200 chars)' };
    if (numericAmount <= 0) return { valid: false, message: 'Amount must be greater than 0' };
    if (numericAmount > 9999999999) return { valid: false, message: 'Amount is too large' };
    if (includedCount === 0) return { valid: false, message: 'At least one member must be included' };
    if (splitMode === 'exact') {
      // Check every included share has a valid numeric value
      const invalidShare = includedShares.find((s) => {
        const trimmed = s.exactAmount.trim();
        if (trimmed === '') return true;
        const parsed = parseFloat(trimmed);
        return isNaN(parsed) || parsed < 0;
      });
      
      if (invalidShare) {
        const member = members.find((m) => m.user_id === invalidShare.userId);
        const name = member?.profile?.name || 'someone';
        return { valid: false, message: `Enter an amount for ${name} (use 0 if no share)` };
      }
      
      if (exactSplitMismatch !== null) {
        const sign = exactSplitMismatch > 0 ? 'short' : 'over';
        return { valid: false, message: `Shares ${sign} by ${currencySymbol}${Math.abs(exactSplitMismatch).toFixed(2)}` };
      }
    }
    return { valid: true, message: '' };
  }, [description, numericAmount, includedCount, splitMode, exactSplitMismatch, currencySymbol, includedShares, members]);
  
  const handleToggleMember = (userId: string) => {
    setShares((prev) =>
      prev.map((s) =>
        s.userId === userId ? { ...s, included: !s.included } : s
      )
    );
  };
  
  const handleExactAmountChange = (userId: string, value: string) => {
    // Allow only valid number characters
    const sanitized = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    const final = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
    setShares((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, exactAmount: final } : s))
    );
  };
  
  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const final = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
    setAmount(final);
  };
  
  const handleSubmit = async () => {
    if (!validation.valid || activeMutation.isPending) return;
    
    // Build shares payload
    let sharesPayload: CreateExpenseShareInput[];
    
    if (splitMode === 'equal') {
      const baseShare = numericAmount / includedCount;
      // Allocate rounding remainder to the first included share
      // so the sum exactly matches the amount
      let allocated = 0;
      const included = shares.filter((s) => s.included);
      sharesPayload = included.map((s, idx) => {
        let portion: number;
        if (idx === included.length - 1) {
          // Last person gets whatever's left to avoid rounding drift
          portion = Number((numericAmount - allocated).toFixed(2));
        } else {
          portion = Number(baseShare.toFixed(2));
          allocated += portion;
        }
        return { user_id: s.userId, amount_owed: portion };
      });
    } else {
      sharesPayload = includedShares.map((s) => {
        const parsed = parseFloat(s.exactAmount);
        if (isNaN(parsed)) {
          throw new Error(`Invalid amount for one or more shares`);
        }
        return {
          user_id: s.userId,
          amount_owed: Number(parsed.toFixed(2)),
        };
      });
    }
    
    try {
      if (isEditMode && expenseToEdit) {
        await updateMutation.mutateAsync({
          expenseId: expenseToEdit.id,
          tripId,
          payerId,
          amount: numericAmount,
          description: description.trim(),
          category,
          splitMode,
          shares: sharesPayload,
        });
      } else {
        await createMutation.mutateAsync({
          tripId,
          payerId,
          amount: numericAmount,
          description: description.trim(),
          category,
          splitMode,
          shares: sharesPayload,
        });
      }
      onClose();
    } catch {
      // Toast handled by mutation onError
    }
  };
  
  const findMember = (userId: string) =>
    members.find((m) => m.user_id === userId);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={activeMutation.isPending ? undefined : onClose}
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
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#a98467]/15 border border-[#a98467]/30 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-[#a98467]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {isEditMode ? 'Edit Expense' : 'Add Expense'}
                  </h2>
                  <p className="text-[10px] text-white/40">
                    Amount in {tripCurrency}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={activeMutation.isPending}
                className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Description */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">
                  What's it for
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Dinner at Sea Side"
                  maxLength={200}
                  disabled={activeMutation.isPending}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#a98467]/50 focus:bg-[#a98467]/5 transition-all disabled:opacity-50"
                />
              </div>
              
              {/* Amount */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-white/60 font-bold">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    disabled={activeMutation.isPending}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-base text-white placeholder:text-white/30 outline-none focus:border-[#a98467]/50 focus:bg-[#a98467]/5 transition-all disabled:opacity-50"
                  />
                </div>
              </div>
              
              {/* Category */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        disabled={activeMutation.isPending}
                        className={cn(
                          "flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all cursor-pointer disabled:opacity-50",
                          isSelected
                            ? "bg-[#a98467]/20 border-[#a98467]/60 text-[#a98467]"
                            : "bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Payer */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">
                  Paid by
                </label>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                  {members.map((m) => {
                    const isSelected = payerId === m.user_id;
                    const isSelf = m.user_id === currentUserId;
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => setPayerId(m.user_id)}
                        disabled={activeMutation.isPending}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-all cursor-pointer disabled:opacity-50",
                          isSelected
                            ? "bg-[#a98467]/15 border-[#a98467]/40"
                            : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                        )}
                      >
                        <Avatar
                          name={m.profile?.name}
                          avatarUrl={m.profile?.avatar_url || null}
                          size="sm"
                          isCurrentUser={isSelf}
                        />
                        <span className="flex-1 text-left text-sm text-white truncate">
                          {m.profile?.name || 'Unknown'}
                          {isSelf && <span className="text-white/40 ml-1.5 text-xs">(you)</span>}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-[#a98467] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Split mode toggle */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">
                  Split
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitMode('equal')}
                    disabled={activeMutation.isPending}
                    className={cn(
                      "py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50",
                      splitMode === 'equal'
                        ? "bg-[#a98467]/20 border-[#a98467]/60 text-[#a98467]"
                        : "bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/5"
                    )}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('exact')}
                    disabled={activeMutation.isPending}
                    className={cn(
                      "py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50",
                      splitMode === 'exact'
                        ? "bg-[#a98467]/20 border-[#a98467]/60 text-[#a98467]"
                        : "bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/5"
                    )}
                  >
                    Exact Amounts
                  </button>
                </div>
              </div>
              
              {/* Split details */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                    Split between
                  </label>
                  {splitMode === 'equal' && includedCount > 0 && numericAmount > 0 && (
                    <span className="text-[10px] text-white/50 font-mono">
                      {currencySymbol}{equalShareAmount.toFixed(2)} each
                    </span>
                  )}
                  {splitMode === 'exact' && (
                    <span className={cn(
                      "text-[10px] tabular-nums font-bold font-mono",
                      exactSplitMismatch === null ? "text-emerald-400" : "text-amber-400"
                    )}>
                      {currencySymbol}{exactSharesSum.toFixed(2)} / {currencySymbol}{numericAmount.toFixed(2)}
                    </span>
                  )}
                </div>
                
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {shares.map((share) => {
                    const member = findMember(share.userId);
                    const isSelf = share.userId === currentUserId;
                    
                    return (
                      <div
                        key={share.userId}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-xl border transition-all",
                          share.included
                            ? "bg-white/[0.03] border-white/10"
                            : "bg-white/[0.01] border-white/5 opacity-50"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleMember(share.userId)}
                          disabled={activeMutation.isPending}
                          className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-50",
                            share.included
                              ? "bg-[#a98467] border-[#a98467]"
                              : "bg-transparent border-white/30 hover:border-white/50"
                          )}
                          aria-label={share.included ? 'Exclude' : 'Include'}
                        >
                          {share.included && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                        </button>
                        
                        <Avatar
                          name={member?.profile?.name}
                          avatarUrl={member?.profile?.avatar_url || null}
                          size="sm"
                          isCurrentUser={isSelf}
                        />
                        
                        <span className="flex-1 text-sm text-white truncate">
                          {member?.profile?.name || 'Unknown'}
                          {isSelf && <span className="text-white/40 ml-1.5 text-xs">(you)</span>}
                        </span>
                        
                        {splitMode === 'exact' && share.included && (
                          <div className="relative w-24 shrink-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white/40">
                              {currencySymbol}
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={share.exactAmount}
                              onChange={(e) => handleExactAmountChange(share.userId, e.target.value)}
                              disabled={activeMutation.isPending}
                              placeholder="—"
                              className="w-full bg-white/5 border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-xs text-white text-right outline-none focus:border-[#a98467]/50 transition-all disabled:opacity-50 tabular-nums font-mono"
                            />
                          </div>
                        )}
                        
                        {splitMode === 'equal' && share.included && numericAmount > 0 && (
                          <span className="text-xs text-white/50 tabular-nums w-20 text-right font-mono">
                            {currencySymbol}{equalShareAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] shrink-0">
              {!validation.valid && validation.message && description.length > 0 && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-200/80">{validation.message}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={activeMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest text-white/80 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!validation.valid || activeMutation.isPending}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-white transition-all cursor-pointer flex items-center justify-center gap-2",
                    validation.valid && !activeMutation.isPending
                      ? "bg-[#a98467] hover:bg-[#8c6f55] shadow-lg shadow-[#7f5539]/20"
                      : "bg-white/10 cursor-not-allowed opacity-50"
                  )}
                >
                  {activeMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {isEditMode ? 'Saving...' : 'Adding...'}
                    </>
                  ) : (
                    isEditMode ? 'Save Changes' : 'Add Expense'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
