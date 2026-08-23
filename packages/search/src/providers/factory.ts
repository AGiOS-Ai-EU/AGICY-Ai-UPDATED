import type { SearchProvider } from "../types.js";
import { BraveSearchProvider } from "./brave.js";
import { MockSearchProvider } from "./mock.js";
import { MockAltSearchProvider } from "./mock-alt.js";

export interface SearchProviderOptions {
  apiKey?: string | null;
  forceMock?: boolean;
}

function isSingleProviderMode(): boolean {
  return (
    process.env.UPDATED_SEARCH_SINGLE === "1" ||
    process.env.UPDATED_SEARCH_SINGLE === "true"
  );
}

/**
 * Return the active provider set for divergence-aware search.
 * Default dev path runs two mocks; live Brave runs alongside mock-alt unless
 * UPDATED_SEARCH_SINGLE=1.
 */
export function createSearchProviders(
  options: SearchProviderOptions = {},
): SearchProvider[] {
  const forceMock =
    options.forceMock ||
    process.env.UPDATED_SEARCH_MOCK === "1" ||
    process.env.UPDATED_SEARCH_MOCK === "true";

  const apiKey =
    options.apiKey?.trim() ||
    process.env.BRAVE_SEARCH_API_KEY?.trim() ||
    process.env.UPDATED_BRAVE_SEARCH_API_KEY?.trim() ||
    "";

  if (isSingleProviderMode()) {
    if (forceMock || !apiKey) return [new MockSearchProvider()];
    return [new BraveSearchProvider(apiKey)];
  }

  if (forceMock || !apiKey) {
    return [new MockSearchProvider(), new MockAltSearchProvider()];
  }

  return [new BraveSearchProvider(apiKey), new MockAltSearchProvider()];
}

/** Back-compat helper for callers that still expect one provider. */
export function createSearchProvider(
  options: SearchProviderOptions = {},
): SearchProvider {
  return createSearchProviders(options)[0];
}

export { BraveSearchProvider, MockAltSearchProvider, MockSearchProvider };
