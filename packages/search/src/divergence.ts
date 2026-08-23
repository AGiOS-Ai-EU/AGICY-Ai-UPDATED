import type { SearchCitation } from "./types.js";

/**
 * Minimum pairwise Jaccard similarity before results are marked CONTESTED.
 * When any provider pair scores below this value, citations disagree materially.
 */
export const DIVERGENCE_CONTESTED_JACCARD_THRESHOLD = 0.35;

export interface DivergencePairScore {
  providerA: string;
  providerB: string;
  jaccard: number;
}

export interface DivergenceReport {
  contested: boolean;
  threshold: number;
  minSimilarity: number | null;
  pairScores: DivergencePairScore[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean)
    .sort();
}

/**
 * Stable citation identity for set comparison: normalized domain plus sorted
 * title tokens. Snippets are excluded because providers often paraphrase them
 * while still citing the same page (domain + title is the durable key).
 */
export function citationIdentityKey(citation: SearchCitation): string {
  const domain = citation.domain
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  const titleTokens = tokenize(citation.title);
  return `${domain}|${titleTokens.join(" ")}`;
}

/** Set of citation identity keys for one provider's result list. */
export function providerCitationKeySet(
  citations: SearchCitation[],
): Set<string> {
  return new Set(citations.map(citationIdentityKey));
}

/** Jaccard index |A∩B| / |A∪B| for two string sets. */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface ProviderCitationInput {
  providerId: string;
  citations: SearchCitation[];
}

/** Pairwise Jaccard scores and CONTESTED classification across providers. */
export function computeDivergence(
  providers: ProviderCitationInput[],
  threshold: number = DIVERGENCE_CONTESTED_JACCARD_THRESHOLD,
): DivergenceReport {
  if (providers.length < 2) {
    return {
      contested: false,
      threshold,
      minSimilarity: null,
      pairScores: [],
    };
  }

  const sets = providers.map((provider) => ({
    providerId: provider.providerId,
    keys: providerCitationKeySet(provider.citations),
  }));

  const pairScores: DivergencePairScore[] = [];
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      pairScores.push({
        providerA: sets[i].providerId,
        providerB: sets[j].providerId,
        jaccard: jaccardSimilarity(sets[i].keys, sets[j].keys),
      });
    }
  }

  const minSimilarity = Math.min(...pairScores.map((pair) => pair.jaccard));
  return {
    contested: minSimilarity < threshold,
    threshold,
    minSimilarity,
    pairScores,
  };
}
