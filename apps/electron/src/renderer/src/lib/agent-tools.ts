import { apiFetch } from "@renderer/lib/api";
import {
  connectorToolActionName,
  isConnectorToolName,
} from "@renderer/lib/connectors";
import { SETTINGS_KEYS } from "@shared/settings-keys";
import { parseSpriteEmotion } from "@shared/sprite-events";

export type AgentToolTier = "free" | "confirmed";

export interface AgentToolCall {
  toolName: string;
  toolCallId: string;
  input: unknown;
}

const OS_TOOLS = new Set(["Bash", "Read", "Glob", "Grep", "Write", "Edit"]);

const MUTATING_OS_TOOLS = new Set(["Bash", "Write", "Edit"]);

const str = (input: Record<string, unknown>, key: string): string =>
  typeof input[key] === "string" ? (input[key] as string) : "";

async function isAgentOsEnabled(): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/settings/${SETTINGS_KEYS.agentOsEnabled}`);
    if (!res.ok) return false;
    const body = (await res.json()) as { value?: string };
    return body.value === "true";
  } catch {
    return false;
  }
}

/**
 * Approval tier for a tool call.
 * - Host OS tools are off unless `agent_os_enabled=true` (default off).
 * - Bash / Write / Edit always require confirmation when enabled.
 * - Read / Glob / Grep may auto-run when enabled (paths sandboxed server-side).
 */
export async function agentToolTier(
  call: AgentToolCall,
): Promise<AgentToolTier | null> {
  switch (call.toolName) {
    case "current_time":
    case "emote":
      return "free";
    case "Bash":
    case "Read":
    case "Glob":
    case "Grep":
    case "Write":
    case "Edit": {
      if (!(await isAgentOsEnabled())) return null;
      return MUTATING_OS_TOOLS.has(call.toolName) ? "confirmed" : "free";
    }
    default:
      return null;
  }
}

export function describeAgentAction(call: AgentToolCall): string {
  const input = (call.input ?? {}) as Record<string, unknown>;
  if (isConnectorToolName(call.toolName)) {
    const action =
      connectorToolActionName(call.toolName, input)
        .replace(/_/g, " ")
        .toLowerCase() || "connected-app action";
    return `Use a connected app to ${action}.`;
  }
  switch (call.toolName) {
    case "Bash": {
      const command = str(input, "command");
      const preview =
        command.length > 300 ? `${command.slice(0, 300)}…` : command;
      return `Run in your agent workspace shell:\n$ ${preview}`;
    }
    case "Read":
      return `Read the file ${str(input, "path")}`;
    case "Write": {
      const text = str(input, "text");
      return `Write ${text.length} characters to ${str(input, "path")}`;
    }
    case "Edit":
      return `Edit the file ${str(input, "path")}`;
    case "Glob":
      return `List files under ${str(input, "path")}`;
    case "Grep":
      return `Search files under ${str(input, "path")}`;
    default:
      return `Run ${call.toolName.replace(/_/g, " ")}.`;
  }
}

async function runOsTool(
  route: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await apiFetch(`/api/agent-os/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 403) {
    return { ok: false, reason: "agent-os-disabled" };
  }
  if (!res.ok) return { ok: false, reason: `os-http-${res.status}` };
  return (await res.json()) as Record<string, unknown>;
}

export async function executeAgentTool(
  call: AgentToolCall,
): Promise<Record<string, unknown>> {
  const input = (call.input ?? {}) as Record<string, unknown>;
  const badArgs = (expected: string): Record<string, unknown> => ({
    ok: false,
    reason: "bad-args",
    expected,
    received: JSON.stringify(call.input)?.slice(0, 300) ?? "undefined",
  });

  try {
    if (OS_TOOLS.has(call.toolName) && !(await isAgentOsEnabled())) {
      return {
        ok: false,
        reason: "agent-os-disabled",
        detail:
          "Host agent tools are off by default. Enable in Settings → Application, or use AGIBOT for sandboxed agency.",
      };
    }

    switch (call.toolName) {
      case "current_time": {
        const now = new Date();
        return {
          iso: now.toISOString(),
          local: now.toLocaleString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
      case "emote": {
        window.api.spriteEvent({
          kind: "emote",
          emotion: parseSpriteEmotion(input.emotion),
        });
        return { ok: true };
      }
      case "Bash":
        if (!str(input, "command")) return badArgs("{ command: string }");
        return runOsTool("bash", { command: str(input, "command") });
      case "Read":
        if (!str(input, "path")) return badArgs("{ path: string }");
        return runOsTool("read", {
          path: str(input, "path"),
          offset: input.offset,
          limit: input.limit,
        });
      case "Write":
        if (!str(input, "path")) return badArgs("{ path, text }");
        return runOsTool("write", {
          path: str(input, "path"),
          text: str(input, "text"),
        });
      case "Edit":
        if (!str(input, "path") || !str(input, "old"))
          return badArgs("{ path, old, new }");
        return runOsTool("edit", {
          path: str(input, "path"),
          old: str(input, "old"),
          new: str(input, "new"),
        });
      case "Glob":
        if (!str(input, "pattern")) return badArgs("{ pattern: string }");
        return runOsTool("glob", {
          pattern: str(input, "pattern"),
          path: str(input, "path") || undefined,
        });
      case "Grep":
        if (!str(input, "query")) return badArgs("{ query: string }");
        return runOsTool("grep", {
          query: str(input, "query"),
          path: str(input, "path") || undefined,
        });
      default:
        return { ok: false, reason: `unknown tool: ${call.toolName}` };
    }
  } catch (err) {
    return {
      ok: false,
      reason: "tool-failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export const DECLINED_OUTPUT: Record<string, unknown> = {
  ok: false,
  reason: "user-declined",
};
