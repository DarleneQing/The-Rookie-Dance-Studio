import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  Heart,
  Pencil,
  QrCode,
  Sparkles,
  Zap,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AvatarUploadDialog } from '@/components/profile/avatar-upload-dialog'
import {
  CheckinHistoryDialog,
  type CheckinHistoryItem,
} from '@/components/profile/checkin-history-dialog'
import { QRCodeDisplay } from '@/components/profile/qr-code-display'
import {
  SubscriptionHistoryDialog,
  type SubscriptionHistoryItem,
} from '@/components/profile/subscription-history-dialog'

interface ProfileSummary {
  fullName: string
  avatarUrl: string | null
  memberType: string | null
  role: string | null
  verificationStatus: string | null
}

interface CurrentSubscription {
  type: string
  status: string | null
  end_date: string | null
  total_credits: number | null
  remaining_credits: number | null
}

interface ProfileDashboardProps {
  userId: string
  profile: ProfileSummary
  subscription: CurrentSubscription | null
  totalClasses: number
  streakWeeks: number
  checkins: CheckinHistoryItem[]
  subscriptionHistory: SubscriptionHistoryItem[]
}

function formatPlanName(type: string | undefined) {
  switch (type) {
    case 'monthly':
      return 'Monthly Card'
    case '5_times':
      return '5-Times Card'
    case '10_times':
      return '10-Times Card'
    default:
      return type || 'No active plan'
  }
}

function formatExpiryDate(value: string | null | undefined) {
  if (!value) return 'No expiry date'

  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  }).format(date)
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'UR'
}

