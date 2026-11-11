'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

export type UseInViewOptions = {
  once?: boolean;
  amount?: number;
  margin?: string;
};

type ObserverCallback = (isIntersecting: boolean) => void;

type PoolEntry = {
  observer: IntersectionObserver;
  elements: Map<Element, ObserverCallback>;
};

const observerPool = new Map<string, PoolEntry>();

function getSharedObserver(amount: number, margin: string): PoolEntry {
  const key = `${amount}|${margin}`;
  const existing = observerPool.get(key);
  if (existing) return existing;

  const elements = new Map<Element, ObserverCallback>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cb = elements.get(entry.target);
        if (cb) cb(entry.isIntersecting);
      }
    },
    { threshold: amount, rootMargin: margin },
  );

  const created: PoolEntry = { observer, elements };
  observerPool.set(key, created);
  return created;
}

export function useInView<T extends Element = HTMLDivElement>(
  options: UseInViewOptions = {},
): [RefObject<T | null>, boolean] {
  const { once = true, amount = 0.12, margin = '0px 0px -4% 0px' } = options;
  const nodeRef = useRef<T | null>(null);
  const [node, setNode] = useState<T | null>(null);

  const ref = useMemo<RefObject<T | null>>(() => {
    return {
      get current() {
        return nodeRef.current;
      },
      set current(value: T | null) {
        if (nodeRef.current !== value) {
          nodeRef.current = value;
          setNode(value);
        }
      },
    };
  }, []);

  const [inView, setInView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (typeof IntersectionObserver === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      return;
    }

    const pool = getSharedObserver(amount, margin);

    pool.elements.set(node, (isIntersecting) => {
      if (isIntersecting) {
        setInView(true);
        if (once) {
          pool.observer.unobserve(node);
          pool.elements.delete(node);
        }
      } else if (!once) {
        setInView(false);
      }
    });

    pool.observer.observe(node);

    const onMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setInView(true);
        if (once) {
          pool.observer.unobserve(node);
          pool.elements.delete(node);
        }
      }
    };
    mediaQuery.addEventListener('change', onMotionChange);

    return () => {
      mediaQuery.removeEventListener('change', onMotionChange);
      pool.observer.unobserve(node);
      pool.elements.delete(node);
    };
  }, [node, once, amount, margin]);

  return [ref, inView];
}
