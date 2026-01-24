import { AuthForm } from "@/components/auth/auth-form"
import { FloatingElementsLazy } from "@/components/auth/floating-elements-lazy"
import { AuthMode } from "@/types/auth"

export default function RegisterPage() {
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

      {/* Auth Form - Centered (starts in register mode) */}
      <div className="relative z-10 w-full flex items-center justify-center px-4 pb-12">
        <AuthForm initialMode={AuthMode.REGISTER} />
      </div>
    </main>
  )
}
