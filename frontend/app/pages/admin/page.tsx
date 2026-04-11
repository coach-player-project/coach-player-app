import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// Przykładowe dane uzytkownikow
const users = [
  {
    id: "1",
    name: "Jan Kowalski",
    email: "jan@example.com",
    role: "Admin",
    status: "Aktywny",
  },
  {
    id: "2",
    name: "Anna Nowak",
    email: "anna@example.com",
    role: "Trener",
    status: "Aktywny",
  },
  {
    id: "3",
    name: "Zygmunt Stary",
    email: "zygmunt@example.com",
    role: "Zawodnik",
    status: "Nieaktywny",
  },
  {
    id: "4",
    name: "Michał Młody",
    email: "michal@example.com",
    role: "Zawodnik",
    status: "Oczekujący",
  },
]

export default function AdminPage() {
  return (
    <div className="bg-card p-6 md:p-8 rounded-xl shadow-sm border border-border max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">Zarządzanie Użytkownikami</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Przeglądaj i zarządzaj uprawnieniami użytkowników w systemie.
          </p>
        </div>
        <button className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap">
          + Dodaj Użytkownika
        </button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="py-4 text-foreground text-black">Użytkownik</TableHead>
              <TableHead className="py-4 text-foreground text-black">Rola</TableHead>
              <TableHead className="py-4 text-foreground text-black">Status</TableHead>
              <TableHead className="text-right py-4 text-foreground text-black">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="transition-colors group">
                <TableCell className="font-medium flex items-center gap-4 py-4">
                  <Avatar className="h-10 w-10 border border-border shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs tracking-wider">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-black">{user.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <span className="text-sm font-medium text-primary/40 bg-muted px-2.5 py-1 rounded-md">
                    {user.role}
                  </span>
                </TableCell>
                <TableCell className="py-4">
                  <Badge
                    variant={user.status === 'Aktywny' ? 'default' : 'secondary'}
                    className={
                      user.status === 'Aktywny'
                        ? 'bg-primary/20 text-primary hover:bg-primary/30 border-primary/20 shadow-none'
                        : user.status === 'Oczekujący'
                          ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border-amber-500/20 shadow-none'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80 border-border shadow-none'
                    }
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right py-4">
                  <button className="text-sm font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors">
                    Edytuj
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}