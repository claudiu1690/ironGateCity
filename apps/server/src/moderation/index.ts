/** The word filter (slice 6 design §23.1): server-only; never import from the client or content. */
export { check, nameAllowed } from './filter';
export type { CheckResult } from './filter';
