import "../search-results.css";

import type { SearchAnswer, SearchCitation } from "@updated/search";
import {
  citationAgeLabel,
  classifySource,
  computePrimaryRate,
  formatAgeStrip,
  sourceClassChipLabel,
  sourceClassDisplayLabel,
} from "@updated/search";
import type React from "react";

export interface SearchResultsProps {
  query: string;
  answer: SearchAnswer;
  providerId?: string;
  latencyNote?: string;
}

function claimTextForCitation(citation: SearchCitation): string {
  return citation.snippet?.trim() || citation.title.trim() || citation.url;
}

function SearchClaimCard({
  citation,
}: {
  citation: SearchCitation;
}): React.JSX.Element {
  const sourceClass = classifySource(citation);
  const age = citationAgeLabel(citation);

  return (
    <article className="updated-search-card">
      <div className="updated-search-card-chip">
        {sourceClassChipLabel(sourceClass)}
      </div>
      <p className="updated-search-card-claim">
        {claimTextForCitation(citation)}
      </p>
      <div className="updated-search-card-strip">
        <span>1 source</span>
        <span aria-hidden="true">·</span>
        <span>{age}</span>
        <span aria-hidden="true">·</span>
        <span>{sourceClassDisplayLabel(sourceClass)}</span>
      </div>
      <div className="updated-search-card-sources">
        <button
          type="button"
          className="updated-search-source-link"
          onClick={() => void window.api.openExternal(citation.url)}
        >
          {citation.domain}
        </button>
      </div>
    </article>
  );
}

export function SearchResults({
  query,
  answer,
  providerId,
  latencyNote,
}: SearchResultsProps): React.JSX.Element {
  const primaryRate = computePrimaryRate(answer.citations);
  const ageStrip = formatAgeStrip(answer.citations);

  return (
    <div className="updated-search">
      <header className="updated-search-header">
        <p className="updated-search-primary-rate">
          Primary-source rate: {primaryRate.rateText}
        </p>
        {!primaryRate.hasPrimary ? (
          <p className="updated-search-no-primary">No primary sources found.</p>
        ) : null}
        <div
          className="updated-search-age-strip"
          role="group"
          aria-label="Citation date range"
        >
          <span className="updated-search-age-item">
            <span>Oldest</span>
            <span>{ageStrip.oldest}</span>
          </span>
          <span className="updated-search-age-item">
            <span>Newest</span>
            <span>{ageStrip.newest}</span>
          </span>
        </div>
        {providerId || latencyNote ? (
          <p className="updated-search-meta">
            {providerId ? `Provider ${providerId}` : null}
            {providerId && latencyNote ? " · " : null}
            {latencyNote ?? null}
          </p>
        ) : null}
      </header>

      {answer.answer.trim() ? (
        <article className="updated-search-card">
          <div className="updated-search-card-chip">SUMMARY</div>
          <p className="updated-search-card-claim">{answer.answer.trim()}</p>
          <div className="updated-search-card-strip">
            <span>
              {answer.citations.length}{" "}
              {answer.citations.length === 1 ? "source" : "sources"}
            </span>
            <span aria-hidden="true">·</span>
            <span>{ageStrip.oldest}</span>
            <span aria-hidden="true">·</span>
            <span>query: {query.trim()}</span>
          </div>
        </article>
      ) : null}

      <div className="updated-search-cards">
        {answer.citations.map((citation) => (
          <SearchClaimCard key={citation.url} citation={citation} />
        ))}
      </div>
    </div>
  );
}
