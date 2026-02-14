'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const FloatingElements = dynamic(() => import('./floating-elements').then((mod) => mod.FloatingElements), {
  ssr: false,
});

const IDLE_DELAY_MS = 800;

/**
 * Loads decorative background after the form can accept input.
 * Uses requestIdleCallback so the main thread isn't busy when the user starts typing;
 * falls back to a short delay for browsers that don't support it.
 */
export function FloatingElementsLazy() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const schedule = () => setShouldLoad(true);

    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(schedule, { timeout: IDLE_DELAY_MS });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(schedule, IDLE_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  if (!shouldLoad) {
    return null;
  }

  return <FloatingElements />;
}

