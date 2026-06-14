"use client"

import { User, Mail, Phone, Lock, Loader2, CheckCircle2, Sun, Moon, Laptop } from "lucide-react"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { useTheme } from "next-themes"

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: ''
  })

  const [userRole, setUserRole] = useState<string>('')
  const [teams, setTeams] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function loadData() {
      try {
        const user = await apiFetch('/user') as any
        if (user) {
          setUserRole(user.role || '')
          setFormData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            phone: user.phone || '',
            password: ''
          })
          if (user.role === 'player' && user.team_memberships) {
            setTeams(user.team_memberships.map((m: any) => m.team).filter(Boolean))
          } else if (user.role === 'coach' && user.coached_teams) {
            setTeams(user.coached_teams)
          }
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'Nie udało się pobrać danych użytkownika.' })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const updatePayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        ...(formData.password ? { password: formData.password } : {})
      }

      await apiFetch('/user', {
        method: 'PUT',
        body: JSON.stringify(updatePayload)
      })

      setMessage({ type: 'success', text: 'Zapisano zmiany pomyślnie!' })
      setFormData(prev => ({ ...prev, password: '' }))
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Wystąpił błąd podczas zapisywania.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    )
  }

  const activeTheme = mounted ? theme : "system"

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">Moje dane</h1>
        <p className="text-muted-foreground text-lg">Zarządzaj swoimi danymi osobowymi i ustawieniami konta.</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">

          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
              {message.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6 border-b border-border pb-6">
            <div className="w-24 h-24 rounded-full bg-muted border-2 border-border flex items-center justify-center shrink-0 mx-auto md:mx-0">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Imię</label>
                  <input type="text" name="first_name" required value={formData.first_name} onChange={handleChange} className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Nazwisko</label>
                  <input type="text" name="last_name" required value={formData.last_name} onChange={handleChange} className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-b border-border pb-6">
            <h3 className="text-lg font-semibold text-foreground">Dane kontaktowe</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email
                </label>
                <input type="email" value={formData.email} className="w-full px-4 py-2 border border-border rounded-lg bg-muted/50 cursor-not-allowed text-muted-foreground focus:outline-none" disabled title="Nie można zmienić adresu email." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Telefon
                </label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="+48 123 456 789" />
              </div>
            </div>
          </div>

          {/* Sekcja wyboru motywu */}
          <div className="space-y-4 border-b border-border pb-6">
            <h3 className="text-lg font-semibold text-foreground">Motyw aplikacji</h3>
            <p className="text-sm text-muted-foreground">Wybierz preferowany wygląd interfejsu aplikacji.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left cursor-pointer ${
                  activeTheme === "light"
                    ? "border-green-500 bg-green-500/5 ring-2 ring-green-500/20"
                    : "border-border bg-transparent hover:bg-muted/50"
                }`}
              >
                <div className={`p-2 rounded-lg ${activeTheme === "light" ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground"}`}>
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Jasny</p>
                  <p className="text-xs text-muted-foreground">Tradycyjny jasny wygląd</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left cursor-pointer ${
                  activeTheme === "dark"
                    ? "border-green-500 bg-green-500/5 ring-2 ring-green-500/20"
                    : "border-border bg-transparent hover:bg-muted/50"
                }`}
              >
                <div className={`p-2 rounded-lg ${activeTheme === "dark" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Ciemny</p>
                  <p className="text-xs text-muted-foreground">Łagodny dla oczu</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left cursor-pointer ${
                  activeTheme === "system"
                    ? "border-green-500 bg-green-500/5 ring-2 ring-green-500/20"
                    : "border-border bg-transparent hover:bg-muted/50"
                }`}
              >
                <div className={`p-2 rounded-lg ${activeTheme === "system" ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"}`}>
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Systemowy</p>
                  <p className="text-xs text-muted-foreground">Zgodny z systemem</p>
                </div>
              </button>
            </div>
          </div>

          {userRole === 'player' && (
            <div className="space-y-4 border-b border-border pb-6">
              <h3 className="text-lg font-semibold text-foreground">Moje kluby / drużyny</h3>
              <div className="space-y-2">
                {teams.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {teams.map((team: any) => (
                      <span key={team.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                        {team.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nie należysz obecnie do żadnego zatwierdzonego klubu.</p>
                )}
              </div>
            </div>
          )}

          {userRole === 'coach' && (
            <div className="space-y-4 border-b border-border pb-6">
              <h3 className="text-lg font-semibold text-foreground">Prowadzone drużyny</h3>
              <div className="space-y-2">
                {teams.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {teams.map((team: any) => (
                      <span key={team.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                        {team.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nie masz przypisanych żadnych prowadzonych drużyn.</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Bezpieczeństwo</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                Nowe hasło
              </label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Wpisz nowe hasło (pozostaw puste, aby nie zmieniać)" />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={saving} className={`px-6 py-2.5 bg-foreground text-background font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-foreground/90'}`}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
