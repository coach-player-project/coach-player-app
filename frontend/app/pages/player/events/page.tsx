"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Calendar, Clock, Search, Shield, User, Mail, ChevronRight, Dumbbell, Trophy, Check, X } from "lucide-react"

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
  attendance_status?: "obecny" | "nieobecny" | null
  attendance_note?: string | null
  attendance_responded_at?: string | null
  player_fatigue_rating?: number | null
  player_fatigue_submitted_at?: string | null
}

type EventsResponse = {
  data: EventItem[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  training: "Trening",
  match: "Mecz",
}

export default function PlayerEventsPage() {
  const [items, setItems] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"" | EventType>("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [meta, setMeta] = useState<EventsResponse["meta"]>({
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
  })

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [eventDetails, setEventDetails] = useState<EventItem | null>(null)

  const [submittingAttendance, setSubmittingAttendance] = useState(false)
  const [attendanceStatusInput, setAttendanceStatusInput] = useState<"obecny" | "nieobecny" | null>(null)
  const [attendanceNoteInput, setAttendanceNoteInput] = useState("")

  const [submittingFatigue, setSubmittingFatigue] = useState(false)
  const [fatigueRatingInput, setFatigueRatingInput] = useState<number | null>(null)

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
      setItems((prev) => prev.map((item) => item.id === selectedEventId ? { ...item, ...res.event } : item))
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
      setItems((prev) => prev.map((item) => item.id === selectedEventId ? { ...item, ...res.event } : item))
      setFatigueRatingInput(res.event.player_fatigue_rating ?? null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Wystąpił błąd podczas zapisywania zmęczenia.")
    } finally {
      setSubmittingFatigue(false)
    }
  }

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("per_page", String(perPage))
    if (search.trim()) {
      params.set("search", search.trim())
    }
    if (typeFilter) {
      params.set("event_type", typeFilter)
    }
    return params.toString()
  }, [page, perPage, search, typeFilter])

  async function loadEvents() {
    setLoading(true)
    setError(null)
    try {
      const res = (await apiFetch(`/player/events?${queryString}`)) as EventsResponse
      setItems(res.data ?? [])
      if (res.meta) {
        setMeta(res.meta)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać wydarzeń.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [queryString])

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

  function handleOpenDetails(item: EventItem) {
    setSelectedEventId(item.id)
    setEventDetails(item) // Use current item temporarily
    setIsSheetOpen(true)
    void loadEventDetails(item.id) // Fetch full fresh details
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section with rich aesthetics */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-800 to-indigo-600 p-6 md:p-8 text-white shadow-lg">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
          <Calendar className="w-64 h-64" />
        </div>
        <div className="relative z-10 space-y-2">
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-none py-1 px-3 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            Harmonogram
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Twoje Wydarzenia</h1>
          <p className="text-blue-100 max-w-xl text-sm md:text-base font-medium">
            Sprawdź nadchodzące oraz historyczne treningi i mecze utworzone przez Twojego trenera. Bądź na bieżąco z planem!
          </p>
        </div>
      </div>

      {/* Main card panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/40 p-6 space-y-6">
        
        {/* Filters and search section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <Search className="w-5 h-5" />
            </span>
            <Input
              placeholder="Szukaj po nazwie, opisie lub drużynie..."
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              className="pl-10 h-11 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-xl text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Typ:</span>
              <select
                className="h-10 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1 text-sm font-medium text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                value={typeFilter}
                onChange={(e) => {
                  setPage(1)
                  setTypeFilter(e.target.value as "" | EventType)
                }}
              >
                <option value="">Wszystkie wydarzenia</option>
                <option value="training">Treningi</option>
                <option value="match">Mecze</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Limit:</span>
              <select
                className="h-10 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1 text-sm font-medium text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                value={perPage}
                onChange={(e) => {
                  setPage(1)
                  setPerPage(Number(e.target.value))
                }}
              >
                <option value={5}>5 na stronę</option>
                <option value={10}>10 na stronę</option>
                <option value={20}>20 na stronę</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm">
            {error}
          </div>
        )}

        {/* Content list/table */}
        <div className="border border-gray-100 rounded-xl overflow-hidden shadow-inner bg-gray-50/20">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px] font-bold text-gray-700">Typ</TableHead>
                <TableHead className="font-bold text-gray-700">Wydarzenie</TableHead>
                <TableHead className="font-bold text-gray-700">Drużyna</TableHead>
                <TableHead className="font-bold text-gray-700">Termin</TableHead>
                <TableHead className="font-bold text-gray-700">Czas trwania</TableHead>
                <TableHead className="font-bold text-gray-700">Obecność</TableHead>
                <TableHead className="w-[100px] text-right font-bold text-gray-700">Akcja</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center gap-2 justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                      <span className="text-sm font-medium">Ładowanie wydarzeń...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-gray-500">
                    <div className="max-w-md mx-auto space-y-3">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
                      <h3 className="font-semibold text-gray-800 text-lg">Brak zaplanowanych wydarzeń</h3>
                      <p className="text-sm text-gray-400">
                        Nie znaleziono żadnych meczów ani treningów dla Twoich drużyn spełniających kryteria wyszukiwania.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={() => handleOpenDetails(item)}
                    className="hover:bg-blue-50/20 cursor-pointer transition-colors border-b border-gray-100 group"
                  >
                    <TableCell className="py-4">
                      {item.event_type === "match" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm shadow-blue-50/30">
                          <Trophy className="w-3.5 h-3.5" />
                          {EVENT_TYPE_LABELS[item.event_type]}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm shadow-indigo-50/30">
                          <Dumbbell className="w-3.5 h-3.5" />
                          {EVENT_TYPE_LABELS[item.event_type]}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-sm">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-gray-600 font-medium">{item.team_name ?? "Brak nazwy"}</TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{new Date(item.scheduled_at).toLocaleDateString()}</span>
                        <span className="text-gray-300 font-normal">|</span>
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-100/80 px-2.5 py-1 rounded-lg text-gray-600 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {item.duration_minutes} min
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      {item.attendance_status === "obecny" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-100 px-2.5 py-1 text-xs font-bold text-green-700 shadow-sm shadow-green-50/30">
                          <Check className="w-3 h-3 text-green-600" />
                          Obecny
                        </span>
                      ) : item.attendance_status === "nieobecny" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 shadow-sm shadow-rose-50/30">
                          <X className="w-3 h-3 text-rose-600" />
                          Nieobecny
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-400">
                          Brak decyzji
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="group-hover:bg-blue-50 group-hover:text-blue-700 text-gray-400 rounded-lg hover:text-blue-850 transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDetails(item)
                        }}
                      >
                        Szczegóły
                        <ChevronRight className="w-4 h-4 ml-1 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-sm text-gray-500 font-medium">
          <span>
            Wyświetlono stronę <strong className="text-gray-800">{meta.current_page}</strong> z <strong className="text-gray-800">{meta.last_page}</strong> (łącznie <strong className="text-gray-800">{meta.total}</strong> wyników)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl px-4 font-semibold text-gray-600 hover:text-blue-650 disabled:opacity-50"
              disabled={meta.current_page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl px-4 font-semibold text-gray-600 hover:text-blue-650 disabled:opacity-50"
              disabled={meta.current_page >= meta.last_page || loading}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Następna
            </Button>
          </div>
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
                          ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-600/20"
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
                          ? "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/20"
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

              {/* Sekcja oceny zmęczenia (widoczna tylko dla przeszłych wydarzeń) */}
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

                  {/* Wybór 1-10 */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-gray-500 block">Wybierz stopień zmęczenia (1 - najniższe, 10 - najwyższe):</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
                        const isSelected = fatigueRatingInput === rating;
                        let btnStyle = "bg-white text-gray-700 border-gray-200 hover:bg-gray-50";
                        if (isSelected) {
                          if (rating <= 3) {
                            btnStyle = "bg-green-600 text-white border-green-600 shadow-lg shadow-green-600/20 hover:bg-green-700";
                          } else if (rating <= 7) {
                            btnStyle = "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20 hover:bg-amber-650";
                          } else {
                            btnStyle = "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/20 hover:bg-rose-700";
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
                            className={`h-9 w-full rounded-lg text-xs font-bold border transition-all flex items-center justify-center ${btnStyle}`}
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
                        {eventDetails.coach_role === "coach" ? "Trener" : eventDetails.coach_role === "admin" ? "Administrator" : eventDetails.coach_role}
                      </div>
                      {eventDetails.coach_email && (
                        <a
                          href={`mailto:${eventDetails.coach_email}`}
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline pt-1"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>{eventDetails.coach_email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Close */}
              <div className="border-t border-gray-100 pt-4 flex gap-2">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11" onClick={() => setIsSheetOpen(false)}>
                  Zamknij
                </Button>
              </div>

            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
