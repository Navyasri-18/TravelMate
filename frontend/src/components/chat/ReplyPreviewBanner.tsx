import { motion, AnimatePresence } from 'framer-motion';
import { X, Reply as ReplyIcon, Image as ImageIcon } from 'lucide-react';
import type { ChatMessage } from '@/types/chat';

interface ReplyPreviewBannerProps {
  message: ChatMessage | null;
  isCurrentUser: boolean;
  onCancel: () => void;
}

export function ReplyPreviewBanner({ message, isCurrentUser, onCancel }: ReplyPreviewBannerProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: 8, height: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="max-w-[70%] mx-auto mb-2 overflow-hidden"
        >
          <div className="flex items-stretch gap-2 bg-white/5 border-l-2 border-[#a98467] rounded-r-xl rounded-l-md pl-3 pr-2 py-2">
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-[#a98467]">
                <ReplyIcon className="h-3 w-3" />
                Replying to {isCurrentUser ? 'yourself' : (message.profiles?.name || 'Unknown')}
              </div>
              <div className="text-xs text-white/70 truncate mt-0.5 flex items-center gap-1.5">
                {message.attachment_url && !message.content.trim() && (
                  <>
                    <ImageIcon className="h-3 w-3 shrink-0" />
                    <span>Photo</span>
                  </>
                )}
                {message.content && message.content.trim().length > 0 && (
                  <span className="truncate">{message.content}</span>
                )}
              </div>
            </div>

            {message.attachment_url && (
              <img
                src={message.attachment_url}
                alt="Reply thumbnail"
                className="w-10 h-10 rounded-md object-cover shrink-0"
              />
            )}

            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 p-1.5 self-start rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
              aria-label="Cancel reply"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
