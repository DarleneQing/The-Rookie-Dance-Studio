'use client'

import { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { BackToTopButton } from '@/components/legal/back-to-top-button'

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
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-background" />

      {/* Content */}
      <div className="relative z-10 container max-w-4xl mx-auto pt-8 pb-24 px-4">
        {/* Back Button */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-foreground/70 hover:text-white font-outfit text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-syne font-bold text-3xl md:text-4xl text-foreground mb-2">
            {title}
          </h1>
          <p className="text-foreground/70 font-outfit text-sm">
            {description}
          </p>
          <p className="text-foreground/50 font-outfit text-xs mt-2">
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
        <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-lg">
          <div className="prose prose-invert prose-sm md:prose-base max-w-none">
            {children}
          </div>
        </div>

        {/* Back to Top Button */}
        <BackToTopButton />
      </div>
    </main>
  )
}
