/* ---------------- lib/dismiss.js ----------------
 * One stack of open overlays (modals, drawers, menus). Escape — and the
 * Android back button — close only the topmost one, the way a phone user
 * expects back to work.
 */
import { useEffect, useRef } from 'react';

const stack = [];

/** Registers an overlay while `active`; `onClose` is called when it is the
 *  topmost overlay and the user presses Escape or Android back. */
export function useDismiss(active, onClose) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!active) return undefined;
    const entry = { close: () => closeRef.current?.() };
    stack.push(entry);
    const onKey = (e) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === entry) {
        e.stopPropagation();
        entry.close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      const i = stack.indexOf(entry);
      if (i !== -1) stack.splice(i, 1);
      window.removeEventListener('keydown', onKey);
    };
  }, [active]);
}

/** Closes the topmost overlay. Returns false if nothing was open. */
export function dismissTop() {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.close();
  return true;
}
