'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { useInView, type UseInViewOptions } from '@/lib/use-in-view.ts';

export type RevealVariant =
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale-up'
  | 'blur-in'
  | 'clip-reveal';

export type RevealProps = HTMLAttributes<HTMLElement> &
  UseInViewOptions & {
    as?: ElementType;
    variant?: RevealVariant;
    /** Penundaan dalam ms (default: 0) */
    delay?: number;
    /** Durasi kustom dalam ms (opsional, mengikuti default varian jika kosong) */
    duration?: number;
    /** Jarak geser dalam px untuk varian slide-* (default mengikuti varian) */
    distance?: number;
    children: ReactNode;
  };

export function Reveal({
  as: Tag = 'div',
  variant = 'slide-up',
  delay = 0,
  duration,
  distance,
  once = true,
  amount = 0.16,
  margin = '0px 0px -8% 0px',
  className = '',
  style,
  children,
  ...rest
}: RevealProps) {
  const [ref, inView] = useInView<HTMLElement>({ once, amount, margin });

  const customVars: Record<string, string | undefined> = {
    '--io-delay': delay > 0 ? `${delay}ms` : undefined,
    '--io-duration': duration ? `${duration}ms` : undefined,
    '--io-distance': distance !== undefined ? `${distance}px` : undefined,
  };

  const mergedStyle: CSSProperties = {
    ...style,
    ...(Object.fromEntries(
      Object.entries(customVars).filter(([, v]) => v !== undefined),
    ) as CSSProperties),
  };

  const Component = Tag as ElementType;

  return (
    <Component
      ref={ref}
      data-io-reveal=""
      data-variant={variant}
      data-in-view={inView ? 'true' : 'false'}
      className={className || undefined}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </Component>
  );
}

export type StaggerGroupProps = HTMLAttributes<HTMLElement> &
  UseInViewOptions & {
    as?: ElementType;
    /** Jeda antar anak dalam ms (standar Emil Kowalski: 40-60ms, default: 55ms) */
    staggerMs?: number;
    /** Penundaan awal sebelum item pertama masuk (default: 0ms) */
    baseDelayMs?: number;
    children: ReactNode;
  };

export function StaggerGroup({
  as: Tag = 'div',
  staggerMs = 55,
  baseDelayMs = 0,
  once = true,
  amount = 0.15,
  margin = '0px 0px -6% 0px',
  className = '',
  style,
  children,
  ...rest
}: StaggerGroupProps) {
  const [ref, inView] = useInView<HTMLElement>({ once, amount, margin });

  // Batasi stagger maksimal 5 indeks efektif agar daftar tidak terasa lambat (Emil Kowalski Bar)
  const items = Children.map(children, (child, index) => {
    if (
      !isValidElement<{
        style?: CSSProperties;
        'data-in-view'?: string;
      }>(child)
    ) {
      return child;
    }
    const cappedIndex = Math.min(index, 4);
    const itemDelay = baseDelayMs + cappedIndex * staggerMs;
    return cloneElement(child, {
      'data-in-view': inView ? 'true' : 'false',
      style: {
        ...child.props.style,
        '--io-delay': itemDelay > 0 ? `${itemDelay}ms` : undefined,
      } as CSSProperties,
    });
  });

  const Component = Tag as ElementType;

  return (
    <Component
      ref={ref}
      data-io-stagger-group=""
      data-in-view={inView ? 'true' : 'false'}
      className={className || undefined}
      style={style}
      {...rest}
    >
      {items}
    </Component>
  );
}

export type StaggerItemProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  variant?: RevealVariant;
  duration?: number;
  distance?: number;
  children: ReactNode;
};

export function StaggerItem({
  as: Tag = 'div',
  variant = 'slide-up',
  duration,
  distance,
  className = '',
  style,
  children,
  ...rest
}: StaggerItemProps) {
  const customVars: Record<string, string | undefined> = {
    '--io-duration': duration ? `${duration}ms` : undefined,
    '--io-distance': distance !== undefined ? `${distance}px` : undefined,
  };

  const mergedStyle: CSSProperties = {
    ...style,
    ...(Object.fromEntries(
      Object.entries(customVars).filter(([, v]) => v !== undefined),
    ) as CSSProperties),
  };

  const Component = Tag as ElementType;

  return (
    <Component
      data-io-reveal=""
      data-variant={variant}
      className={className || undefined}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </Component>
  );
}

/**
 * Menjeda seluruh animasi CSS tak terbatas di dalam anak komponen (seperti <CityMap>)
 * ketika elemen berada di luar viewport.
 */
export function ViewportPause({
  className = '',
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [ref, inView] = useInView<HTMLDivElement>({
    once: false,
    amount: 0.04,
    margin: '120px 0px 120px 0px',
  });

  return (
    <div
      ref={ref}
      data-io-pause={inView ? 'active' : 'paused'}
      className={className || undefined}
      style={style}
    >
      {children}
    </div>
  );
}
