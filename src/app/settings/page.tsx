import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MemberLayout } from '@/components/navigation/member-layout'
import { FloatingElementsLazy } from '@/components/auth/floating-elements-lazy'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AvatarUploadDialog } from '@/components/profile/avatar-upload-dialog'
import { EditProfileDialog } from '@/components/profile/edit-profile-dialog'
import { StudentVerificationDialog } from '@/components/profile/student-verification-dialog'
import { LogoutButton } from '@/components/profile/logout-button'
import { FindUsDialog } from '@/components/legal/find-us-dialog'
import { 
  User, 
  Mail, 
  Calendar, 
  GraduationCap, 
  Pencil,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin
} from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return redirect('/login')
  }

  const userInitials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'UR'

  return (
    <MemberLayout>
      <main className="relative min-h-screen overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0 bg-black" />

        {/* Floating decorative elements */}
        <FloatingElementsLazy />

        {/* Content */}
        <div className="relative z-10 container max-w-lg mx-auto pt-8 pb-8 px-4 space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="font-syne font-bold text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple px-2">
              Settings
            </h2>
            <p className="text-white/70 font-outfit text-sm mt-2 px-2">
              Manage your profile and preferences
            </p>
          </div>

          {/* Re-verification Required Banner */}
          {profile.verification_status === 'reupload_required' && (
            <div className="bg-orange-500/10 backdrop-blur-sm rounded-3xl p-4 border border-orange-500/20 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="bg-orange-500/20 rounded-full p-2 flex-shrink-0 mt-0.5">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-syne font-semibold text-orange-300 text-lg">
                    Student Verification Required
                  </h3>
                  <p className="font-outfit text-orange-200/80 text-sm mt-1">
                    {profile.rejection_reason || 'Please upload a current student card to maintain your student status.'}
                  </p>
                  <StudentVerificationDialog
                    currentStatus="reupload_required"
                    rejectionReason={profile.rejection_reason}
                  >
                    <button className="mt-3 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-outfit font-medium text-sm px-4 py-2 rounded-full transition-colors">
                      <GraduationCap className="h-4 w-4" />
                      Upload Student Card
                    </button>
                  </StudentVerificationDialog>
                </div>
              </div>
            </div>
          )}

          {/* Profile Section */}
          <div className="space-y-4">
            <h3 className="font-syne font-semibold text-white/90 text-lg px-2">Profile</h3>

            {/* Avatar */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {/* Gradient Ring */}
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-rookie-purple via-rookie-pink to-rookie-blue opacity-60 blur-sm" />
                  <Avatar className="relative h-20 w-20 border-4 border-transparent">
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                    <AvatarFallback className="text-xl bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Edit Icon */}
                  <AvatarUploadDialog>
                    <button className="absolute bottom-0 right-0 bg-rookie-pink rounded-md p-1.5 border border-white/30 shadow-md hover:scale-110 transition-transform">
                      <Pencil className="h-3 w-3 text-white" />
                    </button>
                  </AvatarUploadDialog>
                </div>
                <div className="flex-1">
                  <p className="text-white/60 font-outfit text-xs mb-1">Profile Picture</p>
                  <p className="text-white font-outfit text-sm">Click the pencil icon to change</p>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-lg space-y-4">
              {/* Full Name */}
              <div className="flex items-start gap-3">
                <div className="bg-white/10 rounded-full p-2 mt-0.5">
                  <User className="h-4 w-4 text-white/60" />
                </div>
                <div className="flex-1">
                  <p className="text-white/60 font-outfit text-xs mb-1">Full Name</p>
                  <p className="text-white font-syne font-semibold">{profile.full_name || '—'}</p>
                </div>
                <EditProfileDialog
                  currentFullName={profile.full_name}
                  currentDob={profile.dob}
                >
                  <button className="bg-rookie-pink rounded-md p-2 border border-white/30 shadow-md hover:scale-110 transition-transform mt-0.5">
                    <Pencil className="h-4 w-4 text-white" />
                  </button>
                </EditProfileDialog>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="bg-white/10 rounded-full p-2 mt-0.5">
                  <Mail className="h-4 w-4 text-white/60" />
                </div>
                <div className="flex-1">
                  <p className="text-white/60 font-outfit text-xs mb-1">Email</p>
                  <p className="text-white font-outfit text-sm">{user.email || '—'}</p>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="flex items-start gap-3">
                <div className="bg-white/10 rounded-full p-2 mt-0.5">
                  <Calendar className="h-4 w-4 text-white/60" />
                </div>
                <div className="flex-1">
                  <p className="text-white/60 font-outfit text-xs mb-1">Date of Birth</p>
                  <p className="text-white font-outfit text-sm">
                    {profile.dob
                      ? new Date(profile.dob as string).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Member Type */}
              <div className="flex items-start gap-3">
                <div className="bg-white/10 rounded-full p-2 mt-0.5">
                  <GraduationCap className="h-4 w-4 text-white/60" />
                </div>
                <div className="flex-1">
                  <p className="text-white/60 font-outfit text-xs mb-1">Member Type</p>
                  <p className="text-white font-outfit text-sm capitalize">
                    {profile.member_type || 'Adult'}
                    {profile.role === 'admin' && ' • Admin'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Student Verification Section */}
          <div className="space-y-4">
            <h3 className="font-syne font-semibold text-white/90 text-lg px-2">Student Status</h3>

            {profile.verification_status === 'none' || profile.verification_status === 'rejected' ? (
              <StudentVerificationDialog
                currentStatus={profile.verification_status || 'none'}
                rejectionReason={profile.rejection_reason}
              >
                <button className="w-full bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/20 shadow-lg flex items-center justify-between hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 rounded-full p-2">
                      <GraduationCap className="h-5 w-5 text-white/60" />
                    </div>
                    <div className="text-left">
                      <p className="font-outfit text-white/90 font-medium">Verify as Student</p>
                      <p className="text-xs text-white/60 font-outfit">Upload student card for verification</p>
                    </div>
                  </div>
                  <Pencil className="h-4 w-4 text-white/60" />
                </button>
              </StudentVerificationDialog>
            ) : profile.verification_status === 'pending' ? (
              <div className="w-full bg-yellow-500/10 backdrop-blur-sm rounded-3xl p-4 border border-yellow-500/20 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500/20 rounded-full p-2">
                    <Clock className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-outfit text-yellow-300 font-medium">Verification Pending</p>
                    <p className="text-xs text-yellow-400/80 font-outfit">Your submission is under review</p>
                  </div>
                </div>
                <div className="bg-yellow-500/20 rounded-full px-3 py-1">
                  <span className="text-xs font-outfit text-yellow-300 font-semibold">PENDING</span>
                </div>
              </div>
            ) : profile.verification_status === 'approved' && profile.member_type === 'student' ? (
              <div className="w-full bg-green-500/10 backdrop-blur-sm rounded-3xl p-4 border border-green-500/20 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 rounded-full p-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-outfit text-green-300 font-medium">Student Status Verified</p>
                    <p className="text-xs text-green-400/80 font-outfit">Your student status is confirmed</p>
                  </div>
                </div>
                <div className="bg-green-500/20 rounded-full px-3 py-1">
                  <span className="text-xs font-outfit text-green-300 font-semibold">VERIFIED</span>
                </div>
              </div>
            ) : profile.verification_status === 'reupload_required' ? (
              <StudentVerificationDialog
                currentStatus="reupload_required"
                rejectionReason={profile.rejection_reason}
              >
                <button className="w-full bg-orange-500/10 backdrop-blur-sm rounded-3xl p-4 border border-orange-500/20 shadow-lg flex items-center justify-between hover:bg-orange-500/15 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500/20 rounded-full p-2">
                      <GraduationCap className="h-5 w-5 text-orange-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-outfit text-orange-300 font-medium">Re-upload Student Card</p>
                      <p className="text-xs text-orange-400/80 font-outfit">Action required</p>
                    </div>
                  </div>
                  <Pencil className="h-4 w-4 text-orange-400" />
                </button>
              </StudentVerificationDialog>
            ) : null}
          </div>

          {/* FAQ */}
          <a
            href="/faq"
            className="w-full bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/20 shadow-lg flex items-center justify-between hover:bg-white/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-full p-2">
                <svg className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-outfit text-white/90 font-medium">Frequently Asked Questions</p>
              </div>
            </div>
            <svg className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* Find Us */}
          <FindUsDialog>
            <button
              type="button"
              className="w-full bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/20 shadow-lg flex items-center justify-between hover:bg-white/15 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/10 rounded-full p-2">
                  <MapPin className="h-5 w-5 text-white/60" />
                </div>
                <div className="text-left">
                  <p className="font-outfit text-white/90 font-medium">Find Us</p>
                  <p className="font-outfit text-xs text-white/60">Location, contact & social media</p>
                </div>
              </div>
              <svg className="h-5 w-5 text-white/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </FindUsDialog>

          {/* Terms and Conditions */}
          <a
            href="/terms"
            className="w-full bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/20 shadow-lg flex items-center justify-between hover:bg-white/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-full p-2">
                <svg className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-outfit text-white/90 font-medium">Terms and Conditions</p>
              </div>
            </div>
            <svg className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* Privacy Policy */}
          <a
            href="/privacy"
            className="w-full bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/20 shadow-lg flex items-center justify-between hover:bg-white/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-full p-2">
                <svg className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-outfit text-white/90 font-medium">Privacy Policy</p>
              </div>
            </div>
            <svg className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* Account Actions */}
          <div className="space-y-4">
            <h3 className="font-syne font-semibold text-white/90 text-lg px-2">Account</h3>
            
            <LogoutButton />
          </div>
        </div>
      </main>
    </MemberLayout>
  )
}
