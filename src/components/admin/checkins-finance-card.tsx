"use client"

import React, { useState } from "react"
import { Calendar, Loader2, Calculator, FileSpreadsheet, Landmark } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    <div className="relative min-w-0 w-full max-w-full">
      <div className="relative min-w-0 w-full max-w-full overflow-hidden rounded-3xl border border-border/60 bg-card p-4 shadow-2xl sm:p-6">
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
              <div className="min-w-0 space-y-2 pt-2">
                <div className="text-foreground/70 font-outfit text-sm">
                  {checkins.length === 0
                    ? "No check-ins found for this date"
                    : `${checkins.length} check-in${checkins.length !== 1 ? "s" : ""} found`}
                </div>

                {checkins.length > 0 && (
                  <>
                    <div className="relative max-h-[300px] min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border border-border/60 bg-white/[0.03]">
                      <table className="w-full table-fixed border-collapse text-left text-xs">
                        <thead className="sticky top-0 z-20 bg-card shadow-[0_1px_0_hsl(var(--border))]">
                          <tr>
                            <th className="w-[28%] px-2 py-2 font-syne text-[11px] font-bold text-foreground/90 sm:w-[22%] sm:px-3 sm:text-xs">Name</th>
                            <th className="w-[20%] px-2 py-2 font-syne text-[11px] font-bold text-foreground/90 sm:w-[18%] sm:px-3 sm:text-xs">Time</th>
                            <th className="w-[26%] px-2 py-2 font-syne text-[11px] font-bold text-foreground/90 sm:w-[18%] sm:px-3 sm:text-xs">Member</th>
                            <th className="w-[26%] px-2 py-2 font-syne text-[11px] font-bold text-foreground/90 sm:w-[18%] sm:px-3 sm:text-xs">Payment</th>
                            <th className="hidden w-[24%] px-3 py-2 font-syne text-xs font-bold text-foreground/90 sm:table-cell">Phone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {checkins.map((checkin) => (
                            <tr key={checkin.id} className="h-11 border-b border-border/50 last:border-0 hover:bg-white/5">
                              <td className="truncate px-2 py-2 font-outfit font-medium text-foreground sm:px-3" title={checkin.full_name || "Unknown"}>
                                {checkin.full_name || "Unknown"}
                              </td>
                              <td className="truncate px-2 py-2 font-outfit text-foreground/80 sm:px-3">
                                {formatTimestampTime(checkin.created_at)}
                              </td>
                              <td className="truncate px-2 py-2 font-outfit capitalize text-foreground/80 sm:px-3" title={checkin.member_type ?? "—"}>
                                {checkin.member_type ?? "—"}
                              </td>
                              <td className="truncate px-2 py-2 font-outfit text-foreground/80 sm:px-3" title={formatPaymentMethod(checkin.payment_method)}>
                                {formatPaymentMethod(checkin.payment_method)}
                              </td>
                              <td className="hidden truncate px-3 py-2 font-outfit text-foreground/80 sm:table-cell" title={checkin.phone_number || "—"}>
                                {checkin.phone_number || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
