export const DEFAULT_AGICY_PLATFORM_URL = "https://agicy.ai";
export const AGICY_HOSTED_PROVIDER_ID = "agicy-hosted";
export const AGICY_HOSTED_TRANSCRIBE_MODEL_ID = "agicy-hosted/stt";

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
  return (process.env.AGICY_PLATFORM_URL || DEFAULT_AGICY_PLATFORM_URL).replace(
    /\/+$/,
    "",
  );
}

export async function requestAgicyDeviceCode(): Promise<AgicyDeviceCodeResult> {
  const res = await fetch(`${agicyPlatformUrl()}/api/updated/device/code`, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Could not start AGICY sign-in (${res.status})`);
  }
  const data = (await res.json()) as AgicyDeviceCodeResult & {
    verification_uri?: string;
    verification_uri_complete?: string;
  };
  return {
    device_code: data.device_code,
    user_code: data.user_code,
    verification_url:
      data.verification_url ||
      data.verification_uri_complete ||
      data.verification_uri ||
      `${agicyPlatformUrl()}/updated/my_device`,
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
