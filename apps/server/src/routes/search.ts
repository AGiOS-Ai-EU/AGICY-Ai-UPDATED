import { zValidator } from "@hono/zod-validator";
import { createSearchProvider } from "@updated/search";
import { Hono } from "hono";
import { z } from "zod";

const searchQuerySchema = z.object({
  query: z.string().trim().min(1).max(500),
});

const search = new Hono().post(
  "/",
  zValidator("json", searchQuerySchema),
  async (c) => {
    const { query } = c.req.valid("json");
    const headerKey = c.req.header("x-search-api-key")?.trim();
    const provider = createSearchProvider({
      apiKey: headerKey || null,
      forceMock:
        process.env.UPDATED_SEARCH_MOCK === "1" ||
        process.env.UPDATED_SEARCH_MOCK === "true",
    });

    try {
      const answer = await provider.search(query, c.req.raw.signal);
      return c.json({
        ok: true as const,
        providerId: provider.id,
        answer,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Search request failed";
      return c.json({ ok: false as const, error: message }, 502);
    }
  },
);

export default search;
