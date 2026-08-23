import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  appendDivergenceLog,
  buildDivergenceLogEvent,
  SEARCH_DIVERGENCE_LOG_FILENAME,
} from "../src/lib/search/divergence-log.js";

describe("search divergence log", () => {
  let tempDir = "";

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    delete process.env.FREESTYLE_DB_PATH;
    delete process.env.UPDATED_SEARCH_DIVERGENCE_LOG;
  });

  it("appends JSONL events under the server data logs directory", () => {
    tempDir = mkdtempSync(join(tmpdir(), "updated-search-log-"));
    process.env.FREESTYLE_DB_PATH = join(tempDir, "freestyle.db");

    const event = buildDivergenceLogEvent({
      query: "Cyprus annual return",
      providers: ["mock", "mock-alt"],
      divergence: {
        contested: true,
        threshold: 0.35,
        minSimilarity: 0,
        pairScores: [{ providerA: "mock", providerB: "mock-alt", jaccard: 0 }],
      },
    });

    const path = appendDivergenceLog(event);
    expect(path.endsWith(join("logs", SEARCH_DIVERGENCE_LOG_FILENAME))).toBe(
      true,
    );

    const lines = readFileSync(path, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({
      query: "Cyprus annual return",
      contested: true,
      providers: ["mock", "mock-alt"],
    });
  });
});
