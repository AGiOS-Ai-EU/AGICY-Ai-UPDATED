import { Button } from "@renderer/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@renderer/components/ui/dialog";
import { useCloudAuth } from "@renderer/lib/auth-context";
import { settingsQueryOptions } from "@renderer/lib/query";
import { cn } from "@renderer/lib/utils";
import { SETTINGS_KEYS } from "@shared/settings-keys";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { PageHeader, PageShell } from "./page-chrome";
import { PairCard } from "./pair-card";
import {
  FREESTYLE_CLOUD_CLEANUP,
  FREESTYLE_CLOUD_TIER,
  TranscriptionPicker,
} from "./transcription-picker";
import { useModels } from "./use-models";

/**
 * Managed provider that needs no key. It handles transcription and cleanup,
 * depending on which sides the user routes to it.
 */
const FREESTYLE_CLOUD_PROVIDER = "freestyle-cloud";

export default function ModelsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const m = useModels();
  const cloudAuth = useCloudAuth();
  const navigate = useNavigate();

  // Advanced mode gates this page in the sidebar. When it's off, the page can
  // still be reached directly (deep link / redirect); surface a banner that
  // points the user to the toggle instead of silently hiding functionality.
  const { data: settings } = useQuery(settingsQueryOptions());
  const advancedMode = settings?.[SETTINGS_KEYS.advancedMode] === "true";

  const [voiceOpen, setVoiceOpen] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);

  const freestyleVoiceActive =
    m.defaultVoice?.provider === FREESTYLE_CLOUD_PROVIDER;
  const syncingFreestyleCleanup = useRef(false);

  const cloudUserId = cloudAuth.user?.id ?? null;
  const reloadModels = m.reload;
  // Refetch only when the signed-in user actually changes, so the sign-in
  // switch to Freestyle Transcribe (and the sign-out revert) is reflected. The
  // initial mount is skipped — the queries already load themselves, so reloading
  // here would just refetch the same data a second time.
  const prevCloudUserId = useRef<string | null>(cloudUserId);
  useEffect(() => {
    if (prevCloudUserId.current === cloudUserId) return;
    prevCloudUserId.current = cloudUserId;
    void reloadModels();
  }, [cloudUserId, reloadModels]);

  // Keep Freestyle Cleanup paired with Freestyle Transcribe. Wait for the
  // persisted settings to seed into `m.llmCleanup` first — reading it before
  // then sees the initial `false` and re-configures cleanup on every mount.
  useEffect(() => {
    if (
      m.loading ||
      !m.settingsSeeded ||
      !freestyleVoiceActive ||
      syncingFreestyleCleanup.current
    ) {
      return;
    }
    const needsSync =
      !m.llmCleanup ||
      m.defaultLlm?.provider !== FREESTYLE_CLOUD_PROVIDER ||
      m.defaultLlm?.model_id !== FREESTYLE_CLOUD_CLEANUP.model_id;
    if (!needsSync) return;

    syncingFreestyleCleanup.current = true;
    void (async () => {
      try {
        if (cloudAuth.user && (await cloudAuth.refresh())) {
          setCloudBusy(true);
          await m.configureModel(FREESTYLE_CLOUD_CLEANUP, "llm");
          m.setCleanup(true);
        }
      } finally {
        setCloudBusy(false);
        syncingFreestyleCleanup.current = false;
      }
    })();
  }, [
    m.loading,
    m.settingsSeeded,
    freestyleVoiceActive,
    m.llmCleanup,
    m.defaultLlm?.provider,
    m.defaultLlm?.model_id,
    m.configureModel,
    m.setCleanup,
    cloudAuth,
  ]);

  const ensureCloudAuth = async (): Promise<boolean> => {
    if (cloudAuth.user && (await cloudAuth.refresh())) return true;
    return !!(await cloudAuth.signIn());
  };

  const configureFreestylePair = async (): Promise<void> => {
    setCloudBusy(true);
    try {
      if (!(await ensureCloudAuth())) return;
      await m.configureModel(FREESTYLE_CLOUD_TIER, "voice");
      await m.configureModel(FREESTYLE_CLOUD_CLEANUP, "llm");
      m.setCleanup(true);
    } finally {
      setCloudBusy(false);
    }
  };

  const onUseFreestyle = (): void => {
    void configureFreestylePair().then(() => setVoiceOpen(false));
  };

  const onToggleCleanup = (next: boolean): void => {
    if (freestyleVoiceActive) return;
    if (!next) {
      m.setCleanup(false);
      return;
    }
    m.setCleanup(true);
    if (m.defaultLlm) return;
    void (async () => {
      setCloudBusy(true);
      try {
        if (!(await ensureCloudAuth())) {
          m.setCleanup(false);
          return;
        }
        await m.configureModel(FREESTYLE_CLOUD_CLEANUP, "llm");
      } finally {
        setCloudBusy(false);
      }
    })();
  };

  if (m.loading) {
    return (
      <PageShell>
        <PageHeader title={t("models.title")} />
        <ModelsLoadingSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title={t("models.title")} />
      {!advancedMode && (
        <AdvancedModeBanner
          onEnable={() => navigate("/settings#application")}
        />
      )}
      <PairCard
        voice={m.defaultVoice}
        llm={m.defaultLlm}
        llmCleanup={m.llmCleanup}
        cleanupLocked={freestyleVoiceActive}
        onToggleCleanup={onToggleCleanup}
        onChangeVoice={() => setVoiceOpen(true)}
      />

      {voiceOpen && (
        <Dialog open onOpenChange={(o) => !o && setVoiceOpen(false)}>
          <DialogContent
            aria-label={t("models.picker.transcription")}
            showCloseButton={false}
            className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden p-0 sm:max-w-2xl"
          >
            <DialogTitle className="sr-only">
              {t("models.picker.transcription")}
            </DialogTitle>
            <TranscriptionPicker
              m={m}
              busy={cloudBusy}
              onClose={() => setVoiceOpen(false)}
              onUse={onUseFreestyle}
            />
          </DialogContent>
        </Dialog>
      )}
    </PageShell>
  );
}

function AdvancedModeBanner({
  onEnable,
}: {
  onEnable: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="border-border mb-6 flex items-start gap-3 rounded-lg border bg-muted/40 px-4 py-3">
      <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-foreground/90 text-[13px] leading-relaxed">
          {t("models.advancedModeBanner")}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={onEnable}
      >
        {t("models.advancedModeBannerAction")}
      </Button>
    </div>
  );
}

function SkeletonLine({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "bg-muted/60 relative overflow-hidden rounded-full",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className,
      )}
    />
  );
}

function ModelsLoadingSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-label="Loading models">
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
      <section className="border-border bg-card grid grid-cols-1 gap-6 rounded-[14px] border p-6 min-[820px]:grid-cols-2">
        {["voice", "cleanup"].map((key) => (
          <div
            key={key}
            className={cn(
              "flex min-h-[140px] flex-col gap-3",
              key === "cleanup" &&
                "border-border border-t pt-6 min-[820px]:border-l min-[820px]:border-t-0 min-[820px]:pl-6 min-[820px]:pt-0",
            )}
          >
            <SkeletonLine className="h-3 w-40" />
            <SkeletonLine className="h-6 w-52 max-w-full" />
            <SkeletonLine className="h-3 w-32" />
            <div className="mt-auto flex items-center gap-3">
              <SkeletonLine className="h-9 w-24 rounded-md" />
              <SkeletonLine className="h-5 w-28" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
