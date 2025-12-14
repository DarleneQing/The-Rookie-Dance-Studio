import Link from "next/link"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-8 text-primary">The Rookies</h1>
      <p className="mb-8 text-lg text-muted-foreground text-center max-w-md">
        Welcome to the dance group check-in system.
      </p>
      <div className="flex gap-4">
        <Link 
          href="/login" 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
        >
          Login
        </Link>
        <Link 
          href="/register" 
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition"
        >
          Register
        </Link>
      </div>
    </main>
  )
}
