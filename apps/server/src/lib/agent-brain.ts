import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const FILE_MAX_CHARS = 60_000;
const BRAIN_INDEX_MAX_CHARS = 8_000;
const TODOS_MAX_CHARS = 4_000;
const TREE_MAX_ENTRIES = 400;
const SEARCH_MAX_MATCHES = 40;

const STARTER_BRAIN_INDEX = `# Brain

`;

export function agentHomeDir(): string {
  const dbPath = process.env.FREESTYLE_DB_PATH;
  const base = dbPath ? path.dirname(dbPath) : process.cwd();
  return path.join(base, "brain");
}

function migrateLegacyHome(brain: string): void {
  const base = path.dirname(brain);
  const legacy = path.join(base, "home");
  if (!existsSync(brain) && existsSync(legacy)) {
    renameSync(legacy, brain);
  }
  const legacyIndex = path.join(brain, "memories", "MEMORY.md");
  const index = path.join(brain, "BRAIN.md");
  if (existsSync(legacyIndex) && !existsSync(index)) {
    renameSync(legacyIndex, index);
  }
}

export function ensureAgentHome(): void {
  const brain = agentHomeDir();
  migrateLegacyHome(brain);
  mkdirSync(path.join(brain, "memories"), { recursive: true });
  mkdirSync(path.join(brain, "notes"), { recursive: true });
  mkdirSync(path.join(brain, "skills"), { recursive: true });
  const index = path.join(brain, "BRAIN.md");
  if (!existsSync(index)) writeFileSync(index, STARTER_BRAIN_INDEX);
  const todos = path.join(brain, "todos.md");
  if (!existsSync(todos)) writeFileSync(todos, "# Todos\n\n");
}

export class HomePathError extends Error {}

/**
 * Resolve a caller-supplied relative path inside the home, refusing anything
 * that escapes it: absolute paths, `..` traversal, and symlinked parents that
 * resolve outside. Every file operation goes through this jail.
 */
export function resolveHomePath(relative: string): string {
  const home = agentHomeDir();
  if (path.isAbsolute(relative)) throw new HomePathError("absolute-path");
  const joined = path.resolve(home, relative);
  const rel = path.relative(home, joined);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new HomePathError("outside-home");
  }
  let probe = joined;
  while (probe.length >= home.length) {
    if (existsSync(probe)) {
      const realHome = realpathSync(home);
      const realProbe = realpathSync(probe);
      const relReal = path.relative(realHome, realProbe);
      if (relReal.startsWith("..") || path.isAbsolute(relReal)) {
        throw new HomePathError("outside-home");
      }
      break;
    }
    probe = path.dirname(probe);
  }
  return joined;
}

interface HomeFileEntry {
  path: string;
  size: number;
  modified: number;
}

function walk(dir: string, home: string, out: HomeFileEntry[]): void {
  if (out.length >= TREE_MAX_ENTRIES) return;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries.sort()) {
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, home, out);
    } else if (name.endsWith(".md")) {
      if (out.length >= TREE_MAX_ENTRIES) return;
      out.push({
        path: path.relative(home, full),
        size: st.size,
        modified: st.mtimeMs,
      });
    }
  }
}

export function listHomeFiles(relative?: string): HomeFileEntry[] {
  const home = agentHomeDir();
  const root = relative ? resolveHomePath(relative) : home;
  const out: HomeFileEntry[] = [];
  walk(root, home, out);
  return out;
}

export function readHomeFile(relative: string): {
  text: string;
  truncated: boolean;
} {
  const full = resolveHomePath(relative);
  const raw = readFileSync(full, "utf8");
  return {
    text: raw.slice(0, FILE_MAX_CHARS),
    truncated: raw.length > FILE_MAX_CHARS,
  };
}

export function writeHomeFile(relative: string, text: string): void {
  const full = resolveHomePath(relative);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, text);
}

export function editHomeFile(
  relative: string,
  oldText: string,
  newText: string,
): "ok" | "not-found" | "ambiguous" {
  const full = resolveHomePath(relative);
  const raw = readFileSync(full, "utf8");
  const first = raw.indexOf(oldText);
  if (first === -1) return "not-found";
  if (raw.indexOf(oldText, first + 1) !== -1) return "ambiguous";
  writeFileSync(full, raw.replace(oldText, newText));
  return "ok";
}

export function searchHomeFiles(
  query: string,
  relative?: string,
): Array<{ path: string; line: number; text: string }> {
  const needle = query.toLowerCase();
  const matches: Array<{ path: string; line: number; text: string }> = [];
  for (const entry of listHomeFiles(relative)) {
    if (matches.length >= SEARCH_MAX_MATCHES) break;
    let raw: string;
    try {
      raw = readFileSync(path.join(agentHomeDir(), entry.path), "utf8");
    } catch {
      continue;
    }
    const lines = raw.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(needle)) {
        matches.push({
          path: entry.path,
          line: i + 1,
          text: lines[i].slice(0, 300),
        });
        if (matches.length >= SEARCH_MAX_MATCHES) break;
      }
    }
  }
  return matches;
}

export function agentHomeContext(): {
  brainIndex: string | null;
  tree: string[];
  todos: string | null;
} {
  ensureAgentHome();
  const read = (rel: string, cap: number): string | null => {
    try {
      return readFileSync(path.join(agentHomeDir(), rel), "utf8").slice(0, cap);
    } catch {
      return null;
    }
  };
  return {
    brainIndex: read("BRAIN.md", BRAIN_INDEX_MAX_CHARS),
    tree: listHomeFiles().map((f) => f.path),
    todos: read("todos.md", TODOS_MAX_CHARS),
  };
}
