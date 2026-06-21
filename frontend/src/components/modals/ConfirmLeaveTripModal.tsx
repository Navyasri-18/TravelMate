import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmLeaveTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tripName: string;
  isLeaving: boolean;
}

export const ConfirmLeaveTripModal = ({
  isOpen,
  onClose,
  onConfirm,
  tripName,
  isLeaving,
}: ConfirmLeaveTripModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] w-full max-w-md text-white overflow-hidden"
          >
            {/* Body */}
            <div className="p-8 space-y-6">
              {/* Warning icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-7 w-7 text-red-400" />
                </div>
              </div>

              {/* Title + description */}
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-white">Leave this trip?</h2>
                <p className="text-sm text-white/60 leading-relaxed px-4">
                  You're about to leave <span className="text-white font-semibold">{tripName}</span>.
                  You won't be able to see any new messages or get back in unless someone invites you again.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLeaving}
                  className="flex-1 py-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLeaving}
                  className="flex-1 py-3 rounded-full bg-red-500/90 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLeaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Leaving...
                    </>
                  ) : (
                    'Leave Trip'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
