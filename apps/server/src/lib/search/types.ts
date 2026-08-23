/**
 * Server-side mirror of @updated/search contracts.
 * Keep in sync with packages/search/src/types.ts until shared import is wired.
 */

export interface SearchCitation {
  url: string;
  title: string;
  domain: string;
  publishedAt?: string;
  snippet?: string;
}

export interface SearchAnswer {
  answer: string;
  citations: SearchCitation[];
  engineVersion?: string;
  latencyMs?: number;
}

export interface SearchProvider {
  readonly id: string;
  search(query: string, signal?: AbortSignal): Promise<SearchAnswer>;
}

export type InputMode = "dictation" | "search";
