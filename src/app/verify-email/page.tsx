import Link from "next/link"
import { Mail, ArrowRight } from "lucide-react"
import { FloatingElementsLazy } from "@/components/auth/floating-elements-lazy"

export default function VerifyEmailPage() {
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

      {/* Verify Email Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="relative">
          {/* Glow behind card */}
          <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
          
          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-8 shadow-2xl overflow-hidden text-center">
            {/* Glossy highlight effect on top */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
            
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-rookie-purple/20 p-4 border border-rookie-purple/40">
                <Mail className="h-8 w-8 text-rookie-purple" />
              </div>
            </div>
            
            <h2 className="font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-3">
              Check your email
            </h2>
            <p className="text-white/70 font-outfit mb-6">
              We have sent a verification link to your email address.
            </p>
            
            <p className="text-sm text-white/50 font-outfit mb-6">
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

