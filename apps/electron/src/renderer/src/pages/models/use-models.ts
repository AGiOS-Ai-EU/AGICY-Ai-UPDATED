import { getClient } from "@renderer/lib/api";
import type { AvailableModel } from "@renderer/lib/models";
import { queryKeys, settingsQueryOptions } from "@renderer/lib/query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SETTINGS_KEYS } from "../../../../shared/settings-keys";
import type { ConfiguredModel } from "./types";

// Query keys for the models page, all sourced from the shared registry.
// `queryKeys.models.all` (`["models"]`) is a family so a single invalidate
// refreshes every models query.
const MODELS_KEYS = {
  all: queryKeys.models.all,
  configured: queryKeys.models.configured,
  settings: queryKeys.settings,
};

// Stable empty fallback so derived useMemo deps don't change identity while a
// query is still loading.
const EMPTY_CONFIGURED: ConfiguredModel[] = [];

export interface UseModels {
  loading: boolean;
  llmCleanup: boolean;
  /** True once the editable form state has been seeded from persisted settings. */
  settingsSeeded: boolean;

  // Derived
  defaultVoice: ConfiguredModel | undefined;
  defaultLlm: ConfiguredModel | undefined;

  // Actions — each refetches as needed
  configureModel: (
    model: AvailableModel,
    type: "voice" | "llm",
  ) => Promise<void>;
  setCleanup: (next: boolean) => void;
  reload: () => Promise<void>;
}

export function useModels(): UseModels {
  const queryClient = useQueryClient();

  // -------------------------------------------------------------------------
  // Server data (React Query)
  // -------------------------------------------------------------------------

  const configuredQuery = useQuery({
    queryKey: MODELS_KEYS.configured,
    queryFn: async () => {
      const res = await getClient().api.models.configured.$get();
      if (!res.ok) throw new Error("Failed to load configured models");
      return (await res.json()) as ConfiguredModel[];
    },
  });

  const settingsQuery = useQuery(settingsQueryOptions());

  const configured = configuredQuery.data ?? EMPTY_CONFIGURED;
  const loading = configuredQuery.isLoading || settingsQuery.isLoading;

  // -------------------------------------------------------------------------
  // Editable form state (seeded from persisted settings)
  // -------------------------------------------------------------------------

  const [llmCleanup, setLlmCleanup] = useState(false);

  // Seed editable state from persisted settings once, when the settings query
  // first resolves. Mutations update this local state directly, so we don't
  // re-seed on later invalidations (which would clobber in-progress edits).
  // `settingsSeeded` is state (not a ref) so consumers can wait for the seed
  // before acting on `llmCleanup` — reading it too early sees the initial
  // `false` and can trigger spurious re-configuration.
  const [settingsSeeded, setSettingsSeeded] = useState(false);
  useEffect(() => {
    const s = settingsQuery.data;
    if (!s || settingsSeeded) return;
    setSettingsSeeded(true);
    const cleanup = s[SETTINGS_KEYS.llmCleanup];
    if (cleanup) setLlmCleanup(cleanup === "true");
  }, [settingsQuery.data, settingsSeeded]);

  // -------------------------------------------------------------------------
  // Reloaders (invalidate the relevant queries)
  // -------------------------------------------------------------------------

  const reload = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: MODELS_KEYS.all }),
      queryClient.invalidateQueries({ queryKey: MODELS_KEYS.settings }),
    ]);
  }, [queryClient]);
  const loadData = reload;

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const defaultVoice = useMemo(
    () => configured.find((m) => m.type === "voice" && m.is_default === 1),
    [configured],
  );
  const defaultLlm = useMemo(
    () => configured.find((m) => m.type === "llm" && m.is_default === 1),
    [configured],
  );

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const configureModel = useCallback(
    async (model: AvailableModel, type: "voice" | "llm") => {
      await getClient().api.models.configured.$post({
        json: {
          provider: model.provider_id,
          model_id: model.model_id,
          model_name: model.model_name,
          type,
          is_default: true,
        },
      });
      await loadData();
    },
    [loadData],
  );

  const setCleanup = useCallback((next: boolean) => {
    setLlmCleanup(next);
    getClient()
      .api.settings[":key"].$put({
        param: { key: SETTINGS_KEYS.llmCleanup },
        json: { value: String(next) },
      })
      .then(() => {
        // Toggling cleanup changes whether the pill needs the frontmost app for
        // routing — notify it to refresh its cached decision.
        window.api?.sendCleanupContextChanged();
      })
      .catch((err) => console.error("Failed to save LLM cleanup:", err));
  }, []);

  return {
    loading,
    llmCleanup,
    settingsSeeded,
    defaultVoice,
    defaultLlm,
    configureModel,
    setCleanup,
    reload: loadData,
  };
}
