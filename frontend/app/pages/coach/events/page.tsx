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
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <h1 className="text-2xl font-bold tracking-tight text-black">Wydarzenia</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Planuj treningi i mecze dla swoich drużyn.
        </p>

        {teams.length === 0 && !teamsLoading && (
          <p className="mt-3 text-sm text-amber-700">
            Nie masz przypisanych drużyn. Skontaktuj się z administratorem.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
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
          <select
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
          <Input
            placeholder="Tytuł"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
          <Input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
            required
          />
          <Input
            type="number"
            min={1}
            placeholder="Czas trwania (min)"
            value={form.duration_minutes}
            onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
            required
          />
          <textarea
            className="md:col-span-2 min-h-24 rounded-lg border border-input px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Opis (opcjonalnie)"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />

          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" disabled={submitting || teams.length === 0}>
              {submitting ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Dodaj wydarzenie"}
            </Button>
            {isEditing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Anuluj edycję
              </Button>
            )}
          </div>
        </form>

        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between mb-4">
          <Input
            placeholder="Szukaj po nazwie / opisie / drużynie..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="md:max-w-md"
          />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <select
              className="h-8 rounded-lg border border-input px-2"
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
            <span>Na stronę:</span>
            <select
              className="h-8 rounded-lg border border-input px-2"
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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Typ</TableHead>
              <TableHead>Tytuł</TableHead>
              <TableHead>Drużyna</TableHead>
              <TableHead>Termin</TableHead>
              <TableHead>Czas</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>Ładowanie...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>Brak wydarzeń.</TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span
                      className={
                        item.event_type === "match"
                          ? "inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                          : "inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                      }
                    >
                      {EVENT_TYPE_LABELS[item.event_type] ?? item.event_type}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>{item.team_name ?? item.team_id}</TableCell>
                  <TableCell>{new Date(item.scheduled_at).toLocaleString()}</TableCell>
                  <TableCell>{item.duration_minutes} min</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                      onClick={() => onEdit(item)}
                    >
                      Edytuj
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>
                      Usuń
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span>
            Strona {meta.current_page} z {meta.last_page} (łącznie: {meta.total})
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
