"use client"

import { Calendar, Presentation, Dumbbell, MessageSquare, MessageCircle, LayoutDashboard, Settings } from "lucide-react"

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
    title: "Pulpit",
    url: "/pages/coach",
    icon: LayoutDashboard,
  },
  {
    title: "Wydarzenia",
    url: "/pages/coach/events",
    icon: Calendar,
  },
  {
    title: "Taktyka meczowa",
    url: "/pages/coach/tactics",
    icon: Presentation,
  },
  {
    title: "Jednostki treningowe",
    url: "/pages/coach/training-units",
    icon: Dumbbell,
  },
  {
    title: "Ankiety zmęczenia",
    url: "/pages/coach/surveys",
    icon: MessageSquare,
  },
  {
    title: "Wiadomości",
    url: "/pages/coach/chat",
    icon: MessageCircle,
  },
  {
    title: "Moje dane",
    url: "/pages/coach/settings",
    icon: Settings,
  },
]

export function CoachSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mt-4 mb-2">
            Panel Trenera
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url} className="flex items-center gap-3 px-3 py-2 text-foreground/80 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50/50 dark:hover:bg-green-950/20 rounded-md transition-all">
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
