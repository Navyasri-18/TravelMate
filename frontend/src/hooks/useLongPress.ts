import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: (e: React.TouchEvent) => void;
  /** How long the user must hold before the callback fires (ms). Default: 500 */
  delay?: number;
}

/**
 * Returns touch event handlers that fire `onLongPress` after `delay` ms.
 * Movement of > 10px cancels the timer so normal scrolling still works.
 */
export function useLongPress({ onLongPress, delay = 500 }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPos.current = null;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      startPos.current = { x: touch.clientX, y: touch.clientY };

      timerRef.current = setTimeout(() => {
        onLongPress(e);
        timerRef.current = null;
      }, delay);
    },
    [onLongPress, delay],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!startPos.current || timerRef.current === null) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startPos.current.x);
      const dy = Math.abs(touch.clientY - startPos.current.y);
      // Cancel if the finger moved more than 10px — user is scrolling
      if (dx > 10 || dy > 10) cancel();
    },
    [cancel],
  );

  const onTouchEnd = useCallback(() => {
    cancel();
  }, [cancel]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
