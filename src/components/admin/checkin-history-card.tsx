"use client"

import React, { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export type CheckinHistoryItem = {
  id: string
  full_name: string | null
  created_at: string
}

export function CheckinHistoryCard() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  )
  const [checkins, setCheckins] = useState<CheckinHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

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
        .select("id, created_at, profiles!user_id(full_name)")
        .gte("created_at", dateStartISO)
        .lte("created_at", dateEndISO)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching check-ins:", error)
        setCheckins([])
        return
      }

      // Transform the data to match our type
      // The profiles data comes back as an object with the foreign key relationship
      type CheckinWithProfile = {
        id: string
        created_at: string
        profiles: { full_name: string | null } | { full_name: string | null }[] | null
      }

      const transformedData: CheckinHistoryItem[] =
        data?.map((item: CheckinWithProfile) => {
          const profile = item.profiles
          return {
            id: item.id,
            full_name:
              profile && !Array.isArray(profile)
                ? profile.full_name
                : Array.isArray(profile) && profile[0]
                ? profile[0].full_name
                : null,
            created_at: item.created_at,
          }
        }) || []

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
              Check-in History
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
                            <div className="mt-1 text-sm text-white/70 font-outfit">
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
