"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Loader2, XCircle, UserPlus } from "lucide-react";

type TeamRef = { id: string; name: string };
type UserRef = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
  created_at?: string;
};

type MembershipItem = {
  id: string;
  team_id: string;
  user_id: string;
  status: string;
  joined_at: string;
  team?: TeamRef | null;
  user?: UserRef | null;
};

type MembershipsResponse = {
  data: MembershipItem[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
};

function fullName(user?: UserRef | null) {
  if (!user) return "—";
  return `${user.first_name} ${user.last_name}`;
}

export default function AdminMembershipsPage() {
  const [items, setItems] = useState<MembershipItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch(
        `/admin/team-members?status=pending&page=${page}&per_page=15`
      )) as MembershipsResponse;
      setItems(res.data ?? []);
      setMeta({ last_page: res.last_page ?? 1, total: res.total ?? 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać zgłoszeń.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActionId(id);
    setMessage(null);
    setError(null);
    try {
      const res = (await apiFetch(`/admin/team-members/${id}/${action}`, {
        method: "POST",
      })) as { message?: string };
      setMessage(res.message ?? "Operacja zakończona pomyślnie.");
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wykonać operacji.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* NAGŁÓWEK STRONY */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 md:p-8 shadow-xl shadow-blue-950/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserPlus className="h-10 w-10 text-blue-400 shrink-0" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1 text-white">Zgłoszenia do drużyn</h1>
              <p className="text-blue-200 text-sm md:text-base">Zaakceptuj lub odrzuć prośby o dołączenie do wybranej drużyny.</p>
            </div>
          </div>
          {meta.total > 0 && (
            <div className="shrink-0">
              <Badge className="bg-amber-500/25 text-amber-200 border-amber-500/30 hover:bg-amber-500/30 px-3 py-1.5 text-sm shadow-none font-medium">
                Oczekujących: {meta.total}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card p-6 md:p-8 rounded-xl shadow-sm border border-border">
        {message && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-black">Użytkownik</TableHead>
              <TableHead className="text-black">Drużyna</TableHead>
              <TableHead className="text-black">Status</TableHead>
              <TableHead className="text-right text-black">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Ładowanie zgłoszeń...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  Brak oczekujących zgłoszeń.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-black">{fullName(item.user)}</span>
                      {item.user?.role && (
                        <Badge className={item.user.role === 'coach' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/10 hover:bg-emerald-500/10 shadow-none' : 'bg-blue-500/10 text-blue-700 border-blue-500/10 hover:bg-blue-500/10 shadow-none'}>
                          {item.user.role === 'coach' ? 'Trener' : 'Zawodnik'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.user?.email}</div>
                  </TableCell>
                  <TableCell className="font-medium text-black">
                    {item.team?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/20 shadow-none">
                      Oczekuje
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-700 border-green-300 bg-green-50/50 hover:bg-green-100 hover:text-green-800 transition-colors"
                      disabled={actionId === item.id}
                      onClick={() => handleAction(item.id, "approve")}
                    >
                      {actionId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Akceptuj
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-700 border-red-300 bg-red-50/50 hover:bg-red-100 hover:text-red-800 transition-colors"
                      disabled={actionId === item.id}
                      onClick={() => handleAction(item.id, "reject")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Odrzuć
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta.last_page > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 hover:text-blue-800 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            Poprzednia
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            Strona {page} / {meta.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.last_page || loading}
            onClick={() => setPage((p) => p + 1)}
            className="border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 hover:text-blue-800 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            Następna
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
