"use client"

import { Users, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"

interface PlayerData {
  id: string
  user_id: string
  name: string
  email: string
  phone: string
  team_name: string
  last_fatigue_rating: number | null
  last_fatigue_submitted_at: string | null
  avatar_initials: string
}

export default function CoachPage() {
  const [players, setPlayers] = useState<PlayerData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPlayers() {
      try {
        const res = await apiFetch("/coach/dashboard/players") as { players: PlayerData[] }
        setPlayers(res.players || [])
      } catch (err) {
        console.error(err)
        setError("Wystąpił błąd podczas ładowania zawodników zespołu.")
      } finally {
        setLoading(false)
      }
    }
    loadPlayers()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Pulpit Trenera</h1>
        <p className="text-gray-500 text-lg">Witaj w panelu głównym. Zarządzaj swoimi zawodnikami i planuj kolejne kroki.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Planowanie treningów", link: "Wkrótce...", color: "bg-blue-100 text-blue-700" },
          { title: "Tworzenie taktyki", link: "Wkrótce...", color: "bg-purple-100 text-purple-700" },
          { title: "Jednostki treningowe", link: "Wkrótce...", color: "bg-orange-100 text-orange-700" },
          { title: "Wysyłanie ankiet", link: "Wkrótce...", color: "bg-green-100 text-green-700" },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${item.color}`}>
              {/* Miejsce na ikonę */}
              <div className="w-6 h-6 opacity-70" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.link}</p>
          </div>
        ))}
      </div>

      {/* Tabela Zespołu */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-gray-700" />
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Twój Zespół</h2>
        </div>
        
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 flex flex-col justify-center items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-gray-500 font-medium">Ładowanie zawodników...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 rounded-xl border border-red-100 p-6 text-center">
            <p className="font-medium">{error}</p>
          </div>
        ) : players.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-500">
            Brak zawodników w przypisanych Ci zespołach.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                    <th className="py-4 px-6 font-medium">Zawodnik</th>
                    <th className="py-4 px-6 font-medium">Drużyna</th>
                    <th className="py-4 px-6 font-medium text-center">Telefon</th>
                    <th className="py-4 px-6 font-medium text-center">Ostatnie zmęczenie</th>
                    <th className="py-4 px-6 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {players.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-sm shrink-0">
                            {player.avatar_initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{player.name}</span>
                            <span className="text-xs text-gray-500">{player.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-600">{player.team_name}</td>
                      <td className="py-4 px-6 text-center text-gray-600 font-medium">{player.phone}</td>
                      <td className="py-4 px-6 text-center">
                        {player.last_fatigue_rating !== null ? (
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            player.last_fatigue_rating <= 3 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : player.last_fatigue_rating <= 7 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {player.last_fatigue_rating}/10
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Brak ocen</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Aktywny
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

