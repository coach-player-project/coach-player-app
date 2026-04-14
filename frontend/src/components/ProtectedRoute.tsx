"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    // Sprawdzenie sesji po zamontowaniu na kliencie
    const token = localStorage.getItem("auth_token")
    const role = localStorage.getItem("user_role")

    if (!token) {
      // Brak tokenu -> Użytkownik gość
      router.replace("/login")
      return
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (!role || !allowedRoles.includes(role)) {
        // Brak perrmisji (niedozwolona rola merytorycznie)
        // Autoprzekierowanie na odpowiedni, dedykowany pulpit usera
        if (role === "admin") router.replace("/pages/admin")
        else if (role === "coach") router.replace("/pages/coach")
        else if (role === "player") router.replace("/pages/player")
        else router.replace("/login")
        return
      }
    }

    // Pomyślna weryfikacja
    setIsAuthorized(true)
  }, [allowedRoles, router])

  if (!isAuthorized) {
    // Ekran ładowania chroniący przed błyśnięciem widoku dla "nieklikniętych"
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
        <p className="text-gray-500 font-medium">Autoryzacja. Proszę czekać...</p>
      </div>
    )
  }

  return <>{children}</>
}
