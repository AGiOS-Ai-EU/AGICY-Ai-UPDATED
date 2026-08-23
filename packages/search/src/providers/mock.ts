import type { SearchAnswer, SearchProvider } from "../types.js";

/** Fixed citations for dev UI when no Brave key is configured. */
export const MOCK_SEARCH_ANSWER: SearchAnswer = {
  answer:
    "Cyprus company annual returns must be filed with the Department of Registrar of Companies. Late filing can incur penalties under the Companies Law.",
  citations: [
    {
      url: "https://www.gov.cy/en/economy-and-finance/company-registration",
      title: "Department of Registrar of Companies and Intellectual Property",
      domain: "gov.cy",
      publishedAt: "2023-11-04",
      snippet:
        "The Department of Registrar of Companies maintains the official register of Cyprus companies and accepts HE32 annual returns.",
    },
    {
      url: "https://en.wikipedia.org/wiki/Companies_Law_(Cyprus)",
      title: "Companies Law (Cyprus)",
      domain: "en.wikipedia.org",
      publishedAt: "2024-08-12",
      snippet:
        "The Companies Law Cap. 113 governs incorporation, annual returns, and filing obligations for Cyprus companies.",
    },
    {
      url: "https://www.reuters.com/world/europe/cyprus-corporate-filings-2024",
      title: "Cyprus tightens corporate filing deadlines",
      domain: "reuters.com",
      publishedAt: "2025-02-01",
      snippet:
        "Regulators warned that late annual returns remain a common compliance gap among small Cyprus entities.",
    },
    {
      url: "https://www.pwc.com.cy/en/services/audit-assurance/regulatory-filings.html",
      title: "Regulatory filings — PwC Cyprus",
      domain: "pwc.com.cy",
      publishedAt: "2024-03-18",
      snippet:
        "Professional advisers routinely prepare HE32 annual returns and supporting schedules for Cyprus clients.",
    },
    {
      url: "https://www.reddit.com/r/cyprus/comments/filing",
      title: "Anyone else confused about HE32?",
      domain: "reddit.com",
      snippet:
        "Forum thread discussing practical experiences filing annual returns in Cyprus.",
    },
  ],
  engineVersion: "mock-1",
  latencyMs: 12,
};

export class MockSearchProvider implements SearchProvider {
  readonly id = "mock";

  search(query: string, signal?: AbortSignal): Promise<SearchAnswer> {
    if (signal?.aborted) {
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }
    return Promise.resolve({
      ...MOCK_SEARCH_ANSWER,
      answer: `${MOCK_SEARCH_ANSWER.answer} (Query: ${query.trim()})`,
    });
  }
}
