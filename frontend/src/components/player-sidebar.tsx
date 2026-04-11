"use client"

import { CalendarDays, Presentation, Dumbbell, MessageCircle, Activity, LayoutDashboard, Settings } from "lucide-react"

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

const items = [
  {
    title: "Pulpit",
    url: "/pages/player",
    icon: LayoutDashboard,
  },
  {
    title: "Obecności na treningach",
    url: "/pages/player/calendar",
    icon: CalendarDays,
  },
  {
    title: "Podgląd treningów",
    url: "/pages/player/trainings",
    icon: Dumbbell,
  },
  {
    title: "Kontakt z trenerem",
    url: "/pages/player/chat",
    icon: MessageCircle,
  },
  {
    title: "Taktyka meczowa",
    url: "/pages/player/tactics",
    icon: Presentation,
  },
  {
    title: "Ankieta zmęczenia",
    url: "/pages/player/fatigue",
    icon: Activity,
  },
  {
    title: "Moje dane",
    url: "/pages/player/settings",
    icon: Settings,
  },
]

export function PlayerSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold tracking-wider text-gray-500 uppercase mt-4 mb-2">
            Panel Zawodnika
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
