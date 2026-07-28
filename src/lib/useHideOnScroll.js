import { useEffect, useRef, useState } from 'react';

/**
 * On mobile, hides the element this hook is attached to as soon as the user
 * scrolls down (freeing up screen space), and brings it back immediately on
 * the very first upward scroll — not just once you reach the top again.
 * Measures the element's real rendered height (via ResizeObserver) so
 * callers can reserve exactly that much space, rather than guessing a
 * fixed pixel value that would drift out of sync whenever the content wraps
 * differently (e.g. more filter dropdowns wrapping to another line).
 *
 * Desktop (width > 640px) is untouched — this only ever activates on mobile.
 */
export function useHideOnScroll() {
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);
  const [height, setHeight] = useState(0);
  const lastY = useRef(0);

  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setHeight(entry.contentRect.height);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    lastY.current = window.scrollY;
    function onScroll() {
      if (window.innerWidth > 640) { setHidden(false); return; }
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (y < 30) setHidden(false);
      else if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      lastY.current = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { ref, hidden, height };
}
