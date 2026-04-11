'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function TestApi() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/user')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-3xl mb-6">Test połączenia z API</h1>

      {error && (
        <div className="bg-red-100 p-4 rounded mb-4">
          Błąd: {error}
        </div>
      )}

      {data ? (
        <pre className="bg-gray-200 p-4 rounded overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <p>Ładowanie...</p>
      )}
    </main>
  );
}