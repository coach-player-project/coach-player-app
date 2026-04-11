"use client"

import { User, Mail, Phone, Lock, Loader2, CheckCircle2 } from "lucide-react"
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

  useEffect(() => {
    async function loadData() {
      try {
        const user = await apiFetch('/user')
        if (user) {
          setFormData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            phone: user.phone || '',
            password: ''
          })
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Moje dane</h1>
        <p className="text-gray-500 text-lg">Zarządzaj swoimi danymi osobowymi i ustawieniami konta.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">

          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

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
    </div>
  )
}
