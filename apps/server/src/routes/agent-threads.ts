import { createAppLogger } from "@freestyle-voice/utils";
import { Hono } from "hono";
import { getAgicySessionToken } from "../lib/agicy-session.js";
import { freestyleCloudUrl } from "../lib/freestyle-cloud.js";
import { getSessionToken, invalidateSession } from "../lib/sessions.js";

const log = createAppLogger("agent-threads");

/** Empty local thread payloads for AGICY-only sessions (no Freestyle Cloud). */
function agicyLocalEmpty(
  kind: "list" | "latest" | "one" | "clear" | "delete",
): { status: number; payload: unknown } {
  if (kind === "list") {
    return { status: 200, payload: { threads: [], nextCursor: null } };
  }
  if (kind === "clear" || kind === "delete") {
    return { status: 200, payload: { ok: true } };
  }
  return { status: 200, payload: { thread: null } };
}

async function forward(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; payload: unknown }> {
  const freestyleToken = getSessionToken();
  if (freestyleToken) {
    try {
      const upstream = await fetch(`${freestyleCloudUrl()}/v2/threads${path}`, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${freestyleToken}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (upstream.status === 401) {
        invalidateSession();
        if (getAgicySessionToken()) {
          const kind =
            path === "/clear"
              ? "clear"
              : path === "/latest"
                ? "latest"
                : path.startsWith("/?") || path === "" || path.startsWith("?")
                  ? "list"
                  : path.length > 1
                    ? init.method === "DELETE"
                      ? "delete"
                      : "one"
                    : "list";
          return agicyLocalEmpty(kind);
        }
        return {
          status: 401,
          payload: { ok: false, reason: "cloud_auth_required" },
        };
      }
      return { status: upstream.status, payload: await upstream.json() };
    } catch (err) {
      log.debug(`Thread request ${path} failed: ${err}`);
      return {
        status: 502,
        payload: { ok: false, reason: "cloud-unreachable" },
      };
    }
  }

  if (getAgicySessionToken()) {
    const kind =
      path === "/clear"
        ? "clear"
        : path === "/latest"
          ? "latest"
          : path.startsWith("/?") || path === "" || path.startsWith("?")
            ? "list"
            : path.length > 1
              ? init.method === "DELETE"
                ? "delete"
                : "one"
              : "list";
    return agicyLocalEmpty(kind);
  }

  return {
    status: 401,
    payload: { ok: false, reason: "cloud_auth_required" },
  };
}

const agentThreadsRoute = new Hono()
  .post("/clear", async (c) => {
    const { status, payload } = await forward("/clear", { method: "POST" });
    return c.json(payload as object, status as 200);
  })
  .get("/list", async (c) => {
    const params = new URLSearchParams();
    const origin = c.req.query("origin");
    if (origin === "user" || origin === "scheduled")
      params.set("origin", origin);
    for (const key of ["limit", "cursor"] as const) {
      const value = Number(c.req.query(key));
      if (Number.isInteger(value) && value > 0) params.set(key, String(value));
    }
    const query = params.size > 0 ? `?${params.toString()}` : "";
    const { status, payload } = await forward(query);
    return c.json(payload as object, status as 200);
  })
  .get("/latest", async (c) => {
    const { status, payload } = await forward("/latest");
    return c.json(payload as object, status as 200);
  })
  .get("/:id", async (c) => {
    const { status, payload } = await forward(
      `/${encodeURIComponent(c.req.param("id"))}`,
    );
    return c.json(payload as object, status as 200);
  })
  .delete("/:id", async (c) => {
    const { status, payload } = await forward(
      `/${encodeURIComponent(c.req.param("id"))}`,
      { method: "DELETE" },
    );
    return c.json(payload as object, status as 200);
  });

export default agentThreadsRoute;
