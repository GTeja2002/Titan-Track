/* ---------------- lib/useKeyboardAware.js ----------------
 * On touch devices, while a text field has focus the on-screen keyboard is
 * up. With Android's adjustResize the bottom tab bar would then ride on top
 * of the keyboard and eat a third of the remaining space, so the body gets a
 * `keyboard-open` class that hides it (see index.css).
 */
import { useEffect } from 'react';

const TEXT_INPUT = /^(text|search|email|number|tel|url|password|time|date)$/i;

function isTyping(el) {
  if (!el) return false;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT') return TEXT_INPUT.test(el.type || 'text');
  return el.isContentEditable === true;
}

export function useKeyboardAware() {
  useEffect(() => {
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (!coarse) return undefined;
    const update = () => document.body.classList.toggle('keyboard-open', isTyping(document.activeElement));
    // focusout fires before focus moves to the next field; check after it settles.
    const onOut = () => setTimeout(update, 50);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', onOut);
      document.body.classList.remove('keyboard-open');
    };
  }, []);
}
