/**
 * Packaged builds do not load `.env.local` (dead-code-eliminated; electron-builder
 * also excludes `.env*`). CI passes `POSTHOG_API_KEY` / optional `POSTHOG_HOST`
 * into `electron-vite`, which inlines them as `__UPDATED_POSTHOG_*__` (see
 * `electron.vite.config.ts`). Copy onto `process.env` so the in-process server
 * (`apps/server/src/lib/posthog.ts`) sees the same vars as in development.
 *
 * An already-set env var wins, so a local override still works.
 *
 * These are PostHog *project* API keys (`phc_…`). Never bake a personal key (`phx_…`).
 */

declare const __UPDATED_POSTHOG_API_KEY__: string | undefined;
declare const __UPDATED_POSTHOG_HOST__: string | undefined;

export function applyBakedTelemetryEnv(
  bakedKey: string,
  bakedHost: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const key = bakedKey.trim();
  const host = bakedHost.trim();
  if (!env.POSTHOG_API_KEY?.trim() && key) env.POSTHOG_API_KEY = key;
  if (!env.POSTHOG_HOST?.trim() && host) env.POSTHOG_HOST = host;
}

export function applyPackagedTelemetryEnv(): void {
  applyBakedTelemetryEnv(
    typeof __UPDATED_POSTHOG_API_KEY__ === "string"
      ? __UPDATED_POSTHOG_API_KEY__
      : "",
    typeof __UPDATED_POSTHOG_HOST__ === "string"
      ? __UPDATED_POSTHOG_HOST__
      : "",
  );
}
