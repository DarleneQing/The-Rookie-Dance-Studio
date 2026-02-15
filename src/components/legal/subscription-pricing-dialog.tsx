'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tag, GraduationCap, User } from 'lucide-react'

const PRICING = [
  {
    name: 'Monthly card',
    student: 30,
    adult: 45,
  },
  {
    name: '5-times card',
    student: 45,
    adult: 68,
  },
  {
    name: '10-times card',
    student: 85,
    adult: 128,
  },
] as const

interface SubscriptionPricingDialogProps {
  children: React.ReactNode
}

export function SubscriptionPricingDialog({ children }: SubscriptionPricingDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col bg-black border-white/20 text-white p-0 overflow-hidden sm:max-w-lg [&>button]:text-white [&>button]:hover:text-white [&>button]:opacity-80">
        <DialogHeader className="flex-shrink-0 p-6 pb-4">
          <DialogTitle className="font-syne font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple">
            Subscription Pricing
          </DialogTitle>
          <DialogDescription className="text-white/70 font-outfit text-sm">
            Class card prices for students and adults. Contact us to purchase.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 pb-6">
          {PRICING.map((card) => (
            <div
              key={card.name}
              className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="bg-rookie-purple/30 rounded-full p-2">
                  <Tag className="h-4 w-4 text-rookie-pink" />
                </div>
                <p className="font-syne font-semibold text-white">{card.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <GraduationCap className="h-4 w-4 text-rookie-pink flex-shrink-0" />
                  <div>
                    <p className="font-outfit text-xs text-white/60">Students</p>
                    <p className="font-outfit font-semibold text-white">CHF {card.student}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <User className="h-4 w-4 text-rookie-pink flex-shrink-0" />
                  <div>
                    <p className="font-outfit text-xs text-white/60">Adult</p>
                    <p className="font-outfit font-semibold text-white">CHF {card.adult}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
