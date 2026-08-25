import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@shared/sprite-events", () => ({
  parseSpriteEmotion: vi.fn(),
}));

const apiFetch = vi.fn();
vi.mock("@renderer/lib/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

import { agentToolTier } from "./agent-tools";

describe("agent tool approval tiers", () => {
  const call = (toolName: string) => ({
    toolName,
    toolCallId: "call-1",
    input: {},
  });

  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("keeps harmless tools free", async () => {
    await expect(agentToolTier(call("current_time"))).resolves.toBe("free");
    await expect(agentToolTier(call("emote"))).resolves.toBe("free");
  });

  it("refuses host OS tools when agent_os_enabled is off (default)", async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(agentToolTier(call("Read"))).resolves.toBeNull();
    await expect(agentToolTier(call("Bash"))).resolves.toBeNull();
    await expect(agentToolTier(call("Write"))).resolves.toBeNull();
  });

  it("requires confirmation for Bash/Write/Edit when OS tools are enabled", async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ value: "true" }),
    });
    await expect(agentToolTier(call("Read"))).resolves.toBe("free");
    await expect(agentToolTier(call("Glob"))).resolves.toBe("free");
    await expect(agentToolTier(call("Grep"))).resolves.toBe("free");
    await expect(agentToolTier(call("Write"))).resolves.toBe("confirmed");
    await expect(agentToolTier(call("Edit"))).resolves.toBe("confirmed");
    await expect(
      agentToolTier({ ...call("Bash"), input: { command: "rm -rf ./x" } }),
    ).resolves.toBe("confirmed");
  });

  it("does not claim connected-app tools, which run on the server", async () => {
    await expect(
      agentToolTier(call("connector__gmail__474d41494c5f53454")),
    ).resolves.toBeNull();
  });
});
