import { describe, expect, it } from "vitest";
import {
  citationAgeLabel,
  computePrimaryRate,
  formatAgeStrip,
  oldestCitationAgeLabel,
  uniqueCitationDomains,
} from "./result-stats.js";
import type { SearchCitation } from "./types.js";

const citations: SearchCitation[] = [
  {
    url: "https://gov.uk/a",
    title: "A",
    domain: "gov.uk",
    publishedAt: "2024-06-01",
  },
  {
    url: "https://nytimes.com/b",
    title: "B",
    domain: "nytimes.com",
    publishedAt: "2025-01-15",
  },
  {
    url: "https://example.com/c",
    title: "C",
    domain: "example.com",
  },
];

describe("computePrimaryRate", () => {
  it("counts primary sources plainly", () => {
    expect(computePrimaryRate(citations)).toEqual({
      primary: 1,
      total: 3,
      rateText: "1 / 3",
      hasPrimary: true,
    });
  });

  it("reports zero primary without hiding", () => {
    const pressOnly: SearchCitation[] = [
      {
        url: "https://bbc.co.uk",
        title: "BBC",
        domain: "bbc.co.uk",
      },
    ];
    expect(computePrimaryRate(pressOnly)).toEqual({
      primary: 0,
      total: 1,
      rateText: "0 / 1",
      hasPrimary: false,
    });
  });
});

describe("formatAgeStrip", () => {
  it("returns oldest and newest ISO dates", () => {
    expect(formatAgeStrip(citations)).toEqual({
      oldest: "2024-06-01",
      newest: "2025-01-15",
    });
  });

  it("returns undated when no dates exist", () => {
    expect(
      formatAgeStrip([{ url: "https://a.test", title: "A", domain: "a.test" }]),
    ).toEqual({ oldest: "undated", newest: "undated" });
  });
});

describe("citationAgeLabel", () => {
  it("formats known dates and undated fallback", () => {
    expect(citationAgeLabel(citations[0])).toBe("2024-06-01");
    expect(citationAgeLabel(citations[2])).toBe("undated");
  });
});

describe("oldestCitationAgeLabel", () => {
  it("picks the oldest date in a group", () => {
    expect(oldestCitationAgeLabel(citations)).toBe("2024-06-01");
  });
});

describe("uniqueCitationDomains", () => {
  it("deduplicates domains in order", () => {
    expect(
      uniqueCitationDomains([
        ...citations,
        {
          url: "https://gov.uk/d",
          title: "D",
          domain: "gov.uk",
        },
      ]),
    ).toEqual(["gov.uk", "nytimes.com", "example.com"]);
  });
});
