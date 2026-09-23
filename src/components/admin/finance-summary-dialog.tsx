"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClipboardCheck } from "lucide-react"
import type { CheckinFinanceItem } from "@/components/admin/checkins-finance-card"
import { financeWorkbookLinks } from "@/lib/finance-workbook"
import { getSingleClassPrice, type StudentAdultPrice } from "@/lib/pricing"

interface FinanceSummaryDialogProps {
  checkins: CheckinFinanceItem[]
  /** YYYY-MM-DD the check-ins belong to; selects the price in effect that day. */
  date: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function calculateFinance(checkins: CheckinFinanceItem[], price: StudentAdultPrice) {
  const paidCheckins = checkins.filter(
    (c) => c.payment_method === "cash" || c.payment_method === "twint"
  )
  const cashCheckins = paidCheckins.filter((c) => c.payment_method === "cash")
  const twintCheckins = paidCheckins.filter((c) => c.payment_method === "twint")
  const aboCheckins = checkins.filter((c) => c.payment_method === "abo")

  const adultCount = paidCheckins.filter((c) => c.member_type !== "student").length
  const studentCount = paidCheckins.filter((c) => c.member_type === "student").length
  const adultTotal = adultCount * price.adult
  const studentTotal = studentCount * price.student

  const cashTotal = cashCheckins.reduce(
    (sum, c) => sum + (c.member_type === "student" ? price.student : price.adult),
    0
  )
  const twintTotal = twintCheckins.reduce(
    (sum, c) => sum + (c.member_type === "student" ? price.student : price.adult),
    0
  )
  const totalRevenue = cashTotal + twintTotal

  return {
    adultCount,
    studentCount,
    adultTotal,
    studentTotal,
    cashTotal,
    twintTotal,
    aboCount: aboCheckins.length,
    totalRevenue,
  }
}

export function FinanceSummaryDialog({
  checkins,
  date,
  open,
  onOpenChange,
}: FinanceSummaryDialogProps) {
  const price = getSingleClassPrice(date)
  const finance = calculateFinance(checkins, price)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[480px] max-h-[85vh] overflow-y-auto bg-popover border-border/60 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-syne text-white">
            Finance Summary
          </DialogTitle>
          <DialogDescription className="sr-only">
            Revenue breakdown by member type and payment method for the selected date
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section>
            <h3 className="font-syne font-semibold text-foreground/90 mb-3 text-sm uppercase tracking-wide">
              By Member Type
            </h3>
            <div className="space-y-2 font-outfit text-foreground/90 text-sm">
              <div className="flex justify-between">
                <span>Adult</span>
                <span>
                  {finance.adultCount} × {price.adult} CHF = {finance.adultTotal} CHF
                </span>
              </div>
              <div className="flex justify-between">
                <span>Student</span>
                <span>
                  {finance.studentCount} × {price.student} CHF = {finance.studentTotal} CHF
                </span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-syne font-semibold text-foreground/90 mb-3 text-sm uppercase tracking-wide">
              By Payment Method
            </h3>
            <div className="space-y-2 font-outfit text-foreground/90 text-sm">
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
            <h3 className="font-syne font-semibold text-foreground/90 mb-3 text-sm uppercase tracking-wide">
              Subscription Check-ins
            </h3>
            <div className="font-outfit text-foreground/90 text-sm">
              <span>Abo: </span>
              <span>{finance.aboCount} check-in{finance.aboCount !== 1 ? "s" : ""}</span>
            </div>
          </section>

          <section className="pt-3 border-t border-border/60">
            <h3 className="font-syne font-semibold text-white mb-2 text-sm uppercase tracking-wide">
              Total Revenue
            </h3>
            <div className="font-syne font-bold text-lg text-white">
              Cash + TWINT: {finance.totalRevenue} CHF
            </div>
          </section>

          <a
            href={financeWorkbookLinks.backupCloseout}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-outfit font-semibold py-3 px-4 transition-colors flex items-center justify-center gap-2"
          >
            <ClipboardCheck className="h-4 w-4" />
            Confirm Class Finance
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
