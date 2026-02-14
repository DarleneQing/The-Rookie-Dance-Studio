'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const FloatingElements = dynamic(() => import('./floating-elements').then((mod) => mod.FloatingElements), {
  ssr: false,
});

/** Delay (ms) after which we load the background even if the browser never reported idle (e.g. slow CPU). */
const MAX_DEFER_MS = 2500;

export function FloatingElementsLazy() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const load = () => setShouldLoad(true);

    // Load when the browser is idle so scroll and interaction stay responsive on first visit.
    // Fallback: load after MAX_DEFER_MS so the background still appears on slow devices.
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(load, { timeout: MAX_DEFER_MS });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(load, 150);
    return () => clearTimeout(id);
  }, []);

  if (!shouldLoad) {
    return null;
  }

  return <FloatingElements />;
}

