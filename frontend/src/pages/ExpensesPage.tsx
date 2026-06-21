import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Receipt, Plus, MessageCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTripChat } from '@/hooks/useTripChat';
import { useTripExpenses } from '@/hooks/useTripExpenses';
import { useAuthStore } from '@/stores/authStore';
import { AddExpenseModal } from '@/components/modals/AddExpenseModal';
import { ExpenseListItem } from '@/components/expenses/ExpenseListItem';
import { useDeleteExpense } from '@/hooks/useDeleteExpense';
import { DeleteExpenseDialog } from '@/components/modals/DeleteExpenseDialog';
import { ExpenseDetailModal } from '@/components/modals/ExpenseDetailModal';
import { BalancesSummary } from '@/components/expenses/BalancesSummary';
import type { Expense } from '@/types/expense';

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  AED: 'د.إ',
};

export default function ExpensesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id || '';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [expenseToView, setExpenseToView] = useState<Expense | null>(null);
  
  // Reuse the existing trip hook for trip + members data
  const { trip, members, isLoading, isError } = useTripChat(id);
  
  // Fetch expenses using the new hook
  const { expenses, isLoading: expensesLoading } = useTripExpenses(id);
  
  const deleteMutation = useDeleteExpense({ tripId: id || '' });
  
  if (isLoading) {
    return (
      <AppLayout isFullScreen={true}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full h-screen flex flex-col text-[#f5f5f5] relative z-10 overflow-hidden bg-black/10 backdrop-blur-sm justify-center items-center"
        >
          <div className="h-10 w-10 rounded-full border-2 border-[#a98467]/30 border-t-[#a98467] animate-spin" />
        </motion.div>
      </AppLayout>
    );
  }
  
  if (isError || !trip) {
    return (
      <AppLayout isFullScreen={true}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full h-screen flex flex-col text-[#f5f5f5] relative z-10 overflow-hidden bg-black/10 backdrop-blur-sm justify-center items-center px-6 text-center"
        >
          <h2 className="text-xl font-bold text-white">Couldn't load this trip's expenses</h2>
          <p className="text-white/60 text-sm mt-2 max-w-md">
            The trip may have been deleted, or you may not have access.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-6 px-5 py-2.5 rounded-full bg-[#a98467] hover:bg-[#8c6f55] text-xs font-bold uppercase tracking-widest text-white transition-all cursor-pointer"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </AppLayout>
    );
  }
  
  const activeCurrency = trip.currency || 'INR';
  const currencySymbol = CURRENCY_SYMBOLS[activeCurrency] || activeCurrency;
  
  // Look up the latest version of the viewed expense from cache (in case of realtime/toggle updates while modal is open)
  const latestExpenseToView = expenseToView
    ? expenses.find((e) => e.id === expenseToView.id) || expenseToView
    : null;
  
  return (
    <AppLayout isFullScreen={true}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full h-screen flex flex-col text-[#f5f5f5] relative z-10 overflow-hidden bg-black/10 backdrop-blur-sm"
      >
        {/* Header */}
        <header className="pl-8 pr-8 py-4 border-b border-white/5 flex items-center justify-between bg-black/10 backdrop-blur-md z-20 shrink-0">
          {/* Left: Back to dashboard + trip info */}
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-100 hover:text-white transition-all cursor-pointer group active:scale-95"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>
            <div>
              <h1 className="text-base font-black tracking-tight text-[#f5f5f5] flex items-center gap-1.5">
                {trip.name}
                <span className="w-1.5 h-1.5 rounded-full bg-[#a98467] animate-pulse" />
              </h1>
              <span className="text-[10px] text-[#f5f5f5]/55 font-extrabold tracking-wider flex items-center gap-1 mt-0.5">
                <Receipt className="h-3.5 w-3.5 text-[#a98467]" />
                Expenses · {currencySymbol} {activeCurrency}
              </span>
            </div>
          </div>
          
          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            {/* Add Expense button — only when there are expenses already */}
            {!expensesLoading && expenses.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-xl bg-[#a98467] hover:bg-[#8c6f55] text-[11px] font-bold uppercase tracking-widest text-white transition-all cursor-pointer active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            )}
            
            {/* Back to Chat button */}
            <Link
              to={`/trip/${id}/chat`}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-100 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              aria-label="Back to Chat"
            >
              <MessageCircle className="h-4 w-4" />
            </Link>
          </div>
        </header>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-8 chat-scrollbar">
          <div className="max-w-2xl mx-auto">
            {expensesLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 rounded-full border-2 border-[#a98467]/30 border-t-[#a98467] animate-spin" />
              </div>
            ) : expenses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                {/* Empty state */}
                <div className="flex flex-col items-center text-center py-12">
                  <div className="w-20 h-20 rounded-3xl bg-[#a98467]/10 border border-[#a98467]/20 flex items-center justify-center mb-6">
                    <Receipt className="h-9 w-9 text-[#a98467]" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    No expenses yet
                  </h2>
                  <p className="text-sm text-white/50 mt-2 leading-relaxed max-w-xs">
                    Track who paid for what during this trip. Split costs, settle up at the end.
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-8 flex items-center gap-2 px-6 py-3 rounded-full bg-[#a98467] hover:bg-[#8c6f55] text-xs font-bold uppercase tracking-widest text-white transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Expense
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
                <BalancesSummary
                  expenses={expenses}
                  members={members.map((m) => ({
                    user_id: m.user_id,
                    profile: m.profile,
                  }))}
                  currentUserId={currentUserId}
                  currencySymbol={currencySymbol}
                />
                <div className="space-y-3">
                  {/* Expense list */}
                  <div className="space-y-2.5">
                    {expenses.map((expense) => (
                      <ExpenseListItem
                        key={expense.id}
                        expense={expense}
                        currentUserId={currentUserId}
                        currencySymbol={currencySymbol}
                        onEdit={(e) => setExpenseToEdit(e)}
                        onDelete={(e) => setExpenseToDelete(e)}
                        onClick={(e) => setExpenseToView(e)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
      
      {trip && (
        <>
          {/* Create modal */}
          <AddExpenseModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            tripId={id || ''}
            tripCurrency={activeCurrency}
            currencySymbol={currencySymbol}
            members={members.map((m) => ({
              user_id: m.user_id,
              profile: m.profile,
            }))}
            currentUserId={currentUserId}
          />
          
          {/* Edit modal */}
          <AddExpenseModal
            isOpen={!!expenseToEdit}
            onClose={() => setExpenseToEdit(null)}
            tripId={id || ''}
            tripCurrency={activeCurrency}
            currencySymbol={currencySymbol}
            members={members.map((m) => ({
              user_id: m.user_id,
              profile: m.profile,
            }))}
            currentUserId={currentUserId}
            expenseToEdit={expenseToEdit}
          />
          
          {/* Delete confirmation */}
          <DeleteExpenseDialog
            isOpen={!!expenseToDelete}
            onClose={() => {
              if (!deleteMutation.isPending) setExpenseToDelete(null);
            }}
            onConfirm={() => {
              if (expenseToDelete) {
                deleteMutation.mutate(expenseToDelete.id, {
                  onSettled: () => setExpenseToDelete(null),
                });
              }
            }}
            expense={expenseToDelete}
            currencySymbol={currencySymbol}
            isPending={deleteMutation.isPending}
          />

          {/* View Details modal */}
          <ExpenseDetailModal
            isOpen={!!expenseToView}
            onClose={() => setExpenseToView(null)}
            expense={latestExpenseToView}
            tripId={id || ''}
            currencySymbol={currencySymbol}
            currentUserId={currentUserId}
            members={members.map((m) => ({
              user_id: m.user_id,
              profile: m.profile,
            }))}
          />
        </>
      )}
    </AppLayout>
  );
}
