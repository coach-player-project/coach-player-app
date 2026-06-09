"use client"

import { User, Mail, Phone, Lock, Loader2, CheckCircle2, Globe, Trophy, ShieldAlert, Check, RefreshCw, AlertCircle, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"

export function SettingsPage() {
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
  const [activeTab, setActiveTab] = useState<'profile' | 'api_football'>('profile')

  // API-Football Integration States
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [selectedTeamData, setSelectedTeamData] = useState<any>(null)
  const [integrationLoading, setIntegrationLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const [countries, setCountries] = useState<any[]>([])
  const [leagues, setLeagues] = useState<any[]>([])
  const [apiTeams, setApiTeams] = useState<any[]>([])

  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedLeagueId, setSelectedLeagueId] = useState('')
  const [selectedSeason, setSelectedSeason] = useState(new Date().getFullYear().toString())
  const [selectedApiTeamId, setSelectedApiTeamId] = useState('')
  const [importFixtures, setImportFixtures] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = async () => {
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
          const coachedTeams = user.coached_teams || []
          setTeams(coachedTeams)
          if (coachedTeams.length > 0 && !selectedTeamId) {
            setSelectedTeamId(coachedTeams[0].id)
            setSelectedTeamData(coachedTeams[0])
          }
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Nie udało się pobrać danych użytkownika.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // When selected team ID changes, update selected team data and load countries if not loaded yet
  useEffect(() => {
    if (selectedTeamId && teams.length > 0) {
      const team = teams.find(t => t.id === selectedTeamId)
      setSelectedTeamData(team || null)
      
      // Reset wizard selections
      setSelectedCountry('')
      setSelectedLeagueId('')
      setSelectedApiTeamId('')
      setLeagues([])
      setApiTeams([])
      setApiError(null)

      if (team && !team.api_football_team_id && countries.length === 0 && activeTab === 'api_football') {
        loadCountries()
      }
    }
  }, [selectedTeamId, activeTab])

  const loadCountries = async () => {
    setIntegrationLoading(true)
    setApiError(null)
    try {
      const res = await apiFetch('/coach/api-football/countries') as any
      if (res && res.data) {
        setCountries(res.data)
      }
    } catch (err: any) {
      setApiError(err.message || 'Nie udało się pobrać listy krajów. Upewnij się, że klucz API jest skonfigurowany.')
    } finally {
      setIntegrationLoading(false)
    }
  }

  const handleCountryChange = async (country: string) => {
    setSelectedCountry(country)
    setSelectedLeagueId('')
    setSelectedApiTeamId('')
    setLeagues([])
    setApiTeams([])
    
    if (country) {
      setIntegrationLoading(true)
      setApiError(null)
      try {
        const res = await apiFetch(`/coach/api-football/leagues?country=${encodeURIComponent(country)}`) as any
        if (res && res.data) {
          setLeagues(res.data)
        }
      } catch (err: any) {
        setApiError(err.message || 'Nie udało się pobrać lig.')
      } finally {
        setIntegrationLoading(false)
      }
    }
  }

  const handleLeagueChange = async (leagueId: string) => {
    setSelectedLeagueId(leagueId)
    setSelectedApiTeamId('')
    setApiTeams([])
    
    if (leagueId && selectedSeason) {
      setIntegrationLoading(true)
      setApiError(null)
      try {
        const res = await apiFetch(`/coach/api-football/teams?league=${leagueId}&season=${selectedSeason}`) as any
        if (res && res.data) {
          setApiTeams(res.data)
        }
      } catch (err: any) {
        setApiError(err.message || 'Nie udało się pobrać drużyn.')
      } finally {
        setIntegrationLoading(false)
      }
    }
  }

  const handleSeasonChange = async (season: string) => {
    setSelectedSeason(season)
    setSelectedApiTeamId('')
    setApiTeams([])
    
    if (selectedLeagueId && season) {
      setIntegrationLoading(true)
      setApiError(null)
      try {
        const res = await apiFetch(`/coach/api-football/teams?league=${selectedLeagueId}&season=${season}`) as any
        if (res && res.data) {
          setApiTeams(res.data)
        }
      } catch (err: any) {
        setApiError(err.message || 'Nie udało się pobrać drużyn.')
      } finally {
        setIntegrationLoading(false)
      }
    }
  }

  const handleLinkTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeamId || !selectedApiTeamId || !selectedLeagueId || !selectedSeason) return

    setActionLoading(true)
    setMessage(null)
    setApiError(null)

    const selectedApiTeam = apiTeams.find(t => t.team.id.toString() === selectedApiTeamId.toString())
    const apiTeamName = selectedApiTeam ? selectedApiTeam.team.name : 'Oficjalna Drużyna'

    try {
      const payload = {
        api_team_id: parseInt(selectedApiTeamId),
        api_league_id: parseInt(selectedLeagueId),
        api_season: parseInt(selectedSeason),
        api_team_name: apiTeamName,
        import_fixtures: importFixtures
      }

      const res = await apiFetch(`/coach/teams/${selectedTeamId}/link-api-football`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }) as any

      setMessage({ 
        type: 'success', 
        text: `Pomyślnie połączono z oficjalnymi rozgrywkami! ${importFixtures ? `Zaimportowano ${res.imported_fixtures_count || 0} meczów.` : ''}` 
      })
      await loadData()
    } catch (err: any) {
      setApiError(err.message || 'Wystąpił błąd podczas łączenia z API-Football.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSyncTeam = async () => {
    if (!selectedTeamId) return

    setActionLoading(true)
    setMessage(null)
    setApiError(null)

    try {
      const res = await apiFetch(`/coach/teams/${selectedTeamId}/sync-api-football`, {
        method: 'POST'
      }) as any

      setMessage({ 
        type: 'success', 
        text: `Synchronizacja zakończona pomyślnie! Zaktualizowano ${res.synced_count || 0} meczów.` 
      })
      await loadData()
    } catch (err: any) {
      setApiError(err.message || 'Wystąpił błąd podczas synchronizacji meczów.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnlinkTeam = async () => {
    if (!selectedTeamId) return
    if (!confirm('Czy na pewno chcesz odłączyć tę drużynę od oficjalnych rozgrywek? Spowoduje to usunięcie wszystkich zaimportowanych meczów powiązanych z tym klubem.')) return

    setActionLoading(true)
    setMessage(null)
    setApiError(null)

    try {
      await apiFetch(`/coach/teams/${selectedTeamId}/unlink-api-football`, {
        method: 'POST'
      })

      setMessage({ 
        type: 'success', 
        text: 'Pomyślnie odłączono drużynę i usunięto zaimportowane mecze.' 
      })
      await loadData()
    } catch (err: any) {
      setApiError(err.message || 'Wystąpił błąd podczas odłączania integracji.')
    } finally {
      setActionLoading(false)
    }
  }

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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Ustawienia</h1>
        <p className="text-gray-500 text-lg">Zarządzaj swoimi danymi osobowymi i konfiguracją drużyn.</p>
      </div>

      {userRole === 'coach' && (
        <div className="flex border-b border-gray-200 gap-6">
          <button
            onClick={() => { setActiveTab('profile'); setMessage(null); }}
            className={`pb-3 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Moje dane
          </button>
          <button
            onClick={() => { setActiveTab('api_football'); setMessage(null); }}
            className={`pb-3 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'api_football'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Oficjalne Rozgrywki (API-Football)
          </button>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <CheckCircle2 className={`w-5 h-5 ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`} />
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {activeTab === 'profile' ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row gap-6 border-b border-gray-100 pb-6">
              <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center shrink-0 mx-auto md:mx-0">
                <User className="w-10 h-10 text-gray-400" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Imię</label>
                    <input type="text" name="first_name" required value={formData.first_name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Nazwisko</label>
                    <input type="text" name="last_name" required value={formData.last_name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-b border-gray-100 pb-6">
              <h3 className="text-lg font-semibold text-gray-900">Dane kontaktowe</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Email
                  </label>
                  <input type="email" value={formData.email} className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed text-gray-500 focus:outline-none" disabled title="Nie można zmienić adresu email." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    Telefon
                  </label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="+48 123 456 789" />
                </div>
              </div>
            </div>

            {userRole === 'player' && (
              <div className="space-y-4 border-b border-gray-100 pb-6">
                <h3 className="text-lg font-semibold text-gray-900">Moje kluby / drużyny</h3>
                <div className="space-y-2">
                  {teams.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teams.map((team: any) => (
                        <span key={team.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {team.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Nie należysz obecnie do żadnego zatwierdzonego klubu.</p>
                  )}
                </div>
              </div>
            )}

            {userRole === 'coach' && (
              <div className="space-y-4 border-b border-gray-100 pb-6">
                <h3 className="text-lg font-semibold text-gray-900">Prowadzone drużyny</h3>
                <div className="space-y-2">
                  {teams.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teams.map((team: any) => (
                        <span key={team.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {team.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Nie masz przypisanych żadnych prowadzonych drużyn.</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Bezpieczeństwo</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  Nowe hasło
                </label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Wpisz nowe hasło (pozostaw puste, aby nie zmieniać)" />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={saving} className={`px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg transition-colors flex items-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-800'}`}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-500" />
              Integracja z oficjalnymi rozgrywkami
            </h3>
            <p className="text-sm text-gray-500">
              Połącz wybraną prowadzoną drużynę z bazą danych API-Football, aby automatycznie importować terminarz oraz synchronizować oficjalne wyniki meczów.
            </p>
          </div>

          <div className="space-y-2 max-w-md">
            <label className="text-sm font-medium text-gray-700">Wybierz swoją drużynę</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-gray-300 transition-colors"
            >
              <option value="" disabled>-- Wybierz drużynę --</option>
              {teams.map((team: any) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          {selectedTeamData && (
            <div className="border-t border-gray-100 pt-6">
              {apiError && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold">Błąd integracji:</span>
                    <p className="text-sm">{apiError}</p>
                  </div>
                </div>
              )}

              {selectedTeamData.api_football_team_id ? (
                // Linked State
                <div className="bg-indigo-50/50 rounded-xl border border-indigo-100/80 p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center border border-indigo-100/50 shrink-0">
                        <Trophy className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">{selectedTeamData.name}</h4>
                        <p className="text-sm text-indigo-700 font-medium">
                          Połączono z: <span className="underline">{selectedTeamData.api_football_team_name}</span> (ID: {selectedTeamData.api_football_team_id})
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 self-start sm:self-auto">
                      <Check className="w-3.5 h-3.5" /> Aktywna integracja
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-white p-4 rounded-lg border border-indigo-100/30">
                    <div>
                      <span className="text-gray-400 block text-xs font-medium uppercase tracking-wider mb-1">Oficjalna liga (ID)</span>
                      <span className="font-semibold text-gray-800">{selectedTeamData.api_football_league_id}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-xs font-medium uppercase tracking-wider mb-1">Sezon rozgrywek</span>
                      <span className="font-semibold text-gray-800">{selectedTeamData.api_football_season}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-xs font-medium uppercase tracking-wider mb-1">Automatyczny import</span>
                      <span className="font-semibold text-green-600 flex items-center gap-1">Tak (Włączony)</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={handleSyncTeam}
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-75 disabled:cursor-not-allowed shadow-sm"
                    >
                      <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                      Synchronizuj mecze teraz
                    </button>
                    <button
                      onClick={handleUnlinkTeam}
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-white hover:bg-red-50 text-red-600 font-medium rounded-lg border border-red-200 transition-colors flex items-center gap-2 text-sm disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      Odłącz integrację
                    </button>
                  </div>
                </div>
              ) : (
                // Unlinked State - Wizard Form
                <form onSubmit={handleLinkTeam} className="space-y-6 max-w-xl">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 text-base">Kreator konfiguracji</h4>
                    <p className="text-sm text-gray-500">
                      Wybierz odpowiednie parametry ligowe, aby znaleźć oficjalną drużynę.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Country Select */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase">Kraj rozgrywek</label>
                        <select
                          value={selectedCountry}
                          onChange={(e) => handleCountryChange(e.target.value)}
                          disabled={integrationLoading}
                          required
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">-- Wybierz kraj --</option>
                          {countries.map((c, i) => (
                            <option key={i} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Season Select */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase">Sezon</label>
                        <select
                          value={selectedSeason}
                          onChange={(e) => handleSeasonChange(e.target.value)}
                          disabled={integrationLoading || !selectedLeagueId}
                          required
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          {Array.from({ length: 4 }).map((_, idx) => {
                            const year = (new Date().getFullYear() - idx + 1).toString()
                            return <option key={year} value={year}>{year}</option>
                          })}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* League Select */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase">Oficjalna liga</label>
                        <select
                          value={selectedLeagueId}
                          onChange={(e) => handleLeagueChange(e.target.value)}
                          disabled={integrationLoading || !selectedCountry}
                          required
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">-- Wybierz ligę --</option>
                          {leagues.map((l) => (
                            <option key={l.league.id} value={l.league.id}>{l.league.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Official Team Select */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase">Oficjalna drużyna</label>
                        <select
                          value={selectedApiTeamId}
                          onChange={(e) => setSelectedApiTeamId(e.target.value)}
                          disabled={integrationLoading || !selectedLeagueId || apiTeams.length === 0}
                          required
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">-- Wybierz drużynę --</option>
                          {apiTeams.map((t) => (
                            <option key={t.team.id} value={t.team.id}>{t.team.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Import Checkbox */}
                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="importFixtures"
                        checked={importFixtures}
                        onChange={(e) => setImportFixtures(e.target.checked)}
                        className="w-4.5 h-4.5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                      />
                      <label htmlFor="importFixtures" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                        Natychmiast zaimportuj terminarz meczów i dodaj do kalendarza
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={actionLoading || !selectedApiTeamId || integrationLoading}
                      className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg transition-colors flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
                    >
                      {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Połącz z oficjalnymi rozgrywkami
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
