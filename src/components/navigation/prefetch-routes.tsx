'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

interface PrefetchRoutesProps {
  routes: string[]
}

export function PrefetchRoutes({ routes }: PrefetchRoutesProps) {
  const router = useRouter()
  const routesRef = useRef(routes)
  routesRef.current = routes

  useEffect(() => {
    routesRef.current.forEach((route) => router.prefetch(route))
  }, [router])

  return null
}
