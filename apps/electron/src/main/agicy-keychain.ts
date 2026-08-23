import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app, safeStorage } from "electron";

const KEYCHAIN_DIR = "keychain";
const AGICY_SESSION_FILE = "agicy-session.key";

function keychainDir(): string {
  const dir = join(app.getPath("userData"), KEYCHAIN_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function sessionPath(): string {
  return join(keychainDir(), AGICY_SESSION_FILE);
}

export function isAgicyKeychainAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function getAgicyKeychainToken(): string | null {
  const path = sessionPath();
  if (!existsSync(path) || !safeStorage.isEncryptionAvailable()) return null;
  try {
    const encrypted = readFileSync(path);
    if (!encrypted.length) return null;
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

export function setAgicyKeychainToken(accessToken: string): boolean {
  if (!safeStorage.isEncryptionAvailable()) return false;
  const trimmed = accessToken.trim();
  if (!trimmed) return false;
  writeFileSync(sessionPath(), safeStorage.encryptString(trimmed));
  return true;
}

export function clearAgicyKeychainToken(): boolean {
  const path = sessionPath();
  if (!existsSync(path)) return true;
  try {
    writeFileSync(path, "");
    return true;
  } catch {
    return false;
  }
}

export function getAgicyKeychainStatus(): {
  configured: boolean;
  encryptionAvailable: boolean;
} {
  return {
    configured: Boolean(getAgicyKeychainToken()?.trim()),
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
  };
}
