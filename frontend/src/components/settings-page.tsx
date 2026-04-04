import { User, Mail, Phone, Lock } from "lucide-react"

export function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Moje dane</h1>
        <p className="text-gray-500 text-lg">Zarządzaj swoimi danymi osobowymi i ustawieniami konta.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          
          <div className="flex flex-col md:flex-row gap-6 border-b border-gray-100 pb-6">
            <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center shrink-0 mx-auto md:mx-0">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Imię</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" defaultValue="Jan" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nazwisko</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" defaultValue="Kowalski" />
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
                <input type="email" className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed text-gray-500 focus:outline-none" defaultValue="jan.kowalski@example.com" disabled />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  Telefon
                </label>
                <input type="tel" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" defaultValue="+48 123 456 789" />
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
              <input type="password" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Wpisz nowe hasło" />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
              Zapisz zmiany
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
