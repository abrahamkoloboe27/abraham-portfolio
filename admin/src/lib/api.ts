/** Thin API client with automatic access-token refresh. */

export const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000"
).replace(/\/$/, "");

const PREFIX = "/api/v1";
const ACCESS_KEY = "portfolio_access_token";
const REFRESH_KEY = "portfolio_refresh_token";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const tokens = {
  access: () => localStorage.getItem(ACCESS_KEY),
  refresh: () => localStorage.getItem(REFRESH_KEY),
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
  signal?: AbortSignal;
};

/** Concurrent 401s share a single refresh round-trip. */
let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokens.refresh();
  if (!refresh) return false;

  refreshing ??= (async () => {
    try {
      const response = await fetch(`${API_URL}${PREFIX}/admin/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!response.ok) {
        tokens.clear();
        return false;
      }
      const data = (await response.json()) as { access_token: string; refresh_token: string };
      tokens.set(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

async function parseError(response: Response): Promise<ApiError> {
  let detail = response.statusText || "Erreur inattendue";
  let fields: { field: string; message: string }[] | undefined;
  try {
    const body = (await response.json()) as {
      detail?: string | { msg?: string }[];
      errors?: { field: string; message: string }[];
    };
    if (typeof body.detail === "string") detail = body.detail;
    else if (Array.isArray(body.detail)) detail = body.detail.map((e) => e.msg).join(", ");
    fields = body.errors;
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(detail, response.status, fields);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, auth = true, signal } = options;

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (auth) {
      const token = tokens.access();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    if (body !== undefined) headers["Content-Type"] = "application/json";

    return fetch(`${API_URL}${PREFIX}${path}`, {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    });
  };

  let response = await send();

  if (response.status === 401 && auth && tokens.refresh()) {
    if (await refreshAccessToken()) {
      response = await send();
    }
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", formData }),
  public: <T>(path: string, body?: unknown, method = "POST") =>
    request<T>(path, { method, body, auth: false }),
};

export function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}
