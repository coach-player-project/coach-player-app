"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserCircle2,
  ShieldAlert,
  Trophy,
  ArrowDownAZ,
  CalendarDays
} from "lucide-react";

interface Coach {
  id: string;
  first_name: string;
  last_name: string;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  coach: Coach | null;
}

interface MetaPagination {
  current_page: number;
  last_page: number;
  total: number;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [meta, setMeta] = useState<MetaPagination | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Zawsze zwracaj na pierwszą stronę przy nowym wyszukiwaniu
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    async function fetchTeams() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          search: debouncedSearch,
          sort_by: sortBy,
          sort_dir: sortDir,
          page: page.toString(),
          per_page: "9",
        });

        const res = await apiFetch(`/teams?${queryParams.toString()}`);
        setTeams(res.data || []);

        // Laravel's paginated response provides keys like current_page directly in root or meta object
        if (typeof res.current_page !== "undefined") {
          setMeta({
            current_page: res.current_page,
            last_page: res.last_page,
            total: res.total,
          });
        }
      } catch (e) {
        console.error("Failed to fetch teams", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTeams();
  }, [debouncedSearch, sortBy, sortDir, page]);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 selection:bg-indigo-500/30">
      {/* Dynamic Background Blurs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12">
        {/* Header Section */}
        <header className="text-center space-y-6">
          <Badge variant="outline" className="px-4 py-1 border-indigo-500/30 text-indigo-400 bg-indigo-500/10 backdrop-blur-md">
            Wyszukiwarka Drużyn
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Poznaj Najlepsze <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">
              Drużyny Piłkarskie
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-400 leading-relaxed">
            Przeglądaj, sortuj i wyszukuj drużyny w czasie rzeczywistym.
          </p>
        </header>

        {/* Action Bar (Search & Sort) */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj po nazwie lub opisie..."
              className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500/50 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="appearance-none h-12 px-4 pr-10 bg-white/5 border border-white/10 text-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
              >
                <option value="created_at" className="bg-slate-900">Sortuj po dacie</option>
                <option value="name" className="bg-slate-900">Sortuj po nazwie</option>
              </select>
              {sortBy === 'name' ? (
                <ArrowDownAZ className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              ) : (
                <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              )}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl"
              onClick={() => { setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); setPage(1); }}
              title={sortDir === 'asc' ? "Rosnąco" : "Malejąco"}
            >
              <div className={`transition-transform duration-300 ${sortDir === 'asc' ? 'rotate-180' : ''}`}>
                ↓
              </div>
            </Button>
          </div>
        </div>

        {/* Content Section */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                  <Skeleton className="h-12 w-12 rounded-full bg-white/10" />
                  <Skeleton className="h-6 w-3/4 bg-white/10" />
                  <Skeleton className="h-4 w-full bg-white/10" />
                  <Skeleton className="h-4 w-5/6 bg-white/10" />
                </div>
              ))}
            </div>
          ) : teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <ShieldAlert className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-semibold">Nie znaleziono drużyn</h3>
              <p className="text-slate-400 max-w-md">Spróbuj zmienić parametry wyszukiwania, aby zobaczyć inne wyniki bazy danych.</p>
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => { setSearch(''); setDebouncedSearch(''); }}
              >
                Resetuj filtry
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="group relative p-6 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-indigo-500/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_8px_30px_rgb(99,102,241,0.12)] overflow-hidden flex flex-col"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] group-hover:bg-indigo-400/20 transition-all duration-500" />

                  <div className="relative flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-inner">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {team.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Dołączyła: {new Date(team.created_at).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-grow line-clamp-3">
                    {team.description || "Brak opisu drużyny. Drużyna wciąż przygotowuje swoją historię..."}
                  </p>

                  <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                      <UserCircle2 className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-300">Trener Szkoleniowiec</span>
                      <span className="text-xs text-slate-500">
                        {team.coach ? `${team.coach.first_name} ${team.coach.last_name}` : "Brak przypisanego"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && meta && meta.total > 0 && (
          <div className="flex flex-col items-center justify-center pt-8 border-t border-white/10 space-y-4">
            <p className="text-sm text-slate-400">
              Strona <span className="text-white font-medium">{meta.current_page}</span> z <span className="text-white font-medium">{meta.last_page}</span>
              {" "}({meta.total} wyników)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Poprzednia
              </Button>
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-50"
                disabled={page >= meta.last_page}
                onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
              >
                Następna
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
