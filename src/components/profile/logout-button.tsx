'use client'

import { logout } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button
        type="submit"
        variant="outline"
        className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm rounded-3xl p-4 shadow-lg"
      >
        <LogOut className="mr-2 h-5 w-5" />
        <span className="font-outfit font-medium">Logout</span>
      </Button>
    </form>
  )
}

