import { classifySource } from "./source-class.js";
import type { SearchCitation } from "./types.js";

export interface PrimaryRateSummary {
  primary: number;
  total: number;
  /** Plain `primary / total` string for the results header. */
  rateText: string;
  hasPrimary: boolean;
}

export interface AgeStripSummary {
  oldest: string;
  newest: string;
}

export interface CitationAgeSummary {
  /** ISO date (YYYY-MM-DD) or "undated". */
  label: string;
  timestamp: number | null;
}

function parseCitationDate(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatCitationDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/** Primary-source rate across all citations. */
export function computePrimaryRate(
  citations: SearchCitation[],
): PrimaryRateSummary {
  const total = citations.length;
  const primary = citations.filter(
    (citation) => classifySource(citation) === "primary",
  ).length;
  return {
    primary,
    total,
    rateText: `${primary} / ${total}`,
    hasPrimary: primary > 0,
  };
}

/** Oldest and newest cited source dates for the age strip. */
export function formatAgeStrip(citations: SearchCitation[]): AgeStripSummary {
  const timestamps = citations
    .map((citation) => parseCitationDate(citation.publishedAt))
    .filter((value): value is number => value !== null);

  if (timestamps.length === 0) {
    return { oldest: "undated", newest: "undated" };
  }

  const oldestTs = Math.min(...timestamps);
  const newestTs = Math.max(...timestamps);
  return {
    oldest: formatCitationDate(oldestTs),
    newest: formatCitationDate(newestTs),
  };
}

/** Age label for a single citation (card bottom strip). */
export function citationAgeLabel(citation: SearchCitation): string {
  const timestamp = parseCitationDate(citation.publishedAt);
  return timestamp === null ? "undated" : formatCitationDate(timestamp);
}

/** Oldest cited source age among a card's citations. */
export function oldestCitationAgeLabel(citations: SearchCitation[]): string {
  const timestamps = citations
    .map((citation) => parseCitationDate(citation.publishedAt))
    .filter((value): value is number => value !== null);

  if (timestamps.length === 0) return "undated";
  return formatCitationDate(Math.min(...timestamps));
}

/** Unique domains preserving first-seen order. */
export function uniqueCitationDomains(citations: SearchCitation[]): string[] {
  const seen = new Set<string>();
  const domains: string[] = [];
  for (const citation of citations) {
    const domain = citation.domain.trim().toLowerCase();
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    domains.push(citation.domain);
  }
  return domains;
}
