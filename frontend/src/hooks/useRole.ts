"use client"

import { useState, useEffect } from "react"

export function useRole() {
  const [role, setRole] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const storedRole = localStorage.getItem("user_role")
    if (storedRole) {
      setRole(storedRole)
    }
  }, [])

  return {
    role,
    isClient,
    isAdmin: role === "admin",
    isCoach: role === "coach",
    isPlayer: role === "player",
  }
}
