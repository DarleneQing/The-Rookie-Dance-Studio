'use client'

import type { LucideIcon } from 'lucide-react'
import { GraduationCap, Info, Star, Tag, Ticket, User, Zap } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SINGLE_CLASS_PRICE } from '@/lib/pricing'

const PRICING = [
  {
    name: 'Single Class',
    description: 'Drop in for one class.',
    student: SINGLE_CLASS_PRICE.student,
    adult: SINGLE_CLASS_PRICE.adult,
    icon: Ticket,
  },
  {
    name: 'Monthly Card',
    student: 30,
    adult: 45,
    icon: Tag,
  },
  {
    name: '5-Times Card',
    student: 45,
    adult: 68,
    icon: Zap,
  },
  {
    name: '10-Times Card',
    student: 85,
    adult: 128,
    icon: Star,
  },
] as const

interface SubscriptionPricingDialogProps {
  children: React.ReactNode
}

function PriceColumn({
  icon: Icon,
  label,
  amount,
}: {
  icon: LucideIcon
  label: string
  amount: number
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-1 text-center sm:gap-1.5 sm:px-4">
      <Icon className="h-5 w-5 text-rookie-blue sm:h-6 sm:w-6" strokeWidth={1.75} aria-hidden="true" />
      <span className="font-outfit text-xs text-foreground/60 sm:text-sm">{label}</span>
      <p className="bg-gradient-to-r from-rookie-pink to-rookie-blue bg-clip-text font-syne text-base font-bold tracking-tight text-transparent sm:text-2xl">
        CHF {amount}
      </p>
    </div>
  )
}

function PricingTierTitle({ name }: { name: string }) {
  const cardSuffix = ' Card'
  const isCardName = name.endsWith(cardSuffix)
  const primary = isCardName ? name.slice(0, -cardSuffix.length) : name

  return (
    <h3 className="font-syne text-sm font-bold leading-tight text-foreground sm:text-base">
      {isCardName ? (
        <>
          {primary}
          <br />
          Card
        </>
      ) : (
        name
      )}
    </h3>
  )
}

function PricingTierCard({
  name,
  student,
  adult,
  icon: Icon,
  ...tier
}: (typeof PRICING)[number]) {
  const description = 'description' in tier ? tier.description : undefined

  return (
    <article
      aria-label={name}
      className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:gap-4 sm:px-5 sm:py-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rookie-purple to-[#3d2a62] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] sm:h-11 sm:w-11">
          <Icon className="h-4 w-4 text-white sm:h-5 sm:w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <PricingTierTitle name={name} />
          {description ? (
            <p className="mt-0.5 font-outfit text-[10px] leading-snug text-foreground/55 sm:truncate sm:text-xs">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 flex-[1.15] grid-cols-[1fr_auto_1fr] items-stretch">
        <PriceColumn icon={GraduationCap} label="Students" amount={student} />
        <div className="my-2 w-px bg-white/15" aria-hidden="true" />
        <PriceColumn icon={User} label="Adult" amount={adult} />
      </div>
    </article>
  )
}

export function SubscriptionPricingDialog({ children }: SubscriptionPricingDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl flex-col overflow-hidden border-border/60 bg-popover p-0 text-popover-foreground [&>button]:right-3 [&>button]:top-3 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/5">
        <DialogHeader className="flex-shrink-0 px-5 pb-4 pt-6 sm:px-6">
          <DialogTitle className="bg-gradient-to-r from-white via-rookie-pink to-rookie-blue bg-clip-text font-syne text-xl font-bold text-transparent sm:text-2xl">
            Subscription Pricing
          </DialogTitle>
          <DialogDescription className="font-outfit text-sm text-foreground/65">
            Class card prices for students and adults. Contact us to purchase.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pb-6 sm:space-y-4 sm:px-6">
          {PRICING.map((card) => (
            <PricingTierCard key={card.name} {...card} />
          ))}

          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <Info className="h-3.5 w-3.5 text-foreground/55" aria-hidden="true" />
            </span>
            <div className="space-y-2 font-outfit text-sm leading-relaxed text-foreground/60">
              <p>
                Prices are in CHF and include all regular classes. Workshops and special events are
                not included.
              </p>
              <p>
                Monthly cards can only be used by one person and are not transferable. Times cards
                can only be shared within a family.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
