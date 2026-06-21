import { Reply as ReplyIcon, Image as ImageIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/chat';

interface EmbeddedReplyPreviewProps {
  /** The parent message being replied to. null means the parent was hard-deleted (ON DELETE SET NULL). */
  parentMessage: ChatMessage | null;
  /** Whether the CURRENT message (the reply itself) belongs to the current user. */
  isCurrentUser: boolean;
  onClick: () => void;
}

export function EmbeddedReplyPreview({
  parentMessage,
  isCurrentUser,
  onClick,
}: EmbeddedReplyPreviewProps) {
  // Parent hard-deleted (reply_to_message_id became NULL) or not yet in cache
  if (!parentMessage) {
    return (
      <div
        className={cn(
          'border-l-2 pl-3 pr-3 py-2 mx-2 mt-2 mb-1 rounded-md flex items-center gap-2 text-xs italic',
          isCurrentUser
            ? 'bg-white/10 border-white/30 text-white/60'
            : 'bg-white/[0.03] border-white/20 text-white/40',
        )}
      >
        <Trash2 className="h-3 w-3 shrink-0" />
        <span>Original message unavailable</span>
      </div>
    );
  }

  // Parent was soft-deleted
  if (parentMessage.deleted_at) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full text-left border-l-2 pl-3 pr-3 py-2 mx-2 mt-2 mb-1 rounded-md flex items-center gap-2 text-xs italic cursor-pointer transition-colors',
          isCurrentUser
            ? 'bg-white/10 border-white/30 text-white/60 hover:bg-white/15'
            : 'bg-white/[0.03] border-white/20 text-white/40 hover:bg-white/5',
        )}
      >
        <Trash2 className="h-3 w-3 shrink-0" />
        <span>Original message was deleted</span>
      </button>
    );
  }

  const parentSenderName = parentMessage.profiles?.name || 'Unknown';
  const hasImage = !!parentMessage.attachment_url;
  const hasText = !!(parentMessage.content && parentMessage.content.trim().length > 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left border-l-2 pl-3 pr-3 py-2 mx-2 mt-2 mb-1 rounded-md flex items-stretch gap-2 cursor-pointer transition-colors',
        isCurrentUser
          ? 'bg-white/10 border-white/40 hover:bg-white/15'
          : 'bg-white/[0.04] border-[#a98467]/60 hover:bg-white/[0.07]',
      )}
    >
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div
          className={cn(
            'text-[10px] uppercase tracking-wider font-bold flex items-center gap-1',
            isCurrentUser ? 'text-white/70' : 'text-[#a98467]',
          )}
        >
          <ReplyIcon className="h-2.5 w-2.5" />
          {parentSenderName}
        </div>
        <div
          className={cn(
            'text-xs mt-0.5 overflow-hidden',
            isCurrentUser ? 'text-white/60' : 'text-white/50',
          )}
        >
          {hasText ? (
            <div className="truncate whitespace-nowrap">
              {parentMessage.content}
            </div>
          ) : hasImage ? (
            <span className="flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              Photo
            </span>
          ) : (
            <span className="italic">Empty message</span>
          )}
        </div>
      </div>

      {hasImage && (
        <img
          src={parentMessage.attachment_url!}
          alt="Reply thumbnail"
          className="w-8 h-8 rounded object-cover shrink-0 self-center"
        />
      )}
    </button>
  );
}
