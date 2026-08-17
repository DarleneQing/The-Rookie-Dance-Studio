'use client'

import Image from 'next/image'
import { MessageCircle } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface WhatsAppQrDialogProps {
  children: React.ReactNode
}

export function WhatsAppQrDialog({ children }: WhatsAppQrDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg gap-0 overflow-y-auto rounded-2xl border-border/60 bg-popover p-0 shadow-2xl">
        <DialogHeader className="border-b border-border/40 px-5 pb-4 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2 px-0 pr-12 font-syne text-xl leading-tight">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#49dc7f]">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </span>
            WhatsApp Group
          </DialogTitle>
          <DialogDescription className="pl-10 font-outfit">
            Scan the QR code to join The Rookie Dance Studio group.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-5">
          <div className="overflow-hidden rounded-xl border border-border/50 bg-white">
            <Image
              src="/assets/whatsapp-rookie.jpeg"
              alt="WhatsApp group QR code for The Rookie Dance Studio"
              width={1080}
              height={1080}
              sizes="(max-width: 640px) calc(100vw - 64px), 472px"
              className="aspect-square h-auto w-full"
            />
          </div>
          <p className="mt-3 text-center font-outfit text-xs leading-relaxed text-muted-foreground">
            Point your phone camera at the code, then follow the WhatsApp prompt.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
