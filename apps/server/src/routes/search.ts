import { zValidator } from "@hono/zod-validator";
import { createSearchProviders, runMultiProviderSearch } from "@updated/search";
import { Hono } from "hono";
import { z } from "zod";
import {
  appendDivergenceLog,
  buildDivergenceLogEvent,
} from "../lib/search/divergence-log.js";

const searchQuerySchema = z.object({
  query: z.string().trim().min(1).max(500),
});

const search = new Hono().post(
  "/",
  zValidator("json", searchQuerySchema),
  async (c) => {
    const { query } = c.req.valid("json");
    const headerKey = c.req.header("x-search-api-key")?.trim();
    const providers = createSearchProviders({
      apiKey: headerKey || null,
      forceMock:
        process.env.UPDATED_SEARCH_MOCK === "1" ||
        process.env.UPDATED_SEARCH_MOCK === "true",
    });

    try {
      const outcome = await runMultiProviderSearch(
        providers,
        query,
        c.req.raw.signal,
      );

      const logEvent = buildDivergenceLogEvent({
        query,
        providers: outcome.results.map((result) => result.providerId),
        divergence: outcome.divergence,
      });
      appendDivergenceLog(logEvent);

      return c.json({
        ok: true as const,
        query,
        contested: outcome.contested,
        divergence: outcome.divergence,
        results: outcome.results,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Search request failed";
      return c.json({ ok: false as const, error: message }, 502);
    }
  },
);

export default search;
