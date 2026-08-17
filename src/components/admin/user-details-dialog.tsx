'use client'

import {
  CalendarDays,
  Cake,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import type { AdminUserRow } from '@/app/admin/actions'
import { AssignSubscriptionDialog } from '@/components/admin/assign-subscription-dialog'
import { RequestReVerificationDialog } from '@/components/admin/request-reverification-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatSubscriptionType } from '@/lib/utils/subscription-helpers'

interface UserDetailsDialogProps {
  user: AdminUserRow
  children: React.ReactNode
}

function formatProfileDate(value: string | null | undefined) {
  if (!value) return 'Not provided'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatRole(role: string) {
  if (!role) return 'Member'
  return role.charAt(0).toUpperCase() + role.slice(1).replaceAll('_', ' ')
}

function formatVerificationStatus(status: string | null) {
  if (!status) return 'Not requested'
  return status.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rookie-purple/15 text-rookie-blue">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-outfit text-xs text-card-foreground/45">{label}</span>
        <span className="mt-0.5 block font-outfit text-sm font-medium text-card-foreground">{value}</span>
      </span>
    </div>
  )
}

export function UserDetailsDialog({ user, children }: UserDetailsDialogProps) {
  const subscription = user.subscription
  const isTimesCard = subscription?.type === '5_times' || subscription?.type === '10_times'
  const totalCredits = subscription?.total_credits ?? (subscription?.type === '5_times' ? 5 : subscription?.type === '10_times' ? 10 : null)
  const remainingCredits = subscription?.remaining_credits ?? 0
  const creditProgress = totalCredits ? Math.max(0, Math.min(100, (remainingCredits / totalCredits) * 100)) : 0

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto rounded-2xl border-border/70 bg-popover p-0">
        <DialogHeader className="border-b border-border/50 px-5 pb-5 pt-6 text-left sm:px-6">
          <div className="flex items-center gap-3 pr-10">
            <Avatar className="h-14 w-14 border border-border/60">
              <AvatarImage src={user.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink font-syne font-semibold text-white">
                {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="truncate px-0 text-left font-syne text-xl font-bold leading-tight sm:pr-0">
                {user.full_name || 'Unnamed user'}
              </DialogTitle>
              <DialogDescription className="mt-1 text-left font-outfit">
                {user.member_type === 'student' ? 'Student member' : user.member_type === 'adult' ? 'Adult member' : 'Member profile'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-4 pb-5 sm:px-6 sm:pb-6">
          <section aria-labelledby={`account-details-${user.id}`}>
            <h3 id={`account-details-${user.id}`} className="mb-2 font-syne text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
              Account details
            </h3>
            <div className="divide-y divide-border/45 overflow-hidden rounded-2xl border border-border/60 bg-card">
              <DetailItem icon={ShieldCheck} label="Account role" value={formatRole(user.role)} />
              <DetailItem
                icon={UserRound}
                label="Member type"
                value={user.member_type === 'student' ? 'Student' : user.member_type === 'adult' ? 'Adult' : 'Not set'}
              />
              <DetailItem icon={Cake} label="Date of birth" value={formatProfileDate(user.dob)} />
              {user.member_type === 'student' && (
                <DetailItem
                  icon={GraduationCap}
                  label="Student verification"
                  value={formatVerificationStatus(user.verification_status)}
                />
              )}
            </div>
          </section>

          <section aria-labelledby={`subscription-details-${user.id}`}>
            <h3 id={`subscription-details-${user.id}`} className="mb-2 font-syne text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
              Subscription
            </h3>

            {subscription ? (
              <div className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rookie-purple/20 text-rookie-blue">
                    <CreditCard className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-syne text-base font-semibold text-card-foreground">
                        {formatSubscriptionType(subscription.type)}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2 py-1 font-outfit text-[10px] font-semibold uppercase tracking-wide text-success">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        {subscription.status}
                      </span>
                    </div>

                    {isTimesCard && totalCredits ? (
                      <div className="mt-3">
                        <div className="flex items-center justify-between font-outfit text-xs">
                          <span className="text-card-foreground/55">Sessions remaining</span>
                          <span className="font-semibold text-rookie-blue">
                            {remainingCredits} / {totalCredits}
                          </span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-rookie-blue to-rookie-pink"
                            style={{ width: `${creditProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/45 pt-3">
                        <div>
                          <p className="font-outfit text-[11px] text-card-foreground/45">Starts</p>
                          <p className="mt-0.5 font-outfit text-xs text-card-foreground">
                            {formatProfileDate(subscription.start_date)}
                          </p>
                        </div>
                        <div>
                          <p className="font-outfit text-[11px] text-card-foreground/45">Ends</p>
                          <p className="mt-0.5 font-outfit text-xs text-card-foreground">
                            {formatProfileDate(subscription.end_date)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 px-4 py-5 text-center">
                <CalendarDays className="mx-auto h-5 w-5 text-card-foreground/35" aria-hidden="true" />
                <p className="mt-2 font-outfit text-sm font-medium text-card-foreground">No active plan</p>
                <p className="mt-0.5 font-outfit text-xs text-card-foreground/45">Assign a plan when this member is ready.</p>
              </div>
            )}

            <AssignSubscriptionDialog userId={user.id} userName={user.full_name ?? 'User'}>
              <Button className="mt-3 h-11 w-full rounded-xl font-outfit">
                <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
                {subscription ? 'Replace Plan' : 'Assign Plan'}
              </Button>
            </AssignSubscriptionDialog>
          </section>

          {user.member_type === 'student' && user.verification_status === 'approved' && (
            <RequestReVerificationDialog userId={user.id} userName={user.full_name || 'User'}>
              <Button variant="outline" className="h-11 w-full rounded-xl border-warning/30 text-warning hover:bg-warning/10">
                <GraduationCap className="mr-2 h-4 w-4" aria-hidden="true" />
                Request Re-verification
              </Button>
            </RequestReVerificationDialog>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
