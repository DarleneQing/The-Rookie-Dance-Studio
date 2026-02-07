'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface PrefetchRoutesProps {
  routes: string[]
}

export function PrefetchRoutes({ routes }: PrefetchRoutesProps) {
  const router = useRouter()

  useEffect(() => {
    routes.forEach((route) => router.prefetch(route))
  }, [router, routes])

  return null
}
