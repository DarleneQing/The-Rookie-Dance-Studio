export default function CoursesLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden pb-20">
      <div className="absolute inset-0 z-0 bg-background" />
      <div className="w-full text-center pt-8 pb-2 px-4">
        <h1 className="font-syne font-bold text-3xl md:text-4xl text-foreground">
          The Rookie Dance Studio
        </h1>
      </div>
      <div className="relative z-10 container max-w-md md:max-w-6xl mx-auto pt-4 pb-8 px-4">
        <div className="relative">
          <div className="relative bg-card border border-border/60 rounded-3xl p-4 md:p-6 shadow-2xl overflow-hidden">
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
