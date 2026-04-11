import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { PlayerSidebar } from "@/components/player-sidebar"

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <PlayerSidebar />
      <main className="w-full flex-1 bg-white text-gray-900">
        <div className="h-16 px-6 border-b border-gray-200 bg-white flex items-center gap-4 sticky top-0 z-10">
          <SidebarTrigger className="-ml-2 text-gray-500 hover:text-black" />
          <h2 className="font-semibold text-lg text-gray-900">Panel Zawodnika</h2>
        </div>
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
