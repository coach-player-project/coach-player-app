"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { TacticalBoard } from "@/components/tactical-board"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Presentation, 
  Calendar, 
  FileText, 
  Sparkles, 
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
}

interface TeamOption {
  id: string
  name: string
}

export default function CoachTacticsPage() {
  const [tactics, setTactics] = useState<TacticItem[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [loading, setLoading] = useState(true)
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Selected tactic for editor
  const [selectedTactic, setSelectedTactic] = useState<TacticItem | null>(null)
  const [selectedTacticData, setSelectedTacticData] = useState<string | null>(null)
  const [editorLoading, setEditorLoading] = useState(false)

  // Creation modal/form states
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState({
    team_id: "",
    title: "",
    description: "",
    formation: "4-4-2",
    match_date: "",
    show_opponents: true
  })

  // Load list of tactics
  async function loadTactics() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch("/coach/tactics") as { data: TacticItem[] }
      setTactics(res.data || [])
    } catch (err) {
      console.error(err)
      setError("Nie udało się załadować taktyk.")
    } finally {
      setLoading(false)
    }
  }

  // Load coached teams for the creation dropdown
  async function loadTeams() {
    setTeamsLoading(true)
    try {
      const res = await apiFetch("/coach/teams?per_page=100") as { data?: TeamOption[] }
      setTeams(res.data || [])
      if (res.data && res.data.length > 0) {
        setForm(prev => ({ ...prev, team_id: res.data![0].id }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setTeamsLoading(false)
    }
  }

  useEffect(() => {
    loadTactics()
    loadTeams()
  }, [])

  // Create tactic action
  const handleCreateTactic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.team_id || !form.title.trim()) return

    setSubmitting(true)
    try {
      const payload = {
        team_id: form.team_id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        formation: form.formation,
        match_date: form.match_date ? new Date(form.match_date).toISOString() : null,
        canvas_data: JSON.stringify({
          formation: form.formation,
          showOpponents: form.show_opponents
        })
      }

      const res = await apiFetch("/coach/tactics", {
        method: "POST",
        body: JSON.stringify(payload)
      }) as { tactic: TacticItem }

      setShowCreateForm(false)
      setForm({
        team_id: teams[0]?.id || "",
        title: "",
        description: "",
        formation: "4-4-2",
        match_date: "",
        show_opponents: true
      })
      
      // Open editor immediately for the newly created tactic
      handleOpenEditor(res.tactic)
      loadTactics()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Wystąpił błąd podczas tworzenia taktyki.")
    } finally {
      setSubmitting(false)
    }
  }

  // Load a single tactic with details (including canvas_data)
  const handleOpenEditor = async (tactic: TacticItem) => {
    setSelectedTactic(tactic)
    setEditorLoading(true)
    setSelectedTacticData(null)
    try {
      const res = await apiFetch(`/coach/tactics/${tactic.id}`) as { tactic: TacticItem & { canvas_data?: string } }
      setSelectedTacticData(res.tactic.canvas_data || null)
    } catch (err) {
      console.error(err)
      alert("Nie udało się załadować danych tablicy taktycznej.")
      setSelectedTactic(null)
    } finally {
      setEditorLoading(false)
    }
  }

  // Save tactical board changes (canvas_data & notes)
  const handleSaveTacticData = async (canvasDataString: string) => {
    if (!selectedTactic) return

    try {
      // Parse canvas data to update the local formation if changed inside editor
      let parsedFormation = selectedTactic.formation
      try {
        const parsed = JSON.parse(canvasDataString)
        if (parsed.formation) parsedFormation = parsed.formation
      } catch (e) {}

      await apiFetch(`/coach/tactics/${selectedTactic.id}`, {
        method: "PUT",
        body: JSON.stringify({
          canvas_data: canvasDataString,
          formation: parsedFormation
        })
      })

      alert("Taktyka została pomyślnie zapisana!")
      loadTactics()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Błąd podczas zapisywania taktyki.")
    }
  }

  // Delete tactic action
  const handleDeleteTactic = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Czy na pewno chcesz usunąć tę taktykę?")) return

    try {
      await apiFetch(`/coach/tactics/${id}`, { method: "DELETE" })
      loadTactics()
      if (selectedTactic?.id === id) {
        setSelectedTactic(null)
        setSelectedTacticData(null)
      }
    } catch (err) {
      console.error(err)
      alert("Wystąpił błąd podczas usuwania taktyki.")
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
              <p className="text-blue-200 text-sm md:text-base">Twórz formacje, ustawiaj graczy na wirtualnym boisku i planuj ruchy zespołu.</p>
            </div>
          </div>
          
          {!selectedTactic && !showCreateForm && (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md h-11 px-5 font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/30 flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>Dodaj taktykę</span>
            </Button>
          )}
        </div>
      </div>

      {/* Editor view (If tactic is selected) */}
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
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">Edytujesz:</span>
              <h2 className="text-lg font-bold text-gray-900">{selectedTactic.title}</h2>
              <Badge className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full">
                {selectedTactic.formation || "Brak formacji"}
              </Badge>
            </div>
          </div>

          {editorLoading ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-gray-500 font-medium">Ładowanie tablicy taktycznej...</span>
            </div>
          ) : (
            <TacticalBoard 
              initialData={selectedTacticData} 
              onSave={handleSaveTacticData} 
            />
          )}
        </div>
      ) : showCreateForm ? (
        /* Creator Form View */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/40 p-6 md:p-8 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Nowy plan taktyczny
            </h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              Anuluj
            </button>
          </div>

          <form onSubmit={handleCreateTactic} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Wybierz drużynę</label>
                {teamsLoading ? (
                  <div className="flex items-center gap-2 h-10 px-3 border border-gray-200 rounded-xl bg-gray-50">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-xs text-gray-400">Wczytywanie...</span>
                  </div>
                ) : (
                  <select
                    value={form.team_id}
                    onChange={(e) => setForm(prev => ({ ...prev, team_id: e.target.value }))}
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Ustawienie domyślne</label>
                <select
                  value={form.formation}
                  onChange={(e) => setForm(prev => ({ ...prev, formation: e.target.value }))}
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="4-4-2">4-4-2</option>
                  <option value="4-3-3">4-3-3</option>
                  <option value="3-5-2">3-5-2</option>
                  <option value="4-2-3-1">4-2-3-1</option>
                  <option value="5-3-2">5-3-2</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tytuł taktyki</label>
              <Input
                type="text"
                placeholder="np. Pressing wysoki 4-3-3, Defensywne 4-4-2 na Wisłę"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="h-10 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Opis / Cel taktyczny</label>
              <textarea
                placeholder="Wpisz krótki cel taktyczny lub opis dla zawodników..."
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Data najbliższego meczu (opcjonalnie)</label>
              <Input
                type="date"
                value={form.match_date}
                onChange={(e) => setForm(prev => ({ ...prev, match_date: e.target.value }))}
                className="h-10 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 pb-1">
              <input
                id="show_opponents"
                type="checkbox"
                checked={form.show_opponents}
                onChange={(e) => setForm(prev => ({ ...prev, show_opponents: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="show_opponents" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                Uwzględnij zespół przeciwny na tablicy
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl border-gray-200 h-10 px-5 font-semibold"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md h-10 px-5 font-semibold transition-all hover:shadow-lg flex items-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Utwórz i otwórz tablicę</span>
              </Button>
            </div>
          </form>
        </div>
      ) : (
        /* List View */
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col justify-center items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-gray-500 font-medium">Ładowanie Twoich schematów taktycznych...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-800 rounded-2xl border border-red-100 p-6 text-center">
              <p className="font-semibold">{error}</p>
            </div>
          ) : tactics.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-500">
              Nie stworzyłeś jeszcze żadnych planów taktycznych. Kliknij przycisk powyżej, aby dodać swój pierwszy schemat.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tactics.map((tactic) => (
                <div
                  key={tactic.id}
                  onClick={() => handleOpenEditor(tactic)}
                  className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex flex-col justify-between group relative"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <Badge className="bg-blue-50 border border-blue-100 text-blue-700 font-semibold rounded-full px-2.5 py-0.5 text-xs">
                        {tactic.team_name}
                      </Badge>
                      <button
                        onClick={(e) => handleDeleteTactic(tactic.id, e)}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 absolute top-4 right-4"
                        title="Usuń taktykę"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-lg pr-6">
                      {tactic.title}
                    </h3>

                    {tactic.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                        {tactic.description}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-50 mt-5 pt-4 flex flex-col gap-2">
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
