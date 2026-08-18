import nextDynamic from "next/dynamic"
import Image from "next/image"
import { Footer } from "@/components/footer"
import { FindUsDialog } from "@/components/legal/find-us-dialog"
import { SubscriptionPricingDialog } from "@/components/legal/subscription-pricing-dialog"

const FloatingElementsLazy = nextDynamic(
  () =>
    import("@/components/auth/floating-elements-lazy").then((mod) => ({
      default: mod.FloatingElementsLazy,
    })),
  { ssr: false }
)

const landingInfoButtonClassName =
  "flex h-11 w-full items-center justify-center rounded-xl border-2 font-syne font-bold shadow-lg transition-all duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export const dynamic = "force-static"

export default function Home() {
  return (
    <main id="main-content" className="relative flex flex-col items-center justify-center overflow-x-hidden bg-background min-h-screen">
      {/* Decoration loads in separate chunk – does not block content or interaction */}
      <FloatingElementsLazy />

      <div className="relative z-10 w-full flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full text-center pt-8 pb-4 px-4">
          <h1 className="font-syne font-bold text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-blue mb-1">
            The Rookie Dance Studio
          </h1>
          <p className="text-foreground/70 font-outfit font-light text-base md:text-lg mt-1">
            Welcome to join our enthusiastic, open, and vibrant dance community.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center w-full px-4 my-2 max-h-[300px]">
          <div className="relative w-full max-w-[180px] md:max-w-[240px]">
            <Image
              src="/assets/pose1.webp"
              alt="Welcome illustration"
              width={200}
              height={200}
              priority
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        <div className="w-full max-w-md px-4 pb-2 space-y-3">
          <a
            href="/login"
            className="block w-full h-14 bg-white/10 hover:bg-white/20 border-2 border-border/40 rounded-xl font-syne font-bold text-white text-center flex items-center justify-center transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
          >
            Log in
          </a>
          <a
            href="/register"
            className="block w-full h-14 bg-rookie-blue hover:bg-rookie-blue/90 border-2 border-border/40 rounded-xl font-syne font-bold text-black text-center flex items-center justify-center transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
          >
            Sign Up
          </a>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1">
            <SubscriptionPricingDialog>
              <button
                type="button"
                className={`${landingInfoButtonClassName} border-warning/50 bg-warning/80 text-black hover:bg-warning/90`}
              >
                Pricing
              </button>
            </SubscriptionPricingDialog>
            <span className="select-none font-syne text-foreground/35" aria-hidden="true">
              |
            </span>
            <FindUsDialog>
              <button
                type="button"
                className={`${landingInfoButtonClassName} border-rookie-cyan/50 bg-rookie-cyan/80 text-black hover:bg-rookie-cyan/90`}
              >
                Find Us
              </button>
            </FindUsDialog>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
