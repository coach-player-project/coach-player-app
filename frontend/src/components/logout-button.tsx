"use client"

import { LogOut, Loader2 } from "lucide-react"
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    const token = localStorage.getItem("auth_token")

    try {
      if (token) {
        await fetch("http://localhost:8000/api/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        })
      }
    } catch (error) {
      console.error("Wystąpił błąd podczas próby wylogowania:", error)
    } finally {
      // Zawsze wyczyść lokalną sesję (access + refresh) i wracaj na '/login'
      localStorage.removeItem("auth_token")
      localStorage.removeItem("refresh_token")
      router.push("/login")
    }
  }

  return (
    <SidebarMenuItem className="mt-4 border-t border-gray-100 pt-2">
      <SidebarMenuButton asChild>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full flex items-center gap-3 px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50/50 rounded-md transition-all cursor-pointer font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
          <span>{loading ? "Wylogowywanie..." : "Wyloguj się"}</span>
        </button>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
