import { useEffect, useState } from 'react';

/**
 * On mobile, signals that the element this hook is paired with should hide
 * as soon as the user scrolls down (freeing up screen space), and come back
 * immediately on the very first upward scroll — not just once you reach the
 * top again. Desktop (width > 640px) is untouched.
 */
export function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    function onScroll() {
      if (window.innerWidth > 640) { setHidden(false); return; }
      const y = window.scrollY;
      const delta = y - lastY;
      if (y < 30) setHidden(false);
      else if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return hidden;
}
