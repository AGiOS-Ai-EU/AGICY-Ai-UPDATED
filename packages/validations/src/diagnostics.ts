import { z } from "zod/v3";

// Renderer-side telemetry events funneled through the server-side capture().
export const telemetrySchema = z.object({
  event: z.string().min(1, "event required"),
  properties: z.record(z.unknown()).optional(),
});

// Crash/error reports from the renderer. Message/stack are kept for the local
// diagnostic log only; PostHog receives structured error_code + safe enums.
// Callers must never include transcript or clipboard text.
export const clientErrorSchema = z.object({
  message: z.string().min(1, "message required"),
  stack: z.string().optional(),
  source: z.string().optional(),
  error_code: z.string().max(64).optional(),
  context: z.record(z.unknown()).optional(),
});

export type TelemetryInput = z.infer<typeof telemetrySchema>;
export type ClientErrorInput = z.infer<typeof clientErrorSchema>;
