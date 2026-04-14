const API_BASE_URL = "http://localhost:8000/api";

/**
 * Universal fetch wrapper to handle auth tokens, automatic 401 retries, and token refresh logic.
 */
export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  let token = localStorage.getItem("auth_token");

  // Format headers
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle Unauthorized (Token Expired)
  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      // No refresh token available, force logout
      forceLogout();
      throw new Error("Sesja wygasła.");
    }

    try {
      // Attempt to refresh the tokens using our long-lived refresh_token
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!refreshResponse.ok) {
        throw new Error("Nie powiodło się odświeżenie tokenu.");
      }

      const refreshData = await refreshResponse.json();

      // Update local storage with new tokens
      localStorage.setItem("auth_token", refreshData.token);
      localStorage.setItem("refresh_token", refreshData.refresh_token);

      // Re-run the original request with the new access token
      headers.set("Authorization", `Bearer ${refreshData.token}`);
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
      
    } catch (refreshError) {
      forceLogout();
      throw new Error("Sesja bezpowrotnie wygasła, zaloguj się ponownie.");
    }
  }

  return response;
}

function forceLogout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}
