export const DEFAULT_AGICY_PLATFORM_URL = "https://agicy.ai";
export const AGICY_HOSTED_PROVIDER_ID = "agicy-hosted";
export const AGICY_HOSTED_TRANSCRIBE_MODEL_ID = "agicy-hosted/stt";
const DEVICE_PAGE_PATH = "/updated/my_device";

export function isVercelProtectedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "vercel.com" ||
    host.endsWith(".vercel.com") ||
    host === "vercel.app" ||
    host.endsWith(".vercel.app")
  );
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

/** Browser URL for AGICY device approval — never a Vercel SSO wall. */
export function canonicalDeviceVerificationUrl(
  rawUrl: string | undefined,
  userCode: string,
  platformUrl: string = DEFAULT_AGICY_PLATFORM_URL,
): string {
  const canonical = `${DEFAULT_AGICY_PLATFORM_URL}${DEVICE_PAGE_PATH}?user_code=${encodeURIComponent(userCode)}`;
  const platform = parseHttpUrl(platformUrl);
  const allowLoopback = !!platform && isLoopbackHost(platform.hostname);

  if (!rawUrl?.trim()) return canonical;
  const url = parseHttpUrl(rawUrl.trim());
  if (!url) return canonical;
  if (isVercelProtectedHost(url.hostname)) return canonical;

  const host = url.hostname.toLowerCase();
  if (host === "agicy.ai" || host === "www.agicy.ai") {
    return `${DEFAULT_AGICY_PLATFORM_URL}${DEVICE_PAGE_PATH}?user_code=${encodeURIComponent(userCode)}`;
  }
  if (isLoopbackHost(host)) {
    if (!allowLoopback) return canonical;
    const local = new URL(DEVICE_PAGE_PATH, `${url.protocol}//${url.host}`);
    local.searchParams.set("user_code", userCode);
    return local.toString();
  }
  return canonical;
}

export class AgicyDeviceFlowError extends Error {
  constructor(
    readonly code: string,
    message = code,
  ) {
    super(message);
    this.name = "AgicyDeviceFlowError";
  }
}

export class AgicyAuthError extends Error {
  constructor(message = "AGICY session expired") {
    super(message);
    this.name = "AgicyAuthError";
  }
}

export class AgicyRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AgicyRequestError";
  }
}

export interface AgicyDeviceCodeResult {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

export interface AgicyDeviceTokenResult {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number;
  user?: {
    id: string;
    email: string | null;
    name: string | null;
  };
}

export interface AgicyTranscribeResult {
  text: string;
  durationSeconds?: number;
  provider?: string;
  model?: string;
}

export function agicyPlatformUrl(): string {
  const raw = (process.env.AGICY_PLATFORM_URL || DEFAULT_AGICY_PLATFORM_URL).replace(
    /\/+$/,
    "",
  );
  const url = parseHttpUrl(raw);
  if (!url || isVercelProtectedHost(url.hostname)) {
    return DEFAULT_AGICY_PLATFORM_URL;
  }
  return raw;
}

export async function requestAgicyDeviceCode(): Promise<AgicyDeviceCodeResult> {
  const res = await fetch(`${agicyPlatformUrl()}/api/updated/device/code`, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Could not start AGICY sign-in (${res.status})`);
  }
  let data: AgicyDeviceCodeResult & {
    verification_uri?: string;
    verification_uri_complete?: string;
  };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new Error("Could not start AGICY sign-in");
  }
  if (!data.device_code || !data.user_code) {
    throw new Error("Could not start AGICY sign-in");
  }
  const platform = agicyPlatformUrl();
  return {
    device_code: data.device_code,
    user_code: data.user_code,
    verification_url: canonicalDeviceVerificationUrl(
      data.verification_url ||
        data.verification_uri_complete ||
        data.verification_uri,
      data.user_code,
      platform,
    ),
    expires_in: data.expires_in,
    interval: data.interval ?? 5,
  };
}

export async function pollAgicyDeviceToken(
  deviceCode: string,
): Promise<AgicyDeviceTokenResult> {
  const res = await fetch(`${agicyPlatformUrl()}/api/updated/device/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ device_code: deviceCode }),
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 202) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new AgicyDeviceFlowError(body.error ?? "authorization_pending");
  }
  if (res.status === 429) {
    throw new AgicyDeviceFlowError("slow_down");
  }
  if (res.status === 403) {
    throw new AgicyDeviceFlowError("access_denied");
  }
  if (res.status === 410) {
    throw new AgicyDeviceFlowError(
      "expired_token",
      "Sign-in request expired. Please try again.",
    );
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new AgicyDeviceFlowError(body.error ?? "invalid_grant");
  }

  const data = (await res.json()) as AgicyDeviceTokenResult;
  if (!data.access_token) {
    throw new AgicyDeviceFlowError("invalid_grant");
  }
  return data;
}

export async function transcribeWithAgicyHosted(opts: {
  token: string;
  audio: Uint8Array;
  language?: string;
  filename?: string;
  mimetype?: string;
}): Promise<AgicyTranscribeResult> {
  const form = new FormData();
  const mime = opts.mimetype || "audio/wav";
  form.append(
    "audio",
    new Blob([opts.audio as BlobPart], { type: mime }),
    opts.filename || "audio.wav",
  );
  if (opts.language) form.append("language", opts.language);
  form.append("surface", "stt");

  const res = await fetch(`${agicyPlatformUrl()}/api/stt/transcribe`, {
    method: "POST",
    headers: { authorization: `Bearer ${opts.token}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });

  if (res.status === 401 || res.status === 403) {
    throw new AgicyAuthError();
  }
  if (res.status === 402) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new AgicyRequestError(
      402,
      body.error ?? "Inference credits exhausted.",
    );
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new AgicyRequestError(
      res.status,
      body.error ?? `AGICY transcription failed (${res.status})`,
    );
  }

  const data = (await res.json()) as {
    text?: string;
    durationSeconds?: number;
    provider?: string;
    model?: string;
  };
  return {
    text: data.text ?? "",
    durationSeconds: data.durationSeconds,
    provider: data.provider,
    model: data.model,
  };
}
