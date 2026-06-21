import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import type { Expense } from '@/types/expense';

interface DeleteExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  expense: Expense | null;
  currencySymbol: string;
  isPending: boolean;
}

export function DeleteExpenseDialog({
  isOpen,
  onClose,
  onConfirm,
  expense,
  currencySymbol,
  isPending,
}: DeleteExpenseDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && expense && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={isPending ? undefined : onClose}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#111111]/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Delete Expense?
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Body */}
            <div className="px-6 py-5 bg-[#111111]/80">
              <p className="text-sm text-white/80 leading-relaxed">
                Permanently delete <span className="font-bold text-white">"{expense.description}"</span> for {currencySymbol}{expense.amount.toFixed(2)}?
              </p>
              <p className="text-xs text-white/40 mt-3 leading-relaxed">
                This will remove all associated shares. This action cannot be undone.
              </p>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest text-white/80 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-xs font-bold uppercase tracking-widest text-white transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
