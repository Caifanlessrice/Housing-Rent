import { useEffect, useRef } from "react";

/**
 * Adds a "revealed" class to the element when it enters the viewport.
 * CSS handles the actual animation via .reveal and .reveal.revealed classes.
 */
export function useScrollReveal<T extends HTMLElement>(threshold = 0.08) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
