'use client'

export function BackToTopButton() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      onClick={scrollToTop}
      className="mt-8 w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-lg transition-colors font-outfit text-white/80 hover:text-white"
    >
      Back to Top
    </button>
  )
}
