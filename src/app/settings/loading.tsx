export default function SettingsLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden pb-20">
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="relative z-10 container max-w-lg mx-auto pt-8 pb-8 px-4 space-y-6">
        <div className="mb-6">
          <div className="h-8 w-40 bg-white/20 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-64 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-4 p-4 bg-white/10 rounded-3xl">
          <div className="h-16 w-16 rounded-full bg-white/20 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-white/20 rounded animate-pulse" />
            <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white/10 rounded-3xl p-4 h-20 animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
