"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, Calendar, RefreshCw, TrendingDown, TrendingUp, Minus } from "lucide-react";

type PlayerInfo = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type TrainingSessionInfo = {
  id: string;
  title: string;
  scheduled_at: string;
  event_type: string;
  team?: { name: string } | null;
};

type FatigueRatingItem = {
  id: string;
  training_id: string;
  user_id: string;
  rating: number;
  submitted_at: string;
  user?: PlayerInfo | null;
  training_session?: TrainingSessionInfo | null;
};

type Meta = {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
};

// Kolor tła + tekstu zależnie od oceny (1=zielony, 10=czerwony)
function getRatingStyle(rating: number): string {
  if (rating <= 3) return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (rating <= 5) return "bg-lime-100 text-lime-800 border-lime-300";
  if (rating <= 7) return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-rose-100 text-rose-800 border-rose-300";
}

function getRatingLabel(rating: number): string {
  if (rating <= 3) return "Świeży";
  if (rating <= 5) return "Lekkie";
  if (rating <= 7) return "Umiarkowane";
  return "Wysokie";
}

function getRatingIcon(rating: number) {
  if (rating <= 4) return <TrendingDown className="w-3.5 h-3.5" />;
  if (rating <= 7) return <Minus className="w-3.5 h-3.5" />;
  return <TrendingUp className="w-3.5 h-3.5" />;
}

// Średnia ocena z listy
function average(ratings: FatigueRatingItem[]): number | null {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10;
}

export default function CoachSurveysPage() {
  const [items, setItems] = useState<FatigueRatingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [meta, setMeta] = useState<Meta>({
    total: 0, per_page: 15, current_page: 1, last_page: 1,
  });

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("per_page", String(perPage));
    p.set("sort_dir", "desc");
    if (search.trim()) p.set("search", search.trim());
    return p.toString();
  }, [page, perPage, search]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/coach/fatigue-ratings?${queryString}`) as {
        data: FatigueRatingItem[];
        meta: Meta;
      };
      setItems(res.data ?? []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać danych.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [queryString]);

  const avg = average(items);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Nagłówek */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-indigo-50">
            <Activity className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ankiety zmęczenia</h1>
            <p className="text-sm text-gray-500">
              Monitoruj poziom zmęczenia swoich zawodników po każdym treningu i meczu
            </p>
          </div>
        </div>

        {/* Statystyki na górze */}
        {!loading && items.length > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{meta.total}</div>
              <div className="text-xs text-gray-500 mt-1">Łączne odpowiedzi</div>
            </div>
            <div className={`rounded-lg border p-4 text-center ${avg !== null && avg >= 7 ? "bg-rose-50 border-rose-200" : avg !== null && avg <= 4 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <div className={`text-2xl font-bold ${avg !== null && avg >= 7 ? "text-rose-700" : avg !== null && avg <= 4 ? "text-emerald-700" : "text-amber-700"}`}>
                {avg !== null ? avg : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-1">Śr. zmęczenie (ta strona)</div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {items.filter(i => i.rating >= 8).length}
              </div>
              <div className="text-xs text-gray-500 mt-1">Wysokie zmęczenie (≥8)</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Input
            placeholder="Szukaj po zawodniku lub treningu..."
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            className="max-w-sm"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => void load()}
            title="Odśwież"
            className="border-gray-200 bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Zawodnik</TableHead>
                <TableHead className="font-semibold text-gray-700">Trening / Mecz</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Zmęczenie</TableHead>
                <TableHead className="font-semibold text-gray-700">Data zgłoszenia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    Ładowanie ankiet zmęczenia...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    {search
                      ? "Brak wyników dla podanej frazy."
                      : "Brak ankiet zmęczenia. Zawodnicy nie wypełnili jeszcze żadnych ankiet."}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50 transition-colors">
                    {/* Zawodnik */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                          {item.user
                            ? `${item.user.first_name[0]}${item.user.last_name[0]}`
                            : "?"}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {item.user
                              ? `${item.user.first_name} ${item.user.last_name}`
                              : "Nieznany zawodnik"}
                          </div>
                          <div className="text-xs text-gray-400">{item.user?.email}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Trening */}
                    <TableCell>
                      <div className="font-medium text-gray-800 text-sm">
                        {item.training_session?.title ?? "—"}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.training_session?.scheduled_at
                          ? new Date(item.training_session.scheduled_at).toLocaleDateString("pl-PL")
                          : "—"}
                        {item.training_session?.team?.name && (
                          <span className="ml-1 text-gray-400">· {item.training_session.team.name}</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Ocena */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${getRatingStyle(item.rating)}`}>
                          {getRatingIcon(item.rating)}
                          {item.rating}/10
                        </span>
                        <span className="text-[11px] text-gray-400">{getRatingLabel(item.rating)}</span>
                      </div>
                    </TableCell>

                    {/* Data */}
                    <TableCell className="text-sm text-gray-500">
                      {new Date(item.submitted_at).toLocaleString("pl-PL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginacja */}
        {meta.last_page > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>
              Strona <strong className="text-gray-900">{meta.current_page}</strong> z{" "}
              <strong className="text-gray-900">{meta.last_page}</strong>{" "}
              (łącznie <strong className="text-gray-900">{meta.total}</strong> ankiet)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                className="border-gray-200 bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
                disabled={meta.current_page <= 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Poprzednia
              </Button>
              <Button
                variant="outline" size="sm"
                className="border-gray-200 bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
                disabled={meta.current_page >= meta.last_page || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Następna
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-center text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
