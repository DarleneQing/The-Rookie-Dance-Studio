'use client'

import { ReactNode } from 'react'
import { FloatingElementsLazy } from '@/components/auth/floating-elements-lazy'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface LegalPageLayoutProps {
  title: string
  description: string
  lastUpdated: string
  children: ReactNode
  downloadButton?: ReactNode
}

export function LegalPageLayout({
  title,
  description,
  lastUpdated,
  children,
  downloadButton,
}: LegalPageLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-black" />

      {/* Floating decorative elements */}
      <FloatingElementsLazy />

      {/* Content */}
      <div className="relative z-10 container max-w-4xl mx-auto pt-8 pb-24 px-4">
        {/* Back Button */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white font-outfit text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-syne font-bold text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-2">
            {title}
          </h1>
          <p className="text-white/70 font-outfit text-sm">
            {description}
          </p>
          <p className="text-white/50 font-outfit text-xs mt-2">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Download Button */}
        {downloadButton && (
          <div className="mb-6">
            {downloadButton}
          </div>
        )}

        {/* Content */}
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/10 shadow-lg">
          <div className="prose prose-invert prose-sm md:prose-base max-w-none">
            {children}
          </div>
        </div>

        {/* Back to Top Button */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-8 w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-lg transition-colors font-outfit text-white/80 hover:text-white"
        >
          Back to Top
        </button>
      </div>
    </main>
  )
}
