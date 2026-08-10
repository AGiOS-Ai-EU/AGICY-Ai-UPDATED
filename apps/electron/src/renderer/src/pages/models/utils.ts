import { displayProviderName } from "@renderer/lib/models";

export function displayName(providerId: string, fallback?: string): string {
  return displayProviderName(providerId, fallback);
}
