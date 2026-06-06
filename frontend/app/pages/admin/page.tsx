"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ArrowUpDown,
  Shield,
  User,
  Mail,
  Phone,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  UserCheck,
} from "lucide-react";

type UserItem = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "coach" | "player";
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
};

type UserFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: "admin" | "coach" | "player";
  password: string;
};

const initialForm: UserFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role: "player",
  password: "",
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // SFP States
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Form (Sheet) States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState<UserFormState>(initialForm);

  const isEditing = Boolean(editingUser);

  // Load user data and logged-in user profile
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // Fetch all users for client-side SFP
      const usersData = await apiFetch("/admin/users?all=1");
      setUsers(usersData.data ?? []);

      // Fetch logged-in user to prevent deleting self
      const selfData = await apiFetch("/user");
      setCurrentUser(selfData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się pobrać danych użytkowników."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // Filter and Search logic (client-side)
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Role filter
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }
      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
        const email = user.email.toLowerCase();
        const phone = user.phone ? user.phone.toLowerCase() : "";
        return fullName.includes(query) || email.includes(query) || phone.includes(query);
      }
      return true;
    });
  }, [users, roleFilter, search]);

  // Sorting logic (client-side)
  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    if (!sortBy) return sorted;

    sorted.sort((a, b) => {
      let valA = "";
      let valB = "";

      if (sortBy === "name") {
        valA = `${a.first_name} ${a.last_name}`.toLowerCase();
        valB = `${b.first_name} ${b.last_name}`.toLowerCase();
      } else if (sortBy === "email") {
        valA = a.email.toLowerCase();
        valB = b.email.toLowerCase();
      } else if (sortBy === "role") {
        valA = a.role.toLowerCase();
        valB = b.role.toLowerCase();
      } else if (sortBy === "created_at") {
        valA = a.created_at;
        valB = b.created_at;
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredUsers, sortBy, sortDir]);

  // Pagination logic (client-side)
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * perPage;
    return sortedUsers.slice(start, start + perPage);
  }, [sortedUsers, page, perPage]);

  const totalPages = Math.ceil(sortedUsers.length / perPage) || 1;

  // Reset page number when filtering or searching changes
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const getSortIcon = (key: string) => {
    if (sortBy !== key) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 h-3.5 w-3.5 text-blue-600" />
    ) : (
      <ChevronDown className="ml-1 h-3.5 w-3.5 text-blue-600" />
    );
  };

  // CRUD Functions
  const openCreateForm = () => {
    setEditingUser(null);
    setForm(initialForm);
    setError(null);
    setMessage(null);
    setIsFormOpen(true);
  };

  const openEditForm = (user: UserItem) => {
    setEditingUser(user);
    setForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      role: user.role ?? "player",
      password: "", // Keep blank, only fill to change password
    });
    setError(null);
    setMessage(null);
    setIsFormOpen(true);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const endpoint = isEditing ? `/admin/users/${editingUser?.id}` : "/admin/users";
      const method = isEditing ? "PUT" : "POST";

      const payload: Record<string, any> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        role: form.role,
      };

      if (!isEditing) {
        if (!form.password) {
          throw new Error("Hasło jest wymagane dla nowego użytkownika.");
        }
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }

      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      setMessage(
        isEditing
          ? "Dane użytkownika zostały zaktualizowane."
          : "Użytkownik został pomyślnie utworzony."
      );
      setIsFormOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd podczas zapisu.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (user: UserItem) => {
    if (currentUser && user.id === currentUser.id) {
      alert("Nie możesz usunąć swojego własnego konta.");
      return;
    }

    const confirmDelete = window.confirm(
      `Czy na pewno chcesz usunąć użytkownika ${user.first_name} ${user.last_name}?`
    );
    if (!confirmDelete) return;

    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/admin/users/${user.id}`, {
        method: "DELETE",
      });
      setMessage("Użytkownik został usunięty.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Wystąpił błąd podczas usuwania użytkownika."
      );
    }
  };

  const getRoleBadge = (role: UserItem["role"]) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-500/20 shadow-none font-medium flex items-center gap-1 w-fit">
            <Shield className="h-3 w-3" /> Admin
          </Badge>
        );
      case "coach":
        return (
          <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-500/20 shadow-none font-medium flex items-center gap-1 w-fit">
            <UserCheck className="h-3 w-3" /> Trener
          </Badge>
        );
      case "player":
        return (
          <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20 shadow-none font-medium flex items-center gap-1 w-fit">
            <User className="h-3 w-3" /> Zawodnik
          </Badge>
        );
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-card p-6 md:p-8 rounded-xl shadow-sm border border-border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Zarządzanie Użytkownikami
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Przeglądaj, dodawaj, edytuj i usuwaj konta użytkowników w systemie.
          </p>
        </div>
        <Button onClick={openCreateForm} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm shrink-0">
          <Plus className="h-4 w-4" /> Dodaj Użytkownika
        </Button>
      </div>

      {/* Operations Feedback Messages */}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-sm font-medium">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {/* Table Container & Filter / Search Controls */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po nazwisku, imieniu lub emailu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Wszystkie role</option>
              <option value="admin">Administratorzy</option>
              <option value="coach">Trenerzy</option>
              <option value="player">Zawodnicy</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 self-end md:self-auto">
            <span>Pozycji na stronie:</span>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead
                  onClick={() => handleSort("name")}
                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors py-4 font-semibold text-gray-700"
                >
                  <div className="flex items-center">
                    Użytkownik {getSortIcon("name")}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("email")}
                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors py-4 font-semibold text-gray-700"
                >
                  <div className="flex items-center">
                    Email {getSortIcon("email")}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("role")}
                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors py-4 font-semibold text-gray-700"
                >
                  <div className="flex items-center">
                    Rola {getSortIcon("role")}
                  </div>
                </TableHead>
                <TableHead className="py-4 font-semibold text-gray-700">Telefon</TableHead>
                <TableHead
                  onClick={() => handleSort("created_at")}
                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors py-4 font-semibold text-gray-700"
                >
                  <div className="flex items-center">
                    Zarejestrowany {getSortIcon("created_at")}
                  </div>
                </TableHead>
                <TableHead className="text-right py-4 font-semibold text-gray-700">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Ładowanie listy użytkowników...
                  </TableCell>
                </TableRow>
              ) : sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Brak użytkowników pasujących do kryteriów.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => {
                  const isSelf = !!(currentUser && user.id === currentUser.id);
                  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();

                  return (
                    <TableRow key={user.id} className="transition-colors group hover:bg-muted/10">
                      <TableCell className="font-medium flex items-center gap-3 py-3.5">
                        <Avatar className="h-9 w-9 border border-border shadow-sm">
                          <AvatarFallback className="bg-blue-600/10 text-blue-700 font-bold text-xs tracking-wider">
                            {initials || <User className="h-4 w-4 text-blue-600" />}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-gray-950 flex items-center gap-1.5">
                            {user.first_name} {user.last_name}
                            {isSelf && (
                              <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-slate-200 shadow-none text-[10px] px-1.5 py-0">
                                Ty
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 text-gray-600">{user.email}</TableCell>
                      <TableCell className="py-3.5">{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="py-3.5 text-gray-600">{user.phone || "-"}</TableCell>
                      <TableCell className="py-3.5 text-gray-500">
                        {new Date(user.created_at).toLocaleDateString("pl-PL")}
                      </TableCell>
                      <TableCell className="text-right py-3.5 space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditForm(user)}
                          className="h-8 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 hover:text-blue-800"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edytuj
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isSelf}
                          onClick={() => onDelete(user)}
                          className="h-8 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Usuń
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 pt-2">
          <div>
            Pokazywanie {sortedUsers.length === 0 ? 0 : (page - 1) * perPage + 1} -{" "}
            {Math.min(page * perPage, sortedUsers.length)} z {sortedUsers.length} (łącznie)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1.5 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 hover:text-blue-800 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" /> Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="gap-1.5 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 hover:text-blue-800 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Następna <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Slide-over Form (Radix Sheet) */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col h-full bg-white border-l p-0">
          <SheetHeader className="p-6 border-b border-border bg-slate-50/50">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-black">
              {isEditing ? "Edytuj Użytkownika" : "Dodaj Nowego Użytkownika"}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground mt-1">
              {isEditing
                ? "Zmodyfikuj uprawnienia i dane osobowe użytkownika w systemie."
                : "Wypełnij formularz, aby dodać nowe konto użytkownika do bazy."}
            </SheetDescription>
          </SheetHeader>

          {/* Form Scroll Area */}
          <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {isEditing && currentUser && editingUser?.id === currentUser.id && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs font-semibold leading-relaxed">
                Uwaga: Edytujesz swoje własne konto administratora. Zablokowano możliwość zmiany własnej roli w celu uniknięcia utraty dostępu.
              </div>
            )}

            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  Imię <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    required
                    placeholder="np. Jan"
                    value={form.first_name}
                    onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Nazwisko <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="np. Kowalski"
                  value={form.last_name}
                  onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                Adres Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  type="email"
                  placeholder="np. jan.kowalski@example.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Numer Telefonu</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="np. +48 123 456 789"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Role selection */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                Rola w systemie <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <select
                  className="h-10 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring disabled:bg-slate-100 disabled:text-gray-500"
                  value={form.role}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, role: e.target.value as UserFormState["role"] }))
                  }
                  required
                  disabled={!!(isEditing && currentUser && editingUser?.id === currentUser.id)}
                >
                  <option value="player">Zawodnik (player)</option>
                  <option value="coach">Trener (coach)</option>
                  <option value="admin">Administrator (admin)</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  Hasło {!isEditing && <span className="text-red-500">*</span>}
                </label>
                {isEditing && (
                  <span className="text-[10px] text-muted-foreground">
                    Pozostaw puste, aby nie zmieniać
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder={isEditing ? "••••••••" : "Min. 8 znaków"}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required={!isEditing}
                  minLength={8}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Action buttons inside form */}
            <div className="pt-4 flex gap-3">
              <Button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {submitting ? "Zapisywanie..." : isEditing ? "Zapisz Zmiany" : "Dodaj Użytkownika"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-950 transition-colors"
              >
                Anuluj
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}