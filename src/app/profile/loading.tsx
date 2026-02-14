export default function ProfileLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden pb-20">
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="relative z-10 container max-w-lg mx-auto pt-8 pb-8 px-4 space-y-4">
        <div className="flex flex-col items-center pt-4 pb-6">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-rookie-purple via-rookie-pink to-rookie-blue opacity-60 blur-sm" />
            <div className="relative h-24 w-24 rounded-full bg-white/20 animate-pulse" />
          </div>
          <div className="h-8 w-40 bg-white/20 rounded mt-4 animate-pulse" />
          <div className="h-4 w-32 bg-white/10 rounded mt-2 animate-pulse" />
        </div>
        <div className="relative bg-gradient-to-br from-rookie-purple/90 to-rookie-violet/90 rounded-3xl p-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-white/20 animate-pulse" />
            <div className="h-5 w-40 bg-white/20 rounded animate-pulse" />
            <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-5 w-32 bg-white/20 rounded animate-pulse" />
          <div className="bg-white/80 rounded-3xl p-5 h-32 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/80 rounded-3xl p-5 h-28 animate-pulse" />
          <div className="bg-white/80 rounded-3xl p-5 h-28 animate-pulse" />
        </div>
        <div className="bg-white/10 rounded-3xl p-4 h-16 animate-pulse" />
        <div className="bg-white/10 rounded-3xl p-4 h-16 animate-pulse" />
      </div>
    </div>
  )
}
