import Link from "next/link"
import { Mail, ArrowRight } from "lucide-react"
import { FloatingElementsLazy } from "@/components/auth/floating-elements-lazy"

export default function VerifyEmailPage() {
  return (
    <main id="main-content" className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-background" />

      {/* Floating decorative elements */}
      <FloatingElementsLazy />

      {/* Studio Name Header */}
      <div className="relative z-10 w-full text-center pt-12 pb-8 px-4">
        <h1 className="font-syne font-bold text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-2">
          The Rookie Dance Studio
        </h1>
      </div>

      {/* Verify Email Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="relative">
          <div className="relative bg-card border border-border/60 rounded-3xl p-8 shadow-2xl overflow-hidden text-center">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-rookie-purple/20 p-4 border border-rookie-purple/40">
                <Mail className="h-8 w-8 text-rookie-purple" />
              </div>
            </div>
            
            <h2 className="font-syne font-bold text-3xl text-foreground mb-3">
              Check your email
            </h2>
            <p className="text-foreground/70 font-outfit mb-6">
              We have sent a verification link to your email address.
            </p>
            
            <p className="text-sm text-foreground/50 font-outfit mb-6">
              Click on the link in the email to activate your account and sign in.
            </p>
            
            <Link 
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full mt-4 h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-syne font-bold tracking-wide transition-colors duration-300 group"
            >
              Return to Login
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

