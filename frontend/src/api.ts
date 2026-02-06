const API_BASE = "/api";

// ── Types ──────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface RegulatoryUpdate {
  id: number;
  title: string;
  source: string;
  update_type: string;
  summary: string | null;
  ai_summary: string | null;
  key_points: string[] | null;
  impact_assessment: string | null;
  relevance_score: number | null;
  impact_level: string | null;
  published_date: string;
  source_url: string | null;
  content: string | null;
  is_bookmarked?: boolean;
  is_read?: boolean;
  created_at: string;
}

export interface UpdatesResponse {
  items: RegulatoryUpdate[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface TherapeuticArea {
  id: number;
  name: string;
  keywords: string[];
  created_at: string;
}

export interface WatchedCompany {
  id: number;
  name: string;
  aliases: string[];
  created_at: string;
}

export interface DigestSettings {
  digest_enabled: boolean;
  digest_time: string;
  digest_email: string;
}

export interface Digest {
  id: number;
  date: string;
  update_count: number;
  html_content: string;
  delivered: boolean;
  delivered_at: string | null;
  created_at: string;
}

export interface SavedSearch {
  id: number;
  query: string;
  filters: Record<string, unknown> | null;
  created_at: string;
}

export interface ScrapeLog {
  id: number;
  source: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  items_found: number;
  items_new: number;
  error_message: string | null;
}

export interface UpdateFilters {
  source?: string;
  update_type?: string;
  min_relevance?: number;
  max_relevance?: number;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  page?: number;
  page_size?: number;
  bookmarked?: boolean;
}

// ── Auth-aware fetch wrapper ───────────────────────────────────────────

class AuthError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthError";
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("rr_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("rr_token");
    window.location.href = "/login";
    throw new AuthError();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ── Auth endpoints ─────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<{ access_token: string; token_type: string }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    // Handle FastAPI validation errors (detail is array) vs simple errors (detail is string)
    let message = "Invalid credentials";
    if (typeof body.detail === "string") {
      message = body.detail;
    } else if (Array.isArray(body.detail) && body.detail.length > 0) {
      message = body.detail.map((e: { msg?: string }) => e.msg || "Validation error").join(", ");
    }
    throw new Error(message);
  }

  return response.json();
}

export async function getMe(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

// ── Updates endpoints ──────────────────────────────────────────────────

export async function getUpdates(
  filters: UpdateFilters = {}
): Promise<UpdatesResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return apiFetch<UpdatesResponse>(`/updates${query ? `?${query}` : ""}`);
}

export async function getUpdate(id: number): Promise<RegulatoryUpdate> {
  return apiFetch<RegulatoryUpdate>(`/updates/${id}`);
}

export async function bookmarkUpdate(
  id: number
): Promise<{ bookmarked: boolean }> {
  return apiFetch<{ bookmarked: boolean }>(`/updates/${id}/bookmark`, {
    method: "POST",
  });
}

export async function markAsRead(id: number): Promise<{ read: boolean }> {
  return apiFetch<{ read: boolean }>(`/updates/${id}/read`, {
    method: "POST",
  });
}

// ── Search endpoints ───────────────────────────────────────────────────

export async function search(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<UpdatesResponse> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    page_size: String(pageSize),
  });
  return apiFetch<UpdatesResponse>(`/search?${params.toString()}`);
}

export async function getSavedSearches(): Promise<SavedSearch[]> {
  return apiFetch<SavedSearch[]>("/search/saved");
}

export async function saveSearch(
  query: string,
  filters?: Record<string, unknown>
): Promise<SavedSearch> {
  return apiFetch<SavedSearch>("/search/saved", {
    method: "POST",
    body: JSON.stringify({ query, filters }),
  });
}

export async function deleteSavedSearch(id: number): Promise<void> {
  return apiFetch<void>(`/search/saved/${id}`, { method: "DELETE" });
}

// ── Settings endpoints ─────────────────────────────────────────────────

export async function getSettings(): Promise<DigestSettings> {
  return apiFetch<DigestSettings>("/settings");
}

export async function updateSettings(
  settings: Partial<DigestSettings>
): Promise<DigestSettings> {
  return apiFetch<DigestSettings>("/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
}

// ── Therapeutic Areas ──────────────────────────────────────────────────

export async function getTherapeuticAreas(): Promise<TherapeuticArea[]> {
  return apiFetch<TherapeuticArea[]>("/therapeutic-areas");
}

export async function addTherapeuticArea(
  name: string,
  keywords: string[]
): Promise<TherapeuticArea> {
  return apiFetch<TherapeuticArea>("/therapeutic-areas", {
    method: "POST",
    body: JSON.stringify({ name, keywords }),
  });
}

export async function updateTherapeuticArea(
  id: number,
  name: string,
  keywords: string[]
): Promise<TherapeuticArea> {
  return apiFetch<TherapeuticArea>(`/therapeutic-areas/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, keywords }),
  });
}

export async function deleteTherapeuticArea(id: number): Promise<void> {
  return apiFetch<void>(`/therapeutic-areas/${id}`, { method: "DELETE" });
}

// ── Watched Companies ──────────────────────────────────────────────────

export async function getWatchedCompanies(): Promise<WatchedCompany[]> {
  return apiFetch<WatchedCompany[]>("/watched-companies");
}

export async function addWatchedCompany(
  name: string,
  aliases: string[]
): Promise<WatchedCompany> {
  return apiFetch<WatchedCompany>("/watched-companies", {
    method: "POST",
    body: JSON.stringify({ name, aliases }),
  });
}

export async function deleteWatchedCompany(id: number): Promise<void> {
  return apiFetch<void>(`/watched-companies/${id}`, { method: "DELETE" });
}

// ── Digests ────────────────────────────────────────────────────────────

export async function getDigests(
  page: number = 1,
  pageSize: number = 20
): Promise<{ items: Digest[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return apiFetch<{ items: Digest[]; total: number }>(
    `/digests?${params.toString()}`
  );
}

export async function getDigest(id: number): Promise<Digest> {
  return apiFetch<Digest>(`/digests/${id}`);
}

export async function previewDigest(): Promise<{ html: string }> {
  return apiFetch<{ html: string }>("/digests/preview", {
    method: "POST",
    body: JSON.stringify({ hours_back: 24 }),
  });
}

// ── Scraping ───────────────────────────────────────────────────────────

export async function triggerScrape(
  source?: string
): Promise<{ message: string; task_id?: string }> {
  return apiFetch<{ message: string; task_id?: string }>("/scrape/trigger", {
    method: "POST",
    body: JSON.stringify({ source }),
  });
}

export async function getScrapeLogs(): Promise<ScrapeLog[]> {
  return apiFetch<ScrapeLog[]>("/scrape/logs");
}
