import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app, safeStorage } from "electron";

const KEYCHAIN_DIR = "keychain";
const BRAVE_KEY_FILE = "brave-search.key";

function keychainDir(): string {
  const dir = join(app.getPath("userData"), KEYCHAIN_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function braveKeyPath(): string {
  return join(keychainDir(), BRAVE_KEY_FILE);
}

export function isSearchKeychainAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function getBraveSearchApiKey(): string | null {
  const path = braveKeyPath();
  if (!existsSync(path) || !safeStorage.isEncryptionAvailable()) return null;
  try {
    const encrypted = readFileSync(path);
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

export function setBraveSearchApiKey(apiKey: string): boolean {
  if (!safeStorage.isEncryptionAvailable()) return false;
  const trimmed = apiKey.trim();
  if (!trimmed) return false;
  writeFileSync(braveKeyPath(), safeStorage.encryptString(trimmed));
  return true;
}

export function clearBraveSearchApiKey(): boolean {
  const path = braveKeyPath();
  if (!existsSync(path)) return true;
  try {
    writeFileSync(path, "");
    return true;
  } catch {
    return false;
  }
}

export function getSearchKeyStatus(): {
  configured: boolean;
  providerId: string;
  encryptionAvailable: boolean;
} {
  return {
    configured: Boolean(getBraveSearchApiKey()?.trim()),
    providerId: "brave",
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
  };
}
