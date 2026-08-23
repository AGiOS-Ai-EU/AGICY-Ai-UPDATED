import { describe, expect, it } from "vitest";
import {
  citationIdentityKey,
  computeDivergence,
  DIVERGENCE_CONTESTED_JACCARD_THRESHOLD,
  jaccardSimilarity,
  providerCitationKeySet,
} from "./divergence.js";
import type { SearchCitation } from "./types.js";

function citation(
  domain: string,
  title: string,
  url = `https://${domain}`,
): SearchCitation {
  return { url, title, domain };
}

describe("citationIdentityKey", () => {
  it("normalizes domain and title tokens", () => {
    expect(
      citationIdentityKey({
        url: "https://www.Gov.UK/foo",
        title: "Annual Returns Guide",
        domain: "www.gov.uk",
      }),
    ).toBe("gov.uk|annual guide returns");
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical sets", () => {
    const set = new Set(["a", "b"]);
    expect(jaccardSimilarity(set, set)).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    expect(jaccardSimilarity(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("returns intersection over union", () => {
    expect(jaccardSimilarity(new Set(["a", "b"]), new Set(["b", "c"]))).toBe(
      1 / 3,
    );
  });
});

describe("computeDivergence", () => {
  it("marks CONTESTED when pairwise similarity is below threshold", () => {
    const report = computeDivergence([
      {
        providerId: "mock",
        citations: [
          citation("gov.cy", "Registrar of Companies"),
          citation("reuters.com", "Cyprus filing deadlines"),
        ],
      },
      {
        providerId: "mock-alt",
        citations: [
          citation("stackoverflow.com", "How to file HE32"),
          citation("bbc.co.uk", "Cyprus business news"),
        ],
      },
    ]);

    expect(report.contested).toBe(true);
    expect(report.threshold).toBe(DIVERGENCE_CONTESTED_JACCARD_THRESHOLD);
    expect(report.minSimilarity).toBe(0);
    expect(report.pairScores).toHaveLength(1);
    expect(report.pairScores[0]?.jaccard).toBe(0);
  });

  it("does not mark CONTESTED when providers largely agree", () => {
    const shared = [
      citation("gov.cy", "Registrar of Companies"),
      citation("reuters.com", "Cyprus filing deadlines"),
      citation("wikipedia.org", "Companies Law Cyprus"),
    ];
    const report = computeDivergence([
      { providerId: "a", citations: shared },
      {
        providerId: "b",
        citations: [...shared, citation("pwc.com.cy", "Regulatory filings")],
      },
    ]);

    expect(report.contested).toBe(false);
    expect(report.minSimilarity).toBe(0.75);
  });

  it("returns non-contested for a single provider", () => {
    expect(
      computeDivergence([
        {
          providerId: "only",
          citations: [citation("example.com", "Only provider")],
        },
      ]).contested,
    ).toBe(false);
  });
});

describe("providerCitationKeySet", () => {
  it("deduplicates citation keys within a provider", () => {
    const citations = [
      citation("gov.cy", "Annual returns"),
      citation("gov.cy", "Annual returns"),
    ];
    expect(providerCitationKeySet(citations).size).toBe(1);
  });
});
