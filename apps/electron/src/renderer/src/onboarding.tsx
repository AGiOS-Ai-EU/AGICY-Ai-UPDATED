import {
  MAX_LANGUAGES,
  normalizeLanguageList,
} from "@freestyle-voice/validations";
import { KeyComboDisplay } from "@renderer/components/key-combo";
import {
  LanguageMultiPickerDialog,
  useLanguageOptions,
} from "@renderer/components/language-combobox";
import {
  CoachStrip,
  useCoachPress,
} from "@renderer/components/onboarding/coach-strip";
import { EmailDraft } from "@renderer/components/onboarding/email-draft";
import { SignInButton, SignInSplit } from "@renderer/components/sign-in-split";
import { Button } from "@renderer/components/ui/button";
import {
  acceleratorsEqual,
  comboDisplayKeys,
  formatAcceleratorKeys,
  keyDisplayLabel,
  useHotkeyRecorder,
} from "@renderer/hooks/use-hotkey-recorder";
import { capture } from "@renderer/lib/analytics";
import { getClient } from "@renderer/lib/api";
import { useCloudAuth } from "@renderer/lib/auth-context";
import { defaultLanguage } from "@renderer/lib/languages";
import {
  type AvailableModel,
  FREESTYLE_CLOUD_MODEL_ID,
  FREESTYLE_CLOUD_PROVIDER_ID,
} from "@renderer/lib/models";
import { requestMicAccess, resolveMicStatus } from "@renderer/lib/permissions";
import { IS_LINUX, IS_MAC, IS_WINDOWS, PLATFORM } from "@renderer/lib/platform";
import { queryKeys, settingsQueryOptions } from "@renderer/lib/query";
import { useCloudConfig } from "@renderer/lib/use-cloud-config";
import { cn } from "@renderer/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ClipboardPaste,
  Keyboard,
  Loader2,
  Mic,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import type { CloudUser } from "../../shared/cloud-user";
import { getDefaultHotkey } from "../../shared/hotkey-defaults";
import { getDefaultRemixHotkey } from "../../shared/remix";
import { SETTINGS_KEYS } from "../../shared/settings-keys";
import type { ConfiguredModel } from "./pages/models/types";

type Step = "permissions" | "cloud" | "language" | "draft" | "remix";

const DEFAULT_HOTKEY =
  (typeof window !== "undefined" && window.api?.defaultHotkey) ||
  getDefaultHotkey();

const DEFAULT_REMIX_HOTKEY =
  (typeof window !== "undefined" && window.api?.defaultRemixHotkey) ||
  getDefaultRemixHotkey();

// Linux system-setup state reported by the main process (input-group access
// for the hotkey listener, xdotool/wtype for the paste fallback).
type LinuxSetup = {
  wayland: boolean;
  inputAccess: boolean;
  uinputAccess: boolean;
  pasteToolRequired: string;
  pasteTool: string | null;
};

