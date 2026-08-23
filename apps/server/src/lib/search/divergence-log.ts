import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { DivergenceReport } from "@updated/search";

export const SEARCH_DIVERGENCE_LOG_FILENAME = "search-divergence.jsonl";

export interface DivergenceLogEvent {
  timestamp: string;
  query: string;
  providers: string[];
  contested: boolean;
  threshold: number;
  minSimilarity: number | null;
  pairScores: DivergenceReport["pairScores"];
}

/** Resolve the append-only divergence JSONL path (dev + packaged). */
export function resolveDivergenceLogPath(): string {
  const override = process.env.UPDATED_SEARCH_DIVERGENCE_LOG?.trim();
  if (override) return override;

  const dbPath = process.env.FREESTYLE_DB_PATH?.trim();
  if (dbPath) {
    return join(dirname(dbPath), "logs", SEARCH_DIVERGENCE_LOG_FILENAME);
  }

  return join(process.cwd(), "logs", SEARCH_DIVERGENCE_LOG_FILENAME);
}

function resolveLogPath(): string {
  return resolveDivergenceLogPath();
}

/** Append one divergence event as JSONL (works in dev and packaged Electron). */
export function appendDivergenceLog(event: DivergenceLogEvent): string {
  const path = resolveLogPath();
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(event)}\n`, "utf8");
  return path;
}

export function buildDivergenceLogEvent(input: {
  query: string;
  providers: string[];
  divergence: DivergenceReport;
}): DivergenceLogEvent {
  return {
    timestamp: new Date().toISOString(),
    query: input.query,
    providers: input.providers,
    contested: input.divergence.contested,
    threshold: input.divergence.threshold,
    minSimilarity: input.divergence.minSimilarity,
    pairScores: input.divergence.pairScores,
  };
}
