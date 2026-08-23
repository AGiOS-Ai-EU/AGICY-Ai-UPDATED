export {
  BRAVE_SEARCH_PROVIDER_ID,
  BraveSearchProvider,
} from "./providers/brave.js";
export {
  createSearchProvider,
  MockSearchProvider,
} from "./providers/factory.js";
export { MOCK_SEARCH_ANSWER } from "./providers/mock.js";
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
