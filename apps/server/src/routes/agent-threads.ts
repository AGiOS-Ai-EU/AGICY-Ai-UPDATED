import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  deleteAllThreads,
  deleteThread,
  getThread,
  latestThread,
  listThreads,
  syncThread,
} from "../lib/agent-threads.js";

const agentThreadsRoute = new Hono()
  .post(
    "/sync",
    zValidator(
      "json",
      z.object({
        threadId: z.string().min(1).max(100),
        messages: z.array(z.unknown()).min(1).max(400),
      }),
    ),
    (c) => {
      const { threadId, messages } = c.req.valid("json");
      syncThread(threadId, messages);
      return c.json({ ok: true });
    },
  )
  .post("/clear", (c) => {
    deleteAllThreads();
    return c.json({ ok: true });
  })
  .get("/list", (c) => c.json({ threads: listThreads() }))
  .get("/latest", (c) => c.json({ thread: latestThread() }))
  .get("/:id", (c) => {
    const thread = getThread(c.req.param("id"));
    if (!thread) return c.json({ error: "not-found" }, 404);
    return c.json({ thread });
  })
  .delete("/:id", (c) => {
    deleteThread(c.req.param("id"));
    return c.json({ ok: true });
  });

export default agentThreadsRoute;
