"use client";

import { useEffect, useRef, useState } from "react";

function debounce(fn: (entries: ResizeObserverEntry[]) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>;

  return (entries: ResizeObserverEntry[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(entries), delay);
  };
}

export function useSize<T extends HTMLElement>(delay = 100) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const observer = new ResizeObserver(
      debounce((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;

          setSize({ height, width });
        }
      }, delay)
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [delay]);

  return { ref, width: size.width, height: size.height };
}
