import { apiFetch } from "@renderer/lib/api";

export type AgentToolTier = "free" | "confirmed";

export interface AgentToolCall {
  toolName: string;
  toolCallId: string;
  input: unknown;
}

const TIERS: Record<string, AgentToolTier> = {
  current_time: "free",
  get_context: "free",
  read_document: "free",
  get_clipboard: "free",
  list_files: "free",
  read_file: "free",
  write_file: "free",
  edit_file: "free",
  search_files: "free",
  set_clipboard: "confirmed",
  paste: "confirmed",
};

const FS_TOOL_ROUTES: Record<string, string> = {
  list_files: "list",
  read_file: "read",
  write_file: "write",
  edit_file: "edit",
  search_files: "search",
};

async function runFsTool(
  route: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await apiFetch(`/api/agent-fs/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, reason: `fs-http-${res.status}` };
  return (await res.json()) as Record<string, unknown>;
}

export function agentToolTier(toolName: string): AgentToolTier | null {
  return TIERS[toolName] ?? null;
}

export function describeAgentAction(call: AgentToolCall): string {
  const input = (call.input ?? {}) as Record<string, unknown>;
  switch (call.toolName) {
    case "set_clipboard": {
      const text = typeof input.text === "string" ? input.text : "";
      const preview = text.length > 120 ? `${text.slice(0, 120)}…` : text;
      return `Put this on your clipboard (${text.length} characters):\n“${preview}”`;
    }
    case "paste":
      return "Paste the clipboard into the app you're using, at your cursor.";
    default:
      return `Run ${call.toolName.replace(/_/g, " ")}.`;
  }
}

export async function executeAgentTool(
  call: AgentToolCall,
): Promise<Record<string, unknown>> {
  const input = (call.input ?? {}) as Record<string, unknown>;
  const str = (key: string): string =>
    typeof input[key] === "string" ? (input[key] as string) : "";
  const badArgs = (expected: string): Record<string, unknown> => ({
    ok: false,
    reason: "bad-args",
    expected,
    received: JSON.stringify(call.input)?.slice(0, 300) ?? "undefined",
  });

  const fsRoute = FS_TOOL_ROUTES[call.toolName];
  if (fsRoute) {
    try {
      return await runFsTool(fsRoute, input);
    } catch (err) {
      return {
        ok: false,
        reason: "tool-failed",
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  try {
    switch (call.toolName) {
      case "current_time": {
        const now = new Date();
        return {
          iso: now.toISOString(),
          local: now.toLocaleString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
      case "get_context":
        return { ...(await window.api.remixGetContext()) };
      case "read_document":
        return { ...(await window.api.remixReadDocument()) };
      case "get_clipboard":
        return { ...(await window.api.remixGetClipboard()) };
      case "set_clipboard":
        if (!str("text")) return badArgs("{ text: string }");
        return { ...(await window.api.remixSetClipboard(str("text"))) };
      case "paste":
        return { ...(await window.api.remixPasteClipboard()) };
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
