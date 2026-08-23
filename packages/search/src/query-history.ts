import type { ProviderSearchResult } from "./multi-search.js";
import { computePrimaryRate } from "./result-stats.js";

/** One persisted search in local query history. */
export interface SearchQueryHistoryEntry {
  id: string;
  query: string;
  searchedAt: string;
  contested: boolean;
  primaryRateText: string;
  providerCount: number;
}

export const SEARCH_QUERY_HISTORY_MAX = 30;

export interface SearchQueryHistoryFile {
  version: 1;
  entries: SearchQueryHistoryEntry[];
}

export function emptySearchQueryHistoryFile(): SearchQueryHistoryFile {
  return { version: 1, entries: [] };
}

/** Build a history row from a successful multi-provider search. */
export function buildSearchQueryHistoryEntry(input: {
  query: string;
  contested: boolean;
  results: ProviderSearchResult[];
  searchedAt?: string;
}): SearchQueryHistoryEntry {
  const citations = input.results.flatMap((result) => result.answer.citations);
  const primaryRate = computePrimaryRate(citations);
  const searchedAt = input.searchedAt ?? new Date().toISOString();

  return {
    id: `${searchedAt}:${input.query.trim().toLowerCase()}`,
    query: input.query.trim(),
    searchedAt,
    contested: input.contested,
    primaryRateText: primaryRate.rateText,
    providerCount: input.results.length,
  };
}

/** Prepend an entry, dedupe by query text, cap length. */
export function appendSearchQueryHistoryEntry(
  file: SearchQueryHistoryFile,
  entry: SearchQueryHistoryEntry,
  max = SEARCH_QUERY_HISTORY_MAX,
): SearchQueryHistoryFile {
  const normalized = entry.query.trim().toLowerCase();
  const withoutDuplicate = file.entries.filter(
    (row) => row.query.trim().toLowerCase() !== normalized,
  );
  const entries = [entry, ...withoutDuplicate].slice(0, max);
  return { version: 1, entries };
}

/** Parse persisted JSON; invalid rows are dropped. */
export function parseSearchQueryHistoryFile(
  raw: unknown,
): SearchQueryHistoryFile {
  if (!raw || typeof raw !== "object") return emptySearchQueryHistoryFile();
  const candidate = raw as Partial<SearchQueryHistoryFile>;
  if (candidate.version !== 1 || !Array.isArray(candidate.entries)) {
    return emptySearchQueryHistoryFile();
  }

  const entries = candidate.entries.filter(
    (row): row is SearchQueryHistoryEntry =>
      Boolean(
        row &&
          typeof row === "object" &&
          typeof row.id === "string" &&
          typeof row.query === "string" &&
          row.query.trim().length > 0 &&
          typeof row.searchedAt === "string" &&
          typeof row.contested === "boolean" &&
          typeof row.primaryRateText === "string" &&
          typeof row.providerCount === "number",
      ),
  );

  return { version: 1, entries: entries.slice(0, SEARCH_QUERY_HISTORY_MAX) };
}
