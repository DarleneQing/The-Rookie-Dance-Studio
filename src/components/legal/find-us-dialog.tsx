'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { MapPin, Mail, Instagram, ExternalLink } from 'lucide-react'
import { RednoteIcon } from '@/components/icons/social-icons'

const LOCATION = 'Quartierzentrum SchÃ¼tze Flex 4, Heinrichstrasse 238, 8005 Zurich'
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
                  <span className="text-base">å°çº¢ä¹¦/rednote</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

