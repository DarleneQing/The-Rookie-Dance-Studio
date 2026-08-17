export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-background px-4 pb-10">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-14 border-b border-border/40" />

        <div className="flex min-h-44 items-center">
          <div className="space-y-3">
            <div className="h-4 w-28 rounded bg-white/5" />
            <div className="h-9 w-32 rounded-lg bg-white/10" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 rounded-2xl bg-card" />
          ))}
        </div>

        <div className="mt-8 h-5 w-28 rounded bg-white/10" />
        <div className="mt-3 grid gap-2.5 md:grid-cols-2">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-[68px] rounded-2xl bg-card" />
          ))}
        </div>
      </div>
    </main>
  )
}
