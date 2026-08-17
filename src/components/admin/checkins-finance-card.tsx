"use client"

import React, { useState } from "react"
import { Calendar, Loader2, Calculator, FileSpreadsheet, Landmark } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FinanceSummaryDialog } from "@/components/admin/finance-summary-dialog"
import { formatTimestampTime } from "@/lib/utils/date-formatters"
import { getFinanceCheckins, type FinanceCheckinItem } from "@/app/admin/actions"
import { financeWorkbookLinks } from "@/lib/finance-workbook"

export type CheckinFinanceItem = FinanceCheckinItem

function formatPaymentMethod(method: string | null): string {
  if (!method) return "—"
  if (method === "abo") return "Abo"
  return method.charAt(0).toUpperCase() + method.slice(1)
}

export function CheckinsFinanceCard() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  )
  const [checkins, setCheckins] = useState<CheckinFinanceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setHasSearched(false)
    setCheckins([])
    setErrorMessage(null)
  }

  const fetchCheckins = async () => {
    if (!selectedDate) return

    setLoading(true)
    setHasSearched(true)
    setErrorMessage(null)

    try {
      const result = await getFinanceCheckins(selectedDate)

      if (!result.success) {
        setErrorMessage(result.message ?? "Failed to load check-ins")
        setCheckins([])
        return
      }

      setCheckins(result.items ?? [])
    } catch (error) {
      console.error("Error fetching check-ins:", error)
      setErrorMessage("Failed to load check-ins. Please try again.")
      setCheckins([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-4 shadow-2xl sm:p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="bg-gradient-to-br from-green-500 to-blue-500 rounded-full p-4">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div className="w-full font-syne font-bold text-2xl text-foreground">
              Check-ins & Finance
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href={financeWorkbookLinks.accountReview}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-outfit font-medium py-3 px-4 transition-colors flex items-center justify-center gap-2"
              >
                <Landmark className="h-4 w-4" />
                TWINT Review
              </a>
              <a
                href={financeWorkbookLinks.auditSummary}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-teal-700 hover:bg-teal-600 text-white font-outfit font-medium py-3 px-4 transition-colors flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Audit Summary
              </a>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label htmlFor="checkin-date" className="text-foreground/90 font-outfit font-medium">
                Select Date
              </Label>
              <div className="rounded-2xl border border-white/20 px-3 py-2">
                <Input
                  id="checkin-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full border-0 bg-transparent p-0 text-base text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={fetchCheckins}
              disabled={loading || !selectedDate}
              className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-outfit font-medium py-3 px-4 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "View Check-ins"
              )}
            </button>

            {errorMessage && (
              <p className="text-destructive text-sm font-outfit text-center">{errorMessage}</p>
            )}

            {hasSearched && !errorMessage && (
              <div className="space-y-2 pt-2">
                <div className="text-foreground/70 font-outfit text-sm">
                  {checkins.length === 0
                    ? "No check-ins found for this date"
                    : `${checkins.length} check-in${checkins.length !== 1 ? "s" : ""} found`}
                </div>

                {checkins.length > 0 && (
                  <>
                    <div className="relative max-h-[300px] overflow-auto overscroll-contain rounded-xl border border-border/60 bg-white/[0.03]">
                      <Table className="min-w-[600px] text-xs">
                        <TableHeader className="sticky top-0 z-20 bg-card shadow-[0_1px_0_hsl(var(--border))]">
                          <TableRow className="border-0 bg-card hover:bg-card">
                            <TableHead className="sticky left-0 z-30 min-w-28 bg-card px-3 py-2 font-syne text-xs font-bold text-foreground/90">Name</TableHead>
                            <TableHead className="w-24 px-3 py-2 font-syne text-xs font-bold text-foreground/90">Time</TableHead>
                            <TableHead className="w-24 px-3 py-2 font-syne text-xs font-bold text-foreground/90">Member</TableHead>
                            <TableHead className="w-24 px-3 py-2 font-syne text-xs font-bold text-foreground/90">Payment</TableHead>
                            <TableHead className="w-36 px-3 py-2 font-syne text-xs font-bold text-foreground/90">Phone</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {checkins.map((checkin) => (
                            <TableRow key={checkin.id} className="group h-11 border-border/50 hover:bg-white/5">
                              <TableCell className="sticky left-0 z-10 max-w-36 whitespace-normal break-words bg-card px-3 py-2 font-outfit font-medium text-foreground group-hover:bg-[#181818]">
                                {checkin.full_name || "Unknown"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-3 py-2 font-outfit text-foreground/80">
                                {formatTimestampTime(checkin.created_at)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-3 py-2 font-outfit capitalize text-foreground/80">
                                {checkin.member_type ?? "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-3 py-2 font-outfit text-foreground/80">
                                {formatPaymentMethod(checkin.payment_method)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-3 py-2 font-outfit text-foreground/80">
                                {checkin.phone_number || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFinanceDialogOpen(true)}
                      className="w-full rounded-2xl bg-secondary hover:bg-secondary/90 text-secondary-foreground font-outfit font-medium py-3 px-4 transition-opacity flex items-center justify-center gap-2"
                    >
                      <Calculator className="h-4 w-4" />
                      Finance Summary
                    </button>

                    <FinanceSummaryDialog
                      checkins={checkins}
                      open={financeDialogOpen}
                      onOpenChange={setFinanceDialogOpen}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
