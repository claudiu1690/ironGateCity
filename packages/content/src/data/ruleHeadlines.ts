import type { ContentInput } from '../schemas';

type HeadlineInput = ContentInput['headlines'][number];

/**
 * The voting rework (docs/design/voting-simplified.md §4.8 and §8.4, settled 10 Oct 2026; tech
 * design §10): the rule ballot's headlines in the four papers, word for word. Live conditions,
 * selected at read from the paper's rule facts (`PoliticalFacts.rule`, the server's
 * `ruleHeadlineFacts`). `hl.filed` and `hl.nominations` are reworded in place in
 * `politicalHeadlines.ts` / `heraldHeadlines.ts` (design §8.9.2).
 *
 * The fix round (design §8.12, QA M1 and m2): the facts carry two more booleans, `tie` (the winner
 * was level on votes at home, or on seats in the capital without a draw) and `unrest` (a fallback
 * to card 1 when card 1 was a councillor's, the party's card being off the ballot); `{name}` on a
 * fallback is that councillor. No deck prints the word *votes* after a number that can be 1.
 *
 * Tokens (design §8.4): `{rule}` the rule (the winner, the caller's card, or a councillor's rule),
 * `{winner}` the winning rule, `{votes}` the votes of `{rule}`, `{winnerVotes}` the winner's,
 * `{of}` the votes cast, `{line}` the rule's plain line (capitalised at a deck's start), `{until}`
 * the boundary named by the condition (the vote's close, or the end of the rule's five days),
 * `{name}` the councillor, `{parties}` the card's party or parties (*the Vanguard* / *the Collective
 * and the Alliance*), `{seats}` the seats behind `{rule}`, `{winnerSeats}` the winner's.
 */
interface VoiceSet {
  prefix: string;
  cityId: string;
  won: [string, string];
  tie: [string, string];
  fallback: [string, string];
  fallbackUnrest: [string, string];
  yourWon: [string, string];
  yourLost: [string, string];
  yourLostTie: [string, string];
  onBallot: [string, string];
  voteOpen: [string, string];
}

function homeSet(v: VoiceSet): HeadlineInput[] {
  const t = (
    name: string,
    group: 'city' | 'personal',
    priority: number,
    when: HeadlineInput['when'],
    [headline, deck]: [string, string],
  ): HeadlineInput => ({ id: `${v.prefix}${name}`, cityId: v.cityId, group, priority, when, headline, deck });
  return [
    t('rule-won', 'city', 0, [{ kind: 'ruleDecided', fallback: false, tie: false }], v.won),
    t('rule-tie', 'city', 0, [{ kind: 'ruleDecided', fallback: false, tie: true }], v.tie),
    t('rule-fallback', 'city', 0, [{ kind: 'ruleDecided', fallback: true, unrest: false }], v.fallback),
    t('rule-fallback-unrest', 'city', 0, [{ kind: 'ruleDecided', fallback: true, unrest: true }], v.fallbackUnrest),
    t('your-rule-won', 'personal', 2, [{ kind: 'votedRule', won: true }], v.yourWon),
    t('your-rule-lost', 'personal', 2, [{ kind: 'votedRule', won: false, tie: false }], v.yourLost),
    t('your-rule-lost-tie', 'personal', 2, [{ kind: 'votedRule', won: false, tie: true }], v.yourLostTie),
    t('your-rule-on-ballot', 'personal', 2, [{ kind: 'ruleOnBallot' }], v.onBallot),
    // Day 2 only (§8.1 Q12): the morning the vote opens.
    t('vote-open', 'city', 0, [{ kind: 'voteOpen' }], v.voteOpen),
  ];
}

