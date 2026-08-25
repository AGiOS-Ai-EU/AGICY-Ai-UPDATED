import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

describe("getDb recovery", () => {
  afterEach(async () => {
    const { closeDb } = await import("../src/lib/db.js");
    closeDb();
    delete process.env.FREESTYLE_DB_PATH;
  });

  it("opens a fresh database", async () => {
    const dir = join(tmpdir(), `freestyle-db-ok-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const dbPath = join(dir, "test.db");
    process.env.FREESTYLE_DB_PATH = dbPath;

    const { getDb, closeDb } = await import("../src/lib/db.js");
    closeDb();
    const db = getDb();
    const row = db.prepare("SELECT count(*) AS c FROM sqlite_master").get() as {
      c: number;
    };
    expect(row.c).toBeGreaterThan(0);
  });

  it("recovers when the main db file is garbage", async () => {
    const dir = join(tmpdir(), `freestyle-db-corrupt-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const dbPath = join(dir, "test.db");
    writeFileSync(dbPath, "not a sqlite database");
    process.env.FREESTYLE_DB_PATH = dbPath;

    const { getDb, closeDb } = await import("../src/lib/db.js");
    closeDb();
    const db = getDb();
    db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))",
    ).run("recovery_probe", "1");
    expect(
      db
        .prepare("SELECT value FROM settings WHERE key = ?")
        .get("recovery_probe"),
    ).toMatchObject({ value: "1" });

    const backups = readdirSync(dir).filter((name) =>
      name.includes(".corrupt-"),
    );
    expect(backups.length).toBeGreaterThan(0);
    expect(existsSync(dbPath)).toBe(true);
  });
});
