"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Search, Trophy, Dumbbell, CalendarDays, Presentation, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { TacticalBoard } from "@/components/tactical-board";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EventType = "training" | "match";

type EventItem = {
  id: string;
  team_id: string;
  event_type: EventType;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  team_name?: string;
  canvas_data?: string | null;
  api_football_fixture_id?: number | null;
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

type EventFormState = {
  team_id: string;
  event_type: EventType;
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: string;
  canvas_data: string;
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  training: "Trening",
  match: "Mecz",
};

const initialForm: EventFormState = {
  team_id: "",
  event_type: "training",
  title: "",
  description: "",
  scheduled_at: "",
  duration_minutes: "90",
  canvas_data: "",
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

function defaultDuration(type: EventType) {
  return type === "match" ? "105" : "90";
}

export default function CoachEventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | EventType>("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [meta, setMeta] = useState<EventsResponse["meta"]>({
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTacticalModal, setShowTacticalModal] = useState(false);
  const [form, setForm] = useState<EventFormState>(initialForm);

  const isEditing = Boolean(editingId);
  const editingEvent = editingId ? items.find(item => item.id === editingId) : null;
  const isApiFootballEvent = Boolean(editingEvent?.api_football_fixture_id);

  // Calendar View states
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Attendance state
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<EventItem | null>(null);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSavingId, setAttendanceSavingId] = useState<string | null>(null);

  async function loadAttendance(eventId: string) {
    setAttendanceLoading(true);
    try {
      const res = (await apiFetch(`/coach/events/${eventId}/attendance`)) as {
        attendance: any[];
      };
      setAttendanceList(res.attendance ?? []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Nie udało się pobrać listy obecności.");
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function updatePlayerAttendance(eventId: string, userId: string, status: string) {
    setAttendanceSavingId(userId);
    try {
      await apiFetch(`/coach/events/${eventId}/attendance`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, status }),
      });
      await loadAttendance(eventId);
      setMessage("Zaktualizowano obecność zawodnika.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Nie udało się zaktualizować obecności.");
    } finally {
      setAttendanceSavingId(null);
    }
  }

  // Monthly Calendar Helpers
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const monthNames = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];
  const weekdayNames = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIdx = getFirstDayOfWeek(currentYear, currentMonth);

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayIdx; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(day);
    }
    return cells;
  }, [daysInMonth, firstDayIdx]);

  const getEventsForDay = (day: number) => {
    return items.filter(event => {
      const d = new Date(event.scheduled_at);
      return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  };

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (viewMode === "calendar") {
      params.set("page", "1");
      params.set("per_page", "100");
    } else {
      params.set("page", String(page));
      params.set("per_page", String(perPage));
    }
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (typeFilter) {
      params.set("event_type", typeFilter);
    }
    return params.toString();
  }, [page, perPage, search, typeFilter, viewMode]);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch(`/coach/events?${queryString}`)) as EventsResponse;
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
      const res = (await apiFetch("/coach/teams?per_page=100&sort_by=name&sort_dir=asc")) as {
        data?: TeamOption[];
      };
      const teamData = res.data ?? [];
      setTeams(teamData);
      if (!editingId && teamData.length > 0) {
        setForm((prev) => (prev.team_id ? prev : { ...prev, team_id: teamData[0].id }));
      }
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
    setForm({
      ...initialForm,
      team_id: teams[0]?.id ?? "",
    });
    setEditingId(null);
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
    };

    try {
      if (isEditing && editingId) {
        await apiFetch(`/coach/events/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setMessage("Wydarzenie zostało zaktualizowane.");
      } else {
        await apiFetch("/coach/events", {
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
    });
    setMessage(null);
    setError(null);
  }

  async function onDelete(id: string) {
    const ok = window.confirm("Na pewno usunąć wydarzenie?");
    if (!ok) return;

    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/coach/events/${id}`, { method: "DELETE" });
      if (editingId === id) {
        resetForm();
      }
      setMessage("Wydarzenie zostało usunięte.");
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć wydarzenia.");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section with rich aesthetics */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 md:p-8 shadow-xl shadow-blue-950/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-10 w-10 text-blue-400 shrink-0" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">Wydarzenia</h1>
              <p className="text-blue-200 text-sm md:text-base">Planuj treningi i mecze dla swoich drużyn. Zarządzaj terminami i monitoruj aktywność zespołu w jednym miejscu.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/40 p-6 space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-gray-900">{isEditing ? "Edytuj wydarzenie" : "Dodaj nowe wydarzenie"}</h2>
          <p className="text-xs text-gray-400 mt-1">Wypełnij poniższe dane, aby dodać trening lub mecz do kalendarza.</p>
        </div>

        {teams.length === 0 && !teamsLoading && (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-100 text-sm">
            Nie masz przypisanych drużyn. Skontaktuj się z administratorem.
          </div>
        )}

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Drużyna</label>
            <select
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1 text-sm font-medium text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
              value={form.team_id}
              onChange={(e) => setForm((prev) => ({ ...prev, team_id: e.target.value }))}
              disabled={teamsLoading || teams.length === 0 || isApiFootballEvent}
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

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Typ wydarzenia</label>
            <select
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1 text-sm font-medium text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
              value={form.event_type}
              onChange={(e) => {
                const eventType = e.target.value as EventType;
                setForm((prev) => ({
                  ...prev,
                  event_type: eventType,
                  duration_minutes: defaultDuration(eventType),
                }));
              }}
              required
              disabled={isApiFootballEvent}
            >
              <option value="training">Trening</option>
              <option value="match">Mecz</option>
            </select>
            {isApiFootballEvent && (
              <span className="text-[10px] text-green-600 font-semibold block mt-0.5">
                Wydarzenie zsynchronizowane z oficjalnymi rozgrywkami (typ zablokowany).
              </span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tytuł</label>
            <Input
              placeholder="Tytuł wydarzenia"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
              className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Termin</label>
            <Input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
              required
              className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Czas trwania (minuty)</label>
            <Input
              type="number"
              min={1}
              placeholder="Czas trwania (min)"
              value={form.duration_minutes}
              onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
              required
              className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-xl text-sm"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Opis (opcjonalnie)</label>
            <textarea
              className="w-full min-h-24 rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              placeholder="Wpisz krótki opis treningu lub instrukcje przedmeczowe..."
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plan Taktyczny (opcjonalnie)</label>
            <div className="flex flex-wrap gap-3 items-center">
              <Button
                type="button"
                onClick={() => setShowTacticalModal(true)}
                className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl px-4 py-2 font-semibold flex items-center gap-2 text-sm"
              >
                <Presentation className="h-4 w-4" />
                <span>{form.canvas_data ? "Zmień / Edytuj taktykę" : "Zaprojektuj schemat taktyczny"}</span>
              </Button>
              {form.canvas_data && (
                <Badge className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold px-2.5 py-1 rounded-full text-xs">
                  Tablica taktyczna została skonfigurowana
                </Badge>
              )}
            </div>
          </div>

          {form.event_type === "training" && isEditing && (
            <div className="md:col-span-2 p-4 bg-indigo-50 border border-indigo-150 rounded-xl text-indigo-700 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-semibold mt-2">
              <span>💡 Aby zarządzać ćwiczeniami (kreator drillów) i sprzętem dla tego treningu, przejdź do zakładki Jednostki Treningowe.</span>
              <Button
                type="button"
                onClick={() => window.location.href = "/pages/coach/training-units"}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1.5 text-[11px] font-bold shadow-sm transition-colors w-fit shrink-0 h-auto"
              >
                Otwórz Kreator
              </Button>
            </div>
          )}

          <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
            <Button
              type="submit"
              disabled={submitting || teams.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-semibold shadow-md shadow-blue-600/10 transition-all disabled:opacity-50"
            >
              {submitting ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Dodaj wydarzenie"}
            </Button>
            {isEditing && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-850 rounded-xl h-11 px-5 font-semibold transition-all"
                  onClick={() => {
                    const item = items.find((i) => i.id === editingId);
                    if (item) {
                      setSelectedEventForAttendance(item);
                      void loadAttendance(item.id);
                    }
                  }}
                >
                  Lista obecności
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="border-gray-200 bg-white hover:bg-gray-50 text-gray-705 rounded-xl h-11 px-6 font-semibold transition-all border"
                >
                  Anuluj edycję
                </Button>
              </>
            )}
          </div>
        </form>

        {message && <div className="mt-3 bg-green-50 border border-green-150 text-green-800 p-4 rounded-xl text-sm font-medium">{message}</div>}
        {error && <div className="mt-3 bg-red-50 border border-red-150 text-red-800 p-4 rounded-xl text-sm font-medium">{error}</div>}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-xl dark:shadow-none p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <Search className="w-5 h-5" />
            </span>
            <Input
              placeholder="Szukaj po nazwie / opisie / drużynie..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="pl-10 h-11 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-xl text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Widok:</span>
              <div className="flex bg-gray-105 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    viewMode === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-505 hover:text-gray-900"
                  }`}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    viewMode === "calendar" ? "bg-white text-blue-600 shadow-sm" : "text-gray-505 hover:text-gray-900"
                  }`}
                >
                  Kalendarz
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Typ:</span>
              <select
                className="h-10 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1 text-sm font-medium text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                value={typeFilter}
                onChange={(e) => {
                  setPage(1);
                  setTypeFilter(e.target.value as "" | EventType);
                }}
              >
                <option value="">Wszystkie typy</option>
                <option value="training">Treningi</option>
                <option value="match">Mecze</option>
              </select>
            </div>

            {viewMode === "list" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Na stronę:</span>
                <select
                  className="h-10 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1 text-sm font-medium text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                  value={perPage}
                  onChange={(e) => {
                    setPage(1);
                    setPerPage(Number(e.target.value));
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {viewMode === "list" ? (
          <>
            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-inner bg-gray-50/20">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px] font-bold text-gray-700">Typ</TableHead>
                    <TableHead className="font-bold text-gray-700">Tytuł</TableHead>
                    <TableHead className="font-bold text-gray-700">Drużyna</TableHead>
                    <TableHead className="font-bold text-gray-700">Termin</TableHead>
                    <TableHead className="font-bold text-gray-700">Czas trwania</TableHead>
                    <TableHead className="text-right font-bold text-gray-700">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                        <div className="flex flex-col items-center gap-2 justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                          <span className="text-sm font-medium">Ładowanie...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16 text-gray-500">
                        <div className="max-w-md mx-auto space-y-3">
                          <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
                          <h3 className="font-semibold text-gray-800 text-lg">Brak zaplanowanych wydarzeń</h3>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-blue-50/10 transition-colors border-b border-gray-100 group">
                        <TableCell className="py-4">
                          {item.event_type === "match" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm shadow-blue-50/30">
                              <Trophy className="w-3.5 h-3.5" />
                              {EVENT_TYPE_LABELS[item.event_type] ?? item.event_type}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm shadow-indigo-50/30">
                              <Dumbbell className="w-3.5 h-3.5" />
                              {EVENT_TYPE_LABELS[item.event_type] ?? item.event_type}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                          <div className="flex items-center gap-2">
                            <span>{item.title}</span>
                            {item.canvas_data && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded-full" title="Dołączono plan taktyczny">
                                <Presentation className="w-3.5 h-3.5" />
                                Taktyka
                              </span>
                            )}
                            {item.api_football_fixture_id && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-50 border border-green-150 text-green-700 px-2 py-0.5 rounded-full" title="Mecz zaimportowany z oficjalnych rozgrywek ligowych">
                                <Globe className="w-3.5 h-3.5" />
                                Oficjalny
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-gray-650 font-medium">{item.team_name ?? item.team_id}</TableCell>
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
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-105 px-2.5 py-1 rounded-lg text-gray-650 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {item.duration_minutes} min
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 rounded-xl px-4 py-1.5 transition-all font-semibold"
                            onClick={() => {
                              setSelectedEventForAttendance(item);
                              void loadAttendance(item.id);
                            }}
                          >
                            Obecność
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded-xl px-4 py-1.5 transition-all font-semibold"
                            onClick={() => onEdit(item)}
                          >
                            Edytuj
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-100 hover:text-rose-800 rounded-xl px-4 py-1.5 transition-all font-semibold border"
                            onClick={() => onDelete(item.id)}
                          >
                            Usuń
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-500 font-medium">
              <span>
                Strona <strong className="text-gray-800">{meta.current_page}</strong> z <strong className="text-gray-800">{meta.last_page}</strong> (łącznie: <strong className="text-gray-800">{meta.total}</strong>)
              </span>
              <div className="flex gap-2">
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
          </>
        ) : (
          /* Calendar Month Grid */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-foreground">
                  {monthNames[currentMonth]} {currentYear}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarDate(new Date(currentYear, currentMonth - 1, 1))}
                  className="rounded-xl border-border hover:bg-accent text-foreground h-10 w-10 p-0 flex items-center justify-center"
                >
                  <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarDate(new Date())}
                  className="rounded-xl border-border hover:bg-accent text-foreground h-10 px-4 font-semibold text-sm"
                >
                  Dzisiaj
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarDate(new Date(currentYear, currentMonth + 1, 1))}
                  className="rounded-xl border-border hover:bg-accent text-foreground h-10 w-10 p-0 flex items-center justify-center"
                >
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-7 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground py-2">
                {weekdayNames.map((name) => (
                  <div key={name} className="py-2">{name}</div>
                ))}
              </div>

              {loading ? (
                <div className="h-96 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  <span className="text-sm font-medium text-muted-foreground">Ładowanie kalendarza...</span>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1.5 md:gap-3">
                  {calendarCells.map((day, idx) => {
                    if (day === null) {
                      return (
                        <div key={`empty-${idx}`} className="bg-muted/10 border border-transparent rounded-2xl aspect-square md:aspect-auto md:min-h-[110px]" />
                      );
                    }

                    const dayEvents = getEventsForDay(day);
                    const currentIsToday = isToday(day);

                    return (
                      <div
                        key={`day-${day}`}
                        onClick={() => {
                          const d = new Date(currentYear, currentMonth, day);
                          d.setHours(18, 0, 0, 0);
                          setForm((prev) => ({
                            ...prev,
                            scheduled_at: toDatetimeLocal(d.toISOString()),
                          }));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={`border rounded-2xl p-2 md:p-3 aspect-square md:aspect-auto md:min-h-[110px] flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                          currentIsToday
                            ? "bg-blue-500/10 border-blue-500 shadow-sm dark:bg-blue-500/25"
                            : "bg-card border-border hover:border-muted-foreground/30 hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-xs md:text-sm font-bold flex items-center justify-center w-6 h-6 rounded-full ${
                            currentIsToday
                              ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
                              : "text-foreground"
                          }`}>
                            {day}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[10px] font-extrabold text-blue-500 dark:text-blue-400 md:hidden">
                              ● {dayEvents.length}
                            </span>
                          )}
                        </div>

                        {/* Event tags desktop */}
                        <div className="hidden md:flex flex-col gap-1.5 mt-2 overflow-hidden">
                          {dayEvents.slice(0, 3).map((event) => {
                            const isMatch = event.event_type === "match";
                            const eventBg = isMatch
                              ? "bg-blue-500/10 border-blue-200/50 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
                              : "bg-indigo-500/10 border-indigo-200/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20";

                            return (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(event);
                                }}
                                className={`px-2 py-1 text-[11px] font-bold rounded-lg truncate border flex items-center gap-1 hover:brightness-95 transition-all ${eventBg}`}
                                title={event.title}
                              >
                                {isMatch ? (
                                  <Trophy className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                                ) : (
                                  <Dumbbell className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                                )}
                                <span className="truncate flex-1">{event.title}</span>
                                {event.api_football_fixture_id && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="Zsynchronizowano z API-Football" />
                                )}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] font-extrabold text-gray-400 pl-1">
                              + {dayEvents.length - 3} więcej
                            </div>
                          )}
                        </div>

                        {/* Event tags mobile */}
                        <div className="flex md:hidden gap-1 mt-1 justify-center">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={`w-2 h-2 rounded-full ${
                                event.event_type === "match" ? "bg-blue-500" : "bg-indigo-500"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showTacticalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 w-full max-w-5xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Presentation className="h-5 w-5 text-indigo-600" />
                Taktyka dla: {form.title || "Nowe wydarzenie"}
              </h2>
              <button
                type="button"
                onClick={() => setShowTacticalModal(false)}
                className="text-gray-400 hover:text-gray-600 font-semibold text-sm"
              >
                Zamknij
              </button>
            </div>
            <div className="overflow-x-auto max-h-[70vh] p-1">
              <TacticalBoard
                initialData={form.canvas_data}
                onSave={(data) => {
                  setForm((prev) => ({ ...prev, canvas_data: data }));
                  setShowTacticalModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {selectedEventForAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 w-full max-w-3xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-emerald-600" />
                  <span>Obecność: {selectedEventForAttendance.title}</span>
                </h2>
                <p className="text-xs text-gray-400">
                  Drużyna: {selectedEventForAttendance.team_name} | Termin: {new Date(selectedEventForAttendance.scheduled_at).toLocaleString('pl-PL')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEventForAttendance(null);
                  setAttendanceList([]);
                }}
                className="text-gray-400 hover:text-gray-600 font-semibold text-sm cursor-pointer p-1.5 hover:bg-gray-50 rounded-lg"
              >
                Zamknij
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-1 divide-y divide-gray-100">
              {attendanceLoading ? (
                <div className="flex flex-col items-center gap-2 justify-center py-12 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                  <span className="text-sm font-medium">Pobieranie listy zawodników...</span>
                </div>
              ) : attendanceList.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Brak przypisanych zatwierdzonych zawodników w tej drużynie.
                </div>
              ) : (
                attendanceList.map((player) => {
                  const initials = `${player.first_name?.[0] || ""}${player.last_name?.[0] || ""}`.toUpperCase();
                  const isSaving = attendanceSavingId === player.user_id;

                  return (
                    <div key={player.user_id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0">
                      {/* Player profile */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{player.first_name} {player.last_name}</p>
                          <p className="text-xs text-gray-500">{player.email}</p>
                        </div>
                      </div>

                      {/* Declaration note */}
                      {player.note && (
                        <div className="text-xs bg-amber-50 border border-amber-100 text-amber-800 px-3 py-1.5 rounded-lg max-w-xs sm:mx-4 font-normal">
                          <span className="font-semibold block mb-0.5">Uzasadnienie:</span>
                          "{player.note}"
                        </div>
                      )}

                      {/* Status and Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Status Badge */}
                        <div className="w-28 text-center sm:text-right">
                          {player.status === "obecny" ? (
                            <Badge className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-xs px-2.5 py-0.5 rounded-full">
                              Obecny
                            </Badge>
                          ) : player.status === "nieobecny" ? (
                            <Badge className="bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs px-2.5 py-0.5 rounded-full">
                              Nieobecny
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-50 border border-gray-200 text-gray-500 font-medium text-xs px-2.5 py-0.5 rounded-full">
                              Brak
                            </Badge>
                          )}
                        </div>

                        {/* Direct Controls */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            disabled={isSaving}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm flex items-center gap-1 cursor-pointer transition-colors ${
                              player.status === "obecny"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            }`}
                            onClick={() => updatePlayerAttendance(selectedEventForAttendance.id, player.user_id, "obecny")}
                          >
                            Obecny
                          </Button>
                          <Button
                            size="sm"
                            disabled={isSaving}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm flex items-center gap-1 cursor-pointer transition-colors ${
                              player.status === "nieobecny"
                                ? "bg-rose-600 hover:bg-rose-700 text-white"
                                : "bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100"
                            }`}
                            onClick={() => updatePlayerAttendance(selectedEventForAttendance.id, player.user_id, "nieobecny")}
                          >
                            Nieobecny
                          </Button>
                          {player.status !== null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSaving}
                              className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded-lg"
                              onClick={() => updatePlayerAttendance(selectedEventForAttendance.id, player.user_id, "unanswered")}
                            >
                              Wyczyść
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button
                type="button"
                onClick={() => {
                  setSelectedEventForAttendance(null);
                  setAttendanceList([]);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-5 font-semibold transition-colors"
              >
                Zamknij
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
