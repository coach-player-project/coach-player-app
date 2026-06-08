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
  Calendar, 
  Sparkles, 
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Dumbbell,
  Check,
  Presentation,
  Wrench,
  Users
} from "lucide-react"

interface ExerciseItem {
  id?: string
  name: string
  description: string
  canvas_schema: string | null
  order_index: number
  tools_count: number
}

interface TrainingUnitItem {
  id: string
  title: string
  description: string | null
  scheduled_at: string
  duration_minutes: number
  team_name: string
  team_id: string
  exercises?: ExerciseItem[]
}

interface TeamOption {
  id: string
  name: string
}

// Predefined training tools
const TRAINING_TOOLS = [
  { name: "Piłki", icon: "⚽" },
  { name: "Pachołki", icon: "🟧" },
  { name: "Znaczniki", icon: "👕" },
  { name: "Małe bramki", icon: "🥅" },
  { name: "Drabinki", icon: "🪜" },
  { name: "Tyczki", icon: "📍" },
]

export default function CoachTrainingUnitsPage() {
  const [units, setUnits] = useState<TrainingUnitItem[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [loading, setLoading] = useState(true)
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editor states
  const [selectedUnit, setSelectedUnit] = useState<TrainingUnitItem | null>(null)
  const [editorLoading, setEditorLoading] = useState(false)
  
  // Exercise Builder State (within Editor)
  const [exercises, setExercises] = useState<ExerciseItem[]>([])

  // Modal for Canvas Tactical Board
  const [tacticalModalOpen, setTacticalModalOpen] = useState(false)
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null)

  // Form states for creating a new training unit
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState({
    team_id: "",
    title: "",
    description: "",
    scheduled_at: "",
    duration_minutes: 90
  })

  // Load list of training sessions
  async function loadTrainingUnits() {
    setLoading(true)
    setError(null)
    try {
      // Fetch only training events
      const res = await apiFetch("/coach/events?event_type=training&per_page=100") as { data?: TrainingUnitItem[] }
      setUnits(res.data || [])
    } catch (err) {
      console.error(err)
      setError("Nie udało się załadować jednostek treningowych.")
    } finally {
      setLoading(false)
    }
  }

  // Load coached teams
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
    loadTrainingUnits()
    loadTeams()
  }, [])

  // Create training unit action (basic event creator)
  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.team_id || !form.title.trim()) return

    setSubmitting(true)
    try {
      const payload = {
        team_id: form.team_id,
        event_type: "training",
        title: form.title.trim(),
        description: form.description.trim() || null,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : new Date().toISOString(),
        duration_minutes: Number(form.duration_minutes) || 90,
        exercises: [] // start empty, coach will build exercises in editor
      }

      const res = await apiFetch("/coach/events", {
        method: "POST",
        body: JSON.stringify(payload)
      }) as { event: TrainingUnitItem }

      setShowCreateForm(false)
      setForm({
        team_id: teams[0]?.id || "",
        title: "",
        description: "",
        scheduled_at: "",
        duration_minutes: 90
      })
      
      // Open editor immediately
      handleOpenEditor(res.event)
      loadTrainingUnits()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Wystąpił błąd podczas tworzenia treningu.")
    } finally {
      setSubmitting(false)
    }
  }

  // Open unit editor and load exercises
  const handleOpenEditor = async (unit: TrainingUnitItem) => {
    setSelectedUnit(unit)
    setEditorLoading(true)
    setExercises([])
    try {
      const res = await apiFetch(`/coach/events/${unit.id}`) as { event: TrainingUnitItem }
      setExercises(res.event.exercises || [])
    } catch (err) {
      console.error(err)
      alert("Nie udało się pobrać szczegółów treningu.")
      setSelectedUnit(null)
    } finally {
      setEditorLoading(false)
    }
  }

  // Save everything (exercises and basic info if modified)
  const handleSaveUnitData = async () => {
    if (!selectedUnit) return

    setSubmitting(true)
    try {
      const payload = {
        title: selectedUnit.title,
        description: selectedUnit.description,
        scheduled_at: selectedUnit.scheduled_at,
        duration_minutes: selectedUnit.duration_minutes,
        exercises: exercises.map((ex, index) => ({
          name: ex.name.trim() || `Ćwiczenie ${index + 1}`,
          description: ex.description.trim(),
          canvas_schema: ex.canvas_schema,
          order_index: index + 1,
          tools_count: ex.tools_count
        }))
      }

      await apiFetch(`/coach/events/${selectedUnit.id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      })

      alert("Jednostka treningowa została pomyślnie zapisana!")
      loadTrainingUnits()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Wystąpił błąd podczas zapisywania treningu.")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete training unit action
  const handleDeleteUnit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Czy na pewno chcesz usunąć tę jednostkę treningową?")) return

    try {
      await apiFetch(`/coach/events/${id}`, { method: "DELETE" })
      loadTrainingUnits()
      if (selectedUnit?.id === id) {
        setSelectedUnit(null)
        setExercises([])
      }
    } catch (err) {
      console.error(err)
      alert("Wystąpił błąd podczas usuwania treningu.")
    }
  }

  // Exercise Management helpers
  const handleAddExercise = () => {
    const newEx: ExerciseItem = {
      name: "",
      description: "",
      canvas_schema: JSON.stringify({
        tools: {
          "Piłki": 0,
          "Pachołki": 0,
          "Znaczniki": 0,
          "Małe bramki": 0,
          "Drabinki": 0,
          "Tyczki": 0
        },
        canvas_data: null
      }),
      order_index: exercises.length + 1,
      tools_count: 0
    }
    setExercises(prev => [...prev, newEx])
  }

  const handleRemoveExercise = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  const handleMoveExercise = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return
    if (direction === "down" && idx === exercises.length - 1) return

    const targetIdx = direction === "up" ? idx - 1 : idx + 1
    const copy = [...exercises]
    const temp = copy[idx]
    copy[idx] = copy[targetIdx]
    copy[targetIdx] = temp
    setExercises(copy)
  }

  const handleUpdateExerciseField = (idx: number, field: keyof ExerciseItem, value: any) => {
    setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex))
  }

  // Parse tools dictionary and canvas_data from canvas_schema string
  const parseExerciseSchema = (schemaString: string | null) => {
    const defaultData = {
      tools: {
        "Piłki": 0,
        "Pachołki": 0,
        "Znaczniki": 0,
        "Małe bramki": 0,
        "Drabinki": 0,
        "Tyczki": 0
      } as Record<string, number>,
      canvas_data: null as string | null
    }

    if (!schemaString) return defaultData
    try {
      const parsed = JSON.parse(schemaString)
      return {
        tools: (parsed.tools || defaultData.tools) as Record<string, number>,
        canvas_data: (parsed.canvas_data || null) as string | null
      }
    } catch (e) {
      return defaultData
    }
  }

  // Update a single tool count in exercise
  const handleUpdateToolCount = (idx: number, toolName: string, delta: number) => {
    const currentEx = exercises[idx]
    const parsed = parseExerciseSchema(currentEx.canvas_schema)
    const currentVal = parsed.tools[toolName] || 0
    const newVal = Math.max(0, currentVal + delta)
    
    parsed.tools[toolName] = newVal
    
    // Sum total tools count
    const totalToolsCount = Object.values(parsed.tools).reduce((sum: number, v: any) => sum + Number(v || 0), 0)
    
    handleUpdateExerciseField(idx, "canvas_schema", JSON.stringify(parsed))
    handleUpdateExerciseField(idx, "tools_count", totalToolsCount)
  }

  // Tactical Board Modal helpers
  const handleOpenTacticalBoard = (idx: number) => {
    setActiveExerciseIndex(idx)
    setTacticalModalOpen(true)
  }

  const handleSaveTacticalBoard = (canvasDataString: string) => {
    if (activeExerciseIndex === null) return
    
    const currentEx = exercises[activeExerciseIndex]
    const parsed = parseExerciseSchema(currentEx.canvas_schema)
    parsed.canvas_data = canvasDataString
    
    handleUpdateExerciseField(activeExerciseIndex, "canvas_schema", JSON.stringify(parsed))
    setTacticalModalOpen(false)
    setActiveExerciseIndex(null)
  }

  // Date formatter
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return ""
      return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    } catch (e) {
      return ""
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header section with gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 md:p-8 shadow-xl shadow-blue-950/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Dumbbell className="h-10 w-10 text-blue-400 shrink-0" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">Jednostki treningowe</h1>
              <p className="text-blue-200 text-sm md:text-base">Kreator treningów: definiuj ćwiczenia, dobieraj sprzęt i projektuj schematy w Canvas.</p>
            </div>
          </div>
          
          {!selectedUnit && !showCreateForm && (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md h-11 px-5 font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/30 flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>Dodaj jednostkę</span>
            </Button>
          )}
        </div>
      </div>

      {/* Editor view (If unit is selected) */}
      {selectedUnit ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <button
              onClick={() => {
                setSelectedUnit(null)
                setExercises([])
              }}
              className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Wróć do listy treningów</span>
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">Planujesz trening:</span>
              <h2 className="text-lg font-bold text-gray-900">{selectedUnit.title}</h2>
              <Badge className="bg-blue-50 border border-blue-200 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full">
                {selectedUnit.team_name}
              </Badge>
            </div>
          </div>

          {editorLoading ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-gray-500 font-medium">Ładowanie jednostki treningowej...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Basic Information Edit */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 border-b border-gray-150 pb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Informacje o treningu
                  </h3>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tytuł treningu</label>
                    <Input
                      type="text"
                      value={selectedUnit.title}
                      onChange={(e) => setSelectedUnit(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                      className="rounded-xl focus:ring-2 focus:ring-blue-500 h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Czas rozpoczęcia</label>
                    <Input
                      type="datetime-local"
                      value={selectedUnit.scheduled_at ? new Date(selectedUnit.scheduled_at).toISOString().slice(0, 16) : ""}
                      onChange={(e) => setSelectedUnit(prev => prev ? ({ ...prev, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : "" }) : null)}
                      className="rounded-xl focus:ring-2 focus:ring-blue-500 h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Czas trwania (minuty)</label>
                    <Input
                      type="number"
                      value={selectedUnit.duration_minutes || ""}
                      onChange={(e) => setSelectedUnit(prev => prev ? ({ ...prev, duration_minutes: Number(e.target.value) }) : null)}
                      className="rounded-xl focus:ring-2 focus:ring-blue-500 h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Opis / Cel treningowy</label>
                    <textarea
                      value={selectedUnit.description || ""}
                      onChange={(e) => setSelectedUnit(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleSaveUnitData}
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-semibold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 transition-all"
                    >
                      {submitting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Check className="h-4.5 w-4.5" />}
                      <span>Zapisz całą jednostkę</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Exercise Drills List Builder */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-150 pb-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Dumbbell className="h-5 w-5 text-indigo-500" />
                      Struktura ćwiczeń ({exercises.length})
                    </h3>
                    <Button
                      type="button"
                      onClick={handleAddExercise}
                      className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl h-9 px-3 font-semibold text-xs flex items-center gap-1 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Dodaj ćwiczenie</span>
                    </Button>
                  </div>

                  {exercises.length === 0 ? (
                    <div className="text-center p-12 text-gray-500 border-2 border-dashed border-gray-100 rounded-xl">
                      Brak ćwiczeń w tym treningu. Kliknij przycisk powyżej, aby dodać pierwsze ćwiczenie.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {exercises.map((ex, index) => {
                        const parsedSchema = parseExerciseSchema(ex.canvas_schema)
                        return (
                          <div 
                            key={index} 
                            className="p-5 border border-gray-150 rounded-2xl bg-gray-50/30 space-y-4 relative group"
                          >
                            {/* Header row inside exercise card */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {index + 1}
                                </span>
                                <Input
                                  type="text"
                                  placeholder="Nazwa ćwiczenia (np. Rondo 4v2, Strzały)"
                                  value={ex.name}
                                  onChange={(e) => handleUpdateExerciseField(index, "name", e.target.value)}
                                  className="h-9 rounded-lg font-semibold text-gray-900 border-gray-200 bg-white focus:ring-1 focus:ring-blue-500 w-64 text-sm"
                                  required
                                />
                              </div>

                              {/* Ordering & delete tools */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleMoveExercise(index, "up")}
                                  disabled={index === 0}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveExercise(index, "down")}
                                  disabled={index === exercises.length - 1}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExercise(index)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* Description/Instructions */}
                            <div className="space-y-1">
                              <textarea
                                placeholder="Wpisz instrukcje lub opis ćwiczenia dla zawodników..."
                                value={ex.description}
                                onChange={(e) => handleUpdateExerciseField(index, "description", e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none min-h-[60px]"
                              />
                            </div>

                            {/* Training Tools counters */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Wrench className="h-3 w-3 text-gray-400" />
                                Sprzęt treningowy (Łącznie: {ex.tools_count})
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-white border border-gray-100 rounded-xl">
                                {TRAINING_TOOLS.map((t) => {
                                  const count = parsedSchema.tools[t.name] || 0
                                  return (
                                    <div key={t.name} className="flex items-center justify-between gap-1 text-xs">
                                      <span className="font-semibold text-gray-700 truncate" title={t.name}>
                                        {t.icon} {t.name}
                                      </span>
                                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0 bg-gray-50/50">
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateToolCount(index, t.name, -1)}
                                          className="px-2 py-1 hover:bg-gray-100 text-gray-600 font-bold transition-colors"
                                        >
                                          -
                                        </button>
                                        <span className="px-2 text-gray-900 font-bold w-6 text-center text-[11px]">
                                          {count}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateToolCount(index, t.name, 1)}
                                          className="px-2 py-1 hover:bg-gray-100 text-gray-600 font-bold transition-colors"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Drill Canvas designer */}
                            <div className="flex justify-between items-center gap-3 pt-2">
                              <Button
                                type="button"
                                onClick={() => handleOpenTacticalBoard(index)}
                                className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl h-9 px-4 font-semibold text-xs flex items-center gap-1.5 transition-all w-full sm:w-auto"
                              >
                                <Presentation className="h-4 w-4" />
                                <span>{parsedSchema.canvas_data ? "Zmień / Edytuj schemat" : "Zaprojektuj schemat ćwiczenia"}</span>
                              </Button>

                              {parsedSchema.canvas_data && (
                                <Badge className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold px-2 py-0.5 rounded-full text-[10px] shrink-0">
                                  Schemat skonfigurowany
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : showCreateForm ? (
        /* Creator Form View for new Training Session */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/40 p-6 md:p-8 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Nowa jednostka treningowa
            </h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              Anuluj
            </button>
          </div>

          <form onSubmit={handleCreateUnit} className="space-y-4">
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
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Czas trwania (minuty)</label>
                <Input
                  type="number"
                  placeholder="np. 90, 120"
                  value={form.duration_minutes}
                  onChange={(e) => setForm(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                  className="h-10 rounded-xl focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tytuł treningu</label>
              <Input
                type="text"
                placeholder="np. Trening motoryczny, Taktyka obronna"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="h-10 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Opis / Cel główny</label>
              <textarea
                placeholder="Wpisz krótki cel treningowy lub opis jednostki..."
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Czas rozpoczęcia</label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                className="h-10 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
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
                <span>Utwórz i otwórz kreator ćwiczeń</span>
              </Button>
            </div>
          </form>
        </div>
      ) : (
        /* List View for Units */
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col justify-center items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-gray-500 font-medium">Ładowanie jednostek treningowych...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-800 rounded-2xl border border-red-100 p-6 text-center">
              <p className="font-semibold">{error}</p>
            </div>
          ) : units.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-500">
              Nie utworzyłeś jeszcze żadnych jednostek treningowych. Kliknij przycisk powyżej, aby dodać swój pierwszy trening.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  onClick={() => handleOpenEditor(unit)}
                  className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex flex-col justify-between group relative"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <Badge className="bg-blue-50 border border-blue-100 text-blue-700 font-semibold rounded-full px-2.5 py-0.5 text-xs">
                        {unit.team_name}
                      </Badge>
                      <button
                        onClick={(e) => handleDeleteUnit(unit.id, e)}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 absolute top-4 right-4"
                        title="Usuń trening"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-lg pr-6">
                      {unit.title}
                    </h3>

                    {unit.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                        {unit.description}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-50 mt-5 pt-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>Termin:</span>
                      <span className="text-gray-700">{formatDate(unit.scheduled_at)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span>Czas trwania:</span>
                      <span className="text-gray-700">{unit.duration_minutes} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tactical Board Canvas Modal */}
      {tacticalModalOpen && activeExerciseIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-5xl bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <div className="flex items-center gap-2">
                <Presentation className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-gray-900">
                  Projektujesz schemat dla: {exercises[activeExerciseIndex]?.name || `Ćwiczenie ${activeExerciseIndex + 1}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTacticalModalOpen(false)
                  setActiveExerciseIndex(null)
                }}
                className="text-gray-400 hover:text-gray-600 font-semibold text-sm"
              >
                Zamknij
              </button>
            </div>
            <div className="overflow-y-auto max-h-[70vh] p-1">
              <TacticalBoard
                initialData={parseExerciseSchema(exercises[activeExerciseIndex]?.canvas_schema).canvas_data}
                onSave={handleSaveTacticalBoard}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
