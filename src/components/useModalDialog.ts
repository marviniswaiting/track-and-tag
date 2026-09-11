import { useEffect, useRef } from 'react';

const focusable = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function useModalDialog<T extends HTMLElement = HTMLElement>(onClose: () => void, active = true) {
  const dialog = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!active || !dialog.current) return;
    const root = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = Array.from(document.querySelectorAll<HTMLElement>('#root > .app-shell > header, #root > .app-shell > main, #root > .app-shell > .notice-stack'));
    background.forEach(element => { element.inert = true; });
    const frame = requestAnimationFrame(() => root.querySelector<HTMLElement>('[autofocus]')?.focus() ?? root.querySelector<HTMLElement>(focusable)?.focus());

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(root.querySelectorAll<HTMLElement>(focusable)).filter(element => !element.hidden);
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0]!; const last = controls.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKey);
      background.forEach(element => { element.inert = false; });
      previous?.focus();
    };
  }, [active]);

  return dialog;
}
