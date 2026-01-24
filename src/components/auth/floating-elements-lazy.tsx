'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const FloatingElements = dynamic(() => import('./floating-elements').then((mod) => mod.FloatingElements), {
  ssr: false,
});

export function FloatingElementsLazy() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Delay loading to allow initial render to complete
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldLoad) {
    return null;
  }

  return <FloatingElements />;
}

