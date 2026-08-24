import {
  filterLanguageOptions,
  INDUSTRY_LABELS,
  type Industry,
  industrySchema,
  MAX_LANGUAGES,
  normalizeLanguageList,
  resolveLanguageOptions,
} from "@freestyle-voice/validations";
import { ModelProviderAvatar } from "@renderer/components/model-provider-avatar";
import { applyAppearanceToDocument } from "@renderer/lib/apply-appearance";
import {
  ACCENT_OPTIONS,
  APPEARANCE_PRESETS,
  DEFAULT_LLM_MODEL_ID,
  getUpdatedLlmModel,
  TEXT_SCALE_OPTIONS,
  UI_LOCALES,
  UPDATED_LLM_MODELS,
} from "@renderer/lib/updated-models";
import "../model-picker.css";
import { NotificationsHistory } from "@renderer/components/notifications-history";
import {
  acceleratorsEqual,
  formatAcceleratorKeys,
  useHotkeyRecorder,
} from "@renderer/hooks/use-hotkey-recorder";
import { capture } from "@renderer/lib/analytics";
import { apiFetch, getClient } from "@renderer/lib/api";
import { useCloudAuth } from "@renderer/lib/auth-context";
import { LANGUAGES } from "@renderer/lib/languages";
import { VOICE_STT_OPTIONS } from "@renderer/lib/models";
import { queryKeys, settingsQueryOptions } from "@renderer/lib/query";
import { replaceSetting, settingsForView } from "@renderer/lib/settings";
import { useCloudConfig } from "@renderer/lib/use-cloud-config";
import { usagePercent, useCloudUsage } from "@renderer/lib/use-cloud-usage";
import { usePricing } from "@renderer/lib/use-pricing";
import {
  type SocialProvider,
  useLinkedAccounts,
  useLinkSocial,
  useProfileFields,
  useRefreshAccountsOnFocus,
  useUnlinkSocial,
  useUpdateName,
  useUpdateProfileFields,
} from "@renderer/lib/use-profile";
import { SpriteBadge } from "@renderer/sprites/badge";
import {
  type CompanionForm,
  DEFAULT_COMPANION_FORM,
  parseCompanionForm,
} from "@shared/companion";
import type { InputMode } from "@shared/dictation-prefs";
import { getDefaultHotkey } from "@shared/hotkey-defaults";
import { getDefaultRemixHotkey } from "@shared/remix";
import {
  parseInputMode,
  parseSearchProviderMode,
} from "@shared/search-settings";
import { SETTINGS_KEYS } from "@shared/settings-keys";
import { SPRITES_INFO } from "@shared/sprites";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type SettingsPage =
  | "root"
  | "profile"
  | "billing"
  | "notifications"
  | "dictation"
  | "search"
  | "talk"
  | "appearance"
  | "models"
  | "application"
  | "permissions"
  | "data";

const PAGE_TITLES: Record<Exclude<SettingsPage, "root">, string> = {
  profile: "Profile",
  billing: "Billing & Usage",
  notifications: "Notifications",
  dictation: "Dictation",
  search: "Search",
  talk: "Talk & Summon",
  appearance: "Appearance & Language",
  models: "Models",
  application: "Application",
  permissions: "Permissions",
  data: "Data",
};

export function profileAvatarInitial(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  return (name?.trim() || email?.trim() || "?").slice(0, 1).toUpperCase();
}

function ProfileAvatar({
  image,
  name,
  email,
}: {
  image: string | null | undefined;
  name: string | null | undefined;
  email: string | null | undefined;
}): React.JSX.Element {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const src = image && image !== failedImage ? image : null;

  if (src) {
    return (
      <img
        className="tavern-set-avatar"
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailedImage(src)}
      />
    );
  }

  return (
    <span className="tavern-set-avatar is-empty" aria-hidden="true">
      {profileAvatarInitial(name, email)}
    </span>
  );
}

function useServerSettings(): {
  settings: Record<string, string> | null;
  setSetting: (key: string, value: string) => void;
} {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery(settingsQueryOptions());
  const update = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await apiFetch(`/api/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!response.ok) throw new Error("Could not save settings.");
    },
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings });
      const previous = queryClient.getQueryData<Record<string, string>>(
        queryKeys.settings,
      );
      queryClient.setQueryData(
        queryKeys.settings,
        replaceSetting(previous ?? {}, key, value),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKeys.settings, context?.previous);
    },
    onSuccess: (_data, { key }) => {
      window.api.reloadDictationPrefs();
      if (key === SETTINGS_KEYS.remixHotkey) window.api.reloadRemixHotkey();
      if (key === SETTINGS_KEYS.hotkey || key === SETTINGS_KEYS.hotkeyMode) {
        window.api.reloadHotkey();
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
  });

  const setSetting = useCallback(
    (key: string, value: string): void => update.mutate({ key, value }),
    [update],
  );

  return {
    settings: settingsForView(settingsQuery.data, settingsQuery.isError),
    setSetting,
  };
}

function NavRow({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail?: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button type="button" className="tavern-set-row" onClick={onClick}>
      <span className="tavern-set-label">{label}</span>
      <span className="tavern-set-detail">
        {detail ? `${detail} ` : ""}
        <span className="tavern-set-chevron">›</span>
      </span>
    </button>
  );
}

function ChoiceRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className="tavern-set-row is-static">
      <span className="tavern-set-label">{label}</span>
      <div className="tavern-set-seg">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`tavern-set-seg-btn${value === opt.id ? " is-on" : ""}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  on,
  disabled,
  onChange,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}): React.JSX.Element {
  return (
    <div className="tavern-set-row is-static">
      <span className="tavern-set-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        className={`tavern-set-switch${on ? " is-on" : ""}`}
        onClick={() => onChange(!on)}
      >
        <span className="tavern-set-knob" />
      </button>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="tavern-set-row is-static">
      <span className="tavern-set-label">{label}</span>
      <span className="tavern-set-detail">{value}</span>
    </div>
  );
}

