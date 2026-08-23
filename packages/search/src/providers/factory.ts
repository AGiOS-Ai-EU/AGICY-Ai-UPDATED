import type { SearchProvider } from "../types.js";
import { BraveSearchProvider } from "./brave.js";
import { MockSearchProvider } from "./mock.js";

export interface SearchProviderOptions {
  apiKey?: string | null;
  forceMock?: boolean;
}

/** Select Brave when a key exists; otherwise fall back to the dev mock provider. */
export function createSearchProvider(
  options: SearchProviderOptions = {},
): SearchProvider {
  const forceMock =
    options.forceMock ||
    process.env.UPDATED_SEARCH_MOCK === "1" ||
    process.env.UPDATED_SEARCH_MOCK === "true";

  if (forceMock) {
    return new MockSearchProvider();
  }

  const apiKey =
    options.apiKey?.trim() ||
    process.env.BRAVE_SEARCH_API_KEY?.trim() ||
    process.env.UPDATED_BRAVE_SEARCH_API_KEY?.trim() ||
    "";

  if (apiKey) {
    return new BraveSearchProvider(apiKey);
  }

  return new MockSearchProvider();
}

export { BraveSearchProvider, MockSearchProvider };
