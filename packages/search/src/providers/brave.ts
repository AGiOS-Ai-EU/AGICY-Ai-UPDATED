import type { SearchProvider } from "../types.js";

/**
 * Brave Search API stub — chosen over Exa for Gate 3 because:
 * - Mature web index with explicit citation URLs (fits certificate UI)
 * - Predictable REST API and documented rate limits
 * - No embedding-only results that lack page titles/snippets
 *
 * Full implementation in Gate 4; API key via OS keychain (see SEARCH-ARCHITECTURE.md).
 */
export const BRAVE_SEARCH_PROVIDER_ID = "brave";

export class BraveSearchProvider implements SearchProvider {
  readonly id = BRAVE_SEARCH_PROVIDER_ID;

  search(_query: string, _signal?: AbortSignal): Promise<never> {
    return Promise.reject(
      new Error(
        "BraveSearchProvider is a Gate 3 stub — wire keychain + HTTP in Gate 4",
      ),
    );
  }
}
