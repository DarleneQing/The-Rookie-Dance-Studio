'use client'

import { useState } from 'react'
import { assignUserSubscription } from '@/app/admin/actions'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select' // Need to create Select
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface AssignSubscriptionDialogProps {
  userId: string
  userName: string
  children: React.ReactNode
}

export function AssignSubscriptionDialog({
  userId,
  userName,
  children,
}: AssignSubscriptionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'monthly' | '5_times' | '10_times'>('monthly')
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0])

  const handleAssign = async () => {
    setLoading(true)
    try {
      const result = await assignUserSubscription(userId, type, startDate)
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Failed to assign subscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Subscription</DialogTitle>
          <DialogDescription>
            Assign a new subscription to {userName}. This will archive their current active subscription.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Subscription Type</Label>
            <Select value={type} onValueChange={(val: any) => setType(val)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Card</SelectItem>
                <SelectItem value="5_times">5-Times Card</SelectItem>
                <SelectItem value="10_times">10-Times Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === 'monthly' && (
            <div className="grid gap-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading}>
            {loading ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

