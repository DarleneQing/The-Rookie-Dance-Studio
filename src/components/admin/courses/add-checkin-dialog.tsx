'use client'

import { useState, useEffect, useCallback } from 'react'
import { searchUsers, manualCheckin } from '@/app/admin/courses/actions'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Search, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaymentMethod } from '@/types/courses'

interface AddCheckinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  onSuccess: () => void
}

export function AddCheckinDialog({
  open,
  onOpenChange,
  courseId,
  onSuccess,
}: AddCheckinDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ id: string; full_name: string; avatar_url: string | null } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const data = await searchUsers(q)
    setResults(data)
    setSearching(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setSelectedUser(null)
      setPaymentMethod(null)
    }
  }, [open])

  const handleConfirm = async () => {
    if (!selectedUser || !paymentMethod) return

    setSubmitting(true)
    try {
      const result = await manualCheckin(selectedUser.id, courseId, paymentMethod)
      if (result.success) {
        toast.success(`${selectedUser.full_name} checked in successfully`)
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Failed to add check-in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Check-in
          </DialogTitle>
          <DialogDescription>
            Search for a user to manually add a check-in record.
          </DialogDescription>
        </DialogHeader>

        {!selectedUser ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                placeholder="Search by name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {searching ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-white/50" />
                </div>
              ) : results.length > 0 ? (
                results.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne text-xs">
                        {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-outfit text-sm text-white">{user.full_name}</span>
                  </button>
                ))
              ) : query.length >= 2 ? (
                <p className="text-center py-6 text-white/50 font-outfit text-sm">No users found</p>
              ) : (
                <p className="text-center py-6 text-white/50 font-outfit text-sm">Type at least 2 characters to search</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected user */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedUser.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne">
                  {selectedUser.full_name?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-syne font-semibold text-white">{selectedUser.full_name}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
                className="text-white/50 hover:text-white text-xs"
              >
                Change
              </Button>
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <span className="text-white/80 font-outfit text-sm font-semibold">Payment Method</span>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'twint', 'abo'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'px-4 py-2 rounded-lg border transition-all font-outfit text-sm font-semibold',
                      paymentMethod === method
                        ? 'bg-primary text-primary-foreground border-transparent'
                        : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {method === 'cash' ? 'Cash' : method === 'twint' ? 'TWINT' : 'Abo'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          {selectedUser && (
            <Button
              onClick={handleConfirm}
              disabled={submitting || !paymentMethod}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Check-in'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
