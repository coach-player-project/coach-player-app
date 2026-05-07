"use client"

import { Users, Settings, LayoutDashboard, CalendarDays, Shield } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { LogoutButton } from "./logout-button"

const items = [
  {
    title: "Zarządzanie Użytk.",
    url: "/pages/admin",
    icon: Users,
  },
  {
    title: "Statystyki",
    url: "/pages/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Wydarzenia",
    url: "/pages/admin/events",
    icon: CalendarDays,
  },
  {
    title: "Drużyny",
    url: "/pages/admin/teams",
    icon: Shield,
  },
  {
    title: "Moje dane",
    url: "/pages/admin/settings",
    icon: Settings,
  },
]

export function AdminSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold tracking-wider text-gray-500 uppercase mt-4 mb-2">
            Panel Administratora
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url} className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-green-600 hover:bg-green-50/50 rounded-md transition-all">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <LogoutButton />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
