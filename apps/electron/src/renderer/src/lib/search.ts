import { apiFetch, initApiBase } from "@renderer/lib/api";
import type { DivergenceReport, ProviderSearchResult } from "@updated/search";

export interface SearchQuerySuccess {
  ok: true;
  query: string;
  contested: boolean;
  divergence: DivergenceReport;
  results: ProviderSearchResult[];
}

export interface SearchQueryFailure {
  ok: false;
  error: string;
}

export type SearchQueryResult = SearchQuerySuccess | SearchQueryFailure;

/** Load persisted search queries (most recent first). */
export async function fetchSearchQueryHistory(): Promise<
  import("@updated/search").SearchQueryHistoryEntry[]
> {
  if (window.api.listSearchQueryHistory) {
    return window.api.listSearchQueryHistory();
  }
  return [];
}

/** Clear local search query history. */
export async function clearSearchQueryHistory(): Promise<void> {
  if (window.api.clearSearchQueryHistory) {
    await window.api.clearSearchQueryHistory();
  }
}

/** Execute multi-provider search via main-process proxy. */
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
