import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  QrCode,
  Sparkles,
  Users,
} from 'lucide-react'

import { ActiveSubscriptionsDialog } from '@/components/admin/active-subscriptions-dialog'
import { CourseQRScanner } from '@/components/admin/scanner/course-qr-scanner'
import { TodayCheckinsDialog, type TodayCheckinItem } from '@/components/admin/today-checkins-dialog'
import { UserStatsDialog } from '@/components/admin/user-stats-dialog'
import { LogoutButton } from '@/components/profile/logout-button'
import type { CourseWithBookingCount } from '@/types/courses'

const CheckinsFinanceCard = dynamic(
  () =>
    import('@/components/admin/checkins-finance-card').then((module) => ({
      default: module.CheckinsFinanceCard,
    })),
  {
    ssr: false,
    loading: () => <div className="h-40 animate-pulse rounded-2xl bg-white/5" />,
  },
)

interface AdminDashboardStats {
  totalUsers: number
  activeSubscriptions: number
  todayCheckins: number
  pendingVerifications: number
  adultMembers: number
  studentMembers: number
  monthlySubscriptions: number
  fiveTimesSubscriptions: number
  tenTimesSubscriptions: number
}

interface AdminDashboardProps {
  stats: AdminDashboardStats
  todayCheckins: TodayCheckinItem[]
  todaysCourses: CourseWithBookingCount[]
}

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: number
  caption: string
  iconClassName: string
}

interface QuickActionContentProps {
  icon: LucideIcon
  label: string
  description: string
  iconClassName: string
  badge?: number
}

const quickActionClassName =
  'group flex min-h-[68px] w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:border-border hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

function MetricCard({ icon: Icon, label, value, caption, iconClassName }: MetricCardProps) {
  return (
    <button
      type="button"
      className="flex min-h-[108px] min-w-0 w-full flex-col items-start rounded-xl border border-border/60 bg-card p-2.5 text-left shadow-lg transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-32 sm:rounded-2xl sm:p-4"
      aria-label={`${label}: ${value}. ${caption}`}
    >
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${iconClassName}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="mt-2 block w-full truncate font-outfit text-[10px] text-card-foreground/60 sm:text-xs">{label}</span>
      <span className="mt-0.5 font-syne text-xl font-bold text-card-foreground sm:text-2xl">{value}</span>
      <span className="mt-auto pt-1 font-outfit text-[10px] leading-tight text-success max-[419px]:hidden sm:text-[11px]">{caption}</span>
    </button>
  )
}

