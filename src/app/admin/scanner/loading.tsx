export default function AdminScannerLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="relative z-10 w-full text-center pt-12 pb-8 px-4">
        <div className="h-12 w-64 bg-white/20 rounded mx-auto mb-2 animate-pulse" />
      </div>
      <div className="relative z-10 container max-w-md mx-auto py-8 px-4">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-6 shadow-2xl overflow-hidden">
            <div className="h-8 w-48 bg-white/20 rounded mx-auto mb-6 animate-pulse" />
            <div className="h-14 w-full bg-white/20 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  )
}
