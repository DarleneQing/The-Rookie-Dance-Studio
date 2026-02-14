"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { CheckinFinanceItem } from "@/components/admin/checkins-finance-card"

interface FinanceSummaryDialogProps {
  checkins: CheckinFinanceItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function calculateFinance(checkins: CheckinFinanceItem[]) {
  const paidCheckins = checkins.filter(
    (c) => c.payment_method === "cash" || c.payment_method === "twint"
  )
  const cashCheckins = paidCheckins.filter((c) => c.payment_method === "cash")
  const twintCheckins = paidCheckins.filter((c) => c.payment_method === "twint")
  const aboCheckins = checkins.filter((c) => c.payment_method === "abo")

  const adultCount = paidCheckins.filter((c) => c.member_type !== "student").length
  const studentCount = paidCheckins.filter((c) => c.member_type === "student").length
  const adultTotal = adultCount * 15
  const studentTotal = studentCount * 10

  const cashTotal = cashCheckins.reduce(
    (sum, c) => sum + (c.member_type === "student" ? 10 : 15),
    0
  )
  const twintTotal = twintCheckins.reduce(
    (sum, c) => sum + (c.member_type === "student" ? 10 : 15),
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
  open,
  onOpenChange,
}: FinanceSummaryDialogProps) {
  const finance = calculateFinance(checkins)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-[480px] max-h-[85vh] overflow-y-auto bg-black/90 border-white/20 backdrop-blur-xl"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="font-syne text-white">
            Finance Summary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section>
            <h3 className="font-syne font-semibold text-white/90 mb-3 text-sm uppercase tracking-wide">
              By Member Type
            </h3>
            <div className="space-y-2 font-outfit text-white/90 text-sm">
              <div className="flex justify-between">
                <span>Adult</span>
                <span>
                  {finance.adultCount} × 15 CHF = {finance.adultTotal} CHF
                </span>
              </div>
              <div className="flex justify-between">
                <span>Student</span>
                <span>
                  {finance.studentCount} × 10 CHF = {finance.studentTotal} CHF
                </span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-syne font-semibold text-white/90 mb-3 text-sm uppercase tracking-wide">
              By Payment Method
            </h3>
            <div className="space-y-2 font-outfit text-white/90 text-sm">
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
            <h3 className="font-syne font-semibold text-white/90 mb-3 text-sm uppercase tracking-wide">
              Subscription Check-ins
            </h3>
            <div className="font-outfit text-white/90 text-sm">
              <span>Abo: </span>
              <span>{finance.aboCount} check-in{finance.aboCount !== 1 ? "s" : ""}</span>
            </div>
          </section>

          <section className="pt-3 border-t border-white/20">
            <h3 className="font-syne font-semibold text-white mb-2 text-sm uppercase tracking-wide">
              Total Revenue
            </h3>
            <div className="font-syne font-bold text-lg text-white">
              Cash + TWINT: {finance.totalRevenue} CHF
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
