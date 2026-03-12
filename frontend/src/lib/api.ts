export async function apiFetch(
    endpoint: string,
    options: RequestInit = {}
  ) {
    const url = `http://localhost:8000/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
    const res = await fetch(url, {
      ...options,
      credentials: 'include',                    // ← kluczowe dla cookie Sanctum
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `HTTP ${res.status}`);
    }
  
    return res.json();
  }
  
  // Pomocnicza funkcja do pobrania aktualnego użytkownika
  export async function getCurrentUser() {
    try {
      return await apiFetch('/user');
    } catch {
      return null;
    }
  }