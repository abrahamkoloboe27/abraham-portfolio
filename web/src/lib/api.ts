import type {
  Page,
  Playlist,
  Post,
  PostSummary,
  Project,
  ProjectSummary,
  SiteBundle,
  Tag,
  Talk,
} from "@/lib/types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);
const PREFIX = "/api/v1";

/** Seconds before a cached page is revalidated in the background. */
const REVALIDATE = Number(process.env.NEXT_PUBLIC_REVALIDATE ?? 300);

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchOptions = {
  revalidate?: number | false;
  tags?: string[];
  signal?: AbortSignal;
};

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { revalidate = REVALIDATE, tags, signal } = options;

  const response = await fetch(`${API_URL}${PREFIX}${path}`, {
    headers: { Accept: "application/json" },
    signal,
    next: revalidate === false ? undefined : { revalidate, tags },
    cache: revalidate === false ? "no-store" : undefined,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      detail = ((await response.json()) as { detail?: string }).detail ?? detail;
    } catch {
      /* the body was not JSON — keep the status text */
    }
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

/** Returns `null` on 404 so pages can call `notFound()` themselves. */
async function requestOrNull<T>(path: string, options?: FetchOptions): Promise<T | null> {
  try {
    return await request<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

export const api = {
  /** Everything the home page needs, in a single cached request. */
  siteBundle: () => request<SiteBundle>("/site", { tags: ["site"] }),

  /**
   * Same call, but resolving to `null` instead of throwing.
   *
   * Prerendered pages must build even when the API is unreachable — that is the
   * case inside a Docker image build and in CI. The page then renders its
   * "API unavailable" state and ISR replaces it with real content at the first
   * successful revalidation.
   */
  siteBundleSafe: async (): Promise<SiteBundle | null> => {
    try {
      return await request<SiteBundle>("/site", { tags: ["site"] });
    } catch (error) {
      console.warn(
        `[api] /site indisponible (${error instanceof Error ? error.message : "erreur"}) — ` +
          "rendu dégradé, le contenu sera repris à la prochaine revalidation.",
      );
      return null;
    }
  },

  projects: (params: {
    page?: number;
    per_page?: number;
    category?: string;
    tag?: string;
    tech?: string;
    featured?: boolean;
    q?: string;
  } = {}) => request<Page<ProjectSummary>>(`/projects${query(params)}`, { tags: ["projects"] }),

  project: (slug: string) =>
    requestOrNull<Project>(`/projects/${encodeURIComponent(slug)}`, {
      tags: ["projects", `project:${slug}`],
    }),

  posts: (params: { page?: number; per_page?: number; tag?: string; q?: string } = {}) =>
    request<Page<PostSummary>>(`/posts${query(params)}`, { tags: ["posts"] }),

  post: (slug: string) =>
    requestOrNull<Post>(`/posts/${encodeURIComponent(slug)}`, {
      tags: ["posts", `post:${slug}`],
    }),

  tags: () => request<Tag[]>("/tags", { tags: ["tags"] }),

  talks: (params: { page?: number; per_page?: number; type?: string; organization?: string } = {}) =>
    request<Page<Talk>>(`/talks${query(params)}`, { tags: ["talks"] }),

  talk: (slug: string) =>
    requestOrNull<Talk>(`/talks/${encodeURIComponent(slug)}`, { tags: ["talks", `talk:${slug}`] }),

  playlists: () => request<Playlist[]>("/playlists", { tags: ["playlists"] }),

  /** Client-side calls — never cached. */
  sendContact: async (payload: {
    name: string;
    email: string;
    company?: string;
    subject?: string;
    message: string;
    locale: string;
    honeypot?: string;
  }) => {
    const response = await fetch(`${API_URL}${PREFIX}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as {
      detail?: string;
      errors?: { field: string; message: string }[];
    };
    if (!response.ok) {
      throw new ApiError(body.detail ?? "Erreur lors de l'envoi", response.status);
    }
    return body;
  },

  track: (payload: {
    path: string;
    entity_type?: string;
    entity_id?: string;
    locale?: string;
    referrer?: string;
  }) =>
    fetch(`${API_URL}${PREFIX}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined),
};
