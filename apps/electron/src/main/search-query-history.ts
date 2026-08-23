import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  appendSearchQueryHistoryEntry,
  buildSearchQueryHistoryEntry,
  emptySearchQueryHistoryFile,
  type ProviderSearchResult,
  parseSearchQueryHistoryFile,
  type SearchQueryHistoryEntry,
  type SearchQueryHistoryFile,
} from "@updated/search";
import { app } from "electron";

const HISTORY_FILENAME = "search-query-history.json";

function historyPath(): string {
  const override = process.env.UPDATED_SEARCH_QUERY_HISTORY?.trim();
  if (override) return override;
  return join(app.getPath("userData"), HISTORY_FILENAME);
}

function readHistoryFile(): SearchQueryHistoryFile {
  const path = historyPath();
  if (!existsSync(path)) return emptySearchQueryHistoryFile();
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return parseSearchQueryHistoryFile(raw);
  } catch {
    return emptySearchQueryHistoryFile();
  }
}

function writeHistoryFile(file: SearchQueryHistoryFile): void {
  const path = historyPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

export function listSearchQueryHistory(): SearchQueryHistoryEntry[] {
  return readHistoryFile().entries;
}

export function clearSearchQueryHistory(): void {
  writeHistoryFile(emptySearchQueryHistoryFile());
}

export function recordSearchQueryHistory(input: {
  query: string;
  contested: boolean;
  results: ProviderSearchResult[];
}): SearchQueryHistoryEntry[] {
  const entry = buildSearchQueryHistoryEntry(input);
  const next = appendSearchQueryHistoryEntry(readHistoryFile(), entry);
  writeHistoryFile(next);
  return next.entries;
}

export function resolveSearchQueryHistoryPath(): string {
  return historyPath();
}
