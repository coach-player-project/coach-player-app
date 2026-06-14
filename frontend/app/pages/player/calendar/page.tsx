"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  User, 
  Dumbbell, 
  Trophy, 
  Check, 
  X, 
  Presentation,
  CalendarDays
} from "lucide-react"
import { TacticalBoard } from "@/components/tactical-board"

type EventType = "training" | "match"

type EventItem = {
  id: string
  team_id: string
  event_type: EventType
  title: string
  description: string | null
  scheduled_at: string
  duration_minutes: number
  team_name?: string
  coach_first_name?: string
  coach_last_name?: string
  coach_email?: string
  coach_role?: string
  creator_role?: string
  attendance_status?: "obecny" | "nieobecny" | null
  attendance_note?: string | null
  attendance_responded_at?: string | null
  player_fatigue_rating?: number | null
  player_fatigue_submitted_at?: string | null
  canvas_data?: string | null
  exercises?: {
    id: string
    name: string
    description: string | null
    canvas_schema: string | null
    order_index: number
    tools_count: number
  }[]
}

const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
]

const WEEKDAY_NAMES = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"]

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  training: "Trening",
  match: "Mecz",
}

export default function PlayerCalendarPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Current calendar view date
  const [currentDate, setCurrentDate] = useState(new Date())

  // Selected event for detail sheet
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [showTacticalModal, setShowTacticalModal] = useState(false)

  // Drill Modal States
  const [showDrillModal, setShowDrillModal] = useState(false)
  const [drillCanvasData, setDrillCanvasData] = useState<string | null>(null)
  const [drillModalTitle, setDrillModalTitle] = useState("")

  const [detailsLoading, setDetailsLoading] = useState(false)
  const [eventDetails, setEventDetails] = useState<EventItem | null>(null)

  const [submittingAttendance, setSubmittingAttendance] = useState(false)
  const [attendanceStatusInput, setAttendanceStatusInput] = useState<"obecny" | "nieobecny" | null>(null)
  const [attendanceNoteInput, setAttendanceNoteInput] = useState("")

  const [submittingFatigue, setSubmittingFatigue] = useState(false)
  const [fatigueRatingInput, setFatigueRatingInput] = useState<number | null>(null)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Load events for player (fetch a wide window or all events for the current month)
  async function loadEvents() {
    setLoading(true)
    setError(null)
    try {
      // Fetch player events
      const res = await apiFetch("/player/events?per_page=100") as { data?: EventItem[] }
      setEvents(res.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać wydarzeń.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [])

  async function loadEventDetails(id: string) {
    setDetailsLoading(true)
    try {
      const res = (await apiFetch(`/player/events/${id}`)) as { event: EventItem }
      setEventDetails(res.event)
    } catch (err) {
      console.error("Błąd podczas pobierania szczegółów wydarzenia:", err)
    } finally {
      setDetailsLoading(false)
    }
  }

  useEffect(() => {
    if (eventDetails) {
      setAttendanceStatusInput(eventDetails.attendance_status ?? null)
      setAttendanceNoteInput(eventDetails.attendance_note ?? "")
      setFatigueRatingInput(eventDetails.player_fatigue_rating ?? null)
    } else {
      setAttendanceStatusInput(null)
      setAttendanceNoteInput("")
      setFatigueRatingInput(null)
    }
  }, [eventDetails])

  async function handleSaveAttendance() {
    if (!selectedEventId || !attendanceStatusInput) return
    setSubmittingAttendance(true)
    try {
      const res = await apiFetch(`/player/events/${selectedEventId}/attendance`, {
        method: "POST",
        body: JSON.stringify({
          status: attendanceStatusInput,
          note: attendanceNoteInput.trim() || null,
        }),
      }) as { event: EventItem }
      
      setEventDetails(res.event)
      setEvents((prev) => prev.map((item) => item.id === selectedEventId ? { ...item, ...res.event } : item))
    } catch (err) {
      alert(err instanceof Error ? err.message : "Wystąpił błąd podczas zapisywania obecności.")
    } finally {
      setSubmittingAttendance(false)
    }
  }

  async function handleSaveFatigue(rating: number) {
    if (!selectedEventId) return
    setSubmittingFatigue(true)
    try {
      const res = await apiFetch(`/player/events/${selectedEventId}/fatigue`, {
        method: "POST",
        body: JSON.stringify({
          rating,
        }),
      }) as { event: EventItem }
      
      setEventDetails(res.event)
      setEvents((prev) => prev.map((item) => item.id === selectedEventId ? { ...item, ...res.event } : item))
      setFatigueRatingInput(res.event.player_fatigue_rating ?? null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Wystąpił błąd podczas zapisywania zmęczenia.")
    } finally {
      setSubmittingFatigue(false)
    }
  }

  function handleOpenDetails(item: EventItem) {
    setSelectedEventId(item.id)
    setEventDetails(item)
    setIsSheetOpen(true)
    void loadEventDetails(item.id)
  }

  // Monthly grid helper functions
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfWeek = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1 // Adjust so Mon=0, Sun=6
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayIdx = getFirstDayOfWeek(currentYear, currentMonth)

  // Monthly Calendar cells array (padded with nulls for first week offset)
  const calendarCells = useMemo(() => {
    const cells = []
    for (let i = 0; i < firstDayIdx; i++) {
      cells.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(day)
    }
    return cells
  }, [daysInMonth, firstDayIdx])

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const isToday = (day: number) => {
    const today = new Date()
    return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear
  }

  // Get events scheduled for a specific day
  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const d = new Date(event.scheduled_at)
      return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section with rich aesthetics */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-600 p-6 md:p-8 text-white shadow-lg">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
          <CalendarDays className="w-64 h-64" />
        </div>
        <div className="relative z-10 space-y-2">
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-none py-1 px-3 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            Mój Kalendarz
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Obecności i Treningi</h1>
          <p className="text-emerald-100 max-w-xl text-sm md:text-base font-medium">
            Sprawdzaj zaplanowane wydarzenia w czytelnym widoku miesięcznym. Zgłaszaj swoją obecność i oceniaj zmęczenie po treningu.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}

      {/* Monthly Calendar Component */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/40 p-6 space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <p className="text-xs text-gray-400">
                Kliknij na wydarzenie, aby zarządzać obecnością i szczegółami.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
              className="rounded-xl border-gray-200 hover:bg-gray-50 h-10 w-10 p-0 flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5 text-gray-650" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="rounded-xl border-gray-200 hover:bg-gray-50 h-10 px-4 font-semibold text-sm"
            >
              Dzisiaj
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              className="rounded-xl border-gray-200 hover:bg-gray-50 h-10 w-10 p-0 flex items-center justify-center"
            >
              <ChevronRight className="h-5 w-5 text-gray-650" />
            </Button>
          </div>
        </div>

        {/* Grid Calendar Layout */}
        <div className="space-y-1">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center font-bold text-xs uppercase tracking-wider text-gray-400 py-2">
            {WEEKDAY_NAMES.map(name => (
              <div key={name} className="py-2">{name}</div>
            ))}
          </div>

          {/* Days Grid */}
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-gray-400 border border-gray-100 rounded-2xl">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
              <span className="text-sm font-medium">Ładowanie kalendarza...</span>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5 md:gap-3">
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return (
                    <div key={`empty-${idx}`} className="bg-gray-50/20 border border-transparent rounded-2xl aspect-square md:aspect-auto md:min-h-[110px]" />
                  )
                }

                const dayEvents = getEventsForDay(day)
                const currentIsToday = isToday(day)

                return (
                  <div
                    key={`day-${day}`}
                    className={`border rounded-2xl p-2 md:p-3 aspect-square md:aspect-auto md:min-h-[110px] flex flex-col justify-between transition-all duration-200 ${
                      currentIsToday 
                        ? "bg-emerald-50/30 border-emerald-500 shadow-sm" 
                        : "bg-white border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    {/* Day number */}
                    <div className="flex justify-between items-center">
                      <span className={`text-xs md:text-sm font-bold flex items-center justify-center w-6 h-6 rounded-full ${
                        currentIsToday 
                          ? "bg-emerald-600 text-white shadow-sm" 
                          : "text-gray-700"
                      }`}>
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-extrabold text-gray-405 md:hidden">
                          ● {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Day events (desktop view) */}
                    <div className="hidden md:flex flex-col gap-1.5 mt-2">
                      {dayEvents.map(event => {
                        const isMatch = event.event_type === "match"
                        const statusColor = 
                          event.attendance_status === "obecny"
                            ? "border-l-green-500 bg-green-50/20 text-green-800"
                            : event.attendance_status === "nieobecny"
                            ? "border-l-rose-500 bg-rose-50/20 text-rose-800"
                            : "border-l-gray-400 bg-gray-50/50 text-gray-600"

                        return (
                          <div
                            key={event.id}
                            onClick={() => handleOpenDetails(event)}
                            className={`border-l-3 px-2 py-1 text-[11px] font-bold rounded-r-lg truncate cursor-pointer hover:brightness-95 transition-all flex items-center gap-1 ${statusColor}`}
                            title={event.title}
                          >
                            {isMatch ? (
                              <Trophy className="w-3 h-3 text-blue-600 shrink-0" />
                            ) : (
                              <Dumbbell className="w-3 h-3 text-indigo-600 shrink-0" />
                            )}
                            <span className="truncate">{event.title}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Day events (mobile icon view) */}
                    <div className="flex md:hidden gap-1 mt-1 justify-center">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          onClick={() => handleOpenDetails(event)}
                          className={`w-2 h-2 rounded-full cursor-pointer ${
                            event.event_type === "match" ? "bg-blue-500" : "bg-indigo-500"
                          }`}
                          title={event.title}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Slide-out sheet for Event details */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-md p-6 bg-white overflow-y-auto" showCloseButton={true}>
          <SheetHeader className="pb-6 border-b border-gray-100">
            <SheetTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {eventDetails?.event_type === "match" ? (
                <Trophy className="w-5 h-5 text-blue-600" />
              ) : (
                <Dumbbell className="w-5 h-5 text-indigo-600" />
              )}
              <span>Szczegóły Wydarzenia</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-gray-400">
              Szczegółowe dane dotyczące zaplanowanego spotkania.
            </SheetDescription>
          </SheetHeader>

          {detailsLoading && !eventDetails ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="text-sm text-gray-400 font-medium">Ładowanie szczegółów...</span>
            </div>
          ) : eventDetails ? (
            <div className="py-6 space-y-6">
              
              {/* Type Badge and Title */}
              <div className="space-y-2">
                <div>
                  {eventDetails.event_type === "match" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700">
                      Mecz ligowy / towarzyski
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700">
                      Trening zespołu
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{eventDetails.title}</h3>
              </div>

              {/* Grid cards for time & team */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Drużyna</span>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-800 text-sm">{eventDetails.team_name ?? "Brak nazwy"}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Czas trwania</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-800 text-sm">{eventDetails.duration_minutes} minut</span>
                  </div>
                </div>
              </div>

              {/* Exact Date Box */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Zaplanowany termin</span>
                <div className="flex flex-col sm:flex-row justify-between gap-2 text-sm font-semibold text-gray-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Dzień: {new Date(eventDetails.scheduled_at).toLocaleDateString("pl-PL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Godzina: {new Date(eventDetails.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Opis wydarzenia</span>
                <div className="bg-blue-50/20 border border-blue-50/40 p-4 rounded-xl text-sm text-gray-700 leading-relaxed min-h-[80px]">
                  {eventDetails.description ? eventDetails.description : "Brak dodatkowego opisu dla tego wydarzenia."}
                </div>
              </div>

              {/* Tactical Board preview button */}
              {eventDetails.canvas_data && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Plan taktyczny trenera</span>
                  <Button
                    type="button"
                    onClick={() => setShowTacticalModal(true)}
                    className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl px-4 py-2.5 font-semibold flex items-center justify-center gap-2 text-sm"
                  >
                    <Presentation className="h-4 w-4" />
                    <span>Zobacz tablicę taktyczną</span>
                  </Button>
                </div>
              )}

              {/* Exercise Drills List */}
              {eventDetails.exercises && eventDetails.exercises.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-semibold text-gray-500">Plan ćwiczeń ({eventDetails.exercises.length})</span>
                  <div className="space-y-3">
                    {eventDetails.exercises.map((ex, index) => {
                      const parsed = {
                        tools: {} as Record<string, number>,
                        canvas_data: null as string | null
                      }
                      if (ex.canvas_schema) {
                        try {
                          const p = JSON.parse(ex.canvas_schema)
                          parsed.tools = p.tools || {}
                          parsed.canvas_data = p.canvas_data || null
                        } catch (e) {}
                      }

                      const activeTools = Object.entries(parsed.tools).filter(([_, count]) => count > 0)

                      return (
                        <div key={index} className="bg-gray-50/50 border border-gray-150 p-4 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              {ex.name}
                            </h4>
                            {parsed.canvas_data && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDrillCanvasData(parsed.canvas_data)
                                  setDrillModalTitle(ex.name)
                                  setShowDrillModal(true)
                                }}
                                className="text-[10px] font-semibold text-blue-600 hover:text-blue-750 flex items-center gap-0.5 bg-white border border-gray-200 px-2 py-1 rounded-lg transition-colors shadow-sm"
                              >
                                <Presentation className="w-3.5 h-3.5" />
                                <span>Schemat</span>
                              </button>
                            )}
                          </div>

                          {ex.description && (
                            <p className="text-xs text-gray-600 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-gray-100">
                              {ex.description}
                            </p>
                          )}

                          {activeTools.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {activeTools.map(([toolName, count]) => (
                                <Badge key={toolName} className="bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 text-[10px] rounded-full font-medium">
                                  {toolName}: {count}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Attendance management section */}
              <div className="border-t border-gray-100 pt-6 space-y-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-semibold text-gray-500">Twoja obecność</span>
                
                {/* Visual indicator of currently saved attendance status */}
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Status deklaracji:</span>
                    {eventDetails.attendance_status === "obecny" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-100 px-3 py-1 text-xs font-extrabold text-green-700 shadow-sm shadow-green-50/30">
                        <Check className="w-3.5 h-3.5" />
                        Zgłoszono obecność
                      </span>
                    ) : eventDetails.attendance_status === "nieobecny" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-100 px-3 py-1 text-xs font-extrabold text-rose-700 shadow-sm shadow-rose-50/30">
                        <X className="w-3.5 h-3.5" />
                        Zgłoszono nieobecność
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500">
                        Brak odpowiedzi
                      </span>
                    )}
                  </div>

                  {eventDetails.attendance_responded_at && (
                    <div className="text-[11px] text-gray-400 font-medium">
                      Ostatnia odpowiedź: {new Date(eventDetails.attendance_responded_at).toLocaleString("pl-PL")}
                    </div>
                  )}
                </div>

                {/* Form controls to change attendance */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAttendanceStatusInput("obecny")}
                      className={`flex items-center justify-center gap-2 h-11 px-4 text-xs font-bold rounded-xl border transition-all ${
                        attendanceStatusInput === "obecny"
                          ? "bg-green-650 text-white border-green-600 shadow-lg shadow-green-600/20"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      Będę obecny
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceStatusInput("nieobecny")}
                      className={`flex items-center justify-center gap-2 h-11 px-4 text-xs font-bold rounded-xl border transition-all ${
                        attendanceStatusInput === "nieobecny"
                          ? "bg-rose-650 text-white border-rose-600 shadow-lg shadow-rose-600/20"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <X className="w-4 h-4" />
                      Zgłoś nieobecność
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Notatka / powód (opcjonalnie):</label>
                    <textarea
                      placeholder={attendanceStatusInput === "nieobecny" ? "Wpisz powód nieobecności (np. choroba, wyjazd)..." : "Wpisz opcjonalną wiadomość dla trenera..."}
                      value={attendanceNoteInput}
                      onChange={(e) => setAttendanceNoteInput(e.target.value)}
                      className="w-full min-h-[70px] p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
                    />
                  </div>

                  <Button
                    onClick={handleSaveAttendance}
                    disabled={submittingAttendance || !attendanceStatusInput}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/10"
                  >
                    {submittingAttendance ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Zapisywanie...
                      </>
                    ) : (
                      "Zapisz moją decyzję"
                    )}
                  </Button>
                </div>
              </div>

              {/* Fatigue rating (only past events) */}
              {new Date(eventDetails.scheduled_at) < new Date() && (
                <div className="border-t border-gray-100 pt-6 space-y-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-semibold text-gray-500">
                    Ocena zmęczenia po treningu
                  </span>

                  {eventDetails.player_fatigue_rating ? (
                    <div className="bg-blue-50/20 border border-blue-100 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">Zgłoszone zmęczenie:</span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          eventDetails.player_fatigue_rating <= 3 
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : eventDetails.player_fatigue_rating <= 7
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-rose-100 text-rose-800 border-rose-300"
                        }`}>
                          {eventDetails.player_fatigue_rating}/10
                        </span>
                      </div>
                      {eventDetails.player_fatigue_submitted_at && (
                        <div className="text-[10px] text-gray-400 font-medium">
                          Zgłoszono: {new Date(eventDetails.player_fatigue_submitted_at).toLocaleString("pl-PL")}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs text-gray-500">
                      Nie oceniłeś jeszcze swojego zmęczenia po tym wydarzeniu. Wybierz stopień od 1 do 10 poniżej.
                    </div>
                  )}

                  {/* Rating Selector */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-gray-500 block">Wybierz stopień zmęczenia (1 - najniższe, 10 - najwyższe):</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
                        const isSelected = fatigueRatingInput === rating;
                        let btnStyle = "bg-white text-gray-700 border-gray-200 hover:bg-gray-50";
                        if (isSelected) {
                          if (rating <= 3) {
                            btnStyle = "bg-green-650 text-white border-green-600 shadow-lg shadow-green-600/20 hover:bg-green-700";
                          } else if (rating <= 7) {
                            btnStyle = "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20 hover:bg-amber-600";
                          } else {
                            btnStyle = "bg-rose-650 text-white border-rose-600 shadow-lg shadow-rose-600/20 hover:bg-rose-700";
                          }
                        }
                        return (
                          <button
                            key={rating}
                            type="button"
                            disabled={submittingFatigue}
                            onClick={() => {
                              setFatigueRatingInput(rating);
                              void handleSaveFatigue(rating);
                            }}
                            className={`h-9 w-full rounded-lg text-xs font-bold border transition-all flex items-center justify-center cursor-pointer ${btnStyle}`}
                          >
                            {rating}
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="flex justify-between text-[10px] text-gray-400 font-medium px-1">
                      <span>1 - Pełna świeżość</span>
                      <span>10 - Skrajne wyczerpanie</span>
                    </div>

                    {submittingFatigue && (
                      <div className="flex items-center gap-2 justify-center text-xs text-gray-500">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                        <span>Zapisywanie oceny zmęczenia...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Coach details */}
              {(eventDetails.coach_first_name || eventDetails.coach_last_name) && (
                <div className="border-t border-gray-100 pt-6 space-y-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Organizator wydarzenia</span>
                  <div className="flex items-start gap-3 bg-gray-50/40 border border-gray-100 p-4 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-gray-800 text-sm">
                        {eventDetails.coach_first_name} {eventDetails.coach_last_name}
                      </div>
                      <div className="text-xs text-gray-400 font-semibold uppercase bg-gray-100/80 px-2 py-0.5 rounded-md inline-block">
                        {eventDetails.creator_role || (eventDetails.coach_role === "coach" ? "Trener" : eventDetails.coach_role === "admin" ? "Administrator" : eventDetails.coach_role)}
                      </div>
                      {eventDetails.coach_email && (
                        <div className="text-xs text-gray-500 block pt-1 select-all">
                          {eventDetails.coach_email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="py-20 text-center text-gray-400">
              Wydarzenie nie jest dostępne.
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Drill Canvas modal */}
      {showDrillModal && drillCanvasData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 w-full max-w-5xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Presentation className="h-5 w-5 text-indigo-600" />
                Schemat ćwiczenia: {drillModalTitle}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowDrillModal(false)
                  setDrillCanvasData(null)
                  setDrillModalTitle("")
                }}
                className="text-gray-400 hover:text-gray-650 font-semibold text-sm cursor-pointer p-1.5 hover:bg-gray-50 rounded-lg"
              >
                Zamknij
              </button>
            </div>
            <div className="overflow-x-auto max-h-[70vh] p-1">
              <TacticalBoard
                initialData={drillCanvasData}
                readOnly={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Tactical board modal (Event level) */}
      {showTacticalModal && eventDetails?.canvas_data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 w-full max-w-5xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Presentation className="h-5 w-5 text-indigo-600" />
                Taktyka dla: {eventDetails.title}
              </h2>
              <button
                type="button"
                onClick={() => setShowTacticalModal(false)}
                className="text-gray-400 hover:text-gray-655 font-semibold text-sm cursor-pointer p-1.5 hover:bg-gray-50 rounded-lg"
              >
                Zamknij
              </button>
            </div>
            <div className="overflow-x-auto max-h-[70vh] p-1">
              <TacticalBoard
                initialData={eventDetails.canvas_data}
                readOnly={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
