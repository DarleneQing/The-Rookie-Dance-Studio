'use client'

import { startTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserRound } from 'lucide-react'

import { updateProfileInfo } from '@/app/profile/actions'
import { useToggle } from '@/hooks/use-toggle'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const [nameError, setNameError] = useState<string | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setFullName(currentFullName || '')
      setDob(currentDob || '')
      setPhoneNumber(currentPhoneNumber || '')
      setNameError(null)
    }

    setOpen(nextOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fullName.trim()) {
      setNameError('Full name is required')
      return
    }
    setNameError(null)

    setLoading(true)

    try {
      const result = await updateProfileInfo({
        full_name: fullName.trim(),
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md gap-0 overflow-y-auto rounded-2xl border-border/60 bg-popover p-0 shadow-2xl">
        <DialogHeader className="border-b border-border/40 px-5 pb-4 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2 px-0 pr-12 font-syne text-xl leading-tight">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rookie-purple/15 text-rookie-blue">
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </span>
            Edit Profile
          </DialogTitle>
          <DialogDescription className="pl-10 font-outfit">
            Keep your personal details up to date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div className="space-y-2">
            <label htmlFor="fullName" className="font-outfit text-sm font-medium text-foreground">
              Full Name
            </label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                if (nameError) setNameError(null)
              }}
              placeholder="Enter your full name"
              disabled={loading}
              required
              maxLength={100}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'fullName-error' : undefined}
              className="h-11 rounded-xl border-border/60 bg-white/5 px-3 font-outfit text-foreground placeholder:text-foreground/60 focus-visible:ring-ring focus-visible:ring-offset-0"
            />
            {nameError && (
              <p id="fullName-error" role="alert" className="font-outfit text-sm text-destructive">
                {nameError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="dob" className="font-outfit text-sm font-medium text-foreground">
              Date of Birth
            </label>
            <Input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              disabled={loading}
              className="h-11 rounded-xl border-border/60 bg-white/5 px-3 font-outfit text-foreground focus-visible:ring-ring focus-visible:ring-offset-0"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phoneNumber" className="flex items-baseline justify-between gap-3 font-outfit text-sm font-medium text-foreground">
              <span>Phone Number</span>
              <span className="text-xs font-normal text-muted-foreground">Optional</span>
            </label>
            <div className="flex min-h-11 items-center rounded-xl border border-border/60 bg-white/5 px-3 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
              <PhoneInput
                international
                defaultCountry="CH"
                value={phoneNumber}
                onChange={(value) => setPhoneNumber(value || '')}
                disabled={loading}
                className="phone-input-custom"
                numberInputProps={{
                  id: 'phoneNumber',
                  'aria-label': 'Phone number',
                  className: 'h-11 w-full min-w-0 border-0 bg-transparent p-0 font-outfit text-sm text-foreground placeholder:text-foreground/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="h-11 rounded-xl border-border/70 bg-transparent font-outfit hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 rounded-xl bg-rookie-purple font-outfit text-white shadow-[0_8px_24px_rgba(83,49,135,0.2)] hover:bg-rookie-purple/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
