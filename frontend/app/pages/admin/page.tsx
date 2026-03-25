import { redirect } from 'next/navigation';

export default async function AdminPage() {
  // Na razie pomijamy sprawdzanie użytkownika
  // (będzie dodane później)

  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold mb-6">Panel Administratora</h1>
      <p className="text-lg text-gray-600">
        To jest strona admina. 
        <br />
        Sprawdzanie logowania dodamy później.
      </p>

      {/* Tutaj będziesz dodawał resztę panelu */}
      <div className="mt-8 p-6 border rounded-lg bg-gray-50">
        <p className="text-sm text-gray-500">Treść panelu administratora...</p>
      </div>
    </div>
  );
}