'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { approveStudentVerification, rejectStudentVerification } from '@/app/admin/actions'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface VerificationDetailDialogProps {
  verification: {
    id: string
    full_name: string | null
    avatar_url: string | null
    dob: string | null
    student_card_url: string | null
    created_at: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
}

export function VerificationDetailDialog({
  verification,
  open,
  onOpenChange,
  onClose,
}: VerificationDetailDialogProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const router = useRouter()

  const getInitials = (name: string | null) => {
    if (!name) return 'UR'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleApprove = async () => {
    setLoading('approve')
    try {
      const result = await approveStudentVerification(verification.id)
      if (result.success) {
        toast.success(result.message)
        onClose()
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Failed to approve verification')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setLoading('reject')
    try {
      const result = await rejectStudentVerification(verification.id, rejectionReason)
      if (result.success) {
        toast.success(result.message)
        onClose()
        setRejectionReason('')
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Failed to reject verification')
    } finally {
      setLoading(null)
    }
  }

  const handleClose = () => {
    setRejectionReason('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Verification Review</DialogTitle>
          <DialogDescription>
            Review the student card submission and approve or reject the verification request.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* User Info */}
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <Avatar className="h-16 w-16">
              <AvatarImage src={verification.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne text-lg">
                {getInitials(verification.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-syne font-bold text-lg text-white">
                {verification.full_name || 'Unknown User'}
              </h3>
              {verification.dob && (
                <p className="font-outfit text-sm text-white/60 mt-1">
                  Date of Birth: {new Date(verification.dob).toLocaleDateString()}
                </p>
              )}
              <p className="font-outfit text-xs text-white/50 mt-1">
                Submitted: {new Date(verification.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Student Card Image */}
          {verification.student_card_url ? (
            <div className="space-y-2">
              <Label className="text-white/90 font-outfit font-medium">Student Card Image</Label>
              <div className="relative w-full rounded-lg overflow-hidden border border-white/20 bg-black/20">
                <img
                  src={verification.student_card_url}
                  alt="Student card"
                  className="w-full h-auto max-h-[500px] object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              <p className="text-red-400 font-outfit">No student card image available</p>
            </div>
          )}

          {/* Rejection Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="rejection-reason" className="text-white/90 font-outfit font-medium">
              Rejection Reason (required if rejecting)
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px] bg-white/5 border-white/20 text-white placeholder:text-white/40"
              disabled={loading !== null}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading !== null}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={loading !== null || !rejectionReason.trim()}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            {loading === 'reject' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                Reject
              </>
            )}
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading !== null}
            className="w-full sm:w-auto flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            {loading === 'approve' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