export function ProfileDashboard({
  userId,
  profile,
  subscription,
  totalClasses,
  streakWeeks,
  checkins,
  subscriptionHistory,
}: ProfileDashboardProps) {
  const isMonthly = subscription?.type === 'monthly'
  const fallbackCredits =
    subscription?.type === '5_times' ? 5 : subscription?.type === '10_times' ? 10 : 0
  const totalCredits = subscription?.total_credits ?? fallbackCredits
  const remainingCredits = Math.max(subscription?.remaining_credits ?? 0, 0)
  const progress = subscription
    ? isMonthly
      ? 100
      : totalCredits > 0
        ? Math.min((remainingCredits / totalCredits) * 100, 100)
        : 0
    : 0
  const sessionsValue = isMonthly
    ? 'Unlimited'
    : subscription
      ? `${remainingCredits} / ${totalCredits}`
      : '—'
  const memberLabel = profile.memberType === 'student' ? 'Student' : 'Adult'
  const roleLabel = profile.role === 'admin' ? 'Admin' : 'Member'

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_20%_0%,rgba(176,175,221,0.10),transparent_45%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-lg space-y-3 px-4 pb-8 pt-6 sm:space-y-4 sm:pt-8">
        <header className="relative flex min-h-28 items-center gap-4 px-1 py-2 sm:px-2">
          <div className="relative shrink-0">
            <div
              className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-rookie-blue via-rookie-pink to-rookie-purple opacity-55 blur-md"
              aria-hidden="true"
            />
            <Avatar className="relative h-24 w-24 border-2 border-white/20 bg-card shadow-xl">
              <AvatarImage src={profile.avatarUrl || undefined} alt={profile.fullName} />
              <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink font-syne text-2xl text-white">
                {getInitials(profile.fullName)}
              </AvatarFallback>
            </Avatar>
            <AvatarUploadDialog>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-background bg-rookie-pink text-white shadow-lg transition-colors hover:bg-rookie-pink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Update profile picture"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
            </AvatarUploadDialog>
          </div>

          <div className="min-w-0 flex-1 pr-8">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate bg-gradient-to-r from-white via-rookie-pink to-rookie-blue bg-clip-text font-syne text-2xl font-bold text-transparent">
                {profile.fullName}
              </h1>
              {profile.verificationStatus === 'approved' && (
                <BadgeCheck className="h-4 w-4 shrink-0 text-rookie-pink" aria-label="Verified student" />
              )}
            </div>
            <p className="mt-1 font-outfit text-sm text-foreground/65">
              {memberLabel} <span aria-hidden="true">•</span> {roleLabel}
            </p>
          </div>

          <div className="pointer-events-none absolute right-1 top-1 text-rookie-blue" aria-hidden="true">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="pointer-events-none absolute right-5 top-11 text-rookie-pink" aria-hidden="true">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </header>

        <QRCodeDisplay userId={userId} userName={profile.fullName}>
          <button
            type="button"
            className="group relative flex min-h-24 w-full items-center gap-4 overflow-hidden rounded-2xl border border-rookie-blue/30 bg-gradient-to-br from-rookie-purple via-[#4a2b75] to-[#241437] p-4 text-left shadow-[0_16px_40px_rgba(31,18,54,0.28)] transition-colors hover:border-rookie-blue/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span
              className="absolute -right-12 -top-16 h-44 w-44 rounded-full border border-white/10"
              aria-hidden="true"
            />
            <span
              className="absolute -right-6 -top-10 h-36 w-36 rounded-full border border-white/10"
              aria-hidden="true"
            />
            <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white">
              <QrCode className="h-7 w-7" aria-hidden="true" />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="block font-syne text-base font-semibold text-white sm:text-lg">
                Show Member QR
              </span>
              <span className="mt-1 block font-outfit text-xs text-white/65 sm:text-sm">
                Tap for class check-in
              </span>
            </span>
            <ChevronRight
              className="relative h-5 w-5 shrink-0 text-white/75 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        </QRCodeDisplay>

        <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3">
          <span className="inline-flex shrink-0 rounded-md border border-white/15 bg-black px-2 py-1 font-syne text-[10px] font-bold tracking-wide text-white">
            TWINT
          </span>
          <p className="min-w-0 font-outfit text-sm text-foreground/65">
            Pay by TWINT: <span className="font-medium text-foreground">+41 76 722 49 78</span>
          </p>
        </div>

        <section aria-labelledby="current-plan-heading" className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <CreditCard className="h-4 w-4 text-rookie-pink" aria-hidden="true" />
            <h2 id="current-plan-heading" className="font-syne text-sm font-semibold text-foreground/85">
              Current Plan
            </h2>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rookie-blue to-rookie-purple text-white shadow-[0_8px_22px_rgba(83,49,135,0.22)]">
                <Zap className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="inline-flex rounded-full border border-success/35 bg-success/10 px-2 py-0.5 font-outfit text-[10px] font-semibold uppercase tracking-wide text-success">
                  {subscription?.status || 'Inactive'}
                </span>
                <h3 className="mt-1.5 truncate font-syne text-base font-semibold text-card-foreground">
                  {formatPlanName(subscription?.type)}
                </h3>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-outfit text-[10px] text-card-foreground/50">Sessions Left</p>
                <p className="mt-1 font-syne text-lg font-bold text-rookie-blue">{sessionsValue}</p>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-card-foreground/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rookie-blue via-rookie-pink to-rookie-purple transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-3">
              <p className="font-outfit text-xs text-card-foreground/50">
                {subscription ? `Valid until ${formatExpiryDate(subscription.end_date)}` : 'Pay per class'}
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Activity summary" className="grid grid-cols-2 gap-3">
          <article className="flex min-h-28 items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 sm:p-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400 ring-1 ring-inset ring-orange-400/20">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-outfit text-[11px] text-card-foreground/55">Total Classes</p>
              <p className="font-syne text-2xl font-bold text-card-foreground">{totalClasses}</p>
              <p className="font-outfit text-[10px] text-card-foreground/45">All time</p>
            </div>
          </article>

          <article className="flex min-h-28 items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 sm:p-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rookie-pink/15 text-rookie-pink ring-1 ring-inset ring-rookie-pink/20">
              <Heart className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-outfit text-[11px] text-card-foreground/55">Current Streak</p>
              <p className="font-syne text-2xl font-bold text-card-foreground">{streakWeeks}</p>
              <p className="font-outfit text-[10px] text-card-foreground/45">
                {streakWeeks > 0 ? 'Keep it going!' : 'Start this week'}
              </p>
            </div>
          </article>
        </section>

        <section aria-label="Account history" className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card">
          <CheckinHistoryDialog checkins={checkins}>
            <button
              type="button"
              className="group flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rookie-purple/15 text-rookie-blue">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-syne text-sm font-semibold text-card-foreground">Course History</span>
                <span className="mt-0.5 block font-outfit text-xs text-card-foreground/50">View your past classes</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-card-foreground/45 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </CheckinHistoryDialog>

          <SubscriptionHistoryDialog subscriptions={subscriptionHistory}>
            <button
              type="button"
              className="group flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rookie-purple/15 text-rookie-blue">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-syne text-sm font-semibold text-card-foreground">Subscription History</span>
                <span className="mt-0.5 block font-outfit text-xs text-card-foreground/50">View plans and payments</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-card-foreground/45 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </SubscriptionHistoryDialog>
        </section>
      </div>
    </main>
  )
}
