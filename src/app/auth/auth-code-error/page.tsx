import Link from "next/link"
import { AlertCircle, ArrowRight, Mail } from "lucide-react"
import { FloatingElementsLazy } from "@/components/auth/floating-elements-lazy"

export default function AuthCodeErrorPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-black" />

      {/* Floating decorative elements */}
      <FloatingElementsLazy />

      {/* Studio Name Header */}
      <div className="relative z-10 w-full text-center pt-12 pb-8 px-4">
        <h1 className="font-syne font-bold text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-2 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
          The Rookie Dance Studio
        </h1>
      </div>

      {/* Error Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="relative">
          {/* Glow behind card */}
          <div className="absolute -inset-4 bg-gradient-to-r from-red-500/30 to-orange-500/30 opacity-20 blur-2xl rounded-[30px]" />
          
          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-8 shadow-2xl overflow-hidden text-center">
            {/* Glossy highlight effect on top */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
            
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-red-500/20 p-4 border border-red-500/40">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
            </div>
            
            <h2 className="font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-red-300 to-orange-300 mb-3">
              Verification Failed
            </h2>
            <p className="text-white/70 font-outfit mb-4">
              The verification link is invalid or has expired.
            </p>
            
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
              <p className="text-sm text-white/60 font-outfit mb-2">
                This could happen if:
              </p>
              <ul className="text-sm text-white/50 font-outfit text-left space-y-1 list-disc list-inside">
                <li>The link has already been used</li>
                <li>The link has expired (links expire after 24 hours)</li>
                <li>The link was copied incorrectly</li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-3">
              <Link 
                href="/register"
                className="inline-flex items-center justify-center gap-2 w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-syne font-bold tracking-wide transition-colors duration-300 group"
              >
                <Mail size={18} />
                Request New Link
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full h-12 bg-white/5 text-white hover:bg-white/10 border border-white/10 rounded-xl font-syne font-bold tracking-wide transition-colors duration-300"
              >
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
