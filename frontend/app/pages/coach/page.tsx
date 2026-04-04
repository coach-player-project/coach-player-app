import { Users } from "lucide-react"

export default function CoachPage() {
  const team = [
    { id: 1, name: "Robert Lewandowski", position: "Napastnik", number: 9, status: "Gotowy", form: "95%", avatar: "RL" },
    { id: 2, name: "Wojciech Szczęsny", position: "Bramkarz", number: 1, status: "Gotowy", form: "85%", avatar: "WS" },
    { id: 3, name: "Piotr Zieliński", position: "Pomocnik", number: 10, status: "Lekki uraz", form: "70%", avatar: "PZ" },
    { id: 4, name: "Jan Bednarek", position: "Obrońca", number: 5, status: "Gotowy", form: "80%", avatar: "JB" },
    { id: 5, name: "Nicola Zalewski", position: "Pomocnik", number: 21, status: "Gotowy", form: "88%", avatar: "NZ" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Pulpit Trenera</h1>
        <p className="text-gray-500 text-lg">Witaj w panelu głównym. Zarządzaj swoimi zawodnikami i planuj kolejne kroki.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Planowanie treningów", link: "Wkrótce...", color: "bg-blue-100 text-blue-700" },
          { title: "Tworzenie taktyki", link: "Wkrótce...", color: "bg-purple-100 text-purple-700" },
          { title: "Jednostki treningowe", link: "Wkrótce...", color: "bg-orange-100 text-orange-700" },
          { title: "Wysyłanie ankiet", link: "Wkrótce...", color: "bg-green-100 text-green-700" },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${item.color}`}>
              {/* Miejsce na ikonę */}
              <div className="w-6 h-6 opacity-70" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.link}</p>
          </div>
        ))}
      </div>

      {/* Tabela Zespołu */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-gray-700" />
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Twój Zespół</h2>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                  <th className="py-4 px-6 font-medium">Zawodnik</th>
                  <th className="py-4 px-6 font-medium">Pozycja</th>
                  <th className="py-4 px-6 font-medium text-center">Numer</th>
                  <th className="py-4 px-6 font-medium text-center">Forma</th>
                  <th className="py-4 px-6 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {team.map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-sm shrink-0">
                          {player.avatar}
                        </div>
                        <span className="font-medium text-gray-900">{player.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600">{player.position}</td>
                    <td className="py-4 px-6 text-center text-gray-600 font-medium">{player.number}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {player.form}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${player.status === 'Gotowy' ? 'text-green-600' : 'text-amber-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${player.status === 'Gotowy' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                        {player.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
