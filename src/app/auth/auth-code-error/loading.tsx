export default function Loading() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="relative z-10 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-rookie-purple/30 border-t-rookie-purple rounded-full animate-spin" />
      </div>
    </main>
  )
}
