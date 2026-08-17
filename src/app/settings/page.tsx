import { redirect } from 'next/navigation'

import { MemberLayout } from '@/components/navigation/member-layout'
import { SettingsContent } from '@/components/settings/settings-content'
import { getCachedProfile, getCachedUser } from '@/lib/supabase/cached'

export default async function SettingsPage() {
  const user = await getCachedUser()

  if (!user) {
    return redirect('/login')
  }

  const profile = await getCachedProfile(user.id)

  if (!profile) {
    return redirect('/login')
  }

  return (
    <MemberLayout>
      <SettingsContent
        email={user.email || null}
        profile={{
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          dateOfBirth: profile.dob,
          phoneNumber: profile.phone_number,
          memberType: profile.member_type,
          role: profile.role,
          verificationStatus: profile.verification_status,
          rejectionReason: profile.rejection_reason,
        }}
      />
    </MemberLayout>
  )
}
