'use client'

import { ChevronRight, MessageCircle } from 'lucide-react'

import { WhatsAppQrDialog } from '@/components/legal/whatsapp-qr-dialog'

export function WhatsAppGroupCard() {
  return (
    <WhatsAppQrDialog>
      <button
        type="button"
        className="group flex min-h-16 w-full items-center gap-3 rounded-2xl border border-[#25D366]/25 bg-gradient-to-r from-[#25D366]/10 via-white/5 to-rookie-purple/10 p-3 text-left transition-colors hover:border-[#25D366]/45 hover:from-[#25D366]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:p-4"
        aria-label="Show WhatsApp group QR code"
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#49dc7f] ring-1 ring-inset ring-[#25D366]/20">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-syne text-sm font-semibold text-foreground sm:text-base">
            Join our WhatsApp Group
          </span>
          <span className="mt-0.5 block font-outfit text-xs leading-snug text-foreground/60 sm:text-sm">
            Get class updates and stay connected with the community
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 font-outfit text-xs font-medium text-[#49dc7f] sm:flex">
          View QR
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:hidden"
          aria-hidden="true"
        />
      </button>
    </WhatsAppQrDialog>
  )
}
