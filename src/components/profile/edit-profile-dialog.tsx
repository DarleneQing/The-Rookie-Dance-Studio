'use client'

import { useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { updateProfileInfo } from '@/app/profile/actions'
import { useToggle } from '@/hooks/use-toggle'
import { usePhoneInputStyles } from '@/hooks/use-phone-input-styles'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

interface EditProfileDialogProps {
  currentFullName: string | null
  currentDob: string | null
  currentPhoneNumber?: string | null
  children: React.ReactNode
}

export function EditProfileDialog({
  currentFullName,
  currentDob,
  currentPhoneNumber,
  children,
}: EditProfileDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useToggle(false)
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(currentFullName || '')
  const [dob, setDob] = useState(currentDob || '')
  const [phoneNumber, setPhoneNumber] = useState(currentPhoneNumber || '')

  usePhoneInputStyles()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fullName.trim()) {
      toast.error('Full name is required')
      return
    }

    setLoading(true)

    try {
      const result = await updateProfileInfo({
        full_name: fullName,
        dob: dob || undefined,
        phone_number: phoneNumber || undefined,
      })

      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        startTransition(() => router.refresh())
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => setOpen(next)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl">Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-outfit text-white/90">
              Full Name
            </label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              disabled={loading}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="dob" className="text-sm font-outfit text-white/90">
              Date of Birth
            </label>
            <Input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              disabled={loading}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phoneNumber" className="text-sm font-outfit text-white/90">
              Phone Number (Optional)
            </label>
            <div className="rounded-md border border-white/10 bg-white/5">
              <PhoneInput
                international
                defaultCountry="CH"
                value={phoneNumber}
                onChange={(value) => setPhoneNumber(value || '')}
                className="phone-input-custom"
                numberInputProps={{
                  id: 'phoneNumber',
                  className: 'flex h-10 w-full rounded-md border-0 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                }}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-gradient-to-r from-rookie-purple to-rookie-pink hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
