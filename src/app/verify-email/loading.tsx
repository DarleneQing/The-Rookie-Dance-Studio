export default function VerifyEmailLoading() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="relative z-10 w-full flex justify-center px-4">
        <div className="w-full max-w-md bg-black/40 rounded-[30px] p-8 animate-pulse">
          <div className="h-10 w-56 mx-auto bg-white/20 rounded mb-6" />
          <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
        </div>
      </div>
    </main>
  )
}
