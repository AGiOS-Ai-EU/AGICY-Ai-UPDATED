import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  brainGraph,
  editHomeFile,
  ensureAgentHome,
  HomePathError,
  listHomeFiles,
  readHomeFile,
  searchHomeFiles,
  writeHomeFile,
} from "../lib/agent-brain.js";

const relPath = z.string().min(1).max(500);

function failure(err: unknown): { ok: false; reason: string } {
  if (err instanceof HomePathError) return { ok: false, reason: err.message };
  const code = (err as NodeJS.ErrnoException)?.code;
  if (code === "ENOENT") return { ok: false, reason: "not-found" };
  return { ok: false, reason: "fs-failed" };
}

const agentFsRoute = new Hono()
  .post(
    "/list",
    zValidator("json", z.object({ path: relPath.optional() })),
    (c) => {
      try {
        ensureAgentHome();
        return c.json({
          ok: true,
          files: listHomeFiles(c.req.valid("json").path),
        });
      } catch (err) {
        return c.json(failure(err));
      }
    },
  )
  .post("/read", zValidator("json", z.object({ path: relPath })), (c) => {
    try {
      return c.json({ ok: true, ...readHomeFile(c.req.valid("json").path) });
    } catch (err) {
      return c.json(failure(err));
    }
  })
  .post(
    "/write",
    zValidator(
      "json",
      z.object({ path: relPath, text: z.string().max(60_000) }),
    ),
    (c) => {
      try {
        ensureAgentHome();
        const { path, text } = c.req.valid("json");
        writeHomeFile(path, text);
        return c.json({ ok: true });
      } catch (err) {
        return c.json(failure(err));
      }
    },
  )
  .post(
    "/edit",
    zValidator(
      "json",
      z.object({
        path: relPath,
        old: z.string().min(1).max(10_000),
        new: z.string().max(10_000),
      }),
    ),
    (c) => {
      try {
        const body = c.req.valid("json");
        const result = editHomeFile(body.path, body.old, body.new);
        return c.json(
          result === "ok" ? { ok: true } : { ok: false, reason: result },
        );
      } catch (err) {
        return c.json(failure(err));
      }
    },
  )
  .post(
    "/search",
    zValidator(
      "json",
      z.object({ query: z.string().min(1).max(200), path: relPath.optional() }),
    ),
    (c) => {
      try {
        ensureAgentHome();
        const { query, path } = c.req.valid("json");
        return c.json({ ok: true, matches: searchHomeFiles(query, path) });
      } catch (err) {
        return c.json(failure(err));
      }
    },
  )
  .post("/graph", (c) => {
    try {
      return c.json({ ok: true, ...brainGraph() });
    } catch (err) {
      return c.json(failure(err));
    }
  })
  .post(
    "/delete",
    zValidator("json", z.object({ path: relPath })),
    async (c) => {
      try {
        const { path } = c.req.valid("json");
        const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "");
        if (normalized === "todos.md" || normalized === "BRAIN.md") {
          return c.json({ ok: false, reason: "protected" });
        }
        const { unlink } = await import("node:fs/promises");
        const { resolveHomePath } = await import("../lib/agent-brain.js");
        await unlink(resolveHomePath(path));
        return c.json({ ok: true });
      } catch (err) {
        return c.json(failure(err));
      }
    },
  );

export default agentFsRoute;
