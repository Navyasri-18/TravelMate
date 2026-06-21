import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { Check, X as XIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditMessageInputProps {
  initialContent: string;
  isCurrentUser: boolean;
  onSave: (newContent: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function EditMessageInput({
  initialContent,
  isCurrentUser,
  onSave,
  onCancel,
  isPending,
}: EditMessageInputProps) {
  const [text, setText] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount; place cursor at end; auto-resize
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  // Auto-resize whenever text changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [text]);

  const trimmed = text.trim();
  const hasChanged = trimmed !== initialContent.trim();
  const canSave = trimmed.length > 0 && trimmed.length <= 2000 && hasChanged && !isPending;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSave) onSave(trimmed);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl border p-2 flex flex-col gap-2 min-w-[260px] max-w-full',
        isCurrentUser
          ? 'bg-[#a98467]/20 border-[#a98467]/40'
          : 'bg-white/5 border-white/20',
      )}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        maxLength={2000}
        rows={1}
        className={cn(
          'w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed px-2 py-1',
          'placeholder:text-white/30',
          isCurrentUser ? 'text-white' : 'text-[#f5f5f5]',
          'disabled:opacity-50',
        )}
        placeholder="Edit your message..."
      />

      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[10px] text-white/40 font-medium">
          Enter to save · Esc to cancel
        </span>
        <div className="flex items-center gap-1.5">
          {/* Cancel button */}
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            aria-label="Cancel edit"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>

          {/* Save button */}
          <button
            type="button"
            onClick={() => canSave && onSave(trimmed)}
            disabled={!canSave}
            className={cn(
              'p-1.5 rounded-full transition-all flex items-center justify-center',
              canSave
                ? 'bg-[#a98467] hover:bg-[#8c6f55] text-white cursor-pointer'
                : 'bg-white/10 text-white/30 cursor-not-allowed',
            )}
            aria-label="Save edit"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
