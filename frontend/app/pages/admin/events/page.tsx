"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  Shield,
  Clock,
  Edit2,
  Trash2,
  Dumbbell,
  Trophy,
  ChevronUp,
  ChevronDown,
  Filter,
  Plus,
  Save,
  X,
  Search,
  Sparkles,
  AlertCircle,
  FileCode,
  Calendar,
  ChevronRight,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type EventType = "training" | "match";

type EventItem = {
  id: string;
  team_id: string;
  event_type: EventType;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  canvas_data?: string | null;
  google_event_id?: string | null;
  team_name?: string;
  coach_first_name?: string;
  coach_last_name?: string;
  coach_email?: string;
};

type TeamOption = {
  id: string;
  name: string;
};

type EventsResponse = {
  data: EventItem[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  training: "Trening",
  match: "Mecz",
};

type EventFormState = {
  team_id: string;
  event_type: EventType;
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: string;
  canvas_data: string;
  google_event_id: string;
};

const initialForm: EventFormState = {
  team_id: "",
  event_type: "training",
  title: "",
  description: "",
  scheduled_at: "",
  duration_minutes: "90",
  canvas_data: "",
  google_event_id: "",
};

function toDatetimeLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toApiDatetime(value: string) {
  if (!value) return "";
  return new Date(value).toISOString();
}

export default function AdminEventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtrowanie, wyszukiwanie i sortowanie
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortBy, setSortBy] = useState("scheduled_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [meta, setMeta] = useState<EventsResponse["meta"]>({
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(initialForm);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<EventItem | null>(null);

  const isEditing = Boolean(editingId);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));
    params.set("sort_by", sortBy);
    params.set("sort_dir", sortDir);
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (filterTeam) {
      params.set("team_id", filterTeam);
    }
    if (filterType) {
      params.set("event_type", filterType);
    }
    return params.toString();
  }, [page, perPage, search, filterTeam, filterType, sortBy, sortDir]);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch(`/admin/events?${queryString}`)) as EventsResponse;
      setItems(res.data ?? []);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać wydarzeń.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTeams() {
    setTeamsLoading(true);
    try {
      const res = (await apiFetch("/teams?per_page=100&sort_by=name&sort_dir=asc")) as {
        data?: TeamOption[];
      };
      setTeams(res.data ?? []);
    } catch {
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, [queryString]);

  useEffect(() => {
    void loadTeams();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setShowAdvanced(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const payload = {
      team_id: form.team_id.trim(),
      event_type: form.event_type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      scheduled_at: toApiDatetime(form.scheduled_at),
      duration_minutes: Number(form.duration_minutes),
      canvas_data: form.canvas_data.trim() || null,
      google_event_id: form.google_event_id.trim() || null,
    };

    try {
      if (isEditing && editingId) {
        await apiFetch(`/admin/events/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setMessage("Wydarzenie zostało zaktualizowane.");
      } else {
        await apiFetch("/admin/events", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("Wydarzenie zostało utworzone.");
      }
      resetForm();
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać wydarzenia.");
    } finally {
      setSubmitting(false);
    }
  }

  function onEdit(item: EventItem) {
    setEditingId(item.id);
    setForm({
      team_id: item.team_id ?? "",
      event_type: item.event_type ?? "training",
      title: item.title ?? "",
      description: item.description ?? "",
      scheduled_at: toDatetimeLocal(item.scheduled_at),
      duration_minutes: String(item.duration_minutes ?? 90),
      canvas_data: item.canvas_data ?? "",
      google_event_id: item.google_event_id ?? "",
    });
    setShowAdvanced(Boolean(item.canvas_data || item.google_event_id));
    setMessage(null);
    setError(null);
    setSelectedEventDetails(null);
    // Przewiń do góry do formularza edycji
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onDelete(id: string) {
    const ok = window.confirm("Na pewno usunąć wydarzenie?");
    if (!ok) return;

    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/admin/events/${id}`, { method: "DELETE" });
      if (editingId === id) {
        resetForm();
      }
      if (selectedEventDetails?.id === id) {
        setSelectedEventDetails(null);
      }
      setMessage("Wydarzenie zostało usunięte.");
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć wydarzenia.");
    }
  }

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  }

  function renderSortIcon(field: string) {
    if (sortBy !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1 inline-block text-blue-600" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1 inline-block text-blue-600" />
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
      
      {/* NAGŁÓWEK STRONY */}
      <div className="bg-card p-6 md:p-8 rounded-xl shadow-sm border border-border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-blue-600" />
            Harmonogram Wydarzeń
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Zarządzaj w pełni treningami, meczami, przypisanymi drużynami oraz zaawansowanymi danymi taktycznymi i kalendarzem.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1.5 text-sm shadow-none font-medium">
            <Sparkles className="h-4 w-4 mr-1.5 text-blue-600 inline" />
            Łącznie: {meta.total} wydarzeń
          </Badge>
        </div>
      </div>

      {/* STRUKTURA DWUKOLUMNOWA DLA FORMULARZA I PODGLĄDU SZCZEGÓŁÓW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KOLUMNA LEWA: FORMULARZ DODAWANIA / EDYCJI */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 md:p-8">
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Edit2 className="h-5 w-5 text-blue-600" />
                    Edytuj Wydarzenie
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 text-blue-600" />
                    Dodaj Nowe Wydarzenie
                  </>
                )}
              </h2>
              {isEditing && (
                <button 
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700 text-xs font-medium flex items-center gap-1 bg-gray-100/50 px-2.5 py-1 rounded-md border border-gray-200 transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Anuluj edycję
                </button>
              )}
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* DRUŻYNA */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 tracking-wide uppercase flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-gray-400" /> Drużyna
                  </label>
                  <select
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition-colors"
                    value={form.team_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, team_id: e.target.value }))}
                    required
                    disabled={teamsLoading}
                  >
                    <option value="" disabled>
                      {teamsLoading ? "Ładowanie drużyn..." : "Wybierz drużynę"}
                    </option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TYP WYDARZENIA */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 tracking-wide uppercase flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5 text-gray-400" /> Typ wydarzenia
                  </label>
                  <select
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    value={form.event_type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        event_type: e.target.value as EventType,
                        duration_minutes: e.target.value === "match" ? "105" : "90",
                      }))
                    }
                    required
                  >
                    <option value="training">Trening</option>
                    <option value="match">Mecz ligowy / towarzyski</option>
                  </select>
                </div>

                {/* TYTUŁ */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 tracking-wide uppercase">
                    Nazwa wydarzenia / Tytuł
                  </label>
                  <Input
                    placeholder="Np. Trening taktyczny przed derbami, Mecz z Orłami..."
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    required
                    className="h-10 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
                  />
                </div>

                {/* DATA ROZPOCZĘCIA */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 tracking-wide uppercase flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" /> Data i godzina
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                    required
                    className="h-10 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
                  />
                </div>

                {/* CZAS TRWANIA */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 tracking-wide uppercase flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400" /> Czas trwania (minuty)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Np. 90, 105, 120"
                    value={form.duration_minutes}
                    onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                    required
                    className="h-10 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
                  />
                </div>

                {/* OPIS */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 tracking-wide uppercase">
                    Szczegółowy opis wydarzenia
                  </label>
                  <textarea
                    className="w-full min-h-[90px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="Wpisz cele treningu, zbiórkę zawodników, kolor strojów lub uwagi..."
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* SEKCJA ZAAWANSOWANE (ZWIJANA) */}
              <div className="border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors uppercase tracking-wide"
                >
                  {showAdvanced ? "Ukryj opcje zaawansowane" : "Pokaż opcje zaawansowane"}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} />
                </button>

                 {showAdvanced && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200/60 animate-slide-down">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-600 tracking-wide uppercase flex items-center gap-1">
                        <FileCode className="h-3 w-3 text-blue-600" /> Dane Taktyczne (Canvas JSON)
                      </label>
                      <textarea
                        className="w-full h-20 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 font-mono shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder='{"formation": "4-3-3", "positions": [...]}'
                        value={form.canvas_data}
                        onChange={(e) => setForm((prev) => ({ ...prev, canvas_data: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-600 tracking-wide uppercase flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 text-blue-600" /> Identyfikator Google Calendar
                      </label>
                      <Input
                        placeholder="gcal_event_id_xyz"
                        value={form.google_event_id}
                        onChange={(e) => setForm((prev) => ({ ...prev, google_event_id: e.target.value }))}
                        className="h-9 rounded-lg border-gray-200 text-xs focus:border-blue-500 shadow-sm"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        Umożliwia synchronizację wydarzenia z zewnętrznym kalendarzem Google.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* PRZYCISKI ZAPISU */}
              <div className="flex gap-3 pt-2">
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm px-6 font-semibold flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Stwórz wydarzenie"}
                </Button>
                {isEditing && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    className="border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-955 transition-colors rounded-xl font-semibold"
                  >
                    Anuluj
                  </Button>
                )}
              </div>
            </form>

             {message && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-xl border border-blue-200 text-sm flex items-center gap-2 animate-bounce-short">
                <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0" />
                {message}
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-sm flex items-center gap-2 animate-shake">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* KOLUMNA PRAWA: DETALE WYBRANEGO WYDARZENIA */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 h-full flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-950 flex items-center gap-2 mb-4 border-b border-border pb-3">
                <Info className="h-5 w-5 text-blue-600" />
                Szczegóły wydarzenia
              </h2>

              {selectedEventDetails ? (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                      Typ i nazwa
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedEventDetails.event_type === "training" ? (
                        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-none font-semibold flex items-center gap-1">
                          <Dumbbell className="h-3 w-3" /> Trening
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 shadow-none font-semibold flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> Mecz
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mt-2 tracking-tight">
                      {selectedEventDetails.title}
                    </h3>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                      Drużyna
                    </span>
                    <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-blue-600" />
                      {selectedEventDetails.team_name ?? selectedEventDetails.team_id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                        Termin
                      </span>
                      <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-500" />
                        {new Date(selectedEventDetails.scheduled_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-500 block mt-0.5">
                        godz. {new Date(selectedEventDetails.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                        Czas trwania
                      </span>
                      <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-gray-500" />
                        {selectedEventDetails.duration_minutes} min
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                      Opis / Uwagi
                    </span>
                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-line">
                      {selectedEventDetails.description || "Brak dodatkowego opisu."}
                    </p>
                  </div>

                  {selectedEventDetails.coach_first_name && (
                    <div className="border-t border-gray-100 pt-3">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                        Organizator
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">
                          {selectedEventDetails.coach_first_name[0]}{selectedEventDetails.coach_last_name?.[0] || ""}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-800 block leading-none">
                            {selectedEventDetails.coach_first_name} {selectedEventDetails.coach_last_name}
                          </span>
                          <span className="text-[10px] text-gray-500 block mt-0.5">
                            {selectedEventDetails.coach_email}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(selectedEventDetails.canvas_data || selectedEventDetails.google_event_id) && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                        Dane zaawansowane
                      </span>
                      
                      {selectedEventDetails.google_event_id && (
                        <div className="flex items-center justify-between text-xs bg-blue-50/50 p-2 rounded border border-blue-100 text-blue-800">
                          <span className="font-medium">Google Event ID:</span>
                          <span className="font-mono text-[10px]">{selectedEventDetails.google_event_id}</span>
                        </div>
                      )}

                      {selectedEventDetails.canvas_data && (
                        <div>
                          <span className="text-[10px] text-gray-500 block mb-1">Schemat taktyczny:</span>
                          <pre className="text-[9px] font-mono bg-gray-900 text-blue-400 p-2 rounded overflow-x-auto max-h-24">
                            {selectedEventDetails.canvas_data}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl p-4">
                  <Info className="h-8 w-8 mb-2 text-gray-300" />
                  <p className="text-xs font-medium">Kliknij wydarzenie w tabeli, aby wyświetlić jego pełne szczegóły w tym panelu.</p>
                </div>
              )}
            </div>

            <div className="text-[10px] text-gray-400 text-center border-t border-border pt-3 mt-4">
              Zaktualizowano w czasie rzeczywistym z API
            </div>
          </div>
        </div>
      </div>

      {/* PASEK WYSZUKIWANIA, FILTRÓW I SORTOWANIA */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-950">Wyszukiwanie i Filtrowanie</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* SEARCH */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
            <Input
              placeholder="Szukaj po nazwie, opisie lub drużynie..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="pl-10 h-11 rounded-xl border-gray-200 focus:border-blue-500 shadow-sm text-sm"
            />
          </div>

          {/* FILTER DRUŻYNA */}
          <div>
            <select
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              value={filterTeam}
              onChange={(e) => {
                setPage(1);
                setFilterTeam(e.target.value);
              }}
            >
              <option value="">Wszystkie drużyny</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* FILTER TYP */}
          <div>
            <select
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              value={filterType}
              onChange={(e) => {
                setPage(1);
                setFilterType(e.target.value);
              }}
            >
              <option value="">Wszystkie typy</option>
              <option value="training">Tylko Treningi</option>
              <option value="match">Tylko Mecze</option>
            </select>
          </div>

        </div>

        {/* PRZYCISKI DO SZYBKIEGO RESETU */}
        {(search || filterTeam || filterType || sortBy !== "scheduled_at" || sortDir !== "desc") && (
          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                setSearch("");
                setFilterTeam("");
                setFilterType("");
                setSortBy("scheduled_at");
                setSortDir("desc");
                setPage(1);
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Wyczyść wszystkie filtry
            </button>
          </div>
        )}
      </div>

      {/* TABELA WYDARZEŃ */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-gray-950">Lista Wydarzeń ({items.length} na tej stronie)</h3>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span>Wyników na stronę:</span>
            <select
              className="h-8 rounded-lg border border-gray-200 px-2 bg-white outline-none focus:border-blue-500"
              value={perPage}
              onChange={(e) => {
                setPage(1);
                setPerPage(Number(e.target.value));
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-100/50">
              <TableRow>
                <TableHead 
                  onClick={() => handleSort("event_type")}
                  className="py-4 text-xs font-bold uppercase text-gray-700 tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors"
                >
                  Typ {renderSortIcon("event_type")}
                </TableHead>
                <TableHead 
                  onClick={() => handleSort("title")}
                  className="py-4 text-xs font-bold uppercase text-gray-700 tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors"
                >
                  Tytuł {renderSortIcon("title")}
                </TableHead>
                <TableHead className="py-4 text-xs font-bold uppercase text-gray-700 tracking-wider">
                  Drużyna
                </TableHead>
                <TableHead 
                  onClick={() => handleSort("scheduled_at")}
                  className="py-4 text-xs font-bold uppercase text-gray-700 tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors"
                >
                  Termin {renderSortIcon("scheduled_at")}
                </TableHead>
                <TableHead 
                  onClick={() => handleSort("duration_minutes")}
                  className="py-4 text-xs font-bold uppercase text-gray-700 tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors"
                >
                  Czas {renderSortIcon("duration_minutes")}
                </TableHead>
                <TableHead className="text-right py-4 text-xs font-bold uppercase text-gray-700 tracking-wider pr-6">
                  Akcje
                </TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                      Ładowanie wydarzeń...
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    Nie znaleziono żadnych wydarzeń spełniających kryteria.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow 
                    key={item.id}
                    onClick={() => setSelectedEventDetails(item)}
                    className={`transition-colors cursor-pointer hover:bg-blue-50/20 group ${selectedEventDetails?.id === item.id ? "bg-blue-50/40" : ""}`}
                  >
                    
                    {/* TYP BADGE */}
                    <TableCell className="py-4">
                      {item.event_type === "training" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                          <Dumbbell className="h-3 w-3" /> Trening
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <Trophy className="h-3 w-3" /> Mecz
                        </span>
                      )}
                    </TableCell>
                    
                    {/* TYTUŁ */}
                    <TableCell className="font-semibold text-gray-900 py-4 max-w-[200px] truncate">
                      {item.title}
                      {item.description && (
                        <span className="block text-[11px] font-normal text-gray-400 truncate mt-0.5">
                          {item.description}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* DRUŻYNA */}
                    <TableCell className="text-gray-600 py-4">
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <Shield className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        {item.team_name ?? item.team_id}
                      </span>
                    </TableCell>
                    
                    {/* TERMIN */}
                    <TableCell className="text-gray-700 py-4 text-sm">
                      <span className="font-semibold">{new Date(item.scheduled_at).toLocaleDateString()}</span>
                      <span className="block text-[11px] text-gray-400 mt-0.5">
                        godz. {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </TableCell>
                    
                    {/* CZAS */}
                    <TableCell className="text-gray-700 py-4 text-sm font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {item.duration_minutes} min
                      </span>
                    </TableCell>
                    
                    {/* AKCJE */}
                    <TableCell className="text-right py-4 space-x-1.5 pr-6" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors rounded-lg font-semibold"
                        onClick={() => onEdit(item)}
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        Edytuj
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-8 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition-colors rounded-lg font-semibold shadow-none"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Usuń
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINACJA */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium text-gray-600">
          <div className="flex items-center gap-2">
            <span>
              Strona <strong className="text-gray-900">{meta.current_page}</strong> z <strong className="text-gray-900">{meta.last_page}</strong>
            </span>
            <span className="text-gray-300">|</span>
            <span>
              Pokazano <strong className="text-gray-900">{items.length}</strong> z <strong className="text-gray-900">{meta.total}</strong> wyników
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors disabled:opacity-40 disabled:pointer-events-none rounded-lg font-semibold"
            >
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page >= meta.last_page || loading}
              onClick={() => setPage((prev) => prev + 1)}
              className="border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors disabled:opacity-40 disabled:pointer-events-none rounded-lg font-semibold"
            >
              Następna
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
