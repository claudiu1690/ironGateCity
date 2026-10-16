import type { BodyguardTier } from '../schemas';

/**
 * Tech design §24.3 (ADR 0088; docs/design/slice-8-life.md §24.2): the three tiers of *someone to
 * walk with you*, a doorman, a steward and a minder: their names (drawn at hire; the same tier
 * re-hired brings the same man back, §24.8 #5), portraits and run-in lines (≤ 200 characters,
 * `{Name}`). Rules own the prices, gates and power (`BODYGUARD`). Civilians, all three: no uniform,
 * badge or weapon in any picture or line; the player never reads *bodyguard* on a label.
 */
export const bodyguards: BodyguardTier[] = [
  {
    tier: 1,
    said: 'doorman',
    names: ['Ruda', 'Big Anton', 'Ferko'],
    portrait: 'portrait.doorman',
    works: '{Name} puts himself in the way and says nothing. They look at the width of him and go.',
    fails: "{Name} goes down in the first rush. It's you now.",
  },
  {
    tier: 2,
    said: 'steward',
    names: ['Weiss', 'Dušek', 'Holub'],
    portrait: 'portrait.steward',
    works: '{Name} steps between you with his notebook open and asks for their names. Nobody gives one. They go.',
    fails: "{Name} is shouldered aside and the notebook goes in the gutter. It's you now.",
  },
  {
    tier: 3,
    said: 'minder',
    names: ['Mr Halm', 'Mr Varga', 'Mr Olbrich'],
    portrait: 'portrait.minder',
    works: '{Name} says a name, quietly, to the biggest of them. The biggest of them remembers an appointment.',
    fails: "{Name}'s name means nothing to these. He's down, and it's you.",
  },
];
