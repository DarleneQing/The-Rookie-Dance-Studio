'use client'

import { logout } from '@/app/auth/actions'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left text-destructive transition-colors hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-destructive"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-destructive/25 bg-destructive/10">
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="font-outfit text-sm font-medium">Log out</span>
      </button>
    </form>
  )
}

