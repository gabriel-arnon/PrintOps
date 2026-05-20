/**
 * Simple JWT auth helpers backed by localStorage.
 */

const TOKEN_KEY = "token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Force a redirect to /login. Used by the api client on 401 responses.
 */
export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  clearToken();
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");

export interface LoginResponse {
  access_token: string;
  token_type?: string;
}

/**
 * FastAPI's OAuth2PasswordRequestForm requires application/x-www-form-urlencoded
 * (or multipart/form-data) — NOT JSON.
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  if (!BASE_URL) throw new Error("VITE_API_URL not configured");
  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);

  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    body: formData,
    
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = (body as { detail?: string })?.detail ?? "";
    } catch {
      // ignore
    }
    if (res.status === 401) throw new Error(detail || "Usuário ou senha incorretos");
    throw new Error(detail || `Erro ao autenticar (HTTP ${res.status})`);
  }



  const data = await res.json() as LoginResponse
  if (!data.access_token) throw new Error("Resposta de login inválida");
  setToken(data.access_token);
  return data;
}

export function logout(): void {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }
}
