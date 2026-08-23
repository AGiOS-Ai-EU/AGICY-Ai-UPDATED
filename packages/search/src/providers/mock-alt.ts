import type { SearchAnswer, SearchProvider } from "../types.js";

/** Alternate mock index for divergence demos — deliberately low overlap with `mock`. */
export const MOCK_ALT_SEARCH_ANSWER: SearchAnswer = {
  answer:
    "Community guides suggest filing through an authorised secretary, but official registrar guidance should prevail for HE32 deadlines.",
  citations: [
    {
      url: "https://stackoverflow.com/questions/cyprus-he32-filing",
      title: "How do I file an HE32 annual return in Cyprus?",
      domain: "stackoverflow.com",
      publishedAt: "2024-09-20",
      snippet:
        "Developers and founders compare practical filing steps and common registrar portal errors.",
    },
    {
      url: "https://www.bbc.co.uk/news/business/cyprus-filings",
      title: "Cyprus businesses face filing season crunch",
      domain: "bbc.co.uk",
      publishedAt: "2025-01-08",
      snippet:
        "Business reporters highlight seasonal bottlenecks at corporate service providers.",
    },
    {
      url: "https://cyprus-mail.com/business/annual-return-checklist",
      title: "Annual return checklist for Cyprus SMEs",
      domain: "cyprus-mail.com",
      publishedAt: "2024-12-02",
      snippet:
        "A press checklist summarises documents needed before submitting annual returns.",
    },
    {
      url: "https://forum.cyprusexpats.com/t/he32-filing-thread",
      title: "HE32 filing experiences",
      domain: "forum.cyprusexpats.com",
      snippet:
        "Expatriate forum thread sharing anecdotal filing timelines and agent recommendations.",
    },
  ],
  engineVersion: "mock-alt-1",
  latencyMs: 15,
};

export class MockAltSearchProvider implements SearchProvider {
  readonly id = "mock-alt";

  search(query: string, signal?: AbortSignal): Promise<SearchAnswer> {
    if (signal?.aborted) {
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }
    return Promise.resolve({
      ...MOCK_ALT_SEARCH_ANSWER,
      answer: `${MOCK_ALT_SEARCH_ANSWER.answer} (Query: ${query.trim()})`,
    });
  }
}