function ActionRow({
  label,
  action,
  pending,
  danger,
  onClick,
}: {
  label: string;
  action: string;
  pending?: boolean;
  danger?: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <div className="tavern-set-row is-static">
      <span className="tavern-set-label">{label}</span>
      <button
        type="button"
        className={`tavern-set-action${danger ? " is-danger" : ""}`}
        disabled={pending}
        onClick={onClick}
      >
        {action}
      </button>
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className="tavern-set-row is-static">
      <span className="tavern-set-label">{label}</span>
      <select
        className="tavern-set-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value || "__default__"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SectionLabel({ children }: { children: string }): React.JSX.Element {
  return <div className="tavern-set-section">{children}</div>;
}

function HotkeyRow({
  label,
  accel,
  target,
  isBlocked,
  onSaved,
}: {
  label: string;
  accel: string;
  target: "dictation" | "remix";
  isBlocked: (accel: string) => boolean;
  onSaved: (accel: string) => void;
}): React.JSX.Element {
  const recorder = useHotkeyRecorder(onSaved, { target, isBlocked });
  const recording = recorder.state !== "idle";

  return (
    <div className="tavern-set-row is-static">
      <span className="tavern-set-label">{label}</span>
      {recording ? (
        <span className="tavern-set-keys is-recording">
          {recorder.liveModifiers.length > 0
            ? recorder.liveModifiers.join(" + ")
            : "Press keys…"}
          {recorder.blockedNotice ? " · already taken" : ""}
          {recorder.needsModifierOrMouseButton ? " · add a modifier" : ""}
          <button
            type="button"
            className="tavern-set-keys-cancel"
            onClick={() => recorder.cancelRecording()}
          >
            ×
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="tavern-set-keys"
          onClick={() => recorder.startRecording()}
        >
          {formatAcceleratorKeys(accel).map((k) => (
            <kbd key={k} className="tavern-kbd">
              {k}
            </kbd>
          ))}
          <span className="tavern-set-keys-change">Change</span>
        </button>
      )}
      {!recording && recorder.blockedNotice ? (
        <span className="tavern-set-hint">
          That combination is already taken.
        </span>
      ) : null}
      {!recording && recorder.invalidReleaseNotice ? (
        <span className="tavern-set-hint">Hold a modifier with the key.</span>
      ) : null}
    </div>
  );
}

function AccountCard({
  onOpenProfile,
}: {
  onOpenProfile: () => void;
}): React.JSX.Element {
  const auth = useCloudAuth();
  const usage = useCloudUsage(!!auth.user);

  if (auth.user) {
    return (
      <button
        type="button"
        className="tavern-set-card is-clickable"
        onClick={onOpenProfile}
      >
        <div className="tavern-set-profile">
          <ProfileAvatar
            image={auth.user.image}
            name={auth.user.name}
            email={auth.user.email}
          />
          <div className="tavern-set-profile-text">
            <div className="tavern-set-card-title">
              {auth.user.name || "Signed in"}
              <span
                className={`tavern-set-plan${usage.isPro ? " is-pro" : ""}`}
              >
                {usage.isPro ? "Pro" : "Free"}
              </span>
            </div>
            <div className="tavern-set-card-sub">{auth.user.email}</div>
            <button
              type="button"
              className="tavern-set-link"
              onClick={() =>
                void window.api.openExternal("https://agicy.ai/dashboard/usage")
              }
            >
              View inference credits
            </button>
          </div>
          <span className="tavern-set-chevron">›</span>
        </div>
      </button>
    );
  }

  return (
    <div className="tavern-set-card">
      <div className="tavern-set-card-title">Sign in to UPDATED</div>
      <div className="tavern-set-card-sub">
        {auth.signingIn && auth.userCode
          ? `Your code: ${auth.userCode} — finish in the browser.`
          : "Chat, dictation cleanup, and the brain all need your account."}
      </div>
      <div className="tavern-approve-actions">
        {auth.signingIn ? (
          <button
            type="button"
            className="tavern-approve-btn"
            onClick={() => auth.cancelSignIn()}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            className="tavern-approve-btn tavern-approve-allow"
            onClick={() => void auth.signIn()}
          >
            Sign in
          </button>
        )}
      </div>
      {auth.error ? <p className="tavern-notice">{auth.error}</p> : null}
    </div>
  );
}

function SignedOutHint(): React.JSX.Element {
  return (
    <p className="tavern-set-hint">
      Sign in from the Settings home to manage this.
    </p>
  );
}

function NameEditor(): React.JSX.Element {
  const auth = useCloudAuth();
  const updateName = useUpdateName();
  const currentName = auth.user?.name ?? "";
  const [name, setName] = useState(currentName);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const trimmed = name.trim();
  const dirty = trimmed !== currentName.trim();

  const save = (): void => {
    if (!dirty || !trimmed) return;
    setSaved(false);
    updateName
      .mutateAsync(trimmed)
      .then(() => {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <div className="tavern-set-field">
      <label className="tavern-set-field-label" htmlFor="tavern-profile-name">
        Name
      </label>
      <div className="tavern-set-field-line">
        <input
          id="tavern-profile-name"
          className="tavern-set-input"
          value={name}
          maxLength={120}
          placeholder="Your name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              e.stopPropagation();
              setName(currentName);
            }
          }}
        />
        {dirty ? (
          <button
            type="button"
            className="tavern-set-action"
            disabled={!trimmed || updateName.isPending}
            onClick={save}
          >
            {updateName.isPending ? "Saving…" : "Save"}
          </button>
        ) : saved ? (
          <span className="tavern-set-saved">✓ Saved</span>
        ) : null}
      </div>
      {updateName.isError ? (
        <p className="tavern-notice">
          {updateName.error instanceof Error
            ? updateName.error.message
            : "Could not update name"}
        </p>
      ) : null}
    </div>
  );
}

const NO_INDUSTRY = "";

