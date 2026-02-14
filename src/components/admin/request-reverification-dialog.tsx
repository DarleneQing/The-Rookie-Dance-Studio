'use client'

import { useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { requestStudentReVerification } from '@/app/admin/actions'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RefreshCw, Loader2 } from 'lucide-react'

interface RequestReVerificationDialogProps {
  userId: string
  userName: string
  children: React.ReactNode
}

export function RequestReVerificationDialog({
  userId,
  userName,
  children,
}: RequestReVerificationDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRequest = async () => {
    setLoading(true)
    try {
      const result = await requestStudentReVerification(userId, reason)
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        setReason('')
        startTransition(() => router.refresh())
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Failed to request re-verification')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Request Student Re-verification
          </DialogTitle>
          <DialogDescription>
            Request {userName} to re-upload their student card. They will see a notification on their profile page.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-white/90 font-outfit font-medium">
              Message to User (optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Your student verification has expired. Please upload a current student card to maintain your student status."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] bg-white/5 border-white/20 text-white placeholder:text-white/40"
              disabled={loading}
            />
            <p className="text-xs text-white/50 font-outfit">
              If left empty, a default message will be shown to the user.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRequest}
            disabled={loading}
            className="w-full sm:w-auto flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Request Re-verification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