export const ruleHeadlines: HeadlineInput[] = [
  // The Coalport Clarion (design §4.8, §8.4).
  ...homeSet({
    prefix: 'hl.',
    cityId: 'coalport',
    won: ['{rule} Wins the Vote in Coalport', '{votes} of {of} cast. In force until {until}: {line}.'],
    tie: [
      '{rule} Wins the Vote in Coalport on a Tie',
      'Level at {votes} each; the first card takes a tie. In force until {until}: {line}.',
    ],
    fallback: [
      "Coalport Keeps the Branch's Rule",
      'No votes were cast. {rule} runs until {until}. The Union Hall would like a word about that.',
    ],
    fallbackUnrest: [
      "Councillor {name}'s Rule Runs in Coalport",
      'No votes were cast, and the branch had no card: Coalport is in Unrest. {rule} runs until {until}.',
    ],
    yourWon: ['Your Vote Counted: {rule} Wins', '{votes} of {of} cast. In force until {until}.'],
    yourLost: ['Your Vote Counted: {rule} Falls Short', '{winner} took it by {winnerVotes} to {votes}. In force until {until}.'],
    yourLostTie: [
      'Your Vote Counted: {rule} Falls Short on a Tie',
      'Level at {votes} each, and the first card takes a tie: {winner}. In force until {until}.',
    ],
    onBallot: ['Councillor {name} Puts {rule} to the Town', '{line}. Voting opens today until {until}.'],
    voteOpen: [
      'Coalport Votes on Its Rule',
      'Three rules on the ballot. Vote from the paper or the Town Hall until {until}.',
    ],
  }),
  // The Duskwall Sentinel: cold, the committee's voice.
  ...homeSet({
    prefix: 'hl.v.',
    cityId: 'duskwall',
    won: [
      '{rule} Carries the Vote in Duskwall',
      '{votes} of {of} cast. In force until {until}: {line}. The committee notes the result.',
    ],
    tie: [
      '{rule} Carries the Vote in Duskwall on a Tie',
      'Level at {votes} each; the first card takes a tie. In force until {until}: {line}. The committee notes the result.',
    ],
    fallback: [
      "Duskwall Keeps the Committee's Rule",
      'No votes were cast. {rule} runs until {until}. Beacon House has noticed.',
    ],
    fallbackUnrest: [
      "Councillor {name}'s Rule Runs in Duskwall",
      'No votes were cast, and the committee had no card: Duskwall is in Unrest. {rule} runs until {until}. Beacon House has noticed.',
    ],
    yourWon: ['Your Vote Counted: {rule} Carries', '{votes} of {of} cast. In force until {until}.'],
    yourLost: [
      'Your Vote Counted: {rule} Falls Short',
      '{winner} took it by {winnerVotes} to {votes}. In force until {until}. The minutes record it.',
    ],
    yourLostTie: [
      'Your Vote Counted: {rule} Falls Short on a Tie',
      'Level at {votes} each, and the first card takes a tie: {winner}. In force until {until}. The minutes record it.',
    ],
    onBallot: [
      'Councillor {name} Puts {rule} to the Town',
      '{line}. Voting opens today until {until}. The committee expects every member to vote.',
    ],
    voteOpen: [
      'Duskwall Votes on Its Rule',
      'Three rules on the ballot. Vote from the paper or at the Town Hall until {until}. The committee expects a full turnout.',
    ],
  }),
  // The Ashford Gazette: dry, a newspaper that checks.
  ...homeSet({
    prefix: 'hl.a.',
    cityId: 'ashford',
    won: [
      '{rule} Wins the Vote in Ashford',
      '{votes} of {of} cast. In force until {until}: {line}. The Gazette has checked the count.',
    ],
    tie: [
      '{rule} Wins the Vote in Ashford on a Tie',
      'Level at {votes} each; the first card takes a tie, and the Gazette has checked the rule. In force until {until}: {line}.',
    ],
    fallback: [
      "Ashford Keeps the Branch's Rule, Unopposed",
      'No votes were cast. {rule} runs until {until}. The leader column wonders why.',
    ],
    fallbackUnrest: [
      "Councillor {name}'s Rule Runs in Ashford, Unopposed",
      'No votes were cast, and the branch had no card: Ashford is in Unrest. {rule} runs until {until}. The leader column wonders why.',
    ],
    yourWon: ['Your Vote Counted: {rule} Wins', '{votes} of {of} cast. In force until {until}.'],
    yourLost: [
      'Your Vote Counted: {rule} Falls Short',
      '{winner} took it by {winnerVotes} to {votes}. In force until {until}. The Gazette prints the count in full.',
    ],
    yourLostTie: [
      'Your Vote Counted: {rule} Falls Short on a Tie',
      'Level at {votes} each, and the first card takes a tie: {winner}. In force until {until}. The Gazette prints the count in full.',
    ],
    onBallot: [
      'Councillor {name} Puts {rule} to the Town',
      '{line}. Voting opens today until {until}. The Gazette wishes it luck, impartially.',
    ],
    voteOpen: [
      'Ashford Votes on Its Rule',
      'Three rules on the ballot. Vote from the paper or at the Rooms until {until}. The Gazette has read all three.',
    ],
  }),
  // The Irongate Herald: the capital's, wry. No fallback (`how` is `seats` or `draw`, ADR 0085).
  // `tie` here is a seat tie settled on votes or opinion (design §8.12); a draw is its own line.
  {
    id: 'hl.ig.rule-won',
    cityId: 'irongate',
    group: 'city',
    priority: 0,
    when: [{ kind: 'ruleDecided', fallback: false, drawn: false, tie: false }],
    headline: '{rule} Wins the Capital',
    deck: 'Backed by {parties}: {seats} seats of ten. In force until {until} in every district: {line}.',
  },
  {
    id: 'hl.ig.rule-seat-tie',
    cityId: 'irongate',
    group: 'city',
    priority: 0,
    when: [{ kind: 'ruleDecided', fallback: false, drawn: false, tie: true }],
    headline: '{rule} Wins the Capital on Votes, Level on Seats',
    deck: 'Backed by {parties}: {seats} seats of ten, the same as the runner-up, so the ballots decided. In force until {until}: {line}.',
  },
  {
    id: 'hl.ig.rule-drawn',
    cityId: 'irongate',
    group: 'city',
    priority: 0,
    when: [{ kind: 'ruleDecided', fallback: false, drawn: true }],
    headline: "{rule} Wins the Capital on the Returning Officer's Draw",
    deck: 'Level on seats, votes and opinion, so the hat decided. In force until {until}: {line}.',
  },
  {
    id: 'hl.ig.your-rule-won',
    cityId: 'irongate',
    group: 'personal',
    priority: 2,
    when: [{ kind: 'votedRule', won: true }],
    headline: 'Your Vote Counted: {rule} Wins the Capital',
    deck: '{seats} seats of ten behind it. In force until {until}.',
  },
  {
    id: 'hl.ig.your-rule-lost',
    cityId: 'irongate',
    group: 'personal',
    priority: 2,
    when: [{ kind: 'votedRule', won: false, tie: false }],
    headline: 'Your Vote Counted: {rule} Falls Short',
    deck: '{winner} had {winnerSeats} seats of ten to {seats}. In force until {until}.',
  },
  {
    id: 'hl.ig.your-rule-lost-tie',
    cityId: 'irongate',
    group: 'personal',
    priority: 2,
    when: [{ kind: 'votedRule', won: false, tie: true }],
    headline: 'Your Vote Counted: {rule} Falls Short, Level on Seats',
    deck: 'Level at {seats} seats of ten; {winner} had more votes. In force until {until}.',
  },
  {
    id: 'hl.ig.your-rule-on-ballot',
    cityId: 'irongate',
    group: 'personal',
    priority: 2,
    when: [{ kind: 'ruleOnBallot' }],
    // Design §8.6 Q1: every party's short name takes 's (the Vanguard's, the Collective's, the Alliance's Card).
    headline: "Councillor {name} Carries {parties}'s Card: {rule}",
    deck: '{line}. Voting opens today in every district until {until}.',
  },
  {
    id: 'hl.ig.vote-open',
    cityId: 'irongate',
    group: 'city',
    priority: 0,
    when: [{ kind: 'voteOpen' }],
    headline: 'The Capital Votes on Its Rule',
    deck: 'One card a party, every district, until {until}. Your vote is secret; the seats follow it.',
  },
];
