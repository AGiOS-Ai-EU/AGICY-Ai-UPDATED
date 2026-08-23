/** A single web source returned with a search answer. */
export interface SearchCitation {
  url: string;
  title: string;
  domain: string;
  publishedAt?: string;
  snippet?: string;
}

/** Normalized search response from any provider. */
export interface SearchAnswer {
  answer: string;
  citations: SearchCitation[];
  engineVersion?: string;
  latencyMs?: number;
}

/** Provider contract — implemented in Gate 4+. */
export interface SearchProvider {
  readonly id: string;
  search(query: string, signal?: AbortSignal): Promise<SearchAnswer>;
}

/** Dictation vs search routing mode for the hotkey pipeline. */
export type InputMode = "dictation" | "search";
