export default function CoursesLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden pb-20">
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="w-full text-center pt-8 pb-2 px-4">
        <h1 className="font-syne font-bold text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
          The Rookie Dance Studio
        </h1>
      </div>
      <div className="relative z-10 container max-w-md md:max-w-6xl mx-auto pt-4 pb-8 px-4">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-4 md:p-6 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
            <div className="mb-6">
              <div className="h-8 w-48 bg-white/20 rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-64 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="flex gap-2 mb-6">
              <div className="h-10 w-24 bg-white/20 rounded-lg animate-pulse" />
              <div className="h-10 w-28 bg-white/10 rounded-lg animate-pulse" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white/5 rounded-2xl p-4 border border-white/10 animate-pulse"
                >
                  <div className="flex justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-white/20 rounded" />
                      <div className="h-4 w-24 bg-white/10 rounded" />
                      <div className="h-4 w-40 bg-white/10 rounded" />
                    </div>
                    <div className="h-16 w-16 bg-white/20 rounded-full shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
