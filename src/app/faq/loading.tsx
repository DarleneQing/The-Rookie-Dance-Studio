export default function FaqLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="relative z-10 container max-w-3xl mx-auto pt-8 pb-12 px-4">
        <div className="h-10 w-48 bg-white/20 rounded-lg animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
