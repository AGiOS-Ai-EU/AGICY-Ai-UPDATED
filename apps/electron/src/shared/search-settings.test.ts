import { describe, expect, it } from "vitest";
import {
  isBraveKeyPresent,
  parseInputMode,
  parseSearchProviderMode,
} from "../shared/search-settings";

describe("parseInputMode", () => {
  it("defaults to dictation", () => {
    expect(parseInputMode(undefined)).toBe("dictation");
    expect(parseInputMode(null)).toBe("dictation");
    expect(parseInputMode("")).toBe("dictation");
    expect(parseInputMode("other")).toBe("dictation");
  });

  it("accepts search", () => {
    expect(parseInputMode("search")).toBe("search");
  });
});

describe("parseSearchProviderMode", () => {
  it("defaults to dual", () => {
    expect(parseSearchProviderMode(undefined)).toBe("dual");
    expect(parseSearchProviderMode("dual")).toBe("dual");
    expect(parseSearchProviderMode("")).toBe("dual");
  });

  it("accepts single", () => {
    expect(parseSearchProviderMode("single")).toBe("single");
  });
});

describe("isBraveKeyPresent", () => {
  it("requires a non-empty trimmed key", () => {
    expect(isBraveKeyPresent(null)).toBe(false);
    expect(isBraveKeyPresent("   ")).toBe(false);
    expect(isBraveKeyPresent("BSA")).toBe(true);
  });
});
