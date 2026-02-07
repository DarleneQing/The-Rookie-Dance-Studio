import { Metadata } from 'next'
import { FaqContent } from '@/components/legal/faq-content'
import { FloatingElementsLazy } from '@/components/auth/floating-elements-lazy'
import { BackToTopButton } from '@/components/legal/back-to-top-button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FAQ | The Rookie Dance Studio',
  description: 'Frequently Asked Questions about The Rookie Dance Studio. Find answers about bookings, subscriptions, check-in, and more.',
}

export default function FaqPage() {
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
            Frequently Asked Questions
          </h1>
          <p className="text-white/70 font-outfit text-sm">
            Find answers to common questions about our platform, classes, and policies.
          </p>
          <p className="text-white/50 font-outfit text-xs mt-2">
            Last Updated: February 7, 2026
          </p>
        </div>

        {/* Content */}
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/10 shadow-lg">
          <FaqContent />
        </div>

        {/* Back to Top Button */}
        <BackToTopButton />
      </div>
    </main>
  )
}
