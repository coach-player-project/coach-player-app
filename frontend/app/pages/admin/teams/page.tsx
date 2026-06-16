"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, buildApiUrl } from "@/lib/api";
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
import { Users2, Plus, Trash2 } from "lucide-react";

type CoachOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type TeamItem = {
  id: string;
  name: string;
  description: string | null;
  coach_id?: string;
  created_at: string;
  logo_url?: string;
  coach?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  coaches?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    pivot?: {
      role: string;
    };
  }[];
};

type TeamsResponse = {
  data: TeamItem[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
};

type AssignedCoach = {
  user_id: string;
  role: string;
};

type TeamFormState = {
  name: string;
  description: string;
  coaches: AssignedCoach[];
};

const initialForm: TeamFormState = {
  name: "",
  description: "",
  coaches: [{ user_id: "", role: "Główny trener" }],
};

function formatCoachesList(coaches?: TeamItem["coaches"]) {
  if (!coaches || coaches.length === 0) return "Brak przypisanego sztabu";
  return coaches
    .map((c) => `${c.first_name} ${c.last_name} (${c.pivot?.role ?? "Główny trener"})`)
    .join(", ");
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [coachesLoading, setCoachesLoading] = useState(false);
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
  const [form, setForm] = useState<TeamFormState>(initialForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  const isEditing = Boolean(editingId);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));
    params.set("sort_by", "created_at");
    params.set("sort_dir", "desc");
    if (search.trim()) {
      params.set("search", search.trim());
    }
    return params.toString();
  }, [page, perPage, search]);

  async function loadTeams() {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch(`/admin/teams?${queryString}`)) as TeamsResponse;
      setTeams(res.data ?? []);
      setMeta({
        total: res.total ?? 0,
        per_page: res.per_page ?? perPage,
        current_page: res.current_page ?? page,
        last_page: res.last_page ?? 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać drużyn.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCoaches(excludeTeamId?: string) {
    setCoachesLoading(true);
    try {
      const param = excludeTeamId ? `?exclude_team_id=${excludeTeamId}` : "";
      const res = (await apiFetch(`/admin/teams/coaches${param}`)) as { data?: CoachOption[] };
      const coachData = res.data ?? [];
      setCoaches(coachData);

      setForm((prev) => {
        if (prev.coaches.length > 0 && prev.coaches[0].user_id) {
          return prev;
        }
        if (coachData.length > 0) {
          return {
            ...prev,
            coaches: [{ user_id: coachData[0].id, role: "Główny trener" }]
          };
        }
        return prev;
      });
    } catch {
      setCoaches([]);
    } finally {
      setCoachesLoading(false);
    }
  }

  useEffect(() => {
    void loadTeams();
  }, [queryString]);

  useEffect(() => {
    void loadCoaches();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setLogoFile(null);
    setLogoPreview(null);
    setExistingLogoUrl(null);
    setRemoveLogo(false);
    void loadCoaches();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const headCoaches = form.coaches.filter(c => c.role === "Główny trener");
    if (headCoaches.length !== 1) {
      setError("Drużyna musi mieć dokładnie jednego Głównego trenera.");
      setSubmitting(false);
      return;
    }

    if (form.coaches.some(c => !c.user_id)) {
      setError("Wszyscy przypisani trenerzy muszą być wybrani.");
      setSubmitting(false);
      return;
    }

    const coachIds = form.coaches.map(c => c.user_id);
    const hasDuplicates = coachIds.some((id, index) => coachIds.indexOf(id) !== index);
    if (hasDuplicates) {
      setError("Ten sam trener nie może być przypisany do drużyny więcej niż jeden raz.");
      setSubmitting(false);
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const url = buildApiUrl(isEditing ? `/admin/teams/${editingId}` : "/admin/teams");

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      
      form.coaches.forEach((c, index) => {
        formData.append(`coaches[${index}][user_id]`, c.user_id);
        formData.append(`coaches[${index}][role]`, c.role);
      });

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      if (isEditing) {
        formData.append("_method", "PUT");
        if (removeLogo) {
          formData.append("remove_logo", "1");
        }
      }

      const res = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        let errorMsg = `HTTP ${res.status}`;
        if (errorData?.errors) {
          errorMsg = Object.values(errorData.errors as Record<string, string[]>).flat().join(' ');
        } else if (errorData?.message) {
          errorMsg = errorData.message;
        }
        throw new Error(errorMsg);
      }

      if (isEditing) {
        setMessage("Drużyna została zaktualizowana.");
      } else {
        setMessage("Drużyna została utworzona.");
      }

      resetForm();
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać drużyny.");
    } finally {
      setSubmitting(false);
    }
  }

  function onEdit(team: TeamItem) {
    setEditingId(team.id);
    void loadCoaches(team.id);
    
    const mappedCoaches = team.coaches && team.coaches.length > 0
      ? team.coaches.map(c => ({ user_id: c.id, role: c.pivot?.role ?? "Główny trener" }))
      : [{ user_id: team.coach_id ?? "", role: "Główny trener" }];

    setForm({
      name: team.name ?? "",
      description: team.description ?? "",
      coaches: mappedCoaches,
    });
    setExistingLogoUrl(team.logo_url ?? null);
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(false);
    setMessage(null);
    setError(null);
  }

  async function onDelete(id: string) {
    const ok = window.confirm("Na pewno usunąć drużynę?");
    if (!ok) return;

    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/admin/teams/${id}`, { method: "DELETE" });
      if (editingId === id) {
        resetForm();
      }
      setMessage("Drużyna została usunięta.");
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć drużyny.");
    }
  }

  return (
    <div className="space-y-6">
      {/* NAGŁÓWEK STRONY */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 md:p-8 shadow-xl shadow-blue-950/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users2 className="h-10 w-10 text-blue-400 shrink-0" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1 text-white">Zarządzanie drużynami</h1>
              <p className="text-blue-200 text-sm md:text-base">Tworzenie, edycja i usuwanie drużyn w systemie.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card p-6 md:p-8 rounded-xl shadow-sm border border-border">
        <h2 className="text-lg font-bold text-black mb-4">{editingId ? "Edytuj drużynę" : "Utwórz nową drużynę"}</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            placeholder="Nazwa drużyny"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <div className="md:col-span-2 flex flex-col gap-2 border border-border p-4 rounded-xl bg-muted/5 mt-1">
            <span className="text-sm font-semibold text-black">Sztab szkoleniowy (Trenerzy)</span>
            <span className="text-xs text-muted-foreground -mt-1 mb-2">
              Dodaj jednego lub więcej trenerów. Drużyna musi posiadać dokładnie jednego Głównego trenera.
            </span>
            <div className="space-y-2">
              {form.coaches.map((assignedCoach, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2 items-center">
                  <select
                    className="h-9 flex-grow w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
                    value={assignedCoach.user_id}
                    onChange={(e) => {
                      const updated = [...form.coaches];
                      updated[index].user_id = e.target.value;
                      setForm((prev) => ({ ...prev, coaches: updated }));
                    }}
                    required
                    disabled={coachesLoading || coaches.length === 0}
                  >
                    <option value="" disabled>Wybierz trenera</option>
                    {coaches.map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {coach.first_name} {coach.last_name} ({coach.email})
                      </option>
                    ))}
                  </select>
                  
                  <select
                    className="h-9 w-full sm:w-64 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={assignedCoach.role}
                    onChange={(e) => {
                      const updated = [...form.coaches];
                      updated[index].role = e.target.value;
                      setForm((prev) => ({ ...prev, coaches: updated }));
                    }}
                    required
                  >
                    <option value="Główny trener">Główny trener</option>
                    <option value="Asystent">Asystent</option>
                    <option value="Trener bramkarzy">Trener bramkarzy</option>
                    <option value="Trener przygotowania motorycznego">Trener przygotowania motorycznego</option>
                  </select>
                  
                  {form.coaches.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const updated = form.coaches.filter((_, i) => i !== index);
                        setForm((prev) => ({ ...prev, coaches: updated }));
                      }}
                      className="h-9 shrink-0"
                    >
                      Usuń
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  coaches: [...prev.coaches, { user_id: coaches[0]?.id || "", role: "Asystent" }],
                }));
              }}
              className="self-start mt-1 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 hover:text-blue-800 transition-colors"
            >
              + Dodaj trenera
            </Button>
          </div>
          <textarea
            className="md:col-span-2 min-h-24 rounded-lg border border-input px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Opis (opcjonalnie)"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />

          <div className="md:col-span-2 flex flex-col gap-2 mt-1">
            <label className="text-sm font-semibold text-black">Herb / Logo drużyny</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-dashed border-input bg-muted/5 w-full">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-border bg-slate-900 flex items-center justify-center shadow-inner shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Podgląd nowego logo" className="w-full h-full object-cover" />
                ) : existingLogoUrl && !removeLogo ? (
                  <img src={existingLogoUrl} alt="Obecne logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-muted-foreground text-center px-1">Brak logo</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5 flex-grow w-full">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setLogoFile(file);
                    setRemoveLogo(false);
                    if (file) {
                      setLogoPreview(URL.createObjectURL(file));
                    } else {
                      setLogoPreview(null);
                    }
                  }}
                  className="text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-input file:text-xs file:font-semibold file:bg-background file:text-foreground hover:file:bg-accent cursor-pointer"
                />
                <span className="text-[11px] text-muted-foreground">Maksymalnie 2MB. Akceptowane formaty: JPG, PNG, SVG, GIF.</span>
                {existingLogoUrl && !removeLogo && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                      setRemoveLogo(true);
                    }}
                    className="text-xs text-red-600 font-medium hover:text-red-700 self-start mt-1"
                  >
                    Usuń obecne logo
                  </button>
                )}
                {removeLogo && (
                  <span className="text-xs text-red-600 font-semibold mt-1">Obecne logo zostanie usunięte po zapisaniu.</span>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" disabled={submitting || coaches.length === 0}>
              {submitting ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Dodaj drużynę"}
            </Button>
            {isEditing && (
              <Button type="button" variant="outline" onClick={resetForm} className="border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-950 transition-colors">
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
            placeholder="Szukaj po nazwie lub opisie..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="md:max-w-md"
          />
          <div className="flex items-center gap-2 text-sm">
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
              <TableHead className="w-16">Herb</TableHead>
              <TableHead>Nazwa</TableHead>
              <TableHead>Sztab szkoleniowy</TableHead>
              <TableHead>Opis</TableHead>
              <TableHead>Utworzono</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>Ładowanie...</TableCell>
              </TableRow>
            ) : teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>Brak drużyn.</TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-slate-900 flex items-center justify-center shadow-inner">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground text-center">Brak</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell className="max-w-xs truncate" title={formatCoachesList(team.coaches)}>{formatCoachesList(team.coaches)}</TableCell>
                  <TableCell>{team.description || "-"}</TableCell>
                  <TableCell>{new Date(team.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                      onClick={() => onEdit(team)}
                    >
                      Edytuj
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(team.id)}>
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
              className="border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 hover:text-blue-800 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page >= meta.last_page || loading}
              onClick={() => setPage((prev) => prev + 1)}
              className="border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 hover:text-blue-800 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Następna
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
