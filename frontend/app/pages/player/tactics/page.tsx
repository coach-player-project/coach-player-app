"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { TacticalBoard } from "@/components/tactical-board"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Presentation, 
  Calendar, 
  ArrowLeft,
  PenTool
} from "lucide-react"

interface TacticItem {
  id: string
  title: string
  description: string | null
  formation: string | null
  match_date: string | null
  created_at: string
  team_name: string
  team_id: string
  creator_first_name?: string
  creator_last_name?: string
  creator_role?: string
}

export default function PlayerTacticsPage() {
  const [tactics, setTactics] = useState<TacticItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Selected tactic for viewer
  const [selectedTactic, setSelectedTactic] = useState<TacticItem | null>(null)
  const [selectedTacticData, setSelectedTacticData] = useState<string | null>(null)
  const [viewerLoading, setViewerLoading] = useState(false)

  // Load list of tactics
  async function loadTactics() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch("/player/tactics") as { data: TacticItem[] }
      setTactics(res.data || [])
    } catch (err) {
      console.error(err)
      setError("Nie udało się załadować taktyk Twojego zespołu.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTactics()
  }, [])

  // Load a single tactic with details (including canvas_data)
  const handleOpenViewer = async (tactic: TacticItem) => {
    setSelectedTactic(tactic)
    setViewerLoading(true)
    setSelectedTacticData(null)
    try {
      const res = await apiFetch(`/player/tactics/${tactic.id}`) as { tactic: TacticItem & { canvas_data?: string } }
      setSelectedTacticData(res.tactic.canvas_data || null)
    } catch (err) {
      console.error(err)
      alert("Nie udało się załadować tablicy taktycznej.")
      setSelectedTactic(null)
    } finally {
      setViewerLoading(false)
    }
  }

  // Date formatter
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return null
      return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })
    } catch (e) {
      return null
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header section with gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 md:p-8 shadow-xl shadow-blue-950/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Presentation className="h-10 w-10 text-blue-400 shrink-0" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">Taktyka meczowa</h1>
              <p className="text-blue-200 text-sm md:text-base">Przeglądaj schematy formacji oraz notatki taktyczne przygotowane przez trenera.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Viewer view (If tactic is selected) */}
      {selectedTactic ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedTactic(null)
                setSelectedTacticData(null)
              }}
              className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Wróć do listy taktyk</span>
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-500">Przeglądasz:</span>
              <h2 className="text-lg font-bold text-gray-900">{selectedTactic.title}</h2>
              <Badge className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full">
                {selectedTactic.formation || "Brak formacji"}
              </Badge>
              {selectedTactic.creator_first_name && (
                <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md font-semibold">
                  Autor: {selectedTactic.creator_first_name} {selectedTactic.creator_last_name} ({selectedTactic.creator_role || "Trener"})
                </span>
              )}
            </div>
          </div>

          {viewerLoading ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-gray-500 font-medium">Ładowanie tablicy taktycznej...</span>
            </div>
          ) : (
            <TacticalBoard 
              initialData={selectedTacticData} 
              readOnly={true} 
            />
          )}
        </div>
      ) : (
        /* List View */
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col justify-center items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-gray-500 font-medium">Ładowanie schematów Twojej drużyny...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-800 rounded-2xl border border-red-100 p-6 text-center">
              <p className="font-semibold">{error}</p>
            </div>
          ) : tactics.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-500">
              Twój trener nie udostępnił jeszcze żadnych schematów taktycznych dla Twojej drużyny.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tactics.map((tactic) => (
                <div
                  key={tactic.id}
                  onClick={() => handleOpenViewer(tactic)}
                  className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex flex-col justify-between group relative"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <Badge className="bg-blue-50 border border-blue-100 text-blue-700 font-semibold rounded-full px-2.5 py-0.5 text-xs">
                        {tactic.team_name}
                      </Badge>
                    </div>

                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-lg">
                      {tactic.title}
                    </h3>

                    {tactic.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                        {tactic.description}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-50 mt-5 pt-4 flex flex-col gap-2">
                    {tactic.creator_first_name && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                        <span className="text-gray-400">Autor:</span>
                        <span className="text-gray-700">
                          {tactic.creator_first_name} {tactic.creator_last_name} ({tactic.creator_role || "Trener"})
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                      <PenTool className="h-3.5 w-3.5 text-gray-400" />
                      <span>Formacja:</span>
                      <span className="text-gray-700">{tactic.formation || "4-4-2"}</span>
                    </div>

                    {tactic.match_date && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>Mecz:</span>
                        <span className="text-gray-700">{formatDate(tactic.match_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
