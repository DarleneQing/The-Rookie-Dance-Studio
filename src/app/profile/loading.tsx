export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background px-4 pb-20 pt-6">
      <div className="mx-auto max-w-lg space-y-3 animate-pulse sm:space-y-4">
        <div className="flex min-h-28 items-center gap-4 px-1 py-2">
          <div className="h-24 w-24 shrink-0 rounded-full bg-white/10" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-44 max-w-full rounded-lg bg-white/10" />
            <div className="h-4 w-28 rounded bg-white/5" />
          </div>
        </div>

        <div className="h-24 rounded-2xl bg-rookie-purple/25" />
        <div className="h-14 rounded-2xl bg-card" />

        <div className="space-y-2">
          <div className="h-4 w-28 rounded bg-white/10" />
          <div className="h-40 rounded-2xl bg-card" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 rounded-2xl bg-card" />
          <div className="h-28 rounded-2xl bg-card" />
        </div>

        <div className="h-36 rounded-2xl bg-card" />
      </div>
    </div>
  )
}
