export default function AdminVerificationsLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="relative z-10 container max-w-6xl mx-auto pt-8 pb-8 px-4">
        <div className="space-y-6">
          <div>
            <div className="h-10 w-10 rounded-full bg-white/20 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white/20 animate-pulse" />
            <div className="space-y-2">
              <div className="h-8 w-72 bg-white/20 rounded animate-pulse" />
              <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
          <div className="bg-white/10 rounded-3xl p-12 h-48 animate-pulse" />
        </div>
      </div>
    </main>
  )
}
