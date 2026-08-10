import { Button } from "@renderer/components/ui/button";
import { useCloudAuth } from "@renderer/lib/auth-context";
import type { AvailableModel } from "@renderer/lib/models";
import { cn } from "@renderer/lib/utils";
import { Check, Cloud, Mic, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UseModels } from "./use-models";

export const FREESTYLE_CLOUD_TIER: AvailableModel = {
  provider_id: "freestyle-cloud",
  provider_name: "Freestyle Transcribe",
  model_id: "freestyle-cloud/stt",
  model_name: "Freestyle Transcribe",
  type: "voice",
};

export const FREESTYLE_CLOUD_CLEANUP: AvailableModel = {
  provider_id: "freestyle-cloud",
  provider_name: "Freestyle Transcribe",
  model_id: "freestyle-cloud/post-process",
  model_name: "Freestyle Cleanup",
  type: "llm",
};

export function TranscriptionPicker({
  m,
  onClose,
  onUse,
  busy,
}: {
  m: UseModels;
  onClose: () => void;
  onUse: () => void;
  busy?: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  const cloud = useCloudAuth();

  const freestyleSelected =
    m.defaultVoice?.provider === FREESTYLE_CLOUD_TIER.provider_id &&
    m.defaultVoice?.model_id === FREESTYLE_CLOUD_TIER.model_id;

  return (
    <>
      <header className="border-border flex shrink-0 items-center gap-3 border-b px-6 py-4">
        <Mic className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        <span className="text-foreground flex-1 text-[13px] font-semibold">
          {t("models.picker.transcription")}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="shrink-0"
          aria-label="Close"
        >
          <X />
        </Button>
      </header>
      <div className="space-y-5 px-6 py-6">
        <button
          type="button"
          disabled={busy}
          onClick={onUse}
          className={cn(
            "border-border hover:border-primary/35 w-full rounded-[14px] border p-6 text-left transition-[transform,border-color,background-color] duration-150 ease-out active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60",
            freestyleSelected
              ? "border-primary/45 bg-primary/[0.06]"
              : "bg-primary/[0.03]",
          )}
        >
          <div className="flex items-start gap-4">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-[10px]">
              <Cloud className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-foreground text-[15px] font-semibold tracking-[-0.01em]">
                  {t("models.picker.freestyleTranscribe")}
                </span>
                {!freestyleSelected && (
                  <span className="text-primary text-[10px] font-semibold uppercase tracking-wide">
                    {t("models.picker.recommended")}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
                {cloud.user
                  ? t("models.picker.freestyleBundleSignedIn")
                  : t("models.picker.freestyleBundleSignIn")}
              </p>
            </div>
            {freestyleSelected && (
              <Check className="text-primary mt-1 size-[18px] shrink-0" />
            )}
          </div>
        </button>
      </div>
    </>
  );
}
