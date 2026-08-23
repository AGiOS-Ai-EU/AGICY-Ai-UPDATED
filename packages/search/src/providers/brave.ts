import type { SearchAnswer, SearchProvider } from "../types.js";

export const BRAVE_SEARCH_PROVIDER_ID = "brave";

const BRAVE_WEB_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";

interface BraveWebResult {
  url?: string;
  title?: string;
  description?: string;
  age?: string;
  page_age?: string;
}

interface BraveWebResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function composeAnswer(query: string, snippets: string[]): string {
  const joined = snippets.filter(Boolean).join(" ").trim();
  if (joined) return joined;
  return `Results for "${query.trim()}"`;
}

export class BraveSearchProvider implements SearchProvider {
  readonly id = BRAVE_SEARCH_PROVIDER_ID;

  constructor(private readonly apiKey: string) {
    if (!apiKey.trim()) {
      throw new Error("BraveSearchProvider requires a non-empty API key");
    }
  }

  async search(query: string, signal?: AbortSignal): Promise<SearchAnswer> {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new Error("Search query must not be empty");
    }

    const started = Date.now();
    const url = new URL(BRAVE_WEB_SEARCH_URL);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("count", "10");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": this.apiKey,
      },
      signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Brave search failed (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ""}`,
      );
    }

    const payload = (await response.json()) as BraveWebResponse;
    const results = payload.web?.results ?? [];

    const citations = results
      .filter((result): result is BraveWebResult & { url: string } =>
        Boolean(result.url),
      )
      .map((result) => ({
        url: result.url,
        title: result.title?.trim() || result.url,
        domain: hostnameFromUrl(result.url),
        publishedAt: result.page_age || result.age || undefined,
        snippet: result.description?.trim() || undefined,
      }));

    const snippets = citations
      .map((citation) => citation.snippet || citation.title)
      .slice(0, 3);

    return {
      answer: composeAnswer(trimmed, snippets),
      citations,
      engineVersion: response.headers.get("X-Brave-Api-Version") ?? undefined,
      latencyMs: Date.now() - started,
    };
  }
}
