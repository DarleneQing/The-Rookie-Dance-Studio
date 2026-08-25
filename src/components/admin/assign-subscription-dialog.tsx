'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  assignUserSubscription,
  retryAboSaleRecord,
  type AboPaymentInput,
  type AboPriceLabel,
  type FinanceDestination,
  type FinancePaymentChannel,
} from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SUBSCRIPTION_PRICES, type SubscriptionType } from '@/lib/pricing'
import { getZurichToday } from '@/lib/utils/date-helpers'

interface AssignSubscriptionDialogProps {
  userId: string
  userName: string
  memberType: 'adult' | 'student' | null
  children: React.ReactNode
}

const DESTINATION_BY_CHANNEL: Record<FinancePaymentChannel, FinanceDestination> = {
  Cash: 'Cash Box',
  TWINT: 'Personal TWINT',
  Bank: 'Public Bank Account',
  Other: 'Other',
}

export function AssignSubscriptionDialog({
  userId,
  userName,
  memberType,
  children,
}: AssignSubscriptionDialogProps) {
  const router = useRouter()
  const today = getZurichToday()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [type, setType] = useState<SubscriptionType>('monthly')
  const [startDate, setStartDate] = useState(today)
  const [recordPayment, setRecordPayment] = useState(true)
  const [paymentDate, setPaymentDate] = useState(today)
  const [amount, setAmount] = useState('')
  const [priceLabel, setPriceLabel] = useState<AboPriceLabel>('N/A')
  const [paymentChannel, setPaymentChannel] = useState<FinancePaymentChannel>('TWINT')
  const [destination, setDestination] = useState<FinanceDestination>('Personal TWINT')
  const [pendingSubscriptionId, setPendingSubscriptionId] = useState<string | null>(null)
  const [financeMessage, setFinanceMessage] = useState<string | null>(null)
  const [financeSheetUrl, setFinanceSheetUrl] = useState<string | null>(null)

  useEffect(() => {
    if (memberType) setAmount(String(SUBSCRIPTION_PRICES[type][memberType]))
    else setAmount('')
  }, [memberType, type])

  const paymentInput = (): AboPaymentInput =>
    recordPayment
      ? {
          recordPayment: true,
          paymentDate,
          priceLabel,
          actualSaleAmount: Number(amount),
          paymentChannel,
          destination,
        }
      : { recordPayment: false }

  const resetFinanceState = () => {
    setPendingSubscriptionId(null)
    setFinanceMessage(null)
    setFinanceSheetUrl(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetFinanceState()
    setOpen(nextOpen)
  }

  const handleAssign = async () => {
    setLoading(true)
    try {
      const result = await assignUserSubscription(userId, type, startDate, paymentInput())
      if (!result.success) {
        toast.error(result.message)
        return
      }

      router.refresh()
      if (recordPayment && result.financeRecorded === false && result.subscriptionId) {
        setPendingSubscriptionId(result.subscriptionId)
        setFinanceMessage(result.financeMessage || 'Finance record is pending.')
        setFinanceSheetUrl(result.financeSheetUrl || null)
        toast.warning('Subscription assigned; finance record needs attention.')
        return
      }

      toast.success(result.financeMessage || result.message)
      setOpen(false)
      resetFinanceState()
    } catch {
      toast.error('Failed to assign subscription')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async () => {
    if (!pendingSubscriptionId || !recordPayment) return
    const payment = paymentInput()
    if (!payment.recordPayment) return

    setRetrying(true)
    try {
      const result = await retryAboSaleRecord(pendingSubscriptionId, payment)
      setFinanceMessage(result.financeMessage || result.message)
      setFinanceSheetUrl(result.financeSheetUrl || financeSheetUrl)

      if (result.financeRecorded) {
        toast.success(result.financeMessage)
        setOpen(false)
        resetFinanceState()
      } else {
        toast.warning('Finance record is still pending.')
      }
    } catch {
      toast.error('Failed to retry the finance record')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[88vh] w-[95vw] max-w-[480px] overflow-y-auto overflow-x-hidden px-4 sm:px-6">
        <DialogHeader>
          <DialogTitle>Assign Subscription</DialogTitle>
          <DialogDescription>
            Assign a new subscription to {userName}. Their current active subscription will be archived.
          </DialogDescription>
        </DialogHeader>

        {pendingSubscriptionId ? (
          <div className="space-y-4 py-3">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
              <p className="font-semibold">Subscription assigned</p>
              <p className="mt-1 text-amber-100/80">{financeMessage}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" onClick={handleRetry} disabled={retrying}>
                {retrying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Retry finance record
              </Button>
              {financeSheetUrl && (
                <Button type="button" variant="outline" asChild>
                  <a href={financeSheetUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Abo Sales
                  </a>
                </Button>
              )}
            </div>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Subscription Type</Label>
                <Select value={type} onValueChange={(value: SubscriptionType) => setType(value)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly Card</SelectItem>
                    <SelectItem value="5_times">5-Times Card</SelectItem>
                    <SelectItem value="10_times">10-Times Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === 'monthly' && (
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label>New Payment</Label>
                <div className="grid grid-cols-2 rounded-md border border-border/60 p-1">
                  <button
                    type="button"
                    onClick={() => setRecordPayment(true)}
                    className={`h-9 rounded-sm text-sm font-medium transition-colors ${
                      recordPayment ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-white/5'
                    }`}
                  >
                    Received
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordPayment(false)}
                    className={`h-9 rounded-sm text-sm font-medium transition-colors ${
                      !recordPayment ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-white/5'
                    }`}
                  >
                    No new payment
                  </button>
                </div>
              </div>

              {recordPayment && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="abo-payment-date">Payment Date</Label>
                      <Input
                        id="abo-payment-date"
                        type="date"
                        value={paymentDate}
                        onChange={(event) => setPaymentDate(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="abo-amount">Actual Amount (CHF)</Label>
                      <Input
                        id="abo-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="abo-channel">Payment Channel</Label>
                      <Select
                        value={paymentChannel}
                        onValueChange={(value: FinancePaymentChannel) => {
                          setPaymentChannel(value)
                          setDestination(DESTINATION_BY_CHANNEL[value])
                        }}
                      >
                        <SelectTrigger id="abo-channel"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="TWINT">TWINT</SelectItem>
                          <SelectItem value="Bank">Bank</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="abo-destination">Destination</Label>
                      <Select value={destination} onValueChange={(value: FinanceDestination) => setDestination(value)}>
                        <SelectTrigger id="abo-destination"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash Box">Cash Box</SelectItem>
                          <SelectItem value="Personal TWINT">Personal TWINT</SelectItem>
                          <SelectItem value="Public Bank Account">Public Bank Account</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="abo-price-label">Price Context</Label>
                    <Select value={priceLabel} onValueChange={(value: AboPriceLabel) => setPriceLabel(value)}>
                      <SelectTrigger id="abo-price-label"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="N/A">Standard</SelectItem>
                        <SelectItem value="Old Price">Old Price</SelectItem>
                        <SelectItem value="New Price">New Price</SelectItem>
                        <SelectItem value="Discount">Discount</SelectItem>
                        <SelectItem value="Special">Special</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={loading || (recordPayment && (!amount || Number(amount) <= 0))}
                className="w-full sm:w-auto"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Assigning...' : recordPayment ? 'Assign & Record' : 'Assign Only'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
