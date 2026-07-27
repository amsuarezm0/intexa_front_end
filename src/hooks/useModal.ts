import { useEffect,useRef } from 'react';

/** Overlays currently open, oldest first. Only the topmost one reacts to Escape
 *  and traps Tab, so a confirmation nested inside a drawer closes on its own. */
const stack: symbol[] = [];

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface Options {
  /** Called on Escape. Omit for overlays that must be dismissed deliberately. */
  onClose?: () => void;
  /** False while the overlay is closed but its component stays mounted (drawers). */
  active?: boolean;
  /** Set false when the content owns focus itself (e.g. an autoFocus input). */
  autoFocus?: boolean;
}

/**
 * Wires the keyboard and focus behaviour every overlay is expected to have:
 * Escape to close, Tab trapped inside, focus moved in on open and restored to
 * the trigger on close, and the page behind locked from scrolling.
 *
 * Returns a ref for the overlay panel — spread `dialogProps` on the same node
 * so assistive tech announces it as a dialog.
 */
export function useModal<T extends HTMLElement = HTMLDivElement>(
  { onClose, active = true, autoFocus = true }: Options = {},
) {
  const ref = useRef<T>(null);
  // Kept in a ref so a new inline closure each render doesn't re-run the effect.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;

    const id = Symbol('overlay');
    stack.push(id);
    const restoreFocusTo = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    if (stack.length === 1) document.body.style.overflow = 'hidden';

    if (autoFocus) {
      // After paint: the panel's children (and any autoFocus input) exist by then.
      requestAnimationFrame(() => {
        const panel = ref.current;
        if (!panel || panel.contains(document.activeElement)) return;
        (panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();
      });
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== id) return;

      if (e.key === 'Escape' && onCloseRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab' || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        ref.current.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !ref.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    // Capture phase so the overlay sees Escape before any input's own handler.
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      const i = stack.indexOf(id);
      if (i !== -1) stack.splice(i, 1);
      if (stack.length === 0) document.body.style.overflow = previousOverflow;
      restoreFocusTo?.focus?.();
    };
  }, [active, autoFocus]);

  return ref;
}

/** Attributes for the panel node, alongside the ref from `useModal`. */
export const dialogProps = { role: 'dialog', 'aria-modal': true, tabIndex: -1 } as const;
