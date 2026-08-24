import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app, safeStorage } from "electron";

const KEYCHAIN_DIR = "keychain";
const DEEPGRAM_KEY_FILE = "deepgram-stt.key";

function keychainDir(): string {
  const dir = join(app.getPath("userData"), KEYCHAIN_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function deepgramKeyPath(): string {
  return join(keychainDir(), DEEPGRAM_KEY_FILE);
}

export function isSttKeychainAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function getDeepgramSttApiKey(): string | null {
  const path = deepgramKeyPath();
  if (!existsSync(path) || !safeStorage.isEncryptionAvailable()) return null;
  try {
    const encrypted = readFileSync(path);
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

export function setDeepgramSttApiKey(apiKey: string): boolean {
  if (!safeStorage.isEncryptionAvailable()) return false;
  const trimmed = apiKey.trim();
  if (!trimmed) return false;
  writeFileSync(deepgramKeyPath(), safeStorage.encryptString(trimmed));
  return true;
}

export function clearDeepgramSttApiKey(): boolean {
  const path = deepgramKeyPath();
  if (!existsSync(path)) return true;
  try {
    writeFileSync(path, "");
    return true;
  } catch {
    return false;
  }
}

export function getSttKeyStatus(): {
  configured: boolean;
  providerId: string;
  encryptionAvailable: boolean;
} {
  return {
    configured: Boolean(getDeepgramSttApiKey()?.trim()),
    providerId: "deepgram",
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
  };
}