function QuickActionContent({
  icon: Icon,
  label,
  description,
  iconClassName,
  badge,
}: QuickActionContentProps) {
  return (
    <>
      <span className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {!!badge && badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 font-outfit text-[10px] font-bold text-destructive-foreground">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-syne text-sm font-semibold text-card-foreground">{label}</span>
        <span className="mt-0.5 block truncate font-outfit text-xs text-card-foreground/50">{description}</span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-card-foreground/45 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </>
  )
}

export function AdminDashboard({ stats, todayCheckins, todaysCourses }: AdminDashboardProps) {
  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_75%_5%,rgba(176,175,221,0.10),transparent_45%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-10">
        <header className="flex min-h-14 items-center gap-2 border-b border-border/40">
          <LayoutDashboard className="h-4 w-4 text-rookie-blue" aria-hidden="true" />
          <h1 className="font-syne text-sm font-semibold text-foreground">Dashboard</h1>
        </header>

        <section className="relative min-h-60 overflow-hidden py-8 sm:min-h-72 sm:py-10" aria-labelledby="admin-welcome-heading">
          <div className="relative z-10 max-w-[48%] sm:max-w-sm">
            <p className="font-outfit text-sm text-foreground/60">Welcome back,</p>
            <h2 id="admin-welcome-heading" className="mt-1 font-syne text-3xl font-bold text-foreground sm:text-4xl">
              Admin
            </h2>
            <p className="mt-3 hidden max-w-xs font-outfit text-sm leading-relaxed text-foreground/55 sm:block">
              Your studio operations at a glance.
            </p>
          </div>

          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-[62%] max-w-[340px] overflow-hidden [mask-image:linear-gradient(to_left,black_82%,transparent_100%)] sm:w-1/2 sm:max-w-[380px]"
            aria-hidden="true"
          >
            <Image
              src="/assets/pose1.png"
              alt=""
              fill
              sizes="(max-width: 640px) 62vw, 380px"
              className="scale-[1.22] object-contain object-center opacity-90 sm:scale-[1.18]"
              priority
            />
          </div>
          <Sparkles className="pointer-events-none absolute bottom-7 left-2 h-6 w-6 text-rookie-purple" aria-hidden="true" />
          <Sparkles className="pointer-events-none absolute bottom-12 left-16 h-4 w-4 text-rookie-blue" aria-hidden="true" />
        </section>

        <section aria-label="Studio metrics" className="grid grid-cols-4 gap-2 sm:gap-3">
          <UserStatsDialog adultCount={stats.adultMembers} studentCount={stats.studentMembers}>
            <MetricCard
              icon={Users}
              label="Users"
              value={stats.totalUsers}
              caption={`${stats.studentMembers} students`}
              iconClassName="bg-rookie-purple/20 text-rookie-blue"
            />
          </UserStatsDialog>

          <ActiveSubscriptionsDialog
            monthlyCount={stats.monthlySubscriptions}
            fiveTimesCount={stats.fiveTimesSubscriptions}
            tenTimesCount={stats.tenTimesSubscriptions}
          >
            <MetricCard
              icon={CreditCard}
              label="Active Plans"
              value={stats.activeSubscriptions}
              caption={`${stats.monthlySubscriptions} monthly`}
              iconClassName="bg-blue-500/15 text-blue-300"
            />
          </ActiveSubscriptionsDialog>

          <TodayCheckinsDialog checkins={todayCheckins}>
            <MetricCard
              icon={ClipboardCheck}
              label="Check-ins"
              value={stats.todayCheckins}
              caption="Recorded today"
              iconClassName="bg-rookie-pink/15 text-rookie-pink"
            />
          </TodayCheckinsDialog>

          <Link
            href="/admin/verifications"
            className="flex min-h-[108px] min-w-0 w-full flex-col items-start rounded-xl border border-border/60 bg-card p-2.5 text-left shadow-lg transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-32 sm:rounded-2xl sm:p-4"
            aria-label={`${stats.pendingVerifications} pending student verifications`}
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300 sm:h-8 sm:w-8">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="mt-2 block w-full truncate font-outfit text-[10px] text-card-foreground/60 sm:text-xs">Pending Reviews</span>
            <span className="mt-0.5 font-syne text-xl font-bold text-card-foreground sm:text-2xl">{stats.pendingVerifications}</span>
            <span className="mt-auto pt-1 font-outfit text-[10px] leading-tight text-amber-300 max-[419px]:hidden sm:text-[11px]">Needs review</span>
          </Link>
        </section>

        <section aria-labelledby="quick-actions-heading" className="mt-8">
          <h2 id="quick-actions-heading" className="mb-3 font-syne text-base font-semibold text-foreground">
            Quick Actions
          </h2>

          <div className="grid gap-2.5 md:grid-cols-2">
            <CourseQRScanner todaysCourses={todaysCourses}>
              <button type="button" className={quickActionClassName}>
                <QuickActionContent
                  icon={QrCode}
                  label="Check-in Scanner"
                  description="Scan member QR codes"
                  iconClassName="bg-rookie-pink/15 text-rookie-pink"
                />
              </button>
            </CourseQRScanner>

            <Link href="/admin/users" className={quickActionClassName}>
              <QuickActionContent
                icon={Users}
                label="User Management"
                description="Members and account status"
                iconClassName="bg-rookie-purple/20 text-rookie-blue"
              />
            </Link>

            <Link href="/admin/courses" className={quickActionClassName}>
              <QuickActionContent
                icon={CalendarDays}
                label="Course Management"
                description="Schedule courses and attendance"
                iconClassName="bg-blue-500/15 text-blue-300"
              />
            </Link>

            <Link href="/admin/verifications" className={quickActionClassName}>
              <QuickActionContent
                icon={GraduationCap}
                label="Student Verifications"
                description="Review student status requests"
                iconClassName="bg-amber-500/15 text-amber-300"
                badge={stats.pendingVerifications}
              />
            </Link>

            <details className="group/details md:col-span-2">
              <summary className={`${quickActionClassName} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                <QuickActionContent
                  icon={CircleDollarSign}
                  label="Finance & Reports"
                  description="Daily check-ins and summaries"
                  iconClassName="bg-success/15 text-success"
                />
              </summary>
              <div className="mt-3">
                <CheckinsFinanceCard />
              </div>
            </details>
          </div>
        </section>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card">
          <LogoutButton />
        </div>
      </div>
    </main>
  )
}
