"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function useSize<T extends HTMLElement>(delay = 100) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const frameRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    function updateSize(nextWidth: number, nextHeight: number) {
      setSize((currentSize) => {
        if (currentSize.width === nextWidth && currentSize.height === nextHeight) {
          return currentSize;
        }

        return {
          height: nextHeight,
          width: nextWidth,
        };
      });
    }

    function measureElement() {
      const { height, width } = element!.getBoundingClientRect();

      updateSize(width, height);
    }

    function scheduleMeasure(entry: ResizeObserverEntry) {
      const { height, width } = entry.contentRect;

      if (delay <= 0) {
        updateSize(width, height);
        return;
      }

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        updateSize(width, height);
      });
    }

    measureElement();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        scheduleMeasure(entry);
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [delay]);

  return { ref, width: size.width, height: size.height };
}
