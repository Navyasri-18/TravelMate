import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmTransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memberName: string;
  isTransferring: boolean;
}

export function ConfirmTransferOwnershipModal({
  isOpen,
  onClose,
  onConfirm,
  memberName,
  isTransferring,
}: ConfirmTransferOwnershipModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={isTransferring ? undefined : onClose}
          className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-[#a98467]/15 border border-[#a98467]/30 flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5 text-[#a98467]" />
                </div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Make {memberName} the admin?
                </h2>
              </div>
              
              <p className="text-sm text-white/60 leading-relaxed mb-2">
                You'll become a regular member after the transfer.
              </p>
              
              <div className="flex items-start gap-2 mt-3 mb-5 px-3 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Only the admin can manage trip ownership. You won't be able to undo this without {memberName} transferring it back.
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isTransferring}
                  className="flex-1 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest text-white/80 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isTransferring}
                  className="flex-1 px-4 py-2.5 rounded-full bg-[#a98467] hover:bg-[#8c6f55] text-xs font-bold uppercase tracking-widest text-white transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isTransferring ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    'Confirm'
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
