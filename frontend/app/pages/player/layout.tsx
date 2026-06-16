import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { PlayerSidebar } from "@/components/player-sidebar"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { ModeToggle } from "@/components/mode-toggle"

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['player']}>
      <SidebarProvider>
      <PlayerSidebar />
      <main className="w-full flex-1 bg-background text-foreground">
        <div className="h-16 px-6 border-b border-border bg-card text-foreground flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
            <h2 className="font-semibold text-lg text-foreground">Panel Zawodnika</h2>
          </div>
          <ModeToggle />
        </div>
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
    </ProtectedRoute>
  )
}
