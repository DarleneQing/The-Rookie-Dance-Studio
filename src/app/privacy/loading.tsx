export default function PrivacyLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="relative z-10 container max-w-3xl mx-auto pt-8 pb-12 px-4">
        <div className="h-10 w-48 bg-white/20 rounded-lg animate-pulse mb-8" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-4 bg-white/10 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