function ProfessionalDetails(): React.JSX.Element {
  const { data: profile } = useProfileFields(true);
  const updateProfile = useUpdateProfileFields();
  const [industry, setIndustry] = useState<Industry | "">("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [reseed, setReseed] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const parsed = industrySchema.safeParse(profile.industry);
    setIndustry(parsed.success ? parsed.data : "");
    setJobTitle(profile.jobTitle ?? "");
    setCompany(profile.company ?? "");
    setReseed(true);
  }, [profile]);

  const savedIndustry = industrySchema.safeParse(profile?.industry).success
    ? (profile?.industry as Industry)
    : "";
  const industryWillChange = industry !== savedIndustry && industry !== "";
  const dirty =
    industry !== savedIndustry ||
    jobTitle.trim() !== (profile?.jobTitle ?? "") ||
    company.trim() !== (profile?.company ?? "");

  const save = (): void => {
    if (!dirty) return;
    setSaved(false);
    updateProfile
      .mutateAsync({
        industry: industry === "" ? null : industry,
        jobTitle: jobTitle.trim() || null,
        company: company.trim() || null,
        updatePreferences: reseed,
      })
      .then(() => {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <>
      <SectionLabel>Professional details</SectionLabel>
      <div className="tavern-set-field">
        <label
          className="tavern-set-field-label"
          htmlFor="tavern-profile-industry"
        >
          Industry
        </label>
        <select
          id="tavern-profile-industry"
          className="tavern-set-select is-wide"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as Industry | "")}
        >
          <option value={NO_INDUSTRY}>Not specified</option>
          {industrySchema.options.map((value) => (
            <option key={value} value={value}>
              {INDUSTRY_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="tavern-set-field">
        <label className="tavern-set-field-label" htmlFor="tavern-profile-job">
          Job title
        </label>
        <input
          id="tavern-profile-job"
          className="tavern-set-input"
          value={jobTitle}
          maxLength={120}
          placeholder="e.g. Product Manager"
          onChange={(e) => setJobTitle(e.target.value)}
        />
      </div>
      <div className="tavern-set-field">
        <label
          className="tavern-set-field-label"
          htmlFor="tavern-profile-company"
        >
          Company
        </label>
        <input
          id="tavern-profile-company"
          className="tavern-set-input"
          value={company}
          maxLength={120}
          placeholder="e.g. Acme Inc."
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>
      {industryWillChange ? (
        <ToggleRow
          label="Refresh tone & vocabulary for this industry"
          on={reseed}
          onChange={setReseed}
        />
      ) : null}
      {dirty ? (
        <button
          type="button"
          className="tavern-approve-btn tavern-approve-allow"
          disabled={updateProfile.isPending}
          onClick={save}
        >
          {updateProfile.isPending ? "Saving…" : "Save changes"}
        </button>
      ) : saved ? (
        <span className="tavern-set-saved">✓ Saved</span>
      ) : null}
      {updateProfile.isError ? (
        <p className="tavern-notice">
          {updateProfile.error instanceof Error
            ? updateProfile.error.message
            : "Could not update profile"}
        </p>
      ) : null}
    </>
  );
}

const PROVIDERS: Array<{ id: SocialProvider; label: string }> = [
  { id: "github", label: "GitHub" },
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
];

function ConnectedAccounts(): React.JSX.Element {
  const { data: linked, isLoading } = useLinkedAccounts(true);
  const linkSocial = useLinkSocial();
  const unlinkSocial = useUnlinkSocial();
  useRefreshAccountsOnFocus(true);

  const connectedCount = linked?.length ?? 0;

  return (
    <>
      <SectionLabel>Connected accounts</SectionLabel>
      {isLoading ? (
        <p className="tavern-set-hint">Loading…</p>
      ) : (
        PROVIDERS.map((provider) => {
          const isConnected = linked?.includes(provider.id) ?? false;
          const busy =
            (linkSocial.isPending && linkSocial.variables === provider.id) ||
            (unlinkSocial.isPending && unlinkSocial.variables === provider.id);
          const lastMethod = isConnected && connectedCount <= 1;
          return (
            <div key={provider.id} className="tavern-set-row is-static">
              <span className="tavern-set-label">
                {provider.label}
                {isConnected ? (
                  <span className="tavern-set-check is-ok">✓</span>
                ) : null}
              </span>
              <button
                type="button"
                className="tavern-set-action"
                disabled={busy || lastMethod}
                title={lastMethod ? "Your only sign-in method" : undefined}
                onClick={() =>
                  isConnected
                    ? unlinkSocial.mutate(provider.id)
                    : linkSocial.mutate(provider.id)
                }
              >
                {busy ? "…" : isConnected ? "Disconnect" : "Connect"}
              </button>
            </div>
          );
        })
      )}
    </>
  );
}

function ProfilePage(): React.JSX.Element {
  const auth = useCloudAuth();
  if (!auth.user) return <SignedOutHint />;

  return (
    <>
      <div className="tavern-set-profile">
        <ProfileAvatar
          image={auth.user.image}
          name={auth.user.name}
          email={auth.user.email}
        />
        <div className="tavern-set-profile-text">
          <div className="tavern-set-card-title">
            {auth.user.name || "Signed in"}
          </div>
          <div className="tavern-set-card-sub">{auth.user.email}</div>
        </div>
      </div>
      <NameEditor />
      <ProfessionalDetails />
      <ConnectedAccounts />
      <SectionLabel>Session</SectionLabel>
      <button
        type="button"
        className="tavern-approve-btn"
        onClick={() => void auth.signOut()}
      >
        Sign out
      </button>
    </>
  );
}

function BillingPage(): React.JSX.Element {
  const auth = useCloudAuth();
  const usage = useCloudUsage(!!auth.user);
  const pricing = usePricing();
  const [period, setPeriod] = useState<"monthly" | "annual">("annual");

  if (!auth.user) return <SignedOutHint />;

  const balance = usage.balance;
  const pct = balance ? usagePercent(balance) : 0;
  const resetsLabel = balance?.resetsAt
    ? new Date(balance.resetsAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <>
      <div className="tavern-set-card">
        <div className="tavern-set-usage-head">
          <span className="tavern-set-section is-tight">This week</span>
          <button
            type="button"
            className="tavern-set-refresh"
            onClick={() => usage.refresh()}
          >
            {usage.isFetching ? "…" : "↻"}
          </button>
        </div>
        {usage.isPro ? (
          <div className="tavern-set-card-title">
            Unlimited
            <span className="tavern-set-plan is-pro">Pro</span>
          </div>
        ) : usage.isTrialing ? (
          <div className="tavern-set-usage">
            <div className="tavern-set-card-title">
              Unlimited
              <span className="tavern-set-card-sub">
                {" "}
                for {usage.trialDaysLeft}{" "}
                {usage.trialDaysLeft === 1 ? "more day" : "more days"}
              </span>
            </div>
            <span className="tavern-set-card-sub">
              Your first week is on us. After that it's{" "}
              {balance ? balance.limit.toLocaleString() : "50"} runs a week on
              the free plan.
            </span>
          </div>
        ) : balance ? (
          <div className="tavern-set-usage">
            <div className="tavern-set-card-title">
              {balance.remaining.toLocaleString()}
              <span className="tavern-set-card-sub">
                {" "}
                / {balance.limit.toLocaleString()} runs left
              </span>
            </div>
            <div className="tavern-set-usage-bar">
              <span style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <span className="tavern-set-card-sub">
              {pct}% used{resetsLabel ? ` · resets ${resetsLabel}` : ""}
            </span>
          </div>
        ) : (
          <div className="tavern-set-card-sub">
            Usage is unavailable right now.
          </div>
        )}
      </div>

      <SectionLabel>Plan</SectionLabel>
      {usage.isPro ? (
        <InfoRow label="UPDATED Pro" value="Unlimited runs" />
      ) : (
        <>
          <div className="tavern-plan-picker">
            {(
              [
                {
                  id: "annual",
                  name: "Annual",
                  price: pricing.annual.display,
                  note: "billed yearly",
                  badge:
                    pricing.monthly.amount > pricing.annual.amount
                      ? `Save ${Math.round((1 - pricing.annual.amount / pricing.monthly.amount) * 100)}%`
                      : null,
                },
                {
                  id: "monthly",
                  name: "Monthly",
                  price: pricing.monthly.display,
                  note: "billed monthly",
                  badge: null,
                },
              ] as const
            ).map((plan) => (
              <button
                key={plan.id}
                type="button"
                className={`tavern-plan${period === plan.id ? " is-on" : ""}`}
                onClick={() => setPeriod(plan.id)}
              >
                <span className="tavern-plan-name">
                  {plan.name}
                  {plan.badge ? (
                    <span className="tavern-plan-badge">{plan.badge}</span>
                  ) : null}
                </span>
                <span className="tavern-plan-price">
                  {plan.price}
                  <span className="tavern-plan-per">/mo</span>
                </span>
                <span className="tavern-plan-note">{plan.note}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="tavern-approve-btn tavern-approve-allow"
            disabled={usage.checkoutStatus === "pending"}
            onClick={() => {
              capture("upgrade_clicked", { surface: "settings", period });
              void usage.startCheckout(period);
            }}
          >
            {usage.checkoutStatus === "pending"
              ? "Finish in browser…"
              : "Upgrade to Pro"}
          </button>
          {usage.checkoutStatus === "pending" ? (
            <button
              type="button"
              className="tavern-approve-btn"
              onClick={() => usage.resetCheckout()}
            >
              Cancel
            </button>
          ) : null}
        </>
      )}
      <button
        type="button"
        className="tavern-approve-btn"
        disabled={usage.portalOpening}
        onClick={() => void usage.openBillingPortal()}
      >
        {usage.portalOpening ? "Opening…" : "Manage billing ↗"}
      </button>
      {usage.checkoutError ? (
        <p className="tavern-notice">{usage.checkoutError}</p>
      ) : null}
    </>
  );
}

function parseLanguages(
  raw: string | undefined,
  legacy: string | undefined,
): string[] {
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr))
        return arr.filter(
          (x): x is string => typeof x === "string" && x !== "auto",
        );
    } catch {}
  }
  if (legacy && legacy !== "auto") return [legacy];
  return [];
}

function LanguagesEditor({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
}): React.JSX.Element {
  const auth = useCloudAuth();
  const { data: cloudConfig } = useCloudConfig(!!auth.user);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(
    () =>
      resolveLanguageOptions(cloudConfig?.suggestedLanguages, [
        { code: "auto", label: "Auto-detect" },
        ...LANGUAGES.map((l) => ({ code: l.id, label: l.label })),
      ]),
    [cloudConfig?.suggestedLanguages],
  );

  const labelFor = (code: string): string =>
    options.find((o) => o.code === code)?.label ?? code;

  const matches = useMemo(
    () =>
      filterLanguageOptions(options, query).filter(
        (o) => !selected.includes(o.code),
      ),
    [options, query, selected],
  );

  const add = (code: string): void => {
    setAdding(false);
    setQuery("");
    if (code === "auto") {
      onChange([]);
      return;
    }
    onChange([...selected, code].slice(0, MAX_LANGUAGES));
  };

  return (
    <div className="tavern-set-langs">
      <div className="tavern-set-chips">
        {selected.length === 0 ? (
          <span className="tavern-set-chip is-auto">Auto-detect</span>
        ) : (
          selected.map((code) => (
            <span key={code} className="tavern-set-chip">
              {labelFor(code)}
              <button
                type="button"
                className="tavern-set-chip-x"
                aria-label={`Remove ${labelFor(code)}`}
                onClick={() => onChange(selected.filter((c) => c !== code))}
              >
                ×
              </button>
            </span>
          ))
        )}
        {selected.length < MAX_LANGUAGES ? (
          <button
            type="button"
            className="tavern-set-chip is-add"
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? "Done" : "+ Add"}
          </button>
        ) : null}
      </div>
      {adding ? (
        <div className="tavern-set-addlist">
          <input
            ref={(el) => el?.focus()}
            className="tavern-set-input"
            value={query}
            placeholder="Search languages"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setAdding(false);
                setQuery("");
              }
            }}
          />
          <div className="tavern-set-addlist-body">
            {matches.slice(0, 30).map((o) => (
              <button
                key={o.code}
                type="button"
                className="tavern-set-addlist-row"
                onClick={() => add(o.code)}
              >
                {o.label}
              </button>
            ))}
            {matches.length === 0 ? (
              <span className="tavern-set-hint">No matches</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MicrophoneRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (deviceId: string) => void;
}): React.JSX.Element {
  const [devices, setDevices] = useState<
    Array<{ deviceId: string; label: string }>
  >([]);

  useEffect(() => {
    void (async () => {
      try {
        const status = await window.api.checkMicPermission();
        if (status !== "granted") return;
        let inputs = (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === "audioinput",
        );
        if (inputs.some((d) => !d.label)) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          for (const t of stream.getTracks()) t.stop();
          inputs = (await navigator.mediaDevices.enumerateDevices()).filter(
            (d) => d.kind === "audioinput",
          );
        }
        setDevices(
          inputs.map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${d.deviceId.slice(0, 6)}`,
          })),
        );
      } catch {}
    })();
  }, []);

  return (
    <SelectRow
      label="Microphone"
      value={value}
      options={[
        { value: "", label: "System default" },
        ...devices.map((d) => ({ value: d.deviceId, label: d.label })),
      ]}
      onChange={onChange}
    />
  );
}

function DictationPage({
  value,
  setSetting,
}: {
  value: (key: string, fallback?: string) => string;
  setSetting: (key: string, value: string) => void;
}): React.JSX.Element {
  const languages = parseLanguages(
    value(SETTINGS_KEYS.languages),
    value(SETTINGS_KEYS.language),
  );
  const translateOn = value(SETTINGS_KEYS.translateMode) === "true";
  const [hotkeyError, setHotkeyError] = useState<string | null>(null);
  const [voiceProvider, setVoiceProvider] = useState<string>("local-whisper");
  const [deepgramConfigured, setDeepgramConfigured] = useState(false);
  const [deepgramDraft, setDeepgramDraft] = useState("");
  const [sttBusy, setSttBusy] = useState(false);
  const [sttNote, setSttNote] = useState<string | null>(null);
  const [whisperStatus, setWhisperStatus] = useState<{
    archSupported: boolean;
    archUnsupportedReason: string | null;
    binaryAvailable: boolean;
    serverBinaryAvailable: boolean;
    binaryDownloading: boolean;
    models: Array<{
      model: string;
      displayName: string;
      status: string;
      phase?: string;
      downloadProgress?: {
        percent: number;
        bytesDownloaded: number;
        bytesTotal: number;
        speedBps: number;
      };
      error?: string;
    }>;
  } | null>(null);

  useEffect(() => window.api.onHotkeyError(setHotkeyError), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getClient().api.models.configured.$get();
        if (!res.ok || cancelled) return;
        const rows = await res.json();
        const def = rows.find(
          (r: { type: string; is_default: number }) =>
            r.type === "voice" && r.is_default === 1,
        ) as { provider: string } | undefined;
        if (def?.provider && !cancelled) setVoiceProvider(def.provider);
      } catch {
        // keep default
      }
      try {
        const status = await window.api.getSttKeyStatus();
        if (!cancelled) setDeepgramConfigured(status.configured);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshWhisperStatus = useCallback(async () => {
    try {
      const res = await getClient().api.whisper.status.$get();
      if (!res.ok) return;
      const data = await res.json();
      setWhisperStatus(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (voiceProvider !== "local-whisper") return;
    void refreshWhisperStatus();
    const id = window.setInterval(() => void refreshWhisperStatus(), 1000);
    return () => window.clearInterval(id);
  }, [voiceProvider, refreshWhisperStatus]);

  const defaultLocalModel =
    whisperStatus?.models.find((m) => m.model === "base-q5_1") ??
    whisperStatus?.models[0];

  const setLanguages = (next: string[]): void => {
    const normalized = normalizeLanguageList(next);
    setSetting(SETTINGS_KEYS.languages, JSON.stringify(normalized));
    if (normalized.length !== 1 && translateOn)
      setSetting(SETTINGS_KEYS.translateMode, "false");
  };

  const selectVoiceStt = async (
    providerId: string,
    modelId: string,
    modelName: string,
  ) => {
    setSttBusy(true);
    setSttNote(null);
    try {
      const res = await getClient().api.models.configured.$post({
        json: {
          provider: providerId,
          model_id: modelId,
          model_name: modelName,
          type: "voice",
          is_default: true,
        },
      });
      if (!res.ok) throw new Error("Could not save voice provider");
      setVoiceProvider(providerId);
      setSttNote(
        providerId === "local-whisper"
          ? "Local (on-device) selected — zero keys. Download the model below if needed, then hold the hotkey to dictate."
          : "Deepgram EU selected. Paste your API key below if not already saved.",
      );
    } catch (err) {
      setSttNote(
        err instanceof Error ? err.message : "Could not save STT provider",
      );
    } finally {
      setSttBusy(false);
    }
  };

  const startLocalDownload = async (modelId: string) => {
    setSttBusy(true);
    setSttNote(null);
    try {
      const res = await getClient().api.whisper.models[":model"].download.$post(
        {
          param: { model: modelId },
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Download failed to start");
      }
      setSttNote("Download started — progress updates below.");
      void refreshWhisperStatus();
    } catch (err) {
      setSttNote(
        err instanceof Error
          ? `${err.message} — or switch to Deepgram EU (BYOK) below.`
          : "Download failed — switch to Deepgram EU (BYOK) as a fallback.",
      );
    } finally {
      setSttBusy(false);
    }
  };

  const cancelLocalDownload = async (modelId: string) => {
    try {
      await getClient().api.whisper.models[":model"].cancel.$post({
        param: { model: modelId },
      });
      void refreshWhisperStatus();
    } catch {
      // ignore
    }
  };

  const saveDeepgramKey = async () => {
    setSttBusy(true);
    setSttNote(null);
    try {
      const ok = await window.api.setDeepgramSttKey(deepgramDraft);
      if (!ok) throw new Error("Could not store key (encryption unavailable?)");
      setDeepgramConfigured(true);
      setDeepgramDraft("");
      setSttNote("Deepgram EU key saved in OS keychain.");
    } catch (err) {
      setSttNote(err instanceof Error ? err.message : "Could not save key");
    } finally {
      setSttBusy(false);
    }
  };

  const clearDeepgramKey = async () => {
    setSttBusy(true);
    try {
      await window.api.clearDeepgramSttKey();
      setDeepgramConfigured(false);
      setSttNote("Deepgram key cleared.");
    } finally {
      setSttBusy(false);
    }
  };

  return (
    <>
      <p className="tavern-set-hint is-lead">
        Dictation types for you. Hold the hotkey in any app, speak, and let go —
        on-device speech turns into text at your cursor (batch — you&apos;ll see
        Transcribing…). LLM cleanup is optional and requires a cleanup provider;
        search mode always keeps queries raw.
      </p>
      <SectionLabel>Speech-to-text</SectionLabel>
      <ChoiceRow
        label="Provider"
        value={voiceProvider}
        options={VOICE_STT_OPTIONS.map((o) => ({
          id: o.providerId,
          label: o.label,
        }))}
        onChange={(id) => {
          const opt = VOICE_STT_OPTIONS.find((o) => o.providerId === id);
          if (!opt || sttBusy) return;
          void selectVoiceStt(opt.providerId, opt.modelId, opt.label);
        }}
      />
      <p className="tavern-set-hint">
        {VOICE_STT_OPTIONS.find((o) => o.providerId === voiceProvider)
          ?.detail ?? "Local is the zero-key default."}
      </p>
      {voiceProvider === "local-whisper" ? (
        <>
          <SectionLabel>On-device model</SectionLabel>
          {!whisperStatus?.archSupported ? (
            <p className="tavern-notice">
              {whisperStatus?.archUnsupportedReason ??
                "Local Whisper is not supported on this architecture."}{" "}
              Switch to Deepgram EU (BYOK) below.
            </p>
          ) : (
            <>
              <InfoRow
                label="Binary"
                value={
                  whisperStatus?.serverBinaryAvailable
                    ? "Ready"
                    : whisperStatus?.binaryDownloading
                      ? "Downloading…"
                      : "Not found — will download on first use"
                }
              />
              <InfoRow
                label="Model"
                value={
                  defaultLocalModel?.status === "ready"
                    ? `${defaultLocalModel.displayName} ready`
                    : defaultLocalModel?.status === "downloading"
                      ? `${defaultLocalModel.displayName} ${defaultLocalModel.downloadProgress?.percent ?? 0}%${
                          defaultLocalModel.phase === "building_binary"
                            ? " (binary)"
                            : ""
                        }`
                      : defaultLocalModel?.status === "error"
                        ? `Error: ${defaultLocalModel.error ?? "download failed"}`
                        : `${defaultLocalModel?.displayName ?? "Whisper Fast"} not downloaded`
                }
              />
              {defaultLocalModel?.status === "downloading" ? (
                <div className="tavern-set-row is-static" style={{ gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: "var(--border, #333)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, defaultLocalModel.downloadProgress?.percent ?? 0)}%`,
                        height: "100%",
                        background: "var(--accent, #c45c26)",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="tavern-btn"
                    onClick={() =>
                      void cancelLocalDownload(defaultLocalModel.model)
                    }
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
              {defaultLocalModel?.status === "error" ? (
                <p className="tavern-notice">
                  {defaultLocalModel.error} — retry download, or switch to
                  Deepgram EU (BYOK) as a fallback.
                </p>
              ) : null}
              {defaultLocalModel &&
              defaultLocalModel.status !== "ready" &&
              defaultLocalModel.status !== "downloading" ? (
                <div className="tavern-set-row is-static" style={{ gap: 8 }}>
                  <button
                    type="button"
                    className="tavern-btn"
                    disabled={sttBusy}
                    onClick={() =>
                      void startLocalDownload(defaultLocalModel.model)
                    }
                  >
                    Download model
                  </button>
                  <button
                    type="button"
                    className="tavern-btn"
                    disabled={sttBusy}
                    onClick={() =>
                      void selectVoiceStt(
                        "deepgram",
                        "deepgram/nova-3",
                        "Deepgram EU (BYOK)",
                      )
                    }
                  >
                    Use Deepgram EU instead
                  </button>
                </div>
              ) : null}
            </>
          )}
        </>
      ) : null}
      {voiceProvider === "deepgram" ||
      (voiceProvider === "local-whisper" &&
        defaultLocalModel?.status === "error") ? (
        <>
          {voiceProvider === "local-whisper" ? (
            <SectionLabel>Fallback — Deepgram EU</SectionLabel>
          ) : null}
          <InfoRow
            label="Deepgram key"
            value={deepgramConfigured ? "Configured" : "Not set"}
          />
          <div className="tavern-set-row is-static" style={{ gap: 8 }}>
            <input
              type="password"
              className="tavern-input"
              placeholder="Deepgram EU API key"
              value={deepgramDraft}
              onChange={(e) => setDeepgramDraft(e.target.value)}
              style={{ flex: 1 }}
              autoComplete="off"
            />
            <button
              type="button"
              className="tavern-btn"
              disabled={sttBusy || !deepgramDraft.trim()}
              onClick={() => void saveDeepgramKey()}
            >
              Save
            </button>
            {deepgramConfigured ? (
              <button
                type="button"
                className="tavern-btn"
                disabled={sttBusy}
                onClick={() => void clearDeepgramKey()}
              >
                Clear
              </button>
            ) : null}
          </div>
        </>
      ) : null}
      {sttNote ? <p className="tavern-notice">{sttNote}</p> : null}
      <HotkeyRow
        label="Hotkey"
        accel={value(SETTINGS_KEYS.hotkey) || getDefaultHotkey()}
        target="dictation"
        isBlocked={(accel) =>
          acceleratorsEqual(
            accel,
            value(SETTINGS_KEYS.remixHotkey) || getDefaultRemixHotkey(),
          )
        }
        onSaved={(accel) => {
          setHotkeyError(null);
          setSetting(SETTINGS_KEYS.hotkey, accel);
        }}
      />
      {hotkeyError ? <p className="tavern-notice">{hotkeyError}</p> : null}
      <ChoiceRow
        label="Press style"
        value={value(SETTINGS_KEYS.hotkeyMode, "hold")}
        options={[
          { id: "hold", label: "Hold" },
          { id: "toggle", label: "Toggle" },
        ]}
        onChange={(id) => {
          setSetting(SETTINGS_KEYS.hotkeyMode, id);
          window.api.setHotkeyMode(id === "toggle" ? "toggle" : "hold");
        }}
      />
      <MicrophoneRow
        value={value(SETTINGS_KEYS.micDeviceId)}
        onChange={(id) => setSetting(SETTINGS_KEYS.micDeviceId, id)}
      />
      <SectionLabel>Languages</SectionLabel>
      <LanguagesEditor selected={languages} onChange={setLanguages} />
      <ToggleRow
        label="Translate to selected language"
        on={translateOn && languages.length === 1}
        disabled={languages.length !== 1}
        onChange={(next) =>
          setSetting(SETTINGS_KEYS.translateMode, String(next))
        }
      />
      <SectionLabel>Output</SectionLabel>
      <ChoiceRow
        label="Deliver to"
        value={value(SETTINGS_KEYS.dictationDestination, "cursor")}
        options={[
          { id: "cursor", label: "Cursor" },
          { id: "composer", label: "Chat" },
        ]}
        onChange={(id) => setSetting(SETTINGS_KEYS.dictationDestination, id)}
      />
      <ChoiceRow
        label="Method"
        value={value(SETTINGS_KEYS.outputMode, "paste")}
        options={[
          { id: "paste", label: "Paste" },
          { id: "clipboard", label: "Clipboard" },
        ]}
        onChange={(id) => setSetting(SETTINGS_KEYS.outputMode, id)}
      />
      <SectionLabel>Sound</SectionLabel>
      <ToggleRow
        label="Start & stop sounds"
        on={value(SETTINGS_KEYS.soundEnabled, "true") !== "false"}
        onChange={(next) =>
          setSetting(SETTINGS_KEYS.soundEnabled, next ? "true" : "false")
        }
      />
      <ChoiceRow
        label="Other audio"
        value={value("audio_playback_mode", "off")}
        options={[
          { id: "off", label: "Leave" },
          { id: "duck", label: "Duck" },
          { id: "pause", label: "Pause" },
        ]}
        onChange={(id) => setSetting("audio_playback_mode", id)}
      />
    </>
  );
}

function SearchPage({
  value,
  setSetting,
}: {
  value: (key: string, fallback?: string) => string;
  setSetting: (key: string, value: string) => void;
}): React.JSX.Element {
  const inputMode = parseInputMode(value(SETTINGS_KEYS.inputMode));
  const providerMode = parseSearchProviderMode(
    value(SETTINGS_KEYS.searchProviderMode),
  );
  const [keyStatus, setKeyStatus] = useState<{
    configured: boolean;
    encryptionAvailable: boolean;
  } | null>(null);
  const [braveDraft, setBraveDraft] = useState("");
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const [logPath, setLogPath] = useState<string>("");
  const [logMessage, setLogMessage] = useState<string | null>(null);

  const refreshKeyStatus = useCallback((): void => {
    void window.api
      .getSearchKeyStatus()
      .then((status) =>
        setKeyStatus({
          configured: status.configured,
          encryptionAvailable: status.encryptionAvailable,
        }),
      )
      .catch(() => setKeyStatus(null));
  }, []);

  useEffect(() => {
    refreshKeyStatus();
    void window.api
      .getDivergenceLogPath()
      .then(setLogPath)
      .catch(() => setLogPath(""));
  }, [refreshKeyStatus]);

  const setInputMode = (mode: InputMode): void => {
    setSetting(SETTINGS_KEYS.inputMode, mode);
    void window.api.setInputMode(mode);
  };

  const saveBraveKey = (): void => {
    const trimmed = braveDraft.trim();
    if (!trimmed) {
      setKeyMessage("Enter a Brave Search API key.");
      return;
    }
    void window.api.setBraveSearchKey(trimmed).then((ok) => {
      if (ok) {
        setBraveDraft("");
        setKeyMessage("Brave key saved to encrypted storage.");
        refreshKeyStatus();
      } else {
        setKeyMessage(
          keyStatus?.encryptionAvailable === false
            ? "Encrypted storage is unavailable on this system."
            : "Could not save Brave key.",
        );
      }
    });
  };

  const clearBraveKey = (): void => {
    void window.api.clearBraveSearchKey().then((ok) => {
      setKeyMessage(ok ? "Brave key cleared." : "Could not clear Brave key.");
      refreshKeyStatus();
    });
  };

  const revealLog = (): void => {
    void window.api.revealDivergenceLog().then((result) => {
      if (result.ok) {
        setLogPath(result.path);
        setLogMessage("Opened divergence log in file manager.");
      } else {
        setLogMessage(result.error);
      }
    });
  };

  const copyLogPath = (): void => {
    void navigator.clipboard.writeText(logPath).then(
      () => setLogMessage("Log path copied."),
      () => setLogMessage("Could not copy path."),
    );
  };

  return (
    <>
      <p className="tavern-set-hint is-lead">
        Search mode routes the hotkey transcript to certificate results instead
        of pasting. Keys stay in encrypted OS storage — never in SQLite.
      </p>

      <SectionLabel>Input mode</SectionLabel>
      <ChoiceRow
        label="Hotkey delivers"
        value={inputMode}
        options={[
          { id: "dictation", label: "Dictation" },
          { id: "search", label: "Search" },
        ]}
        onChange={(id) =>
          setInputMode(id === "search" ? "search" : "dictation")
        }
      />

      <SectionLabel>Providers</SectionLabel>
      <ChoiceRow
        label="Provider set"
        value={providerMode}
        options={[
          { id: "dual", label: "Dual" },
          { id: "single", label: "Single" },
        ]}
        onChange={(id) =>
          setSetting(
            SETTINGS_KEYS.searchProviderMode,
            id === "single" ? "single" : "dual",
          )
        }
      />
      <p className="tavern-set-hint">
        Dual runs two providers and surfaces CONTESTED when they diverge. Single
        disables divergence pairing.
      </p>

      <SectionLabel>Brave Search</SectionLabel>
      <InfoRow
        label="Key status"
        value={
          keyStatus === null
            ? "…"
            : keyStatus.configured
              ? "Configured"
              : "Not set (using mock)"
        }
      />
      <div className="tavern-set-row is-static">
        <span className="tavern-set-label">API key</span>
        <input
          className="tavern-set-input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste Brave Search key"
          value={braveDraft}
          onChange={(event) => setBraveDraft(event.target.value)}
        />
      </div>
      <div className="tavern-set-row is-static">
        <span className="tavern-set-label" />
        <div className="tavern-set-seg">
          <button
            type="button"
            className="tavern-set-seg-btn"
            onClick={saveBraveKey}
          >
            Save
          </button>
          <button
            type="button"
            className="tavern-set-seg-btn"
            onClick={clearBraveKey}
            disabled={!keyStatus?.configured}
          >
            Clear
          </button>
        </div>
      </div>
      {keyMessage ? <p className="tavern-set-hint">{keyMessage}</p> : null}

      <SectionLabel>Divergence log</SectionLabel>
      <ActionRow label="Reveal JSONL log" action="Open" onClick={revealLog} />
      <ActionRow label="Copy log path" action="Copy" onClick={copyLogPath} />
      {logPath ? (
        <p className="tavern-set-hint tavern-mono">{logPath}</p>
      ) : null}
      {logMessage ? <p className="tavern-set-hint">{logMessage}</p> : null}
    </>
  );
}

function ApplicationPage({
  onReplayIntro,
}: {
  onReplayIntro: () => void;
}): React.JSX.Element {
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [companionForm, setCompanionForm] = useState<CompanionForm>(
    DEFAULT_COMPANION_FORM,
  );
  const [companionEnabled, setCompanionEnabled] = useState(false);
  const [version, setVersion] = useState("");
  const [updateStatus, setUpdateStatus] = useState<
    | { kind: "idle" }
    | { kind: "checking" }
    | { kind: "none" }
    | { kind: "failed" }
    | { kind: "available"; version: string; downloaded: boolean }
  >({ kind: "idle" });

  useEffect(() => {
    void window.api
      .getLaunchAtStartup()
      .then(setLaunchAtStartup)
      .catch(() => {});
    void window.api
      .getAutoUpdate()
      .then(setAutoUpdate)
      .catch(() => {});
    void window.api
      .getAppVersion()
      .then(setVersion)
      .catch(() => {});
    void window.api
      .companionForm()
      .then(setCompanionForm)
      .catch(() => {});
    void window.api
      .getCompanionEnabled()
      .then(setCompanionEnabled)
      .catch(() => {});
    const offForm = window.api.onCompanionForm(setCompanionForm);
    const offEnabled = window.api.onCompanionEnabled(setCompanionEnabled);
    return () => {
      offForm?.();
      offEnabled?.();
    };
  }, []);

  const checkForUpdates = (): void => {
    setUpdateStatus({ kind: "checking" });
    void window.api
      .checkForUpdate()
      .then((result) => {
        setUpdateStatus(
          result
            ? {
                kind: "available",
                version: result.version,
                downloaded: result.downloadState === "downloaded",
              }
            : { kind: "none" },
        );
      })
      .catch(() => setUpdateStatus({ kind: "failed" }));
  };

  return (
    <>
      <SectionLabel>Widget</SectionLabel>
      <ToggleRow
        label="Show desktop companion"
        on={companionEnabled}
        onChange={(next) => {
          setCompanionEnabled(next);
          window.api.setCompanionEnabled(next);
        }}
      />
      <p className="tavern-set-hint">
        Optional floating sprite in the screen corner. Off by default — UPDATED
        is voice-first; hold the hotkey without a companion.
      </p>
      {companionEnabled ? (
        <>
          <div className="tavern-set-row is-static">
            <span className="tavern-set-label">Sprite</span>
            <div className="tavern-sprite-pick">
              {Object.values(SPRITES_INFO).map((s) => {
                const id = parseCompanionForm(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`tavern-sprite-pick-btn${
                      companionForm === id ? " is-on" : ""
                    }`}
                    onClick={() => {
                      setCompanionForm(id);
                      window.api.setCompanionForm(id);
                    }}
                  >
                    <SpriteBadge form={id} size={24} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          <ActionRow label="Intro" action="Replay" onClick={onReplayIntro} />
          <p className="tavern-set-hint">
            Replay the first-run intro for the selected sprite.
          </p>
        </>
      ) : null}
      <SectionLabel>App</SectionLabel>
      <ToggleRow
        label="Launch at login"
        on={launchAtStartup}
        onChange={(next) => {
          setLaunchAtStartup(next);
          window.api.setLaunchAtStartup(next);
        }}
      />
      <ToggleRow
        label="Install updates automatically"
        on={autoUpdate}
        onChange={(next) => {
          setAutoUpdate(next);
          window.api.setAutoUpdate(next);
        }}
      />
      <ActionRow
        label={
          updateStatus.kind === "none"
            ? "Up to date"
            : updateStatus.kind === "failed"
              ? "Couldn't check for updates"
              : updateStatus.kind === "available"
                ? `v${updateStatus.version} available`
                : "Updates"
        }
        action={updateStatus.kind === "checking" ? "Checking…" : "Check now"}
        pending={updateStatus.kind === "checking"}
        onClick={checkForUpdates}
      />
      {updateStatus.kind === "available" ? (
        <button
          type="button"
          className="tavern-approve-btn tavern-approve-allow"
          onClick={() => {
            if (updateStatus.downloaded) window.api.installUpdate();
            else window.api.downloadUpdate();
          }}
        >
          {updateStatus.downloaded ? "Restart to update" : "Download update"}
        </button>
      ) : null}
      {version ? <InfoRow label="Version" value={`v${version}`} /> : null}
    </>
  );
}

function PermissionMark({
  state,
}: {
  state: "ok" | "no" | "wait";
}): React.JSX.Element {
  return (
    <span className={`tavern-set-check is-${state}`}>
      {state === "ok" ? "✓" : state === "no" ? "✕" : "…"}
    </span>
  );
}

function PermissionsPage(): React.JSX.Element {
  const [mic, setMic] = useState<string | null>(null);
  const [ax, setAx] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const refresh = (): void => {
      void window.api
        .checkMicPermission()
        .then((v) => alive && setMic(v))
        .catch(() => {});
      void window.api
        .checkAccessibilityPermission()
        .then((v) => alive && setAx(v))
        .catch(() => {});
    };
    refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <>
      <div className="tavern-set-row is-static">
        <span className="tavern-set-label">
          Microphone
          <PermissionMark
            state={mic === "granted" ? "ok" : mic === null ? "wait" : "no"}
          />
        </span>
        {mic !== null && mic !== "granted" ? (
          <button
            type="button"
            className="tavern-set-action"
            onClick={() => {
              if (mic === "denied") window.api.openMicSettings();
              else void window.api.requestMicPermission();
            }}
          >
            {mic === "denied" ? "Open Settings ↗" : "Allow"}
          </button>
        ) : null}
      </div>
      <p className="tavern-set-hint">Needed to hear you dictate and talk.</p>
      <div className="tavern-set-row is-static">
        <span className="tavern-set-label">
          Accessibility
          <PermissionMark
            state={ax === true ? "ok" : ax === null ? "wait" : "no"}
          />
        </span>
        {ax === false ? (
          <button
            type="button"
            className="tavern-set-action"
            onClick={() => window.api.openAccessibilitySettings()}
          >
            Open Settings ↗
          </button>
        ) : null}
      </div>
      <p className="tavern-set-hint">
        Needed to paste text at your cursor and read what you've highlighted.
      </p>
    </>
  );
}

function DataPage({
  onThreadsCleared,
}: {
  onThreadsCleared: () => void;
}): React.JSX.Element {
  const [clearingChats, setClearingChats] = useState(false);
  const [clearingBrain, setClearingBrain] = useState(false);
  const [brainCleared, setBrainCleared] = useState(false);
  const [exporting, setExporting] = useState(false);

  const clearChats = (): void => {
    if (!window.confirm("Delete every conversation? This can't be undone."))
      return;
    setClearingChats(true);
    void apiFetch("/api/agent/thread/clear", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error("clear failed");
        onThreadsCleared();
      })
      .catch(() => {})
      .finally(() => setClearingChats(false));
  };

  const clearBrain = (): void => {
    if (
      !window.confirm(
        "Erase every brain file — memories, notes, and todos? Export a copy first if you want one. This can't be undone.",
      )
    )
      return;
    setClearingBrain(true);
    void apiFetch("/api/brain/clear", { method: "POST" })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
        } | null;
        if (!res.ok || !data?.ok) throw new Error("clear failed");
        setBrainCleared(true);
        window.setTimeout(() => setBrainCleared(false), 2000);
      })
      .catch(() => {})
      .finally(() => setClearingBrain(false));
  };

  const exportBrain = (): void => {
    setExporting(true);
    void apiFetch("/api/brain/export")
      .then(async (res) => {
        const data = (await res.json()) as {
          ok?: boolean;
          files?: Array<{ path: string; content: string }>;
        };
        if (!data.ok || !data.files) throw new Error("export failed");
        const blob = new Blob([JSON.stringify(data.files, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "updated-brain.json";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {})
      .finally(() => setExporting(false));
  };

  return (
    <>
      <SectionLabel>Chats</SectionLabel>
      <ActionRow
        label="Clear chat history"
        action={clearingChats ? "Clearing…" : "Clear…"}
        pending={clearingChats}
        danger
        onClick={clearChats}
      />
      <p className="tavern-set-hint">
        Deletes every conversation on this Mac and starts fresh.
      </p>
      <SectionLabel>Brain</SectionLabel>
      <ActionRow
        label="Export your brain"
        action={exporting ? "Exporting…" : "Download"}
        pending={exporting}
        onClick={exportBrain}
      />
      <ActionRow
        label={brainCleared ? "Brain cleared" : "Clear brain"}
        action={clearingBrain ? "Clearing…" : "Clear…"}
        pending={clearingBrain}
        danger
        onClick={clearBrain}
      />
      <p className="tavern-set-hint">
        Erases every memory, note, and todo from your brain in the cloud.
      </p>
      <SectionLabel>Diagnostics</SectionLabel>
      <ActionRow
        label="Log files"
        action="Open folder"
        onClick={() => void window.api.openLogsFolder()}
      />
    </>
  );
}

function AppearancePage({
  value,
  setSetting,
}: {
  value: (key: string, fallback?: string) => string;
  setSetting: (key: string, value: string) => void;
}): React.JSX.Element {
  const preset = value(SETTINGS_KEYS.appearancePreset, "vasilikos-light");
  const accent = value(SETTINGS_KEYS.appearanceAccent, "copper");
  const textScale = value(SETTINGS_KEYS.textScale, "comfortable");
  const uiLocale = value(SETTINGS_KEYS.uiLocale, "en");
  const reduceMotion = value(SETTINGS_KEYS.reduceMotion, "false") === "true";

  useEffect(() => {
    applyAppearanceToDocument({
      preset,
      accent,
      textScale,
      uiLocale,
      reduceMotion,
    });
  }, [preset, accent, textScale, uiLocale, reduceMotion]);

  return (
    <>
      <p className="tavern-set-hint is-lead">
        Colors follow AGICY playground (Vasilikos paper + copper). Larger text
        and high contrast help older readers; language picks the panel UI locale
        shared with agicy.ai/updated.
      </p>
      <SectionLabel>Theme</SectionLabel>
      {APPEARANCE_PRESETS.map((p) => (
        <AppearanceChoiceRow
          key={p.id}
          label={p.label}
          detail={p.note}
          selected={preset === p.id}
          onSelect={() => setSetting(SETTINGS_KEYS.appearancePreset, p.id)}
        />
      ))}
      <SectionLabel>Accent</SectionLabel>
      <div className="tavern-set-row is-static">
        <span className="tavern-set-label">Accent color</span>
        <div className="tavern-sprite-pick">
          {ACCENT_OPTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`tavern-sprite-pick-btn${accent === a.id ? " is-on" : ""}`}
              onClick={() => setSetting(SETTINGS_KEYS.appearanceAccent, a.id)}
            >
              <span
                aria-hidden
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: a.color,
                  display: "inline-block",
                }}
              />
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <SectionLabel>Text size</SectionLabel>
      {TEXT_SCALE_OPTIONS.map((t) => (
        <AppearanceChoiceRow
          key={t.id}
          label={t.label}
          detail={t.note}
          selected={textScale === t.id}
          onSelect={() => setSetting(SETTINGS_KEYS.textScale, t.id)}
        />
      ))}
      <SectionLabel>Language</SectionLabel>
      <p className="tavern-set-hint">
        Panel language (eight hub languages). Dictation languages stay under
        Dictation.
      </p>
      <div className="tavern-sprite-pick" style={{ flexWrap: "wrap" }}>
        {UI_LOCALES.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`tavern-sprite-pick-btn${uiLocale === l.id ? " is-on" : ""}`}
            onClick={() => setSetting(SETTINGS_KEYS.uiLocale, l.id)}
          >
            {l.nativeLabel}
          </button>
        ))}
      </div>
      <SectionLabel>Motion</SectionLabel>
      <ToggleRow
        label="Reduce motion"
        on={reduceMotion}
        onChange={(next) =>
          setSetting(SETTINGS_KEYS.reduceMotion, next ? "true" : "false")
        }
      />
      <p className="tavern-set-hint">
        Softens animations for vestibular sensitivity and
        prefers-reduced-motion.
      </p>
    </>
  );
}

