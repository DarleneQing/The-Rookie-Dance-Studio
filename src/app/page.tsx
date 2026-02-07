import Image from "next/image"
import Link from "next/link"
import { FloatingElementsLazy } from "@/components/auth/floating-elements-lazy"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="relative flex flex-col items-center justify-center overflow-hidden bg-black min-h-screen">
      {/* Floating decorative elements */}
      <FloatingElementsLazy />

      {/* Content Container */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center px-4 py-8">
        {/* Title Section */}
        <div className="w-full text-center pt-8 pb-4 px-4">
          <h1 className="font-syne font-bold text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-1 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
            The Rookie Dance Studio
          </h1>
          <p className="text-white/70 font-outfit font-light text-base md:text-lg mt-1">
            Welcome to join our enthusiastic, open, and vibrant dance community.
          </p>
        </div>

        {/* Illustration Section */}
        <div className="flex-1 flex items-center justify-center w-full px-4 my-2 max-h-[300px]">
          <div className="relative w-full max-w-[180px] md:max-w-[240px]">
            <Image
              src="/assets/pose1.png"
              alt="Welcome illustration"
              width={200}
              height={200}
              className="w-full h-auto object-contain"
              priority
            />
          </div>
        </div>

        {/* Buttons Section */}
        <div className="w-full max-w-md px-4 pb-2 space-y-3">
          <Link
            href="/login"
            className="block w-full h-14 bg-white/10 hover:bg-white/20 border-2 border-black rounded-xl font-syne font-bold text-white text-center flex items-center justify-center transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="block w-full h-14 bg-rookie-blue hover:bg-rookie-blue/90 border-2 border-black rounded-xl font-syne font-bold text-black text-center flex items-center justify-center transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
          >
            Sign Up
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  )
}
