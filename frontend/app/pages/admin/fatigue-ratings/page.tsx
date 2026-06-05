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
import { Activity, Trash2, Edit2, Plus, Calendar, User, RefreshCw } from "lucide-react";

type UserOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type EventOption = {
  id: string;
  title: string;
  scheduled_at: string;
  team_name?: string;
};

type FatigueRatingItem = {
  id: string;
  training_id: string;
  user_id: string;
  rating: number;
  submitted_at: string;
  user?: UserOption | null;
  training_session?: EventOption | null;
};

type RatingsResponse = {
  data: FatigueRatingItem[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
};

type RatingFormState = {
  user_id: string;
  training_id: string;
  rating: string;
  submitted_at: string;
};

const initialForm: RatingFormState = {
  user_id: "",
  training_id: "",
  rating: "5",
  submitted_at: "",
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

export default function AdminFatigueRatingsPage() {
  const [ratings, setRatings] = useState<FatigueRatingItem[]>([]);
  const [players, setPlayers] = useState<UserOption[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [meta, setMeta] = useState({
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RatingFormState>(initialForm);

  const isEditing = Boolean(editingId);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));
    params.set("sort_by", "submitted_at");
    params.set("sort_dir", "desc");
    if (search.trim()) {
      params.set("search", search.trim());
    }
    return params.toString();
  }, [page, perPage, search]);

  async function loadRatings() {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch(`/admin/fatigue-ratings?${queryString}`)) as RatingsResponse;
      setRatings(res.data ?? []);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać ocen zmęczenia.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPlayers() {
    setPlayersLoading(true);
    try {
      const res = (await apiFetch("/admin/users?role=player&per_page=100")) as { data?: UserOption[] };
      const data = res.data ?? [];
      setPlayers(data);
      if (!editingId && data.length > 0) {
        setForm((prev) => (prev.user_id ? prev : { ...prev, user_id: data[0].id }));
      }
    } catch {
      setPlayers([]);
    } finally {
      setPlayersLoading(false);
    }
  }

  async function loadEvents() {
    setEventsLoading(true);
    try {
      const res = (await apiFetch("/admin/events?per_page=100")) as { data?: EventOption[] };
      const data = res.data ?? [];
      setEvents(data);
      if (!editingId && data.length > 0) {
        setForm((prev) => (prev.training_id ? prev : { ...prev, training_id: data[0].id }));
      }
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    void loadRatings();
  }, [queryString]);

  useEffect(() => {
    void loadPlayers();
    void loadEvents();
    // Ustaw obecną datę i czas jako domyślne w formularzu
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localIsoString = new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
    setForm((prev) => ({ ...prev, submitted_at: localIsoString }));
  }, []);

  function resetForm() {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localIsoString = new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
    setForm({
      user_id: players[0]?.id ?? "",
      training_id: events[0]?.id ?? "",
      rating: "5",
      submitted_at: localIsoString,
    });
    setEditingId(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const payload = {
      user_id: form.user_id,
      training_id: form.training_id,
      rating: Number(form.rating),
      submitted_at: toApiDatetime(form.submitted_at),
    };

    try {
      if (isEditing && editingId) {
        await apiFetch(`/admin/fatigue-ratings/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setMessage("Ocena zmęczenia została zaktualizowana.");
      } else {
        await apiFetch("/admin/fatigue-ratings", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("Ocena zmęczenia została dodana.");
      }
      resetForm();
      await loadRatings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać oceny.");
    } finally {
      setSubmitting(false);
    }
  }

  function onEdit(item: FatigueRatingItem) {
    setEditingId(item.id);
    setForm({
      user_id: item.user_id,
      training_id: item.training_id,
      rating: String(item.rating),
      submitted_at: toDatetimeLocal(item.submitted_at),
    });
    setMessage(null);
    setError(null);
  }

  async function onDelete(id: string) {
    const ok = window.confirm("Na pewno usunąć tę ocenę zmęczenia?");
    if (!ok) return;

    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/admin/fatigue-ratings/${id}`, { method: "DELETE" });
      if (editingId === id) {
        resetForm();
      }
      setMessage("Ocena zmęczenia została usunięta.");
      await loadRatings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć oceny.");
    }
  }

  // Funkcja zwracająca kolor oceny zmęczenia (1-10)
  function getRatingBadgeColor(rating: number) {
    if (rating <= 4) {
      return "bg-green-50 text-green-700 border-green-200"; // Niskie zmęczenie (dobrze)
    } else if (rating <= 7) {
      return "bg-amber-50 text-amber-700 border-amber-200"; // Średnie
    } else {
      return "bg-rose-50 text-rose-700 border-rose-200"; // Wysokie (ostrzeżenie)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Sekcja formularza */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-6 h-6 text-black" />
          <h1 className="text-2xl font-bold tracking-tight text-black">
            {isEditing ? "Edytuj ocenę zmęczenia" : "Dodaj ocenę zmęczenia"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Zarządzaj wskaźnikami zmęczenia zawodników po jednostkach treningowych i meczach.
        </p>

        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-black uppercase tracking-wider pl-1">
              Zawodnik
            </label>
            <select
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
              value={form.user_id}
              onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
              required
              disabled={playersLoading || players.length === 0}
            >
              <option value="" disabled>
                {playersLoading ? "Ładowanie zawodników..." : "Wybierz zawodnika"}
              </option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.first_name} {player.last_name} ({player.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-black uppercase tracking-wider pl-1">
              Wydarzenie / Trening
            </label>
            <select
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
              value={form.training_id}
              onChange={(e) => setForm((prev) => ({ ...prev, training_id: e.target.value }))}
              required
              disabled={eventsLoading || events.length === 0}
            >
              <option value="" disabled>
                {eventsLoading ? "Ładowanie wydarzeń..." : "Wybierz wydarzenie"}
              </option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({new Date(event.scheduled_at).toLocaleDateString()}) {event.team_name ? `- ${event.team_name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-black uppercase tracking-wider pl-1">
              Ocena zmęczenia (1 - wypoczęty, 10 - wyczerpany)
            </label>
            <select
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={form.rating}
              onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}
              required
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num} - {num <= 3 ? "Świetnie / Wypoczęty" : num <= 7 ? "Umiarkowane zmęczenie" : "Skrajnie zmęczony"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-black uppercase tracking-wider pl-1">
              Data i czas zgłoszenia
            </label>
            <Input
              type="datetime-local"
              value={form.submitted_at}
              onChange={(e) => setForm((prev) => ({ ...prev, submitted_at: e.target.value }))}
              required
              className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="md:col-span-2 flex gap-2 pt-2">
            <Button type="submit" disabled={submitting || players.length === 0 || events.length === 0}>
              {submitting ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Dodaj ocenę"}
            </Button>
            {isEditing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Anuluj edycję
              </Button>
            )}
          </div>
        </form>

        {message && <p className="mt-3 text-sm text-green-700 font-medium">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}
      </div>

      {/* Sekcja tabeli */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between mb-4">
          <div className="relative flex-grow md:max-w-md">
            <Input
              placeholder="Szukaj po zawodniku lub treningu..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <span>Na stronę:</span>
            <select
              className="h-9 rounded-lg border border-input px-2 bg-transparent outline-none text-black"
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
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => void loadRatings()}
              title="Odśwież dane"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-black font-semibold">Zawodnik</TableHead>
                <TableHead className="text-black font-semibold">Wydarzenie / Trening</TableHead>
                <TableHead className="text-black font-semibold text-center w-24">Ocena</TableHead>
                <TableHead className="text-black font-semibold">Data zgłoszenia</TableHead>
                <TableHead className="text-right text-black font-semibold w-32">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Ładowanie ocen zmęczenia...
                  </TableCell>
                </TableRow>
              ) : ratings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Brak ocen zmęczenia spełniających kryteria.
                  </TableCell>
                </TableRow>
              ) : (
                ratings.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-black">
                        {item.user ? `${item.user.first_name} ${item.user.last_name}` : "Nieznany zawodnik"}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.user?.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-black">
                        {item.training_session ? item.training_session.title : "Nieznane wydarzenie"}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.training_session
                          ? new Date(item.training_session.scheduled_at).toLocaleDateString()
                          : "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm border shadow-sm ${getRatingBadgeColor(
                          item.rating
                        )}`}
                      >
                        {item.rating}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {new Date(item.submitted_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-blue-300 text-blue-700 hover:bg-blue-50"
                        onClick={() => onEdit(item)}
                        title="Edytuj"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => onDelete(item.id)}
                        title="Usuń"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginacja */}
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Strona <strong className="text-black">{meta.current_page}</strong> z{" "}
            <strong className="text-black">{meta.last_page}</strong> (łącznie{" "}
            <strong className="text-black">{meta.total}</strong> ocen)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
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
