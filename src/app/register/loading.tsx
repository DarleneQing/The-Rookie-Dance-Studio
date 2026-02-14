export default function RegisterLoading() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="relative z-10 w-full text-center pt-12 pb-8 px-4">
        <div className="h-12 w-64 mx-auto bg-white/20 rounded-xl animate-pulse mb-2" />
      </div>
      <div className="relative z-10 w-full flex justify-center px-4 pb-12">
        <div className="w-full max-w-md bg-black/40 rounded-[30px] p-8 animate-pulse">
          <div className="h-8 w-40 bg-white/20 rounded mb-6" />
          <div className="space-y-4">
            <div className="h-12 bg-white/10 rounded-xl" />
            <div className="h-12 bg-white/10 rounded-xl" />
            <div className="h-12 bg-white/10 rounded-xl" />
            <div className="h-12 bg-white/20 rounded-xl mt-4" />
          </div>
        </div>
      </div>
    </main>
  )
}
