import { SearchResults } from "@renderer/components/search-results";
import { runSearchQuery } from "@renderer/lib/search";
import type { InputMode, SearchAnswer } from "@updated/search";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

export interface SearchTabProps {
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  /** Voice-dictated query pushed from companion when input mode is search. */
  externalQuery?: string | null;
  onExternalQueryHandled?: () => void;
}

interface SearchState {
  query: string;
  providerId?: string;
  answer?: SearchAnswer;
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
    setState({ query: trimmed });
    try {
      const result = await runSearchQuery(trimmed);
      if (!result.ok) {
        setState({ query: trimmed, error: result.error });
        return;
      }
      setState({
        query: trimmed,
        providerId: result.providerId,
        answer: result.answer,
      });
    } catch (err) {
      setState({
        query: trimmed,
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

      {state?.answer ? (
        <SearchResults
          query={state.query}
          answer={state.answer}
          providerId={state.providerId}
          latencyNote={
            state.answer.latencyMs !== undefined
              ? `${state.answer.latencyMs} ms`
              : undefined
          }
        />
      ) : !loading && !state?.error ? (
        <p className="updated-search-status">
          Hold the hotkey in search mode to dictate a query, or type above.
          Modifier + hotkey mode toggle is planned for Gate 6.
        </p>
      ) : null}
    </div>
  );
}
