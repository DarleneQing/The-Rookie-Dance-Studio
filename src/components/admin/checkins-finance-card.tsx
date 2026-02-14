"use client"

import React, { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Calendar, Loader2, Calculator } from "lucide-react"
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

export type CheckinFinanceItem = {
  id: string
  full_name: string | null
  member_type: "adult" | "student" | null
  payment_method: "cash" | "twint" | "abo" | null
  phone_number: string | null
  created_at: string
}

type CheckinWithProfile = {
  id: string
  created_at: string
  payment_method: "cash" | "twint" | "abo" | null
  profiles:
    | { full_name: string | null; member_type: string | null; phone_number: string | null }
    | { full_name: string | null; member_type: string | null; phone_number: string | null }[]
    | null
}

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

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setHasSearched(false)
    setCheckins([])
  }

  const fetchCheckins = async () => {
    if (!selectedDate) return

    setLoading(true)
    setHasSearched(true)

    try {
      const supabase = createClient()
      const dateStart = new Date(selectedDate)
      dateStart.setHours(0, 0, 0, 0)
      const dateStartISO = dateStart.toISOString()

      const dateEnd = new Date(selectedDate)
      dateEnd.setHours(23, 59, 59, 999)
      const dateEndISO = dateEnd.toISOString()

      const { data, error } = await supabase
        .from("checkins")
        .select("id, created_at, payment_method, profiles!user_id(full_name, member_type, phone_number)")
        .not("course_id", "is", null)
        .gte("created_at", dateStartISO)
        .lte("created_at", dateEndISO)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching check-ins:", error)
        setCheckins([])
        return
      }

      const transformedData: CheckinFinanceItem[] =
        (data as CheckinWithProfile[] | null)?.map((item: CheckinWithProfile) => {
          const profile = item.profiles
          const p = profile && !Array.isArray(profile) ? profile : Array.isArray(profile) && profile[0] ? profile[0] : null
          return {
            id: item.id,
            full_name: p?.full_name ?? null,
            member_type: (p?.member_type === "adult" || p?.member_type === "student" ? p.member_type : null) as "adult" | "student" | null,
            payment_method: item.payment_method,
            phone_number: p?.phone_number ?? null,
            created_at: item.created_at,
          }
        }) ?? []

      setCheckins(transformedData)
    } catch (error) {
      console.error("Error fetching check-ins:", error)
      setCheckins([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-r from-green-500 to-blue-500 opacity-20 blur-2xl rounded-[30px]" />
      <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-6 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="bg-gradient-to-br from-green-500 to-blue-500 rounded-full p-4">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div className="w-full font-syne font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-green-300 to-blue-300">
              Check-ins & Finance
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label htmlFor="checkin-date" className="text-white/90 font-outfit font-medium">
                Select Date
              </Label>
              <div className="rounded-2xl border border-white/20 px-3 py-2">
                <Input
                  id="checkin-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full border-0 bg-transparent p-0 text-base text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <button
              onClick={fetchCheckins}
              disabled={loading || !selectedDate}
              className="w-full rounded-2xl bg-gradient-to-r from-green-500 to-blue-500 hover:opacity-90 text-white font-outfit font-medium py-3 px-4 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

            {hasSearched && (
              <div className="space-y-2 pt-2">
                <div className="text-white/70 font-outfit text-sm">
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
                            <TableHead className="text-white/90 font-syne font-bold px-4 py-3">Name</TableHead>
                            <TableHead className="text-white/90 font-syne font-bold px-4 py-3">Time</TableHead>
                            <TableHead className="text-white/90 font-syne font-bold px-4 py-3">Member Type</TableHead>
                            <TableHead className="text-white/90 font-syne font-bold px-4 py-3">Payment</TableHead>
                            <TableHead className="text-white/90 font-syne font-bold px-4 py-3">Phone</TableHead>
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
                      className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-outfit font-medium py-3 px-4 transition-opacity flex items-center justify-center gap-2"
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
