'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, User, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Courses',
    href: '/courses',
    icon: Calendar,
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function MemberBottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/20 shadow-lg">
      <div className="container max-w-md mx-auto">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-200',
                  active ? 'text-white' : 'text-white/60 hover:text-white/90'
                )}
              >
                <Icon
                  className={cn(
                    'h-6 w-6 transition-all duration-200',
                    active && 'scale-110'
                  )}
                />
                <span
                  className={cn(
                    'text-xs font-outfit font-medium transition-all duration-200',
                    active &&
                      'bg-gradient-to-r from-rookie-purple to-rookie-pink bg-clip-text text-transparent'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