export default function OnboardingPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("cloud");

  const {
    user: cloudUser,
    loading: cloudLoading,
    signingIn: cloudSigningIn,
    error: cloudError,
    signIn: cloudSignIn,
  } = useCloudAuth();

  // Permissions state
  const [micStatus, setMicStatus] = useState<string>("unknown");
  const [accessibilityStatus, setAccessibilityStatus] = useState(false);
  const [linuxSetup, setLinuxSetup] = useState<LinuxSetup | null>(null);

  // Voice model state
  const [available, setAvailable] = useState<AvailableModel[]>([]);
  const [languages, setLanguages] = useState<string[]>(() => {
    // Seed from the OS language when it's a real code; "auto" starts empty.
    const guess = defaultLanguage();
    return guess === "auto" ? [] : [guess];
  });
  const cloudDefaulted = useRef(false);

  // Hotkey recorder state (draft step); the remix hotkey lives here too so
  // each step can refuse a combo already taken by the other.
  const [hotkey, setHotkey] = useState(DEFAULT_HOTKEY);
  const [remixHotkey, setRemixHotkey] = useState(DEFAULT_REMIX_HOTKEY);

  // The practice email body, lifted so it survives the draft→remix step
  // transition (and Back).
  const [draftBody, setDraftBody] = useState("");
  const draftDictated = useRef(false);
  const onDraftDictated = useCallback(() => {
    if (draftDictated.current) return;
    draftDictated.current = true;
    capture("onboarding_draft_dictated");
  }, []);

  const handleHotkeyRecorded = useCallback((accelerator: string) => {
    setHotkey(accelerator);
    capture("onboarding_hotkey_changed", { hotkey: accelerator });
    getClient()
      .api.settings[":key"].$put({
        param: { key: SETTINGS_KEYS.hotkey },
        json: { value: accelerator },
      })
      .catch(() => {});
  }, []);

  // Like Settings: main re-reads the remix accelerator from settings, so the
  // listener reload has to wait for the write to land.
  const handleRemixHotkeyRecorded = useCallback((accelerator: string) => {
    setRemixHotkey(accelerator);
    capture("onboarding_remix_hotkey_changed", { hotkey: accelerator });
    getClient()
      .api.settings[":key"].$put({
        param: { key: SETTINGS_KEYS.remixHotkey },
        json: { value: accelerator },
      })
      .then(() => window.api?.reloadRemixHotkey())
      .catch(() => {});
  }, []);

  // Load permissions
  useEffect(() => {
    resolveMicStatus()
      .then(setMicStatus)
      .catch(() => {});
    window.api
      ?.checkAccessibilityPermission()
      .then(setAccessibilityStatus)
      .catch(() => {});
    if (IS_LINUX) {
      window.api
        ?.checkLinuxSetup()
        .then((setup) => setup && setLinuxSetup(setup))
        .catch(() => {});
    }
  }, []);

  // Saved hotkey, read from the shared settings cache (deduped with every other
  // settings consumer instead of a dedicated GET /api/settings/:key).
  const { data: settingsData } = useQuery(settingsQueryOptions());
  useEffect(() => {
    const value = settingsData?.[SETTINGS_KEYS.hotkey];
    if (value) setHotkey(value);
    const remixValue = settingsData?.[SETTINGS_KEYS.remixHotkey];
    if (remixValue) setRemixHotkey(remixValue);
  }, [settingsData]);

  // Analytics: entry + per-step views (drives the drop-off funnel).
  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      capture("onboarding_started", {
        platform: PLATFORM,
      });
    }
    capture("onboarding_step_viewed", { step });
  }, [step]);

  // Analytics: fire once each permission flips to granted.
  useEffect(() => {
    if (micStatus === "granted") capture("onboarding_mic_granted");
  }, [micStatus]);
  useEffect(() => {
    if (accessibilityStatus) capture("onboarding_accessibility_granted");
  }, [accessibilityStatus]);

  // Load models
  useEffect(() => {
    getClient()
      .api.models.available.$get()
      .then((r) => (r.ok ? r.json() : []))
      .then((models: AvailableModel[]) => setAvailable(models))
      .catch(() => {});
  }, []);

  const requestMic = useCallback(async () => {
    capture("onboarding_mic_permission_clicked", { action: "allow" });
    const status = await requestMicAccess();
    if (status) setMicStatus(status);
  }, []);

  const recheckLinuxSetup = useCallback(async () => {
    capture("onboarding_linux_setup_rechecked");
    const setup = await window.api?.checkLinuxSetup();
    if (setup) setLinuxSetup(setup);
  }, []);

  const openMicSettings = useCallback(() => {
    capture("onboarding_mic_permission_clicked", {
      action: "open_settings",
    });
    window.api?.openMicSettings();
    const interval = setInterval(async () => {
      const mic = await window.api?.checkMicPermission();
      if (mic === "granted") {
        setMicStatus("granted");
        clearInterval(interval);
      }
    }, 1000);
    setTimeout(() => clearInterval(interval), 30000);
  }, []);

  const openAccessibility = useCallback(() => {
    capture("onboarding_accessibility_clicked");
    window.api?.openAccessibilitySettings();
    const interval = setInterval(async () => {
      const ok = await window.api?.checkAccessibilityPermission();
      if (ok) {
        setAccessibilityStatus(true);
        clearInterval(interval);
      }
    }, 1000);
    setTimeout(() => clearInterval(interval), 30000);
  }, []);

  const commitFreestyleCloudDefault = useCallback(() => {
    const model = available.find(
      (m) =>
        m.provider_id === FREESTYLE_CLOUD_PROVIDER_ID && m.type === "voice",
    );
    const modelId = model?.model_id ?? FREESTYLE_CLOUD_MODEL_ID;
    const modelName = model?.model_name ?? "Freestyle Transcribe";
    getClient()
      .api.models.configured.$post({
        json: {
          provider: FREESTYLE_CLOUD_PROVIDER_ID,
          model_id: modelId,
          model_name: modelName,
          type: "voice",
          is_default: true,
        },
      })
      .catch(() => {});
    capture("onboarding_cloud_default_set", { model_id: modelId });
  }, [available]);

  // Auto-setup: once the model list and cloud session settle, a signed-in user
  // gets Freestyle Transcribe as the default without touching a picker.
  useEffect(() => {
    if (
      cloudDefaulted.current ||
      cloudLoading ||
      !cloudUser ||
      available.length === 0
    )
      return;
    cloudDefaulted.current = true;
    commitFreestyleCloudDefault();
  }, [available, cloudLoading, cloudUser, commitFreestyleCloudDefault]);

  // Persist the language list (the transcribe path reads it per request).
  const persistLanguages = useCallback((next: string[]) => {
    getClient()
      .api.settings[":key"].$put({
        param: { key: SETTINGS_KEYS.languages },
        json: { value: JSON.stringify(next) },
      })
      .catch(() => {});
  }, []);

  const toggleLanguage = useCallback(
    (code: string) => {
      setLanguages((prev) => {
        const next = prev.includes(code)
          ? prev.filter((c) => c !== code)
          : normalizeLanguageList([...prev, code]);
        capture("onboarding_language_changed", { languages: next });
        persistLanguages(next);
        return next;
      });
    },
    [persistLanguages],
  );

  const clearLanguages = useCallback(() => {
    setLanguages([]);
    capture("onboarding_language_changed", { languages: [] });
    persistLanguages([]);
  }, [persistLanguages]);

  const finishSetup = useCallback(() => {
    capture("onboarding_completed");
    window.api?.setOnboardingComplete();
    navigate("/today", { replace: true });
  }, [navigate]);

  return (
    <div className="glass-window-shell glass-content flex h-screen flex-col">
      <div
        className="h-9 shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      {step === "cloud" ? (
        <CloudStep
          user={cloudUser}
          signingIn={cloudSigningIn}
          error={cloudError}
          onSignIn={() => {
            capture("onboarding_cloud_signin_clicked");
            void cloudSignIn().then((u) => {
              if (u) capture("onboarding_cloud_signin_succeeded");
            });
          }}
          onContinue={() => {
            capture("onboarding_cloud_step_completed", {
              signed_in: true,
              skipped: false,
            });
            setStep("permissions");
          }}
          onSkip={() => {
            capture("onboarding_cloud_step_completed", {
              signed_in: false,
              skipped: true,
            });
            setStep("permissions");
          }}
        />
      ) : (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-6 py-8"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {step === "permissions" && (
            <PermissionsStep
              micStatus={micStatus}
              accessibilityStatus={accessibilityStatus}
              linuxSetup={linuxSetup}
              onRequestMic={requestMic}
              onOpenMicSettings={openMicSettings}
              onOpenAccessibility={openAccessibility}
              onRecheckLinuxSetup={recheckLinuxSetup}
              onBack={() => {
                capture("onboarding_permissions_back_clicked");
                setStep("cloud");
              }}
              onContinue={() => {
                capture("onboarding_permissions_completed");
                setStep("language");
              }}
            />
          )}

          {step === "language" && (
            <LanguageStep
              languages={languages}
              onToggle={toggleLanguage}
              onClear={clearLanguages}
              onBack={() => {
                capture("onboarding_language_back_clicked");
                setStep("permissions");
              }}
              onContinue={() => {
                // Persist even when the pre-selected locale was never toggled.
                persistLanguages(languages);
                capture("onboarding_language_completed", { languages });
                setStep("draft");
              }}
            />
          )}

          {step === "draft" && (
            <DraftStep
              hotkey={hotkey}
              remixHotkey={remixHotkey}
              onHotkeyRecorded={handleHotkeyRecorded}
              modelReady={!!cloudUser}
              body={draftBody}
              onBodyChange={setDraftBody}
              onDraftDictated={onDraftDictated}
              onDictation={() => capture("onboarding_dictation_tried")}
              onBack={() => {
                capture("onboarding_tutorial_back_clicked");
                setStep("language");
              }}
              onContinue={() => setStep("remix")}
            />
          )}

          {step === "remix" && (
            <RemixStep
              body={draftBody}
              onBodyChange={setDraftBody}
              remixHotkey={remixHotkey}
              dictationHotkey={hotkey}
              onRemixHotkeyRecorded={handleRemixHotkeyRecorded}
              onBack={() => setStep("draft")}
              onFinish={finishSetup}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Permissions
// ---------------------------------------------------------------------------
function PermissionsStep({
  micStatus,
  accessibilityStatus,
  linuxSetup,
  onRequestMic,
  onOpenMicSettings,
  onOpenAccessibility,
  onRecheckLinuxSetup,
  onBack,
  onContinue,
}: {
  micStatus: string;
  accessibilityStatus: boolean;
  linuxSetup: LinuxSetup | null;
  onRequestMic: () => void;
  onOpenMicSettings: () => void;
  onOpenAccessibility: () => void;
  onRecheckLinuxSetup: () => void;
  onBack: () => void;
  onContinue: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const micGranted = micStatus === "granted";
  // On Wayland there is no hotkey fallback without /dev/input access, so
  // missing input access blocks. On X11 the Electron globalShortcut still
  // works (toggle mode), so the card only warns.
  const linuxBlocked = !!linuxSetup?.wayland && !linuxSetup.inputAccess;
  // Accessibility is macOS-only; elsewhere the mic alone unblocks.
  // E2E runs on machines that can't grant OS permissions.
  const allGranted =
    (micGranted && (!IS_MAC || accessibilityStatus) && !linuxBlocked) ||
    !!window.api?.isE2E;
  // macOS and Windows can deep-link to the OS mic privacy settings.
  const canOpenMicSettings = IS_MAC || IS_WINDOWS;

  return (
    <div className="w-full max-w-[440px]">
      <div className="flex flex-col gap-2.5">
        <PermCard
          icon={Mic}
          title={t("onboarding.permissions.microphone.title")}
          desc={t("onboarding.permissions.microphone.desc")}
          granted={micGranted}
          action={
            micStatus === "denied" && canOpenMicSettings ? (
              <PermButton onClick={onOpenMicSettings}>
                {t("common.openSettings")}
              </PermButton>
            ) : (
              <PermButton onClick={onRequestMic}>
                {t("common.allow")}
              </PermButton>
            )
          }
        />

        {IS_MAC && (
          <PermCard
            icon={Shield}
            title={t("onboarding.permissions.accessibility.title")}
            desc={t("onboarding.permissions.accessibility.desc")}
            granted={accessibilityStatus}
            action={
              <PermButton onClick={onOpenAccessibility}>
                {t("common.openSettings")}
              </PermButton>
            }
          />
        )}

        {IS_LINUX && linuxSetup && (
          <PermCard
            icon={Keyboard}
            title={t("onboarding.permissions.keyboardAccess.title")}
            desc={
              linuxSetup.inputAccess ? (
                t("onboarding.permissions.keyboardAccess.descGranted")
              ) : (
                <>
                  <Trans
                    i18nKey="onboarding.permissions.keyboardAccess.descDenied"
                    components={{ code: <code className="text-foreground" /> }}
                  />
                  {!linuxSetup.wayland &&
                    t("onboarding.permissions.keyboardAccess.toggleNote")}
                </>
              )
            }
            granted={linuxSetup.inputAccess}
            action={
              <PermButton onClick={onRecheckLinuxSetup}>
                {t("common.recheck")}
              </PermButton>
            }
          />
        )}

        {IS_LINUX &&
          linuxSetup &&
          !linuxSetup.pasteTool &&
          !(linuxSetup.wayland && linuxSetup.uinputAccess) && (
            <PermCard
              icon={ClipboardPaste}
              title={t("onboarding.permissions.pasteTool.title")}
              desc={
                <Trans
                  i18nKey="onboarding.permissions.pasteTool.desc"
                  values={{ tool: linuxSetup.pasteToolRequired }}
                  components={{ code: <code className="text-foreground" /> }}
                />
              }
              granted={false}
              action={
                <PermButton onClick={onRecheckLinuxSetup}>
                  {t("common.recheck")}
                </PermButton>
              }
            />
          )}
      </div>

      <div className="mt-7 flex items-center justify-between gap-3.5">
        <Button variant="outline" onClick={onBack}>
          {t("common.back")}
        </Button>
        <div className="flex items-center gap-3.5">
          {!allGranted && (
            <span className="mono text-muted-foreground text-[10.5px] tracking-[0.1em] uppercase">
              {IS_MAC
                ? t("onboarding.permissions.grantBoth")
                : t("onboarding.permissions.grantAccess")}
            </span>
          )}
          <Button variant="ink" disabled={!allGranted} onClick={onContinue}>
            {t("common.continue")}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PermCard({
  icon: Icon,
  title,
  desc,
  granted,
  action,
}: {
  icon: typeof Mic;
  title: string;
  desc: React.ReactNode;
  granted: boolean;
  action: React.ReactNode;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="border-border bg-card flex items-center gap-3.5 rounded-[12px] border p-4">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border",
          granted
            ? "bg-accent border-primary/20"
            : "bg-background border-border",
        )}
      >
        <Icon
          size={16}
          className={
            granted ? "text-accent-foreground" : "text-muted-foreground"
          }
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-foreground text-[14px] font-medium">{title}</div>
        <div className="text-muted-foreground mt-0.5 text-[12.5px] leading-snug">
          {desc}
        </div>
      </div>
      {granted ? (
        <span className="mono text-accent-foreground inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.14em] uppercase">
          <Check size={13} strokeWidth={2.2} />
          {t("common.granted")}
        </span>
      ) : (
        action
      )}
    </div>
  );
}

function PermButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Button variant="ink" size="sm" onClick={onClick} className="shrink-0">
      {children}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Welcome + Freestyle Cloud sign-in (optional, skippable)
// ---------------------------------------------------------------------------
function CloudStep({
  user,
  signingIn,
  error,
  onSignIn,
  onContinue,
  onSkip,
}: {
  user: CloudUser | null;
  signingIn: boolean;
  error: string | null;
  onSignIn: () => void;
  onContinue: () => void;
  onSkip: () => void;
}): React.JSX.Element {
  return (
    <SignInSplit
      titlePrefix="Welcome to "
      subtitle="Intelligence at your cursor"
      error={error}
      footer={
        !user &&
        // Skipping sign-in is a local-development/E2E affordance only — in
        // production the browser sign-in is the sole way past this step.
        (import.meta.env.DEV || window.api?.isE2E) && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              disabled={signingIn}
              className="text-muted-foreground -ml-2 h-auto px-2 py-1 text-[12px]"
            >
              Skip for now (dev)
            </Button>
          </div>
        )
      }
    >
      {user ? (
        <>
          <div className="border-border bg-card mt-9 flex w-full items-center gap-3 rounded-[12px] border p-4 text-left">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="size-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="bg-accent border-primary/20 flex size-9 shrink-0 items-center justify-center rounded-full border">
                <Check className="text-accent-foreground size-4" />
              </div>
            )}
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-foreground truncate text-[14px] font-medium">
                {user.name || user.email}
              </div>
              <div className="text-muted-foreground truncate text-[12px]">
                {user.name ? `Signed in · ${user.email}` : "Signed in"}
              </div>
            </div>
            <Check className="text-accent-foreground size-4 shrink-0" />
          </div>
          <Button variant="ink" onClick={onContinue} className="mt-5 w-full">
            Continue
            <ArrowRight data-icon="inline-end" />
          </Button>
        </>
      ) : (
        <SignInButton signingIn={signingIn} onClick={onSignIn} />
      )}
    </SignInSplit>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Language
// ---------------------------------------------------------------------------
function LanguageStep({
  languages,
  onToggle,
  onClear,
  onBack,
  onContinue,
}: {
  languages: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onBack: () => void;
  onContinue: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { user } = useCloudAuth();
  const { data: cloudConfig } = useCloudConfig(!!user);
  const options = useLanguageOptions(cloudConfig?.suggestedLanguages);
  const [showAll, setShowAll] = useState(false);

  const selectedSet = useMemo(() => new Set(languages), [languages]);
  const atCap = languages.length >= MAX_LANGUAGES;

  // Show a handful of region-relevant languages as pills; the rest live behind
  // "See all". "auto" gets its own pill below, so exclude it from the top set.
  const PILL_COUNT = 12;
  const pills = useMemo(
    () => options.filter((l) => l.code !== "auto").slice(0, PILL_COUNT),
    [options],
  );

  // Selected languages picked via "See all" may fall outside the top pills;
  // surface them as extra pills so every selection stays visible.
  const selectedOutside = useMemo(
    () =>
      languages
        .filter((code) => !pills.some((l) => l.code === code))
        .map((code) => options.find((l) => l.code === code))
        .filter((l): l is (typeof options)[number] => Boolean(l)),
    [languages, pills, options],
  );

  return (
    <div className="w-full max-w-[560px]">
      <h1 className="serif text-foreground m-0 mb-7 text-center text-[56px] leading-[0.95] font-normal tracking-[-0.025em]">
        <span>{t("onboarding.language.titlePrefix")}</span>
        <span className="serif-italic text-primary">
          {t("onboarding.language.titleEmphasis")}
        </span>
      </h1>

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant={languages.length === 0 ? "default" : "outline"}
          size="sm"
          onClick={onClear}
          className="rounded-full px-4 text-[13.5px]"
        >
          {t("onboarding.language.autoDetect")}
        </Button>
        {pills.map((l) => {
          const active = selectedSet.has(l.code);
          return (
            <Button
              key={l.code}
              variant={active ? "default" : "outline"}
              size="sm"
              disabled={!active && atCap}
              onClick={() => onToggle(l.code)}
              className="rounded-full px-4 text-[13.5px]"
            >
              {l.label}
            </Button>
          );
        })}
        {selectedOutside.map((l) => (
          <Button
            key={l.code}
            variant="default"
            size="sm"
            onClick={() => onToggle(l.code)}
            className="rounded-full px-4 text-[13.5px]"
          >
            {l.label}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll(true)}
          className="rounded-full px-4 text-[13.5px]"
        >
          {t("onboarding.language.seeAll") || "See all"}
        </Button>
      </div>

      <LanguageMultiPickerDialog
        open={showAll}
        onOpenChange={setShowAll}
        values={languages}
        onToggle={onToggle}
        options={options}
      />

      <div className="mt-7 flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          {t("common.back")}
        </Button>
        <Button variant="ink" onClick={onContinue}>
          {t("common.continue")}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function StepHeading({ title }: { title: string }): React.JSX.Element {
  return (
    <h1 className="text-foreground m-0 mb-6 text-[30px] leading-[1.15] font-semibold tracking-[-0.01em]">
      {title}
    </h1>
  );
}

// ---------------------------------------------------------------------------
// Hotkey rebind — a single minimal control, shared by the draft (dictation
// hotkey) and remix (remix hotkey) steps.
// ---------------------------------------------------------------------------
function HotkeyRebindControl({
  hotkey,
  target,
  conflictHotkey,
  conflictNotice,
  onRecorded,
  onStartRecording,
}: {
  hotkey: string;
  target: "dictation" | "remix";
  /** The other feature's hotkey — recording it here is refused. */
  conflictHotkey?: string;
  conflictNotice?: string;
  onRecorded: (accelerator: string) => void;
  onStartRecording?: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const {
    state: recorderState,
    liveModifiers,
    capturedCombo,
    canSaveRecording,
    needsModifierOrMouseButton,
    blockedNotice,
    startRecording,
    cancelRecording,
  } = useHotkeyRecorder(onRecorded, {
    target,
    isBlocked: conflictHotkey
      ? (accel) => acceleratorsEqual(accel, conflictHotkey)
      : undefined,
  });

  const liveKeys = liveModifiers.map(keyDisplayLabel);
  const draftKeys = capturedCombo ? comboDisplayKeys(capturedCombo) : liveKeys;
  const captureHint = needsModifierOrMouseButton
    ? "Add a modifier or side mouse button · Esc to cancel"
    : canSaveRecording
      ? "Release to save · Esc to cancel"
      : "Press a modifier or side mouse button… · Esc to cancel";

  return (
    <div className="mt-5 flex justify-start">
      {recorderState === "idle" ? (
        <div className="relative inline-flex">
          <Button
            variant="outline"
            onClick={() => {
              onStartRecording?.();
              startRecording();
            }}
            className="bg-card hover:bg-secondary h-auto gap-3 rounded-[10px] px-3.5 py-2.5"
          >
            <Keyboard className="text-muted-foreground shrink-0" />
            <KeyComboDisplay keys={formatAcceleratorKeys(hotkey)} />
            <span className="text-muted-foreground ml-1 text-[12.5px]">
              {t("common.change")}
            </span>
          </Button>
          {blockedNotice && conflictNotice && (
            <div className="bg-popover text-popover-foreground border-border shadow-soft absolute top-[calc(100%+6px)] left-0 z-20 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs">
              {conflictNotice}
            </div>
          )}
        </div>
      ) : (
        <div className="border-primary bg-accent inline-flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5">
          <Keyboard className="text-accent-foreground h-4 w-4 shrink-0" />
          {draftKeys.length > 0 ? (
            <KeyComboDisplay keys={draftKeys} variant="dim" />
          ) : null}
          <span className="text-accent-foreground text-[12px]">
            {captureHint}
          </span>
          <Button
            variant="outline"
            size="xs"
            onClick={cancelRecording}
            className="ml-1"
          >
            {t("common.cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Dictate into the Gmail draft (replaces the old tutorial step:
// same model setup + hotkey rebind, new practice surface).
// ---------------------------------------------------------------------------
function DraftStep({
  hotkey,
  remixHotkey,
  onHotkeyRecorded,
  modelReady,
  body,
  onBodyChange,
  onDraftDictated,
  onDictation,
  onBack,
  onContinue,
}: {
  hotkey: string;
  remixHotkey: string;
  onHotkeyRecorded: (accelerator: string) => void;
  modelReady: boolean;
  body: string;
  onBodyChange: (text: string) => void;
  onDraftDictated: () => void;
  onDictation: () => void;
  onBack: () => void;
  onContinue: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const onDictationRef = useRef(onDictation);
  onDictationRef.current = onDictation;
  const { phase, getLiveLevel } = useCoachPress("dictation", {
    onDown: () => {
      if (modelReady) onDictationRef.current();
    },
  });

  // A dictation counts as such only when the paste is corroborated by the
  // pill's transcription:done ping — manual typing still enables Continue,
  // it just isn't counted as a dictation.
  const bodyRef = useRef(body);
  bodyRef.current = body;
  const transcribedRef = useRef(false);
  const onDraftDictatedRef = useRef(onDraftDictated);
  onDraftDictatedRef.current = onDraftDictated;
  useEffect(() => {
    return window.api?.onTranscriptionDone(() => {
      transcribedRef.current = true;
      if (bodyRef.current.trim()) onDraftDictatedRef.current();
    });
  }, []);
  useEffect(() => {
    if (body.trim() && transcribedRef.current) onDraftDictatedRef.current();
  }, [body]);

  const statusLabel =
    phase === "pressed"
      ? t("onboarding.draft.statusListening")
      : phase === "result"
        ? t("onboarding.draft.statusLanded")
        : t("onboarding.draft.statusReady");

  return (
    <div className="w-full max-w-[1100px]">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
        <div>
          <StepHeading title={t("onboarding.draft.title")} />

          <CoachStrip
            keys={formatAcceleratorKeys(hotkey)}
            phase={phase}
            instructionPrefix={t("onboarding.draft.instructionPrefix")}
            instructionSuffix={t("onboarding.draft.instructionSuffix")}
            sayText={t("onboarding.draft.sayText")}
            statusLabel={statusLabel}
            statusEmphasis={phase !== "idle"}
            getLiveLevel={getLiveLevel}
          />
        </div>

        <div className="flex justify-center lg:justify-end">
          <EmailDraft body={body} onBodyChange={onBodyChange} stage="dictate" />
        </div>
      </div>

      <HotkeyRebindControl
        hotkey={hotkey}
        target="dictation"
        conflictHotkey={remixHotkey}
        conflictNotice={t("settings.recording.conflict")}
        onRecorded={onHotkeyRecorded}
        onStartRecording={() => capture("onboarding_hotkey_change_started")}
      />

      <div className="mt-7 flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          {t("common.back")}
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onContinue}
            className="text-muted-foreground h-auto px-2 py-1 text-[12px]"
          >
            {t("onboarding.draft.skip")}
          </Button>
          <Button variant="ink" onClick={onContinue} disabled={!body.trim()}>
            {t("common.continue")}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Remix the draft. Interactive when an LLM default exists: the real
// Remix pipeline runs against our own window via main's practice-target mode.
// Otherwise a scripted preview of a remix pass.
// ---------------------------------------------------------------------------
const REMIX_IN_FLIGHT_GRACE_MS = 30_000;

function RemixStep({
  body,
  onBodyChange,
  remixHotkey,
  dictationHotkey,
  onRemixHotkeyRecorded,
  onBack,
  onFinish,
}: {
  body: string;
  onBodyChange: (text: string) => void;
  remixHotkey: string;
  dictationHotkey: string;
  onRemixHotkeyRecorded: (accelerator: string) => void;
  onBack: () => void;
  onFinish: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { user: cloudUser } = useCloudAuth();
  const { isFetched: settingsFetched } = useQuery(settingsQueryOptions());
  const configuredQuery = useQuery({
    queryKey: queryKeys.models.configured,
    queryFn: async () => {
      const res = await getClient().api.models.configured.$get();
      if (!res.ok) throw new Error("Failed to load configured models");
      return (await res.json()) as ConfiguredModel[];
    },
  });

  // The agent only hears what the user says, so the suggested instruction
  // must carry a concrete name: the signed-in user's first name, or a stand-in.
  const signoffName =
    cloudUser?.name?.trim().split(/\s+/)[0] ||
    t("onboarding.remix.fallbackName");

  const llmDefault = (configuredQuery.data ?? []).find(
    (m) => m.type === "llm" && m.is_default === 1,
  );
  const ready = settingsFetched && configuredQuery.isFetched;
  const interactive = ready && !!llmDefault && !window.api?.isE2E;
  // Server tools (web/image search) exist only behind the cloud proxy; the
  // BYOK loop declares client tools only.
  const searchCapable = llmDefault?.provider === FREESTYLE_CLOUD_PROVIDER_ID;

  const [remixed, setRemixed] = useState(false);
  const [extraDone, setExtraDone] = useState(false);
  const [working, setWorking] = useState(false);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const remixedRef = useRef(false);
  const extraDoneRef = useRef(false);
  const triedRef = useRef(false);
  const extraTriedRef = useRef(false);
  const chipShownRef = useRef(false);
  const chipVisibleRef = useRef(false);
  const viewedRef = useRef(false);
  const inFlightUntilRef = useRef(0);
  const lastDeliveredAtRef = useRef(0);
  const workingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready || viewedRef.current) return;
    viewedRef.current = true;
    capture("onboarding_remix_step_viewed", { interactive });
  }, [ready, interactive]);

  // The one gate this feature opens: while this step is interactive, main
  // treats our own window as a legal Remix target. Unmount is the primary
  // off-switch; main clears it defensively too.
  useEffect(() => {
    if (!interactive) return;
    window.api?.setRemixPracticeTarget(true);
    return () => window.api?.setRemixPracticeTarget(false);
  }, [interactive]);

  const handleDelivered = useCallback(() => {
    // One paste can signal twice (IPC + the body-change fallback) — dedupe.
    const now = Date.now();
    if (now - lastDeliveredAtRef.current < 1500) return;
    lastDeliveredAtRef.current = now;
    inFlightUntilRef.current = 0;
    setDeliveredCount((count) => count + 1);
    setWorking(false);
    if (workingTimerRef.current !== null) {
      window.clearTimeout(workingTimerRef.current);
      workingTimerRef.current = null;
    }
    if (!remixedRef.current) {
      remixedRef.current = true;
      setRemixed(true);
      capture("onboarding_remix_completed");
      return;
    }
    // A late second paste from beat one must not count as the third beat —
    // require a session started while the chip was showing.
    if (
      chipVisibleRef.current &&
      extraTriedRef.current &&
      !extraDoneRef.current
    ) {
      extraDoneRef.current = true;
      setExtraDone(true);
      capture("onboarding_remix_extra_completed");
    }
  }, []);
  const handleDeliveredRef = useRef(handleDelivered);
  handleDeliveredRef.current = handleDelivered;

  useEffect(() => {
    if (!interactive) return;
    return window.api?.onRemixPracticeDelivered(() =>
      handleDeliveredRef.current(),
    );
  }, [interactive]);

  const { phase, getLiveLevel } = useCoachPress("remix", {
    onDown: () => {
      inFlightUntilRef.current = Number.MAX_SAFE_INTEGER;
      if (!triedRef.current) {
        triedRef.current = true;
        capture("onboarding_remix_tried");
      }
      if (chipVisibleRef.current && !extraTriedRef.current) {
        extraTriedRef.current = true;
        capture("onboarding_remix_extra_tried");
      }
    },
    onUp: () => {
      inFlightUntilRef.current = Date.now() + REMIX_IN_FLIGHT_GRACE_MS;
      setWorking(true);
      if (workingTimerRef.current !== null) {
        window.clearTimeout(workingTimerRef.current);
      }
      workingTimerRef.current = window.setTimeout(() => {
        setWorking(false);
      }, REMIX_IN_FLIGHT_GRACE_MS);
    },
  });

  // Belt-and-braces success detection: a body change while a remix session is
  // in flight counts as delivery even if a future path bypasses the two paste
  // handlers.
  useEffect(() => {
    if (!interactive || !body.trim()) return;
    if (Date.now() <= inFlightUntilRef.current) handleDeliveredRef.current();
  }, [body, interactive]);

  const chipVisible = interactive && remixed && searchCapable;
  useEffect(() => {
    chipVisibleRef.current = chipVisible;
    if (chipVisible && !chipShownRef.current) {
      chipShownRef.current = true;
      capture("onboarding_remix_extra_shown");
    }
  }, [chipVisible]);

  const handleFinish = useCallback(() => {
    if (!remixedRef.current) capture("onboarding_remix_skipped");
    onFinish();
  }, [onFinish]);

  // Scripted fallback: an automated remix pass over the user's actual text.
  const [scriptPhase, setScriptPhase] = useState<"idle" | "pressed" | "result">(
    "idle",
  );
  const scripted = ready && !interactive;
  useEffect(() => {
    if (!scripted) return;
    const steps: ReadonlyArray<
      readonly ["idle" | "pressed" | "result", number]
    > = [
      ["idle", 2000],
      ["pressed", 3200],
      ["result", 3600],
    ];
    let index = 0;
    let timeout = 0;
    const tick = (): void => {
      const [name, dur] = steps[index % steps.length];
      setScriptPhase(name);
      index += 1;
      timeout = window.setTimeout(tick, dur);
    };
    tick();
    return () => window.clearTimeout(timeout);
  }, [scripted]);

  const scriptedBase = body.trim() || t("onboarding.remix.sampleDraft");
  const scriptedBody = scripted
    ? scriptPhase === "result"
      ? `${scriptedBase}\n\n${t("onboarding.remix.sampleSignoff", {
          name: signoffName,
        })}`
      : scriptedBase
    : null;

  const statusLabel =
    phase === "pressed"
      ? t("onboarding.remix.statusListening")
      : working
        ? t("onboarding.remix.statusWorking")
        : remixed
          ? t("onboarding.remix.statusRemixed")
          : t("onboarding.remix.statusReady");

  const keys = formatAcceleratorKeys(remixHotkey);

  return (
    <div className="w-full max-w-[1100px]">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
        <div>
          <StepHeading title={t("onboarding.remix.title")} />

          {!ready ? (
            <div className="flex justify-start">
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            </div>
          ) : interactive ? (
            <CoachStrip
              keys={keys}
              phase={phase}
              lead={
                !remixed ? (
                  t("onboarding.remix.highlightNote")
                ) : chipVisible ? (
                  extraDone ? (
                    <span className="text-accent-foreground">
                      {t("onboarding.remix.extraDone")}
                    </span>
                  ) : (
                    t("onboarding.remix.extraLead")
                  )
                ) : (
                  t("onboarding.remix.doneNote")
                )
              }
              instructionPrefix={t("onboarding.remix.instructionPrefix")}
              instructionSuffix={t("onboarding.remix.instructionSuffix")}
              sayText={
                chipVisible
                  ? t("onboarding.remix.extraSay")
                  : t("onboarding.remix.sayText", { name: signoffName })
              }
              statusLabel={statusLabel}
              statusEmphasis={phase === "pressed" || working || remixed}
              getLiveLevel={getLiveLevel}
            >
              {chipVisible && !extraDone && (
                <p className="text-muted-foreground/80 text-[13px] leading-relaxed">
                  {t("onboarding.remix.extraCaption")}
                </p>
              )}
            </CoachStrip>
          ) : (
            <CoachStrip
              keys={keys}
              phase={scriptPhase}
              instructionPrefix={t("onboarding.remix.instructionPrefix")}
              instructionSuffix={t("onboarding.remix.instructionSuffix")}
              sayText={t("onboarding.remix.sayText", { name: signoffName })}
              statusLabel={
                scriptPhase === "pressed"
                  ? t("onboarding.remix.statusListening")
                  : scriptPhase === "result"
                    ? t("onboarding.remix.statusRemixed")
                    : t("onboarding.remix.statusReady")
              }
              statusEmphasis={scriptPhase !== "idle"}
              getLiveLevel={() => null}
            >
              <p className="text-muted-foreground text-[14px] leading-relaxed">
                {t("onboarding.remix.fallbackNote")}
              </p>
            </CoachStrip>
          )}
        </div>

        <div className="flex justify-center lg:justify-end">
          <EmailDraft
            body={body}
            onBodyChange={onBodyChange}
            stage="remix"
            scriptedBody={scriptedBody}
            highlightBody={interactive}
            highlightSignal={deliveredCount}
          />
        </div>
      </div>

      <HotkeyRebindControl
        hotkey={remixHotkey}
        target="remix"
        conflictHotkey={dictationHotkey}
        conflictNotice={t("settings.remix.conflict")}
        onRecorded={onRemixHotkeyRecorded}
        onStartRecording={() =>
          capture("onboarding_remix_hotkey_change_started")
        }
      />

      <div className="mt-7 flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          {t("common.back")}
        </Button>
        <Button variant="ink" onClick={handleFinish}>
          {t("onboarding.tutorial.finish")}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
