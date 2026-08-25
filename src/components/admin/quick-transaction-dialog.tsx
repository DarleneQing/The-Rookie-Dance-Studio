'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, ReceiptText } from 'lucide-react'
import { toast } from 'sonner'

import {
  recordOtherTransaction,
  type FinanceCustodyStatus,
  type FinanceDestination,
  type FinancePaymentChannel,
  type QuickTransactionCategory,
} from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea'
import { getZurichToday } from '@/lib/utils/date-helpers'

interface QuickTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const INCOME_CATEGORIES: QuickTransactionCategory[] = ['Donation', 'Sponsorship', 'Other']
const EXPENSE_CATEGORIES: QuickTransactionCategory[] = ['Instructor', 'Venue', 'Admin', 'Refund', 'Other']

const DESTINATION_BY_CHANNEL: Record<FinancePaymentChannel, FinanceDestination> = {
  Cash: 'Cash Box',
  TWINT: 'Personal TWINT',
  Bank: 'Public Bank Account',
  Other: 'Other',
}

function newTransactionId() {
  return `TXN-${window.crypto.randomUUID()}`
}

export function QuickTransactionDialog({ open, onOpenChange }: QuickTransactionDialogProps) {
  const today = getZurichToday()
  const [transactionId, setTransactionId] = useState('')
  const [direction, setDirection] = useState<'income' | 'expense'>('income')
  const [category, setCategory] = useState<QuickTransactionCategory>('Donation')
  const [transactionDate, setTransactionDate] = useState(today)
  const [serviceDate, setServiceDate] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentChannel, setPaymentChannel] = useState<FinancePaymentChannel>('TWINT')
  const [destination, setDestination] = useState<FinanceDestination>('Personal TWINT')
  const [custodyStatus, setCustodyStatus] = useState<FinanceCustodyStatus>('Not Needed')
  const [receiptLink, setReceiptLink] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)

  useEffect(() => {
    if (open && !transactionId) setTransactionId(newTransactionId())
  }, [open, transactionId])

  const reset = () => {
    setTransactionId('')
    setDirection('income')
    setCategory('Donation')
    setTransactionDate(getZurichToday())
    setServiceDate('')
    setDescription('')
    setAmount('')
    setPaymentChannel('TWINT')
    setDestination('Personal TWINT')
    setCustodyStatus('Not Needed')
    setReceiptLink('')
    setNotes('')
    setErrorMessage(null)
    setSheetUrl(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleDirectionChange = (nextDirection: 'income' | 'expense') => {
    setDirection(nextDirection)
    setCategory(nextDirection === 'income' ? 'Donation' : 'Instructor')
    setCustodyStatus('Not Needed')
    setErrorMessage(null)
  }

  const handleSubmit = async () => {
    if (!transactionId) return
    setLoading(true)
    setErrorMessage(null)

    try {
      const result = await recordOtherTransaction({
        transactionId,
        transactionDate,
        serviceDate: serviceDate || undefined,
        direction,
        category,
        description,
        amount: Number(amount),
        paymentChannel,
        destination,
        receiptLink: receiptLink || undefined,
        custodyStatus,
        notes: notes || undefined,
      })

      if (!result.success) {
        setErrorMessage(result.message)
        setSheetUrl(result.sheetUrl || null)
        return
      }

      toast.success(result.message)
      handleOpenChange(false)
    } catch {
      setErrorMessage('The transaction could not be recorded. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const categories = direction === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-[520px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Transaction</DialogTitle>
          <DialogDescription>
            Add one confirmed income or expense for account review and audit.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3">
          <div className="grid gap-2">
            <Label>Direction</Label>
            <div className="grid grid-cols-2 rounded-md border border-border/60 p-1">
              {(['income', 'expense'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleDirectionChange(value)}
                  className={`h-9 rounded-sm text-sm font-medium capitalize transition-colors ${
                    direction === value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground/70 hover:bg-white/5'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="transaction-category">Category</Label>
              <Select value={category} onValueChange={(value: QuickTransactionCategory) => setCategory(value)}>
                <SelectTrigger id="transaction-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((value) => (
                    <SelectItem key={value} value={value}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transaction-date">Transaction Date</Label>
              <Input
                id="transaction-date"
                type="date"
                value={transactionDate}
                onChange={(event) => setTransactionDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transaction-description">Description</Label>
            <Input
              id="transaction-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={direction === 'income' ? 'What was received?' : 'What was paid for?'}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="transaction-amount">Actual Amount (CHF)</Label>
              <Input
                id="transaction-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transaction-channel">Payment Channel</Label>
              <Select
                value={paymentChannel}
                onValueChange={(value: FinancePaymentChannel) => {
                  setPaymentChannel(value)
                  setDestination(DESTINATION_BY_CHANNEL[value])
                }}
              >
                <SelectTrigger id="transaction-channel"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="TWINT">TWINT</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="transaction-destination">Destination</Label>
              <Select value={destination} onValueChange={(value: FinanceDestination) => setDestination(value)}>
                <SelectTrigger id="transaction-destination"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash Box">Cash Box</SelectItem>
                  <SelectItem value="Personal TWINT">Personal TWINT</SelectItem>
                  <SelectItem value="Public Bank Account">Public Bank Account</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transaction-custody">Custody / Reimbursement</Label>
              <Select value={custodyStatus} onValueChange={(value: FinanceCustodyStatus) => setCustodyStatus(value)}>
                <SelectTrigger id="transaction-custody"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Needed">Not Needed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Holding Cash">Holding Cash</SelectItem>
                  <SelectItem value="Reimbursed">Reimbursed</SelectItem>
                  <SelectItem value="Transferred">Transferred</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="service-date">Service Date (optional)</Label>
              <Input
                id="service-date"
                type="date"
                value={serviceDate}
                onChange={(event) => setServiceDate(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receipt-link">Receipt Link (optional)</Label>
              <Input
                id="receipt-link"
                type="url"
                value={receiptLink}
                onChange={(event) => setReceiptLink(event.target.value)}
                placeholder="https://"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transaction-notes">Notes (optional)</Label>
            <Textarea
              id="transaction-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 resize-y"
            />
          </div>

          {errorMessage && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm" role="alert">
              <p className="text-destructive">{errorMessage}</p>
              {sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-semibold text-foreground underline underline-offset-4"
                >
                  Open Other Transactions manually
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !transactionId || !description.trim() || !amount || Number(amount) <= 0}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ReceiptText className="mr-2 h-4 w-4" />}
            {loading ? 'Recording...' : 'Record Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
