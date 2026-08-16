import { EmailIcon, InstagramIcon, RednoteIcon } from "@/components/icons/social-icons"

export function Footer() {
  return (
    <footer className="relative w-full bg-background border-t border-rookie-purple/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 text-center">
          {/* Mobile: Email + Social on same line, Desktop: All in one line */}
          <div className="flex items-center gap-3 md:gap-0">
            {/* Email */}
            <a
              href="mailto:therookiestudio.ch@gmail.com"
              aria-label="Email The Rookie Dance Studio"
              className="flex items-center gap-1.5 font-outfit text-sm text-foreground/80 hover:text-rookie-blue transition-colors duration-300 p-2"
            >
              <EmailIcon />
              <span className="hidden sm:inline">therookiestudio.ch@gmail.com</span>
            </a>

            {/* Divider */}
            <span className="hidden md:inline text-foreground/30 mx-6">|</span>

            {/* Social Media Links */}
            <div className="flex items-center gap-4">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/therookiedancestudio?igsh=c294ZDFrZ21scXJh"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex items-center gap-1.5 font-outfit text-sm text-foreground/80 hover:text-rookie-pink transition-colors duration-300 p-2"
            >
              <InstagramIcon />
              <span className="hidden sm:inline">Instagram</span>
            </a>

            {/* å°çº¢ä¹¦ (Xiaohongshu/RED) */}
            <a
              href="https://xhslink.com/m/6AztLTO4Ffo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Rednote (Xiaohongshu)"
              className="flex items-center gap-1.5 font-outfit text-sm text-foreground/80 hover:text-rookie-pink transition-colors duration-300 p-2"
            >
              <RednoteIcon />
              <span className="hidden sm:inline">Rednote</span>
            </a>
            </div>
          </div>

          {/* Divider */}
          <span className="hidden md:inline text-foreground/30">|</span>

          {/* Copyright */}
          <p className="font-outfit text-sm text-foreground/60">
            Â© 2025 The Rookie Dance Studio. All rights reserved.
          </p>
        </div>

        {/* Legal Links */}
        <div className="flex items-center justify-center gap-4 mt-3 text-center">
          <a
            href="/faq"
            className="font-outfit text-xs text-foreground/50 hover:text-white/80 transition-colors duration-300"
          >
            FAQ
          </a>
          <span className="text-foreground/30">â€¢</span>
          <a
            href="/terms"
            className="font-outfit text-xs text-foreground/50 hover:text-white/80 transition-colors duration-300"
          >
            Terms & Conditions
          </a>
          <span className="text-foreground/30">â€¢</span>
          <a
            href="/privacy"
            className="font-outfit text-xs text-foreground/50 hover:text-white/80 transition-colors duration-300"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </footer>
  )
}


