'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ChevronRight, ExternalLink, Instagram, Mail, MapPin, MessageCircle } from 'lucide-react'
import { RednoteIcon } from '@/components/icons/social-icons'
import { WhatsAppQrDialog } from '@/components/legal/whatsapp-qr-dialog'

const LOCATION = 'Quartierzentrum Sch\u00fctze Flex 4, Heinrichstrasse 238, 8005 Zurich'
const LOCATION_QUERY = encodeURIComponent('Heinrichstrasse 238, 8005 Zurich, Switzerland')
const GOOGLE_MAPS_EMBED = `https://www.google.com/maps?q=${LOCATION_QUERY}&output=embed`
const GOOGLE_MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${LOCATION_QUERY}`
const EMAIL = 'therookiestudio.ch@gmail.com'
const INSTAGRAM_URL = 'https://www.instagram.com/therookiedancestudio?igsh=c294ZDFrZ21scXJh'
const XIAOHONGSHU_URL = 'https://xhslink.com/m/6AztLTO4Ffo'

interface FindUsDialogProps {
  children: React.ReactNode
}

export function FindUsDialog({ children }: FindUsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col bg-popover border-border/60 text-popover-foreground p-0 overflow-hidden sm:max-w-lg md:max-w-xl">
        <DialogHeader className="flex-shrink-0 p-6 pb-4">
          <DialogTitle className="font-syne font-bold text-xl text-foreground">
            Find Us
          </DialogTitle>
          <DialogDescription className="text-foreground/70 font-outfit text-sm">
            Our studio location, contact details, and social media
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 pb-6">
          {/* Map */}
          <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
            <div className="aspect-video w-full relative">
              <iframe
                title="The Rookie Dance Studio location"
                src={GOOGLE_MAPS_EMBED}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 w-full h-full"
              />
            </div>
            <a
              href={GOOGLE_MAPS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 text-sm font-outfit text-rookie-cyan hover:text-rookie-cyan/80 transition-colors bg-white/5"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Google Maps
            </a>
          </div>

          {/* Location address */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-border/40">
            <div className="bg-rookie-purple/30 rounded-full p-2 flex-shrink-0">
              <MapPin className="h-5 w-5 text-rookie-pink" />
            </div>
            <div>
              <p className="font-syne font-semibold text-foreground text-sm mb-1">Location</p>
              <p className="font-outfit text-foreground/90 text-sm leading-relaxed">{LOCATION}</p>
              <p className="font-outfit text-foreground/60 text-xs mt-1">Classes are held here unless otherwise noted</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-border/40">
            <div className="bg-rookie-purple/30 rounded-full p-2 flex-shrink-0">
              <Mail className="h-5 w-5 text-rookie-pink" />
            </div>
            <div className="min-w-0">
              <p className="font-syne font-semibold text-foreground text-sm mb-1">Email</p>
              <a
                href={`mailto:${EMAIL}`}
                className="font-outfit text-sm text-rookie-cyan hover:text-rookie-cyan/80 break-all"
              >
                {EMAIL}
              </a>
            </div>
          </div>

          {/* Social media */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-border/40">
            <div className="bg-rookie-purple/30 rounded-full p-2 flex-shrink-0">
              <Instagram className="h-5 w-5 text-rookie-pink" />
            </div>
            <div>
              <p className="font-syne font-semibold text-foreground text-sm mb-2">Social Media</p>
              <div className="flex flex-col gap-2">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-outfit text-sm text-rookie-cyan hover:text-rookie-cyan/80"
                >
                  <Instagram className="h-4 w-4" />
                  @therookiedancestudio
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={XIAOHONGSHU_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-outfit text-sm text-rookie-cyan hover:text-rookie-cyan/80"
                >
                  <RednoteIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-base">{'\u5c0f\u7ea2\u4e66/rednote'}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* WhatsApp group */}
          <WhatsAppQrDialog>
            <button
              type="button"
              className="group flex min-h-16 w-full items-center gap-3 rounded-xl border border-border/40 bg-white/5 p-4 text-left transition-colors hover:border-[#25D366]/40 hover:bg-[#25D366]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
              aria-label="Show WhatsApp group QR code"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#49dc7f]">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-syne text-sm font-semibold text-foreground">
                  WhatsApp Group
                </span>
                <span className="mt-0.5 block font-outfit text-xs text-foreground/60">
                  Tap to view the group QR code
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </WhatsAppQrDialog>
        </div>
      </DialogContent>
    </Dialog>
  )
}

