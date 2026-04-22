export async function apiFetch(
    endpoint: string,
    options: RequestInit = {}
  ) {
    const url = `http://localhost:8000/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    // Pobierz token Bearer z localStorage (Sanctum token-based auth)
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    // Jeśli 401 - token wygasł, wyloguj
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_role');
        window.location.href = '/login';
      }
      throw new Error('Sesja wygasła. Zaloguj się ponownie.');
    }
  
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      let errorMsg = `HTTP ${res.status}`;
      if (errorData?.errors) {
        errorMsg = Object.values(errorData.errors as Record<string, string[]>).flat().join(' ');
      } else if (errorData?.message) {
        errorMsg = errorData.message;
      }
      throw new Error(errorMsg);
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