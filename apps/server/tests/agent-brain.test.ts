import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  agentHomeContext,
  editHomeFile,
  ensureAgentHome,
  HomePathError,
  listHomeFiles,
  readHomeFile,
  resolveHomePath,
  searchHomeFiles,
  writeHomeFile,
} from "../src/lib/agent-brain.js";

let dataDir: string;
let prevDbPath: string | undefined;

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "agent-brain-"));
  prevDbPath = process.env.FREESTYLE_DB_PATH;
  process.env.FREESTYLE_DB_PATH = path.join(dataDir, "db.sqlite");
  ensureAgentHome();
});

afterEach(() => {
  if (prevDbPath === undefined) delete process.env.FREESTYLE_DB_PATH;
  else process.env.FREESTYLE_DB_PATH = prevDbPath;
  rmSync(dataDir, { recursive: true, force: true });
});

describe("path jail", () => {
  it("rejects absolute paths", () => {
    expect(() => resolveHomePath("/etc/passwd")).toThrow(HomePathError);
  });

  it("rejects traversal", () => {
    expect(() => resolveHomePath("../db.sqlite")).toThrow(HomePathError);
    expect(() => resolveHomePath("notes/../../db.sqlite")).toThrow(
      HomePathError,
    );
  });

  it("rejects symlinked escape directories", () => {
    symlinkSync(tmpdir(), path.join(dataDir, "brain", "escape"));
    expect(() => resolveHomePath("escape/x.md")).toThrow(HomePathError);
  });

  it("rejects symlinked escape files", () => {
    const secret = path.join(dataDir, "secret.md");
    writeFileSync(secret, "outside");
    symlinkSync(secret, path.join(dataDir, "brain", "notes", "leak.md"));
    expect(() => resolveHomePath("notes/leak.md")).toThrow(HomePathError);
  });

  it("accepts normal relative paths", () => {
    expect(resolveHomePath("memories/fact.md")).toContain(
      path.join("brain", "memories", "fact.md"),
    );
  });
});

describe("file operations", () => {
  it("writes, lists, reads, and searches", () => {
    writeHomeFile(
      "memories/prefers-metric.md",
      "# Prefers metric\n\nMatthew uses metric units.\n",
    );
    const files = listHomeFiles("memories");
    expect(files.map((f) => f.path)).toContain(
      path.join("memories", "prefers-metric.md"),
    );
    expect(readHomeFile("memories/prefers-metric.md").text).toContain(
      "metric units",
    );
    const matches = searchHomeFiles("Metric Units");
    expect(matches[0]?.path).toBe(path.join("memories", "prefers-metric.md"));
  });

  it("edit requires a unique exact match", () => {
    writeHomeFile("todos.md", "# Todos\n\n- [ ] a\n- [ ] b\n");
    expect(editHomeFile("todos.md", "- [ ] a", "- [x] a")).toBe("ok");
    expect(readFileSync(resolveHomePath("todos.md"), "utf8")).toContain(
      "- [x] a",
    );
    expect(editHomeFile("todos.md", "- [ ] zzz", "x")).toBe("not-found");
    writeHomeFile("notes/dup.md", "same\nsame\n");
    expect(editHomeFile("notes/dup.md", "same", "other")).toBe("ambiguous");
  });

  it("context carries index, tree, and todos", () => {
    writeFileSync(
      resolveHomePath("BRAIN.md"),
      "# Brain\n\n- memories/prefers-metric.md — uses metric\n",
    );
    writeHomeFile("memories/prefers-metric.md", "fact");
    const ctx = agentHomeContext();
    expect(ctx.brainIndex).toContain("uses metric");
    expect(ctx.tree).toContain(path.join("memories", "prefers-metric.md"));
    expect(ctx.todos).toContain("# Todos");
  });

  it("migrates a legacy home/ into brain/", () => {
    rmSync(path.join(dataDir, "brain"), { recursive: true, force: true });
    const legacy = path.join(dataDir, "home", "memories");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(
      path.join(legacy, "MEMORY.md"),
      "# Memory index\n\n- old-fact.md — legacy hook\n",
    );
    writeFileSync(path.join(legacy, "old-fact.md"), "legacy fact");
    ensureAgentHome();
    expect(readHomeFile("BRAIN.md").text).toContain("legacy hook");
    expect(readHomeFile("memories/old-fact.md").text).toBe("legacy fact");
    expect(existsSync(path.join(dataDir, "home"))).toBe(false);
  });
});
