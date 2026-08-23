import { SearchResults } from "@renderer/components/search-results";
import { runSearchQuery } from "@renderer/lib/search";
import {
  DIVERGENCE_CONTESTED_JACCARD_THRESHOLD,
  type DivergenceReport,
  type InputMode,
  type ProviderSearchResult,
} from "@updated/search";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

const EMPTY_DIVERGENCE: DivergenceReport = {
  contested: false,
  threshold: DIVERGENCE_CONTESTED_JACCARD_THRESHOLD,
  minSimilarity: null,
  pairScores: [],
};

export interface SearchTabProps {
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  /** Voice-dictated query pushed from companion when input mode is search. */
  externalQuery?: string | null;
  onExternalQueryHandled?: () => void;
}

interface SearchState {
  query: string;
  contested: boolean;
  divergence: DivergenceReport;
  results: ProviderSearchResult[];
  error?: string;
}

export function SearchTab({
  inputMode,
  onInputModeChange,
  externalQuery,
  onExternalQueryHandled,
}: SearchTabProps): React.JSX.Element {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<SearchState | null>(null);

  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setState({
      query: trimmed,
      contested: false,
      divergence: EMPTY_DIVERGENCE,
      results: [],
    });
    try {
      const result = await runSearchQuery(trimmed);
      if (!result.ok) {
        setState({
          query: trimmed,
          contested: false,
          divergence: EMPTY_DIVERGENCE,
          results: [],
          error: result.error,
        });
        return;
      }
      setState({
        query: trimmed,
        contested: result.contested,
        divergence: result.divergence,
        results: result.results,
      });
    } catch (err) {
      setState({
        query: trimmed,
        contested: false,
        divergence: EMPTY_DIVERGENCE,
        results: [],
        error: err instanceof Error ? err.message : "Search failed",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!externalQuery?.trim()) return;
    void executeSearch(externalQuery).finally(() => {
      onExternalQueryHandled?.();
    });
  }, [externalQuery, executeSearch, onExternalQueryHandled]);

  return (
    <div className="updated-search">
      <div className="updated-search-mode">
        <span>Input mode</span>
        <button
          type="button"
          className={`updated-search-mode-toggle${inputMode === "dictation" ? " is-active" : ""}`}
          onClick={() => onInputModeChange("dictation")}
        >
          Dictation
        </button>
        <button
          type="button"
          className={`updated-search-mode-toggle${inputMode === "search" ? " is-active" : ""}`}
          onClick={() => onInputModeChange("search")}
        >
          Search
        </button>
      </div>

      <form
        className="updated-search-query-form"
        onSubmit={(event) => {
          event.preventDefault();
          void executeSearch(draft);
        }}
      >
        <input
          className="updated-search-input"
          value={draft}
          placeholder="Type a query"
          onChange={(event) => setDraft(event.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="updated-search-submit"
          disabled={loading || !draft.trim()}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {loading ? <p className="updated-search-status">Searching…</p> : null}

      {state?.error ? (
        <p className="updated-search-status updated-search-error">
          {state.error}
        </p>
      ) : null}

      {state && state.results.length > 0 ? (
        <SearchResults
          query={state.query}
          contested={state.contested}
          divergence={state.divergence}
          results={state.results}
        />
      ) : !loading && !state?.error ? (
        <p className="updated-search-status">
          Hold the hotkey in search mode to dictate a query, or type above.
          Default dev search runs two mock providers to surface divergence.
        </p>
      ) : null}
    </div>
  );
}
