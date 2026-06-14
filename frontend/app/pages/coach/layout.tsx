import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { CoachSidebar } from "@/components/coach-sidebar"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { ModeToggle } from "@/components/mode-toggle"

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['coach']}>
      <SidebarProvider>
      <CoachSidebar />
      <main className="w-full flex-1 bg-background text-foreground">
        <div className="h-16 px-6 border-b border-border bg-black text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-2 text-white hover:text-gray-200" />
            <h2 className="font-semibold text-lg text-white">Panel Trenera</h2>
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
