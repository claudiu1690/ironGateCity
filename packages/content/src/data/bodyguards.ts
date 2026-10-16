import type { BodyguardTier } from '../schemas';

/**
 * Tech design §24.3 (ADR 0088; design §24.2): the bodyguards' three tiers, a doorman, a steward and a
 * minder: their names, portraits and run-in lines. Rules own the prices, gates and power
 * (`BODYGUARD`). Empty until the designer writes them (T27); the loader then checks all three.
 */
export const bodyguards: BodyguardTier[] = [];
