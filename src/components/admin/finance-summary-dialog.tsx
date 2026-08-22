"use client"

import React, { useState } from "react"
import { ClipboardCheck, ExternalLink, Loader2, RefreshCw } from "lucide-react"

import {
  createOrRefreshFinanceCloseout,
  type FinanceCloseoutActionResult,
  type FinanceCourseItem,
} from "@/app/admin/actions"
import type { CheckinFinanceItem } from "@/components/admin/checkins-finance-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { calculateClassFinance } from "@/lib/finance/calculate-class-finance"
import { SINGLE_CLASS_PRICE } from "@/lib/pricing"

interface FinanceSummaryDialogProps {
  checkins: CheckinFinanceItem[]
  course: FinanceCourseItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FinanceSummaryDialog({
  checkins,
  course,
  open,
  onOpenChange,
}: FinanceSummaryDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<FinanceCloseoutActionResult | null>(null)
  const finance = calculateClassFinance(checkins)
  const adultCount = finance.adultCashCount + finance.adultTwintCount
  const studentCount = finance.studentCashCount + finance.studentTwintCount

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmOpen(false)
      setResult(null)
    }
    onOpenChange(nextOpen)
  }

  const handleCreateSnapshot = async () => {
    setSubmitting(true)
    setResult(null)

    try {
      const actionResult = await createOrRefreshFinanceCloseout(course.id)
      setResult(actionResult)
      if (actionResult.success) setConfirmOpen(false)
    } catch (error) {
      console.error("Finance closeout error:", error)
      setResult({ success: false, message: "The finance row could not be updated. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85vh] w-[95vw] max-w-[480px] overflow-y-auto border-border/60 bg-popover backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-syne text-white">
              Finance Summary
            </DialogTitle>
            <DialogDescription className="font-outfit text-foreground/65">
              {course.scheduled_date} · {course.start_time.slice(0, 5)} · {course.dance_style}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <section>
              <h3 className="mb-3 font-syne text-sm font-semibold uppercase text-foreground/90">
                By Member Type
              </h3>
              <div className="space-y-2 font-outfit text-sm text-foreground/90">
                <div className="flex justify-between gap-4">
                  <span>Adult</span>
                  <span className="text-right">
                    {adultCount} × {SINGLE_CLASS_PRICE.adult} CHF = {adultCount * SINGLE_CLASS_PRICE.adult} CHF
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Student</span>
                  <span className="text-right">
                    {studentCount} × {SINGLE_CLASS_PRICE.student} CHF = {studentCount * SINGLE_CLASS_PRICE.student} CHF
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 font-syne text-sm font-semibold uppercase text-foreground/90">
                By Payment Method
              </h3>
              <div className="space-y-2 font-outfit text-sm text-foreground/90">
                <div className="flex justify-between">
                  <span>Cash</span>
                  <span>{finance.cashTotal} CHF</span>
                </div>
                <div className="flex justify-between">
                  <span>TWINT</span>
                  <span>{finance.twintTotal} CHF</span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 font-syne text-sm font-semibold uppercase text-foreground/90">
                Subscription Check-ins
              </h3>
              <div className="font-outfit text-sm text-foreground/90">
                Abo: {finance.aboCount} check-in{finance.aboCount !== 1 ? "s" : ""}
              </div>
            </section>

            <section className="border-t border-border/60 pt-3">
              <h3 className="mb-2 font-syne text-sm font-semibold uppercase text-white">
                System Revenue
              </h3>
              <div className="font-syne text-lg font-bold text-white">
                Cash + TWINT: {finance.totalRevenue} CHF
              </div>
            </section>

            {finance.unresolvedCount > 0 && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-outfit text-sm text-destructive">
                {finance.unresolvedCount} check-in{finance.unresolvedCount === 1 ? "" : "s"} must be corrected before auto-fill.
              </p>
            )}

            {result && (
              <div
                className={`rounded-md border px-3 py-3 font-outfit text-sm ${
                  result.success
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
                role="status"
              >
                <p>{result.message}</p>
                {result.sheetUrl && (
                  <a
                    href={result.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 font-semibold underline underline-offset-4"
                  >
                    Open finance row
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}

            <Button
              type="button"
              onClick={() => {
                setResult(null)
                setConfirmOpen(true)
              }}
              disabled={finance.unresolvedCount > 0}
              className="h-12 w-full rounded-md bg-amber-500 font-outfit font-semibold text-black hover:bg-amber-400"
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Start Finance Confirmation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={(nextOpen) => !submitting && setConfirmOpen(nextOpen)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[440px] border-border/60 bg-popover">
          <DialogHeader>
            <DialogTitle className="font-syne text-white">
              Create the system snapshot?
            </DialogTitle>
            <DialogDescription className="font-outfit leading-relaxed text-foreground/70">
              This recalculates the selected class from the latest website check-ins and creates or refreshes its finance row.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 font-outfit text-sm text-foreground/80">
            <p>It does not confirm the actual Cash or TWINT amounts.</p>
            <p>Until Backup Confirmed is checked, you can run this again to refresh the row. After confirmation, the row is locked.</p>
          </div>

          {result && !result.success && (
            <p className="font-outfit text-sm text-destructive" role="alert">
              {result.message}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateSnapshot}
              disabled={submitting}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {submitting ? "Calculating..." : "Create or Refresh"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
