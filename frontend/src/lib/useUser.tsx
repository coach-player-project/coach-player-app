'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function Me() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/user')
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Nie udało się pobrać użytkownika');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8">Ładowanie użytkownika...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl mb-4">Błąd</h1>
        <p className="text-red-600">{error}</p>
        <p className="mt-4">Prawdopodobnie nie jesteś zalogowany.</p>
      </div>
    );
  }

  if (!user) {
    return <div className="p-8">Brak zalogowanego użytkownika</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Zalogowany użytkownik</h1>
      
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm border">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">ID</dt>
            <dd className="mt-1 text-lg">{user.id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Nazwa</dt>
            <dd className="mt-1 text-lg">{user.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-lg">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Utworzony</dt>
            <dd className="mt-1 text-lg">{new Date(user.created_at).toLocaleString('pl-PL')}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}