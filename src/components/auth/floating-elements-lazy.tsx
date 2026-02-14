'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const FloatingElements = dynamic(() => import('./floating-elements').then((mod) => mod.FloatingElements), {
  ssr: false,
});

export function FloatingElementsLazy() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Start loading on next frame so first paint isn't blocked, without a long delay
    const id = requestAnimationFrame(() => {
      setShouldLoad(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (!shouldLoad) {
    return null;
  }

  return <FloatingElements />;
}

