export default function PlayerPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Pulpit Zawodnika</h1>
        <p className="text-gray-500 text-lg">Witaj w swoim panelu. Sprawdź nadchodzące treningi, taktykę i zgłoś swoją obecność.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: "Najbliższy trening", description: "Dzisiaj, 18:00 - Boisko główne", color: "bg-blue-100 text-blue-700" },
          { title: "Status obecności", description: "Nie zgłoszono na dzisiaj", color: "bg-amber-100 text-amber-700" },
          { title: "Twoja forma", description: "Wypełnij ankietę zmęczenia", color: "bg-green-100 text-green-700" },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${item.color}`}>
              <div className="w-6 h-6 opacity-70" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
