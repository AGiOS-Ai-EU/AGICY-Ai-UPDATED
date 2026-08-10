import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureAgentHome } from "../src/lib/agent-brain.js";
import {
  editAgentFile,
  globAgentFiles,
  grepAgentFiles,
  readAgentFile,
  resolveAgentPath,
  runAgentBash,
  writeAgentFile,
} from "../src/lib/agent-os.js";

let dataDir: string;
let prevDbPath: string | undefined;

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "agent-os-"));
  prevDbPath = process.env.FREESTYLE_DB_PATH;
  process.env.FREESTYLE_DB_PATH = path.join(dataDir, "db.sqlite");
  ensureAgentHome();
});

afterEach(() => {
  if (prevDbPath === undefined) delete process.env.FREESTYLE_DB_PATH;
  else process.env.FREESTYLE_DB_PATH = prevDbPath;
  rmSync(dataDir, { recursive: true, force: true });
});

describe("path zones", () => {
  it("relative paths are brain zone", () => {
    expect(resolveAgentPath("memories/x.md").zone).toBe("brain");
    expect(resolveAgentPath("todos.md").zone).toBe("brain");
  });

  it("absolute paths inside brain are brain zone", () => {
    const inside = path.join(dataDir, "brain", "notes", "a.md");
    expect(resolveAgentPath(inside).zone).toBe("brain");
  });

  it("escapes and outside paths are outside zone", () => {
    expect(resolveAgentPath("../db.sqlite").zone).toBe("outside");
    expect(resolveAgentPath("/etc/hosts").zone).toBe("outside");
  });
});

describe("file ops on any path", () => {
  it("write/read/edit outside the brain", () => {
    const target = path.join(dataDir, "elsewhere", "doc.txt");
    writeAgentFile(target, "hello world\nsecond line\n");
    expect(readAgentFile(target).text).toContain("hello world");
    expect(readAgentFile(target, 2, 1).text).toBe("second line");
    expect(editAgentFile(target, "hello", "goodbye")).toBe("ok");
    expect(readFileSync(target, "utf8")).toContain("goodbye world");
  });

  it("glob matches nested patterns", () => {
    writeAgentFile("memories/a.md", "x");
    writeAgentFile("notes/deep/b.md", "y");
    const paths = globAgentFiles("**/*.md").map((f) => f.path);
    expect(paths).toContain("memories/a.md");
    expect(paths).toContain("notes/deep/b.md");
    expect(globAgentFiles("memories/*.md").map((f) => f.path)).toEqual([
      "memories/a.md",
    ]);
  });

  it("grep is regex with literal fallback", () => {
    writeAgentFile("notes/n.md", "Genmaicha tea\nplain line\n");
    expect(grepAgentFiles("genmai.*tea")[0]?.path).toBe("notes/n.md");
    expect(grepAgentFiles("((broken")).toEqual([]);
  });
});

describe("bash", () => {
  it("runs in the brain cwd and captures output", async () => {
    writeFileSync(path.join(dataDir, "brain", "hello.txt"), "hi");
    const res = await runAgentBash("ls && pwd");
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("hello.txt");
    expect(res.stdout).toContain("brain");
  });

  it("reports failures and caps output", async () => {
    const fail = await runAgentBash("exit 3");
    expect(fail.exitCode).toBe(3);
    const big = await runAgentBash("yes x | head -c 20000");
    expect(big.stdout.length).toBeLessThanOrEqual(8192);
    expect(big.truncated).toBe(true);
  });
});
