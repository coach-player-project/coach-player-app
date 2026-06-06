"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Search, Trophy, Dumbbell, CalendarDays } from "lucide-react";
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
  const [form, setForm] = useState<EventFormState>(initialForm);

  const isEditing = Boolean(editingId);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (typeFilter) {
      params.set("event_type", typeFilter);
    }
    return params.toString();
  }, [page, perPage, search, typeFilter]);

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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-800 to-indigo-600 p-6 md:p-8 text-white shadow-lg">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
          <CalendarDays className="w-64 h-64" />
        </div>
        <div className="relative z-10 space-y-2">
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-none py-1 px-3 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            Harmonogram i Planowanie
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Wydarzenia</h1>
          <p className="text-blue-100 max-w-xl text-sm md:text-base font-medium">
            Planuj treningi i mecze dla swoich drużyn. Zarządzaj terminami i monitoruj aktywność zespołu w jednym miejscu.
          </p>
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
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1 text-sm font-medium text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              value={form.team_id}
              onChange={(e) => setForm((prev) => ({ ...prev, team_id: e.target.value }))}
              required
              disabled={teamsLoading || teams.length === 0}
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
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1 text-sm font-medium text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
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
            >
              <option value="training">Trening</option>
              <option value="match">Mecz</option>
            </select>
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

          <div className="md:col-span-2 flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={submitting || teams.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-semibold shadow-md shadow-blue-600/10 transition-all disabled:opacity-50"
            >
              {submitting ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Dodaj wydarzenie"}
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl h-11 px-6 font-semibold transition-all border"
              >
                Anuluj edycję
              </Button>
            )}
          </div>
        </form>

        {message && <div className="mt-3 bg-green-50 border border-green-150 text-green-800 p-4 rounded-xl text-sm font-medium">{message}</div>}
        {error && <div className="mt-3 bg-red-50 border border-red-150 text-red-800 p-4 rounded-xl text-sm font-medium">{error}</div>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/40 p-6 space-y-6">
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
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-500">
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
          </div>
        </div>

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
                    <TableCell className="py-4 font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{item.title}</TableCell>
                    <TableCell className="py-4 text-gray-600 font-medium">{item.team_name ?? item.team_id}</TableCell>
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
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-105 px-2.5 py-1 rounded-lg text-gray-605 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {item.duration_minutes} min
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-right space-x-2">
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
      </div>
    </div>
  );
}
