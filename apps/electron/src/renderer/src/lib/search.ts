import { apiFetch, initApiBase } from "@renderer/lib/api";
import type { SearchAnswer } from "@updated/search";

export interface SearchQuerySuccess {
  ok: true;
  providerId: string;
  answer: SearchAnswer;
}

export interface SearchQueryFailure {
  ok: false;
  error: string;
}

export type SearchQueryResult = SearchQuerySuccess | SearchQueryFailure;

/** Execute search via main-process proxy (injects keychain key server-side). */
export async function runSearchQuery(
  query: string,
): Promise<SearchQueryResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: false, error: "Query must not be empty" };
  }

  if (window.api.searchQuery) {
    return window.api.searchQuery(trimmed);
  }

  await initApiBase();
  const response = await apiFetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: trimmed }),
  });
  const payload = (await response.json().catch(() => null)) as
    | SearchQueryResult
    | { error?: string }
    | null;

  if (!response.ok || !payload || !("ok" in payload)) {
    return {
      ok: false,
      error:
        (payload && "error" in payload && payload.error) ||
        `Search failed (${response.status})`,
    };
  }

  return payload;
}
