"use client"

import { useState, useEffect } from "react"
import { Calendar, UserCheck, Activity, Loader2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

interface EventItem {
  id: string
  title: string
  event_type: 'training' | 'match'
  scheduled_at: string
  team_name: string
  attendance_status: string | null
}

interface DashboardSummary {
  next_event: EventItem | null
  unrated_past_event: EventItem | null
  average_fatigue: number | null
}

export default function PlayerPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await apiFetch("/player/dashboard/summary") as DashboardSummary
        setSummary(res)
      } catch (err) {
        console.error(err)
        setError("Wystąpił błąd podczas pobierania danych pulpitu.")
      } finally {
        setLoading(false)
      }
    }
    loadSummary()
  }, [])

  function formatDate(dateString: string) {
    try {
      const d = new Date(dateString)
      if (isNaN(d.getTime())) return dateString
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${day}.${month}.${year} o ${hours}:${minutes}`
    } catch (e) {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Pulpit Zawodnika</h1>
          <p className="text-gray-500 text-lg">Witaj w swoim panelu. Sprawdź nadchodzące treningi, taktykę i zgłoś swoją obecność.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 flex flex-col justify-center items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-gray-500 font-medium">Wczytywanie Twojego pulpitu...</span>
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Pulpit Zawodnika</h1>
          <p className="text-gray-500 text-lg">Witaj w swoim panelu. Sprawdź nadchodzące treningi, taktykę i zgłoś swoją obecność.</p>
        </div>
        <div className="bg-red-50 text-red-800 rounded-xl border border-red-100 p-6 text-center">
          <p className="font-medium">{error || "Brak danych pulpitu."}</p>
        </div>
      </div>
    )
  }

  const { next_event, unrated_past_event, average_fatigue } = summary

  // Najbliższy trening card info
  const nextEventTitle = next_event 
    ? (next_event.event_type === 'match' ? "Najbliższy mecz" : "Najbliższy trening") 
    : "Brak zaplanowanych wydarzeń"
  const nextEventDesc = next_event 
    ? `${next_event.title} - ${formatDate(next_event.scheduled_at)} (${next_event.team_name})` 
    : "Wszystkie treningi zostały zakończone lub brak przypisanych wydarzeń."

  // Status obecności card info
  const attendanceTitle = "Status obecności"
  let attendanceDesc = "Brak zaplanowanych wydarzeń"
  let attendanceColorClass = "bg-gray-100 text-gray-700"
  if (next_event) {
    if (next_event.attendance_status === 'obecny') {
      attendanceDesc = "Zgłoszono: Obecny"
      attendanceColorClass = "bg-emerald-100 text-emerald-700"
    } else if (next_event.attendance_status === 'nieobecny') {
      attendanceDesc = "Zgłoszono: Nieobecny"
      attendanceColorClass = "bg-rose-100 text-rose-700"
    } else {
      attendanceDesc = "Nie podjęto decyzji na najbliższe wydarzenie"
      attendanceColorClass = "bg-amber-100 text-amber-700"
    }
  }

  // Twoja forma card info
  const formTitle = unrated_past_event ? "Oceń zmęczenie!" : "Twoja forma"
  let formDesc = "Brak ocen z ostatnich 30 dni"
  let formColorClass = "bg-gray-100 text-gray-700"
  if (unrated_past_event) {
    formDesc = `Wypełnij ocenę za: ${unrated_past_event.title} z dnia ${formatDate(unrated_past_event.scheduled_at).split(' o ')[0]}`
    formColorClass = "bg-amber-100 text-amber-700 animate-pulse"
  } else if (average_fatigue !== null) {
    let statusLabel = "Stabilna"
    if (average_fatigue <= 3) {
      statusLabel = "Doskonała (Wypoczęty)"
      formColorClass = "bg-emerald-100 text-emerald-700"
    } else if (average_fatigue <= 6) {
      statusLabel = "Dobra"
      formColorClass = "bg-blue-100 text-blue-700"
    } else if (average_fatigue <= 8) {
      statusLabel = "Średnia (Zmęczony)"
      formColorClass = "bg-amber-100 text-amber-700"
    } else {
      statusLabel = "Niska (Przemęczony)"
      formColorClass = "bg-rose-100 text-rose-700"
    }
    formDesc = `${statusLabel} (Średnie zmęczenie: ${average_fatigue}/10)`
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Pulpit Zawodnika</h1>
        <p className="text-gray-500 text-lg">Witaj w swoim panelu. Sprawdź nadchodzące treningi, taktykę i zgłoś swoją obecność.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Karta: Najbliższy trening */}
        <Link href="/pages/player/events" className="group block bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-blue-100 text-blue-700">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
            {nextEventTitle}
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2">{nextEventDesc}</p>
        </Link>

        {/* Karta: Status obecności */}
        <Link href="/pages/player/events" className="group block bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${attendanceColorClass}`}>
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
            {attendanceTitle}
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
          </h3>
          <p className="text-sm text-gray-500">{attendanceDesc}</p>
        </Link>

        {/* Karta: Twoja forma / fatigue ratings */}
        <Link href="/pages/player/events" className="group block bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${formColorClass}`}>
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
            {formTitle}
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
          </h3>
          <p className="text-sm text-gray-500">{formDesc}</p>
        </Link>
      </div>
    </div>
  )
}

