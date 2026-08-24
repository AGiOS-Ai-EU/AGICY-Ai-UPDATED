import { describe, expect, it } from "vitest";
import {
  guardTelemetryProperties,
  MAX_TELEMETRY_STRING_LENGTH,
} from "../src/lib/telemetry-guard.js";

/**
 * Every property shape the renderer and the Electron main process relay through
 * `POST /api/telemetry` today. If the guard ever starts dropping one of these,
 * an existing dashboard silently loses a dimension — so they are asserted
 * verbatim rather than sampled.
 */
const EXISTING_EVENT_PROPERTIES: Array<Record<string, unknown>> = [
  {
    surface: "opener",
    cards: ["inbox-brief"],
    categories: ["do_now"],
    todos: 3,
  },
  { surface: "opener", id: "todo:launch", category: "do_now", kind: "todo" },
  { surface: "chat_connect", slugs: ["gmail", "googlecalendar"] },
  {
    surface: "chat_connect",
    slug: "gmail",
    outcome: "started",
    authMode: "oauth",
  },
  { surface: "chat_connect", slug: "gmail", wasPending: true },
  { surface: "capability", id: "draft-reply" },
  {
    surface: "opener",
    templateId: "friday-wrap",
    applied: 2,
    skipped: ["already_exists"],
  },
  { groups: ["email", "calendar"], items: 12 },
  { surface: "bubble", kind: "reminder" },
  { surface: "bubble", ageMs: 4200 },
  { source: "dictated", chars: 812, threadIsNew: false },
  { tool: "readBrainFile", allowed: true },
  { tab: "notes" },
  { origin: "history" },
  { total: 4 },
  { open: 3 },
  { folder: "memories" },
  { toolkit: "gmail", authMode: "oauth", elapsedMs: 1900 },
  { sprite: "jeb" },
  { beat: "trade", index: 2 },
  {
    hasTask: true,
    trade: "Engineer",
    connected: ["gmail"],
    automations: ["friday-wrap"],
  },
  { name_length: 34, enabled: false },
  { kind: "microphone", granted: true },
  { from: "jeb", to: "spark" },
  { trigger: "dictation" },
  { companion_form: "jeb", launch_at_login: false },
  { plan: "pro" },
  { version: "0.9.0-beta.3", signed_in: true, first_launch: false },
];

describe("guardTelemetryProperties", () => {
  it("passes every existing telemetry call site through untouched", () => {
    for (const properties of EXISTING_EVENT_PROPERTIES) {
      const guarded = guardTelemetryProperties(properties);
      expect(guarded.dropped).toEqual([]);
      expect(guarded.properties).toEqual(properties);
    }
  });

  it("drops string properties longer than the free-text bound", () => {
    const transcript = "a".repeat(MAX_TELEMETRY_STRING_LENGTH + 1);
    const guarded = guardTelemetryProperties({ tab: "notes", transcript });

    expect(guarded.dropped).toEqual(["transcript"]);
    expect(guarded.properties).toEqual({ tab: "notes" });
  });

  it("keeps strings at exactly the bound", () => {
    const slug = "a".repeat(MAX_TELEMETRY_STRING_LENGTH);
    expect(guardTelemetryProperties({ slug }).dropped).toEqual([]);
  });

  it("finds free text nested inside arrays and objects", () => {
    const query = "a".repeat(MAX_TELEMETRY_STRING_LENGTH + 1);

    expect(guardTelemetryProperties({ queries: [query] }).dropped).toEqual([
      "queries",
    ]);
    expect(
      guardTelemetryProperties({ context: { window: { title: query } } })
        .dropped,
    ).toEqual(["context"]);
  });

  it("rejects payloads nested deeper than any real event", () => {
    expect(
      guardTelemetryProperties({ a: { b: { c: { d: "ok" } } } }).dropped,
    ).toEqual(["a"]);
  });

  it("reports no properties when everything was dropped", () => {
    const guarded = guardTelemetryProperties({
      prompt: "a".repeat(MAX_TELEMETRY_STRING_LENGTH + 1),
    });

    expect(guarded.properties).toBeUndefined();
    expect(guarded.dropped).toEqual(["prompt"]);
  });

  it("leaves an absent payload absent", () => {
    expect(guardTelemetryProperties(undefined)).toEqual({
      properties: undefined,
      dropped: [],
    });
  });
});
