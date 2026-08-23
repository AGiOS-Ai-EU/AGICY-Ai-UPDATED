export type {
  DivergencePairScore,
  DivergenceReport,
} from "./divergence.js";
export {
  citationIdentityKey,
  computeDivergence,
  DIVERGENCE_CONTESTED_JACCARD_THRESHOLD,
  jaccardSimilarity,
  providerCitationKeySet,
} from "./divergence.js";
export type {
  MultiProviderSearchResult,
  ProviderSearchResult,
} from "./multi-search.js";
export { runMultiProviderSearch } from "./multi-search.js";
export {
  BRAVE_SEARCH_PROVIDER_ID,
  BraveSearchProvider,
} from "./providers/brave.js";
export {
  createSearchProvider,
  createSearchProviders,
  MockAltSearchProvider,
  MockSearchProvider,
} from "./providers/factory.js";
export { MOCK_SEARCH_ANSWER } from "./providers/mock.js";
export { MOCK_ALT_SEARCH_ANSWER } from "./providers/mock-alt.js";
export type {
  AgeStripSummary,
  PrimaryRateSummary,
} from "./result-stats.js";
export {
  citationAgeLabel,
  computePrimaryRate,
  formatAgeStrip,
  oldestCitationAgeLabel,
  uniqueCitationDomains,
} from "./result-stats.js";
export type { SourceClass } from "./source-class.js";
export {
  classifySource,
  sourceClassChipLabel,
  sourceClassDisplayLabel,
} from "./source-class.js";
export type {
  InputMode,
  SearchAnswer,
  SearchCitation,
  SearchProvider,
} from "./types.js";
