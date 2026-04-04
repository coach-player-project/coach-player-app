import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin-sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <main className="w-full flex-1 bg-gray-50/30">
        <div className="h-16 px-6 border-b bg-white flex items-center gap-4 sticky top-0 z-10">
          <SidebarTrigger className="-ml-2 text-gray-600 hover:text-black" />
          <h2 className="font-semibold text-lg text-gray-800">Panel Administratora</h2>
        </div>
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
