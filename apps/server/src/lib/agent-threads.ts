import { createAppLogger } from "@freestyle-voice/utils";
import { generateText } from "ai";
import { getDb } from "./db.js";
import { FREESTYLE_CLOUD_PROVIDER_ID } from "./freestyle-cloud.js";
import { createChatModel } from "./providers.js";

const log = createAppLogger("agent-threads");

const MAX_THREADS = 50;
const TITLE_MODEL = "openai/gpt-oss-120b";
const TITLE_MAX_CHARS = 60;
const FALLBACK_TITLE_CHARS = 40;

export interface AgentThreadSummary {
  id: string;
  title: string;
  updatedAt: number;
}

interface ThreadRow {
  id: string;
  title: string | null;
  messages: string;
  created_at: number;
  updated_at: number;
}

function firstUserText(messages: unknown[]): string {
  for (const m of messages) {
    const msg = m as {
      role?: string;
      parts?: Array<{ type?: string; text?: string }>;
    };
    if (msg.role !== "user") continue;
    const text = (msg.parts ?? [])
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "";
}

function fallbackTitle(messages: unknown[]): string {
  const text = firstUserText(messages);
  if (!text) return "New chat";
  return text.length > FALLBACK_TITLE_CHARS
    ? `${text.slice(0, FALLBACK_TITLE_CHARS).trimEnd()}…`
    : text;
}

function hasAssistantReply(messages: unknown[]): boolean {
  return messages.some((m) => (m as { role?: string }).role === "assistant");
}

export function syncThread(threadId: string, messages: unknown[]): void {
  const db = getDb();
  const now = Date.now();
  const json = JSON.stringify(messages);
  const existing = db
    .prepare("SELECT id, title FROM agent_threads WHERE id = ?")
    .get(threadId) as { id: string; title: string | null } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE agent_threads SET messages = ?, updated_at = ? WHERE id = ?",
    ).run(json, now, threadId);
  } else {
    db.prepare(
      "INSERT INTO agent_threads (id, title, messages, created_at, updated_at) VALUES (?, NULL, ?, ?, ?)",
    ).run(threadId, json, now, now);
    db.prepare(
      `DELETE FROM agent_threads WHERE id NOT IN (
         SELECT id FROM agent_threads ORDER BY updated_at DESC LIMIT ?
       )`,
    ).run(MAX_THREADS);
  }

  if (!existing?.title && hasAssistantReply(messages)) {
    void generateTitle(threadId, messages);
  }
}

async function generateTitle(
  threadId: string,
  messages: unknown[],
): Promise<void> {
  const fallback = fallbackTitle(messages);
  setTitleIfEmpty(threadId, fallback);

  try {
    const model = await createChatModel(
      FREESTYLE_CLOUD_PROVIDER_ID,
      TITLE_MODEL,
    );
    const excerpt = JSON.stringify(messages).slice(0, 6_000);
    const { text } = await generateText({
      model,
      maxOutputTokens: 200,
      prompt: `Title this conversation in 3-6 plain words. No quotes, no punctuation at the end, no "Chat about". Reply with the title only.\n\nConversation (JSON excerpt):\n${excerpt}`,
    });
    const title = text
      .trim()
      .replace(/^["']|["']$/g, "")
      .slice(0, TITLE_MAX_CHARS);
    if (title) {
      getDb()
        .prepare("UPDATE agent_threads SET title = ? WHERE id = ?")
        .run(title, threadId);
    }
  } catch (err) {
    log.warn(`Thread title generation failed: ${err}`);
  }
}

function setTitleIfEmpty(threadId: string, title: string): void {
  getDb()
    .prepare(
      "UPDATE agent_threads SET title = ? WHERE id = ? AND title IS NULL",
    )
    .run(title, threadId);
}

export function listThreads(): AgentThreadSummary[] {
  const rows = getDb()
    .prepare(
      "SELECT id, title, messages, updated_at FROM agent_threads ORDER BY updated_at DESC LIMIT ?",
    )
    .all(MAX_THREADS) as unknown as ThreadRow[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title ?? fallbackTitle(JSON.parse(r.messages) as unknown[]),
    updatedAt: r.updated_at,
  }));
}

export function getThread(
  threadId: string,
): { id: string; title: string | null; messages: unknown[] } | null {
  const row = getDb()
    .prepare("SELECT id, title, messages FROM agent_threads WHERE id = ?")
    .get(threadId) as ThreadRow | undefined;
  if (!row) return null;
  try {
    return {
      id: row.id,
      title: row.title,
      messages: JSON.parse(row.messages) as unknown[],
    };
  } catch {
    return null;
  }
}

export function latestThread(): {
  id: string;
  title: string | null;
  messages: unknown[];
} | null {
  const row = getDb()
    .prepare(
      "SELECT id, title, messages FROM agent_threads ORDER BY updated_at DESC LIMIT 1",
    )
    .get() as ThreadRow | undefined;
  if (!row) return null;
  return getThread(row.id);
}

export function deleteThread(threadId: string): void {
  getDb().prepare("DELETE FROM agent_threads WHERE id = ?").run(threadId);
}
