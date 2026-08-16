export default function AdminUsersLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 bg-background" />
      <div className="relative z-10 container max-w-md md:max-w-6xl mx-auto pt-8 pb-8 px-4">
        <div className="relative">
          <div className="relative bg-card border border-border/60 rounded-3xl p-4 md:p-6 shadow-2xl overflow-hidden">
            <div className="mb-4">
              <div className="h-10 w-10 rounded-full bg-white/20 animate-pulse" />
            </div>
            <div className="h-8 w-56 bg-white/20 rounded mb-6 animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white/5 rounded-lg p-4 h-16 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
