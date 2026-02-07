export default function AdminLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="relative z-10 container max-w-md mx-auto pt-8 pb-8 px-4 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-white/20 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 h-32 animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-8 w-40 bg-white/20 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-6 h-24 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
