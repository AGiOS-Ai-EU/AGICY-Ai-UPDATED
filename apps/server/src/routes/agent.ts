import { createAppLogger } from "@freestyle-voice/utils";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { agicyPlatformUrl } from "../lib/agicy-platform.js";
import { getAgicySessionToken } from "../lib/agicy-session.js";
import { freestyleCloudUrl } from "../lib/freestyle-cloud.js";
import { getSessionToken, invalidateSession } from "../lib/sessions.js";

const log = createAppLogger("agent");

const agentRequestSchema = z.object({
  messages: z.array(z.record(z.string(), z.unknown())).min(1),
  id: z.string().min(1).max(100).optional(),
  threadId: z.string().min(1).max(100).optional(),
  firstTurn: z.boolean().optional(),
});

/**
 * One companion agent turn.
 * - Freestyle session → legacy Freestyle Cloud `/v2/agent`
 * - AGICY device session → `agicy.ai/api/updated/agent` (Bearer JWT)
 */
const agentRoute = new Hono().post(
  "/",
  zValidator("json", agentRequestSchema),
  async (c) => {
    const { messages, firstTurn, id, threadId } = c.req.valid("json");

    const freestyleToken = getSessionToken();
    const agicyToken = getAgicySessionToken();
    if (!freestyleToken && !agicyToken) {
      return c.json({ error: "cloud_auth_required" }, 401);
    }

    if (freestyleToken) {
      let upstream: Response;
      try {
        upstream = await fetch(`${freestyleCloudUrl()}/v2/agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freestyleToken}`,
          },
          body: JSON.stringify({
            messages,
            ...(threadId || id ? { threadId: threadId ?? id } : {}),
            ...(firstTurn ? { firstTurn: true } : {}),
          }),
          signal: c.req.raw.signal,
        });
      } catch (err) {
        log.error(`Agent cloud request failed: ${err}`);
        return c.json(
          { error: "failed", detail: "Couldn't reach Freestyle Cloud." },
          502,
        );
      }

      if (upstream.status === 401) {
        invalidateSession();
        // Fall through to AGICY if that session exists.
        if (!agicyToken) {
          return c.json({ error: "cloud_auth_required" }, 401);
        }
      } else if (upstream.status === 429) {
        const payload = (await upstream.json().catch(() => null)) as {
          resetsAt?: string;
        } | null;
        return c.json(
          { error: "usage_exceeded", resetsAt: payload?.resetsAt },
          429,
        );
      } else if (!upstream.ok || !upstream.body) {
        const detail = await upstream.text().catch(() => "");
        log.error(
          `Agent cloud returned ${upstream.status}: ${detail.slice(0, 200)}`,
        );
        if (upstream.status === 400 && detail.includes("messages")) {
          return c.json(
            {
              error: "thread_too_long",
              detail:
                "This conversation is too long to continue. Start a new conversation.",
            },
            413,
          );
        }
        if (!agicyToken) {
          return c.json(
            { error: "failed", detail: "Agent failed upstream." },
            502,
          );
        }
      } else {
        return new Response(upstream.body, {
          headers: {
            "Content-Type":
              upstream.headers.get("Content-Type") ?? "text/event-stream",
            "Cache-Control": "no-cache",
            "x-vercel-ai-ui-message-stream": "v1",
          },
        });
      }
    }

    // AGICY-signed-in path (device JWT).
    let agicyUpstream: Response;
    try {
      agicyUpstream = await fetch(`${agicyPlatformUrl()}/api/updated/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${agicyToken}`,
        },
        body: JSON.stringify({
          messages,
          ...(threadId || id ? { threadId: threadId ?? id } : {}),
          ...(firstTurn ? { firstTurn: true } : {}),
        }),
        signal: c.req.raw.signal,
      });
    } catch (err) {
      log.error(`AGICY agent request failed: ${err}`);
      return c.json(
        { error: "failed", detail: "Couldn't reach AGICY agent." },
        502,
      );
    }

    if (agicyUpstream.status === 401) {
      return c.json({ error: "cloud_auth_required" }, 401);
    }
    if (!agicyUpstream.ok || !agicyUpstream.body) {
      const detail = await agicyUpstream.text().catch(() => "");
      log.error(
        `AGICY agent returned ${agicyUpstream.status}: ${detail.slice(0, 200)}`,
      );
      return c.json({ error: "failed", detail: "Agent failed on AGICY." }, 502);
    }

    return new Response(agicyUpstream.body, {
      headers: {
        "Content-Type":
          agicyUpstream.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-cache",
        "x-vercel-ai-ui-message-stream": "v1",
      },
    });
  },
);

export default agentRoute;
