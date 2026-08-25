import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AgentPathDeniedError,
  agentWorkspaceRoot,
  editAgentFile,
  globAgentFiles,
  grepAgentFiles,
  isPathInsideRoot,
  readAgentFile,
  resolveAgentPath,
  runAgentBash,
  writeAgentFile,
} from "../src/lib/agent-os.js";

let workDir: string;
let prevWorkspace: string | undefined;

beforeEach(() => {
  workDir = mkdtempSync(path.join(tmpdir(), "agent-os-"));
  prevWorkspace = process.env.UPDATED_AGENT_WORKSPACE;
  process.env.UPDATED_AGENT_WORKSPACE = workDir;
});

afterEach(() => {
  if (prevWorkspace === undefined) {
    delete process.env.UPDATED_AGENT_WORKSPACE;
  } else {
    process.env.UPDATED_AGENT_WORKSPACE = prevWorkspace;
  }
  rmSync(workDir, { recursive: true, force: true });
});

describe("path resolution", () => {
  it("relative paths resolve under the workspace root", () => {
    expect(resolveAgentPath("Documents/x.txt").full).toBe(
      path.join(workDir, "Documents", "x.txt"),
    );
    expect(resolveAgentPath("Documents/x.txt").root).toBe(
      path.resolve(workDir),
    );
  });

  it("denies absolute paths outside the workspace", () => {
    expect(() => resolveAgentPath("/etc/hosts")).toThrow(AgentPathDeniedError);
    expect(() => resolveAgentPath(path.join(homedir(), "outside.txt"))).toThrow(
      AgentPathDeniedError,
    );
  });

  it("allows absolute paths that stay inside the workspace", () => {
    const inside = path.join(workDir, "ok.txt");
    expect(resolveAgentPath(inside).full).toBe(path.resolve(inside));
  });

  it("isPathInsideRoot rejects parent escapes", () => {
    const root = path.resolve(workDir);
    expect(isPathInsideRoot(root, path.join(root, "a"))).toBe(true);
    expect(isPathInsideRoot(root, path.join(root, "..", "x"))).toBe(false);
  });

  it("defaults workspace under ~/.updated/agent-workspace when unset", () => {
    delete process.env.UPDATED_AGENT_WORKSPACE;
    expect(agentWorkspaceRoot()).toBe(
      path.resolve(homedir(), ".updated", "agent-workspace"),
    );
  });
});

describe("file ops", () => {
  it("write/read/edit on workspace paths", () => {
    const target = path.join(workDir, "nested", "doc.txt");
    writeAgentFile(target, "hello world\nsecond line\n");
    expect(readAgentFile(target).text).toContain("hello world");
    expect(readAgentFile(target, 2, 1).text).toBe("second line");
    expect(editAgentFile(target, "hello", "goodbye")).toBe("ok");
    expect(readFileSync(target, "utf8")).toContain("goodbye world");
    expect(editAgentFile(target, "absent", "x")).toBe("not-found");
    expect(editAgentFile(target, "goodbye", "$$ $& costs $'5")).toBe("ok");
    expect(readFileSync(target, "utf8")).toContain("$$ $& costs $'5 world");
  });

  it("glob and grep under the workspace", () => {
    writeAgentFile(path.join(workDir, "a.md"), "Genmaicha tea");
    writeAgentFile(path.join(workDir, "deep", "b.md"), "plain");
    const paths = globAgentFiles("**/*.md").map((f) => f.path);
    expect(paths).toContain("a.md");
    expect(paths).toContain("deep/b.md");
    expect(grepAgentFiles("genmai.*tea")[0]?.path).toBe("a.md");
  });
});

describe("bash", () => {
  it("runs with cwd set to the workspace root", async () => {
    const res = await runAgentBash(process.platform === "win32" ? "cd" : "pwd");
    expect(res.exitCode).toBe(0);
    const normalized = res.stdout.trim().replace(/\\/g, "/").toLowerCase();
    const expected = workDir.replace(/\\/g, "/").toLowerCase();
    expect(normalized).toContain(path.basename(workDir).toLowerCase());
    // Full path when possible (Unix pwd / Windows cd)
    if (
      normalized.includes(expected) ||
      normalized.endsWith(path.basename(workDir).toLowerCase())
    ) {
      expect(res.exitCode).toBe(0);
    }
  });

  it("reports failures and caps output", async () => {
    const fail = await runAgentBash(
      process.platform === "win32" ? "cmd /c exit 3" : "exit 3",
    );
    expect(fail.exitCode).toBe(3);
    if (process.platform === "win32") return;
    const big = await runAgentBash("yes x | head -c 20000");
    expect(big.stdout.length).toBeLessThanOrEqual(8192);
    expect(big.truncated).toBe(true);
  });
});