function ModelsPage({
  value,
  setSetting,
}: {
  value: (key: string, fallback?: string) => string;
  setSetting: (key: string, value: string) => void;
}): React.JSX.Element {
  const selected = value(SETTINGS_KEYS.llmModel, DEFAULT_LLM_MODEL_ID);
  const active = getUpdatedLlmModel(selected);

  return (
    <>
      <p className="tavern-set-hint is-lead">
        Same provider marks as the playground composer. AGICY Auto routes via
        Copperway when available; pick a specific model for cleanup and chat.
      </p>
      <SectionLabel>Active model</SectionLabel>
      <div className="tavern-set-row is-static">
        <span className="tavern-set-label">Current</span>
        <span
          className="tavern-set-value"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <ModelProviderAvatar model={active} size={20} />
          {active.name}
        </span>
      </div>
      <SectionLabel>Models</SectionLabel>
      <ul className="updated-model-picker-list" style={{ maxHeight: "none" }}>
        {UPDATED_LLM_MODELS.map((m) => {
          const on = m.apiId === active.apiId;
          return (
            <li key={m.apiId}>
              <button
                type="button"
                className={`updated-model-picker-option${on ? " is-selected" : ""}`}
                onClick={() => setSetting(SETTINGS_KEYS.llmModel, m.apiId)}
              >
                <ModelProviderAvatar model={m} size={22} />
                <span className="updated-model-picker-option-text">
                  <span className="updated-model-picker-option-name">
                    {m.name}
                  </span>
                  <span className="updated-model-picker-option-meta">
                    {m.provider}
                    {m.note ? ` · ${m.note}` : ` · ${m.tier}`}
                  </span>
                </span>
                {on ? (
                  <span className="updated-model-picker-check" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="tavern-set-hint">
        Voice STT defaults to Local (on-device); Deepgram EU is opt-in under
        Settings → Dictation. This list is for LLM cleanup and chat.
      </p>
    </>
  );
}

function AppearanceChoiceRow({
  label,
  detail,
  selected,
  onSelect,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`tavern-set-row${selected ? " is-on" : ""}`}
      onClick={onSelect}
      style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
    >
      <span className="tavern-set-label">{label}</span>
      {detail ? <span className="tavern-set-value">{detail}</span> : null}
    </button>
  );
}

export function SettingsView({
  onClose,
  onThreadsCleared,
  onReplayIntro,
  onOpenThread,
}: {
  onClose: () => void;
  onThreadsCleared: () => void;
  onReplayIntro: () => void;
  onOpenThread?: (threadId: string) => void;
}): React.JSX.Element {
  const [page, setPage] = useState<SettingsPage>("root");
  const { settings, setSetting } = useServerSettings();
  const auth = useCloudAuth();
  const usage = useCloudUsage(!!auth.user);
  const [version, setVersion] = useState("");

  useEffect(() => {
    void window.api
      .getAppVersion()
      .then(setVersion)
      .catch(() => {});
  }, []);

  if (settings === null)
    return <div className="tavern-empty">Loading settings…</div>;

  const value = (key: string, fallback = ""): string =>
    settings[key] ?? fallback;

  if (page !== "root") {
    return (
      <>
        <button
          type="button"
          className="tavern-file-back"
          onClick={() => setPage("root")}
        >
          ← {PAGE_TITLES[page]}
        </button>
        {page === "profile" ? (
          <ProfilePage />
        ) : page === "billing" ? (
          <BillingPage />
        ) : page === "notifications" ? (
          <>
            <SectionLabel>History</SectionLabel>
            <NotificationsHistory {...(onOpenThread ? { onOpenThread } : {})} />
          </>
        ) : page === "dictation" ? (
          <DictationPage value={value} setSetting={setSetting} />
        ) : page === "search" ? (
          <SearchPage value={value} setSetting={setSetting} />
        ) : page === "talk" ? (
          <>
            <p className="tavern-set-hint is-lead">
              Talking is how you ask UPDATED to do things. Hold the talk key,
              say what you need, and it lands in the chat when you let go — the
              agent takes it from there. Summon opens this panel from anywhere.
            </p>
            <HotkeyRow
              label="Talk to UPDATED"
              accel={
                value(SETTINGS_KEYS.remixHotkey) || getDefaultRemixHotkey()
              }
              target="remix"
              isBlocked={(accel) =>
                acceleratorsEqual(
                  accel,
                  value(SETTINGS_KEYS.hotkey) || getDefaultHotkey(),
                )
              }
              onSaved={(accel) => setSetting(SETTINGS_KEYS.remixHotkey, accel)}
            />
            <InfoRow label="Summon the panel" value="⌥ Space" />
          </>
        ) : page === "appearance" ? (
          <AppearancePage value={value} setSetting={setSetting} />
        ) : page === "models" ? (
          <ModelsPage value={value} setSetting={setSetting} />
        ) : page === "application" ? (
          <ApplicationPage onReplayIntro={onReplayIntro} />
        ) : page === "permissions" ? (
          <PermissionsPage />
        ) : (
          <DataPage onThreadsCleared={onThreadsCleared} />
        )}
      </>
    );
  }

  return (
    <>
      <button type="button" className="tavern-file-back" onClick={onClose}>
        ← Settings
      </button>
      <AccountCard onOpenProfile={() => setPage("profile")} />
      <NavRow
        label="Billing & Usage"
        detail={auth.user ? (usage.isPro ? "Pro" : "Free") : undefined}
        onClick={() => setPage("billing")}
      />
      <NavRow label="Notifications" onClick={() => setPage("notifications")} />
      <NavRow
        label="Dictation"
        detail={value(SETTINGS_KEYS.hotkey) || getDefaultHotkey()}
        onClick={() => setPage("dictation")}
      />
      <NavRow
        label="Search"
        detail={
          parseInputMode(value(SETTINGS_KEYS.inputMode)) === "search"
            ? "Search mode"
            : "Dictation mode"
        }
        onClick={() => setPage("search")}
      />
      <NavRow
        label="Talk & Summon"
        detail={value(SETTINGS_KEYS.remixHotkey) || getDefaultRemixHotkey()}
        onClick={() => setPage("talk")}
      />
      <NavRow
        label="Models"
        detail={
          getUpdatedLlmModel(
            value(SETTINGS_KEYS.llmModel, DEFAULT_LLM_MODEL_ID),
          ).name
        }
        onClick={() => setPage("models")}
      />
      <NavRow
        label="Appearance & Language"
        detail={value(SETTINGS_KEYS.uiLocale, "en").toUpperCase()}
        onClick={() => setPage("appearance")}
      />
      <NavRow label="Application" onClick={() => setPage("application")} />
      <NavRow label="Permissions" onClick={() => setPage("permissions")} />
      <NavRow label="Data" onClick={() => setPage("data")} />
      {version ? (
        <div className="tavern-set-version">UPDATED v{version}</div>
      ) : null}
    </>
  );
}
