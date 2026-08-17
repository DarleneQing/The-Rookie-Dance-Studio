export default function AdminUsersLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:pt-8">
        <div className="h-11 w-11 animate-pulse rounded-full bg-card" />
        <div className="mb-6 mt-5 space-y-2">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-white/10" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-white/5" />
        </div>
        <div className="mb-4 h-12 animate-pulse rounded-2xl bg-card" />
        <div className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="flex h-[76px] items-center gap-3 px-4 sm:px-5">
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
              </div>
              <div className="h-5 w-5 animate-pulse rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
