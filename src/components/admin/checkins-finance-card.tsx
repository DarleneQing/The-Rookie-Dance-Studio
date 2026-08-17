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
      <div className="relative bg-card border border-border/60 rounded-3xl p-6 shadow-2xl overflow-hidden">
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
                    <div className="rounded-lg border border-white/20 overflow-hidden bg-white/5 backdrop-blur-sm max-h-[280px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/20 hover:bg-white/10 bg-white/5">
                            <TableHead className="text-foreground/90 font-syne font-bold px-4 py-3">Name</TableHead>
                            <TableHead className="text-foreground/90 font-syne font-bold px-4 py-3">Time</TableHead>
                            <TableHead className="text-foreground/90 font-syne font-bold px-4 py-3">Member Type</TableHead>
                            <TableHead className="text-foreground/90 font-syne font-bold px-4 py-3">Payment</TableHead>
                            <TableHead className="text-foreground/90 font-syne font-bold px-4 py-3">Phone</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {checkins.map((checkin) => (
                            <TableRow key={checkin.id} className="border-white/20 hover:bg-white/10">
                              <TableCell className="px-4 py-3 font-outfit text-white">
                                {checkin.full_name || "Unknown"}
                              </TableCell>
                              <TableCell className="px-4 py-3 font-outfit text-white">
                                {formatTimestampTime(checkin.created_at)}
                              </TableCell>
                              <TableCell className="px-4 py-3 font-outfit text-white capitalize">
                                {checkin.member_type ?? "—"}
                              </TableCell>
                              <TableCell className="px-4 py-3 font-outfit text-white">
                                {formatPaymentMethod(checkin.payment_method)}
                              </TableCell>
                              <TableCell className="px-4 py-3 font-outfit text-white">
                                {checkin.phone_number || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <button
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
