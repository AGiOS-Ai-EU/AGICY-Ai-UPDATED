import { describe, expect, it } from "vitest";
import type { ProviderSearchResult } from "./multi-search.js";
import {
  appendSearchQueryHistoryEntry,
  buildSearchQueryHistoryEntry,
  emptySearchQueryHistoryFile,
  parseSearchQueryHistoryFile,
} from "./query-history.js";

const SAMPLE_RESULTS: ProviderSearchResult[] = [
  {
    providerId: "mock",
    answer: {
      answer: "Summary",
      citations: [
        {
          url: "https://example.gov/report",
          title: "Report",
          domain: "example.gov",
          publishedAt: "2024-01-01",
        },
        {
          url: "https://news.example.com/story",
          title: "Story",
          domain: "news.example.com",
        },
      ],
    },
  },
];

describe("buildSearchQueryHistoryEntry", () => {
  it("captures contested state and primary rate", () => {
    const entry = buildSearchQueryHistoryEntry({
      query: "  Cyprus AI policy  ",
      contested: true,
      results: SAMPLE_RESULTS,
      searchedAt: "2026-08-23T09:00:00.000Z",
    });

    expect(entry.query).toBe("Cyprus AI policy");
    expect(entry.contested).toBe(true);
    expect(entry.primaryRateText).toBe("1 / 2");
    expect(entry.providerCount).toBe(1);
    expect(entry.searchedAt).toBe("2026-08-23T09:00:00.000Z");
  });
});

describe("appendSearchQueryHistoryEntry", () => {
  it("moves duplicate queries to the top", () => {
    const first = buildSearchQueryHistoryEntry({
      query: "alpha",
      contested: false,
      results: SAMPLE_RESULTS,
      searchedAt: "2026-08-23T09:00:00.000Z",
    });
    const second = buildSearchQueryHistoryEntry({
      query: "beta",
      contested: true,
      results: SAMPLE_RESULTS,
      searchedAt: "2026-08-23T09:01:00.000Z",
    });
    const refreshedAlpha = buildSearchQueryHistoryEntry({
      query: "alpha",
      contested: true,
      results: SAMPLE_RESULTS,
      searchedAt: "2026-08-23T09:02:00.000Z",
    });

    let file = appendSearchQueryHistoryEntry(
      emptySearchQueryHistoryFile(),
      first,
    );
    file = appendSearchQueryHistoryEntry(file, second);
    file = appendSearchQueryHistoryEntry(file, refreshedAlpha);

    expect(file.entries.map((row) => row.query)).toEqual(["alpha", "beta"]);
    expect(file.entries[0]?.contested).toBe(true);
  });
});

describe("parseSearchQueryHistoryFile", () => {
  it("returns empty file for malformed input", () => {
    expect(parseSearchQueryHistoryFile(null).entries).toEqual([]);
    expect(parseSearchQueryHistoryFile({ version: 2 }).entries).toEqual([]);
  });

  it("keeps valid rows only", () => {
    const parsed = parseSearchQueryHistoryFile({
      version: 1,
      entries: [
        {
          id: "1",
          query: "valid",
          searchedAt: "2026-08-23T09:00:00.000Z",
          contested: false,
          primaryRateText: "0 / 1",
          providerCount: 1,
        },
        { query: "missing fields" },
      ],
    });

    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]?.query).toBe("valid");
  });
});
