import type { ReactNode } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  GraduationCap,
  LifeBuoy,
  LockKeyhole,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  UserRound,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AvatarUploadDialog } from '@/components/profile/avatar-upload-dialog'
import { EditProfileDialog } from '@/components/profile/edit-profile-dialog'
import { StudentVerificationDialog } from '@/components/profile/student-verification-dialog'
import { LogoutButton } from '@/components/profile/logout-button'
import { FindUsDialog } from '@/components/legal/find-us-dialog'
import { SubscriptionPricingDialog } from '@/components/legal/subscription-pricing-dialog'

export interface SettingsProfile {
  fullName: string | null
  avatarUrl: string | null
  dateOfBirth: string | null
  phoneNumber: string | null
  memberType: string | null
  role: string | null
  verificationStatus: string | null
  rejectionReason: string | null
}

interface SettingsContentProps {
  email: string | null
  profile: SettingsProfile
}

const interactiveRowClassName =
  'flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
}) {
  const headingId = `settings-${title.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <section className="space-y-2.5" aria-labelledby={headingId}>
      <div className="flex items-center gap-2 px-1">
        <Icon className="h-4 w-4 text-rookie-blue" aria-hidden="true" />
        <h2 id={headingId} className="font-syne text-sm font-semibold text-foreground/90">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function SettingsPanel({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      {children}
    </div>
  )
}

function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rookie-purple/25 bg-rookie-purple/10 text-rookie-blue">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  )
}

function SettingsRowContent({
  icon,
  label,
  description,
  value,
  showChevron = false,
}: {
  icon: LucideIcon
  label: string
  description?: string
  value?: string
  showChevron?: boolean
}) {
  return (
    <>
      <RowIcon icon={icon} />
      <span className="min-w-0 flex-1">
        <span className="block font-outfit text-sm font-medium text-foreground/90">{label}</span>
        {description && (
          <span className="mt-0.5 block break-words font-outfit text-xs text-foreground/55">
            {description}
          </span>
        )}
      </span>
      {value && (
        <span className="shrink-0 font-outfit text-xs font-medium text-rookie-blue">
          {value}
        </span>
      )}
      {showChevron && <ChevronRight className="h-4 w-4 shrink-0 text-foreground/45" aria-hidden="true" />}
    </>
  )
}

function StaticSettingsRow({
  icon,
  label,
  description,
}: {
  icon: LucideIcon
  label: string
  description: string
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-3 py-2.5">
      <SettingsRowContent icon={icon} label={label} description={description} />
    </div>
  )
}

function VerificationStatus({ profile }: { profile: SettingsProfile }) {
  const status = profile.verificationStatus

  if (status === 'pending') {
    return (
      <div className="p-2">
        <div className="flex min-h-16 items-center gap-3 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-outfit text-sm font-semibold text-warning">Verification pending</span>
            <span className="block font-outfit text-xs text-warning/75">Your submission is under review.</span>
          </span>
          <span className="rounded-full bg-warning/15 px-2.5 py-1 font-outfit text-xs font-semibold text-warning">
            PENDING
          </span>
        </div>
      </div>
    )
  }

  if (status === 'approved' && profile.memberType === 'student') {
    return (
      <div className="p-2">
        <div className="flex min-h-16 items-center gap-3 rounded-xl border border-success/20 bg-success/10 px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-outfit text-sm font-semibold text-success">Student status verified</span>
            <span className="block font-outfit text-xs text-success/75">Your student status is confirmed.</span>
          </span>
          <span className="rounded-full bg-success/15 px-2.5 py-1 font-outfit text-xs font-semibold text-success">
            VERIFIED
          </span>
        </div>
      </div>
    )
  }

  if (status === 'none' || status === 'rejected' || status === 'reupload_required') {
    const needsAttention = status === 'rejected' || status === 'reupload_required'
    const title = status === 'reupload_required'
      ? 'Student verification required'
      : status === 'rejected'
        ? 'Verification rejected'
        : 'Verify student status'
    const description = needsAttention
      ? profile.rejectionReason || 'Upload a current student card to continue receiving student benefits.'
      : 'Upload your student card for discounted class pricing.'

    return (
      <div className="p-2">
        <StudentVerificationDialog currentStatus={status} rejectionReason={profile.rejectionReason}>
          <button
            type="button"
            className={needsAttention
              ? 'flex min-h-16 w-full items-center gap-3 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2.5 text-left transition-colors hover:bg-warning/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              : 'flex min-h-16 w-full items-center gap-3 rounded-xl border border-rookie-purple/20 bg-rookie-purple/10 px-3 py-2.5 text-left transition-colors hover:bg-rookie-purple/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'}
          >
            <span className={needsAttention
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning'
              : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rookie-purple/15 text-rookie-blue'}
            >
              {needsAttention
                ? <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                : <GraduationCap className="h-5 w-5" aria-hidden="true" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={needsAttention
                ? 'block font-outfit text-sm font-semibold text-warning'
                : 'block font-outfit text-sm font-semibold text-foreground'}
              >
                {title}
              </span>
              <span className="block font-outfit text-xs text-foreground/55">{description}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-foreground/45" aria-hidden="true" />
          </button>
        </StudentVerificationDialog>
      </div>
    )
  }

  return null
}

function formatMemberType(memberType: string | null) {
  return memberType
    ? memberType.charAt(0).toUpperCase() + memberType.slice(1)
    : 'Adult'
}

export function SettingsContent({ email, profile }: SettingsContentProps) {
  const userInitials = profile.fullName
    ? profile.fullName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'UR'
  const dateOfBirth = profile.dateOfBirth
    ? new Date(`${profile.dateOfBirth}T00:00:00`).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not provided'
  const memberType = formatMemberType(profile.memberType)
  const accountRole = profile.role === 'admin' ? 'Admin' : 'Member'
  const memberTypeDetail = profile.role === 'admin' ? `${memberType} · Admin` : memberType

  return (
    <main id="main-content" className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full border border-rookie-purple/10" />
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border border-rookie-pink/10" />
      <Sparkles className="pointer-events-none absolute right-7 top-8 h-5 w-5 text-rookie-purple" aria-hidden="true" />

      <div className="relative mx-auto max-w-xl space-y-6 px-4 pb-8 pt-7 sm:px-6">
        <header className="space-y-1 px-1 pb-1">
          <h1 className="font-syne text-3xl font-bold text-foreground">Settings</h1>
          <p className="font-outfit text-sm text-foreground/60">Manage your account and preferences</p>
        </header>

        <SettingsSection title="Profile" icon={UserRound}>
          <SettingsPanel>
            <div className="flex min-h-20 items-center gap-3 p-3">
              <div className="relative shrink-0">
                <Avatar className="h-14 w-14 border border-rookie-purple/35">
                  <AvatarImage src={profile.avatarUrl || undefined} alt={profile.fullName || 'Profile picture'} />
                  <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink font-syne text-sm text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <AvatarUploadDialog>
                  <button
                    type="button"
                    aria-label="Change profile picture"
                    className="absolute -bottom-3 -right-3 flex h-11 w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-rookie-purple text-white shadow-md">
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </button>
                </AvatarUploadDialog>
              </div>

              <EditProfileDialog
                currentFullName={profile.fullName}
                currentDob={profile.dateOfBirth}
                currentPhoneNumber={profile.phoneNumber}
              >
                <button
                  type="button"
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-syne text-base font-semibold text-foreground">
                      {profile.fullName || 'Complete your profile'}
                    </span>
                    <span className="mt-0.5 block font-outfit text-xs text-foreground/55">
                      {memberType} · {accountRole}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-foreground/45" aria-hidden="true" />
                </button>
              </EditProfileDialog>
            </div>
          </SettingsPanel>
        </SettingsSection>

        <SettingsSection title="Account & Status" icon={ShieldCheck}>
          <SettingsPanel>
            <VerificationStatus profile={profile} />
            <StaticSettingsRow icon={Mail} label="Email" description={email || 'Not provided'} />

            <EditProfileDialog currentFullName={profile.fullName} currentDob={profile.dateOfBirth} currentPhoneNumber={profile.phoneNumber}>
              <button type="button" className={interactiveRowClassName}>
                <SettingsRowContent icon={CalendarDays} label="Date of Birth" description={dateOfBirth} showChevron />
              </button>
            </EditProfileDialog>

            <EditProfileDialog currentFullName={profile.fullName} currentDob={profile.dateOfBirth} currentPhoneNumber={profile.phoneNumber}>
              <button type="button" className={interactiveRowClassName}>
                <SettingsRowContent icon={Phone} label="Phone Number" description={profile.phoneNumber || 'Not provided'} showChevron />
              </button>
            </EditProfileDialog>

            <StaticSettingsRow icon={GraduationCap} label="Member Type" description={memberTypeDetail} />
          </SettingsPanel>
        </SettingsSection>

        <SettingsSection title="Preferences" icon={SlidersHorizontal}>
          <SettingsPanel>
            <SubscriptionPricingDialog>
              <button type="button" className={interactiveRowClassName}>
                <SettingsRowContent icon={Tag} label="Subscription & Pricing" description="Class cards and offline payment" showChevron />
              </button>
            </SubscriptionPricingDialog>
          </SettingsPanel>
        </SettingsSection>

        <SettingsSection title="Support" icon={LifeBuoy}>
          <SettingsPanel>
            <Link href="/faq" className={interactiveRowClassName}>
              <SettingsRowContent icon={CircleHelp} label="Frequently Asked Questions" showChevron />
            </Link>
            <FindUsDialog>
              <button type="button" className={interactiveRowClassName}>
                <SettingsRowContent icon={MapPin} label="Find Us" description="Locations, contact and social media" showChevron />
              </button>
            </FindUsDialog>
            <Link href="/terms" className={interactiveRowClassName}>
              <SettingsRowContent icon={FileText} label="Terms and Conditions" showChevron />
            </Link>
            <Link href="/privacy" className={interactiveRowClassName}>
              <SettingsRowContent icon={LockKeyhole} label="Privacy Policy" showChevron />
            </Link>
          </SettingsPanel>
        </SettingsSection>

        <SettingsSection title="Account" icon={UserRound}>
          <SettingsPanel>
            <LogoutButton />
          </SettingsPanel>
        </SettingsSection>
      </div>
    </main>
  )
}
