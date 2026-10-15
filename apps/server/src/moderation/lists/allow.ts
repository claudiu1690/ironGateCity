/**
 * The word filter's allow list (slice 6 design §23.1): the game's own vocabulary and any content name
 * the matcher would otherwise catch (the Scunthorpe problem). A match that lies wholly inside one of
 * these is ignored. Matched after the same folding as the patterns, so one spelling each.
 *
 * Every content string and every copy line was run through the matcher on 15 Oct 2026 (5,029
 * strings): no hits, the library's own whitelist already covers *Assembly*, *Ashford*, *title* and the
 * like. The game's vocabulary is listed here anyway as a guard against a future dataset change.
 * Re-run the sweep when a new city or a batch of names lands: a false refusal in a political game's
 * chat is worse than a missed swear.
 */
export const ALLOW_TERMS: readonly string[] = [
  'rally',
  'strike',
  'picket',
  'canvass',
  'expose',
  'chalking',
  'gate',
  'hands',
  'assembly',
  'assembly rooms',
  'the pass',
  'ashford',
  'mass',
  'masses',
  'night',
  'class',
  'title',
  'constitution',
  'petition',
  'scunthorpe',
];
