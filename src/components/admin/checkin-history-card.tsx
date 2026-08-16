"use client"

import React, { useState } from "react"
import { Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { getCheckinHistory, type CheckinHistoryItem } from "@/app/admin/actions"

export type CheckinHistoryItemType = CheckinHistoryItem

export function CheckinHistoryCard() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  )
  const [checkins, setCheckins] = useState<CheckinHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
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
      const result = await getCheckinHistory(selectedDate)

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
              Check-in History
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
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {checkins.map((checkin) => (
                      <div
                        key={checkin.id}
                        className="rounded-2xl border border-white/15 bg-white/5 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-syne font-semibold text-white truncate">
                              {checkin.full_name || "Unknown User"}
                            </div>
                            <div className="mt-1 text-sm text-foreground/70 font-outfit">
                              {checkin.created_at
                                ? new Date(checkin.created_at).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
