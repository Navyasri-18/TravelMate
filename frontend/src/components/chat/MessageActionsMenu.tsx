import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface MessageAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}

interface MenuPosition {
  x: number;
  y: number;
}

interface MessageActionsMenuProps {
  /** Screen-space position of the menu anchor */
  position: MenuPosition | null;
  actions: MessageAction[];
  onClose: () => void;
}

/**
 * Floating glassmorphic context menu for message actions.
 * Renders into a fixed-position layer so it escapes any overflow container.
 */
export function MessageActionsMenu({ position, actions, onClose }: MessageActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on any outside click / Escape
  useEffect(() => {
    if (!position) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [position, onClose]);

  // Smart positioning: keep the menu inside the viewport
  const getMenuStyle = (): React.CSSProperties => {
    if (!position) return {};
    const MENU_WIDTH = 200;
    const MENU_HEIGHT = actions.length * 48 + 16; // approx
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Prevent overflow right
    if (x + MENU_WIDTH > vw - 16) x = vw - MENU_WIDTH - 16;
    if (x < 16) x = 16;

    // Prefer below; if not enough room, go above
    if (y + MENU_HEIGHT > vh - 16) y = y - MENU_HEIGHT - 8;
    if (y < 16) y = 16;

    return { left: x, top: y };
  };

  return (
    <AnimatePresence>
      {position && (
        <>
          {/* Invisible hit-area backdrop */}
          <div className="fixed inset-0 z-[300]" onClick={onClose} />

          <motion.div
            ref={menuRef}
            style={getMenuStyle()}
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="fixed z-[301] w-[200px] origin-top-left"
          >
            <div className="bg-black/70 backdrop-blur-2xl border border-white/10 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-2 overflow-hidden">
              {actions.map((action, i) => (
                <div key={action.id}>
                  {i > 0 && action.danger && (
                    <div className="h-px bg-white/5 mx-2 my-1" />
                  )}
                  <button
                    type="button"
                    disabled={action.disabled}
                    onClick={() => {
                      action.onClick();
                      onClose();
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left',
                      action.disabled
                        ? 'text-white/25 cursor-not-allowed'
                        : action.danger
                          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                          : 'text-[#f5f5f5] hover:bg-white/8 hover:text-white',
                    )}
                  >
                    <span className={cn(
                      'shrink-0',
                      action.disabled ? 'opacity-40' : '',
                    )}>
                      {action.icon}
                    </span>
                    {action.label}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ----------------------------------------------------------------
// Convenience: copy-action factory
// ----------------------------------------------------------------
interface UseCopyActionProps {
  text: string | null | undefined;
}

/** Returns a MessageAction for "Copy Text" with a brief checkmark feedback. */
export function useCopyAction({ text }: UseCopyActionProps): MessageAction {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return {
    id: 'copy',
    label: copied ? 'Copied!' : 'Copy Text',
    icon: copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />,
    disabled: !text || text.trim().length === 0,
    onClick: handleCopy,
  };
}
