import type { ContentInput } from '../schemas';

type NationalLineInput = NonNullable<ContentInput['nationalLines']>[number];

/**
 * Slice 7 (docs/design/slice-7-nation.md §11.1; tech design §11): the national section, *FROM THE
 * CAPITAL* in the home papers and the Courier, *THE REPUBLIC* in the Herald. The same words in every
 * paper; at most two a day (the two highest in priority), written to `nation.news` by the nation's
 * day and selected live. `scope`: everyone, the faction a line names, or (the party's target) the
 * members who contributed. `{reason}` for `nl.chair-secretary` is *No member stood* or *{name} fell
 * short by {margin}*, built by the server. Times (`{until}`) travel as epoch ms for the client.
 */
export const nationalLines: NationalLineInput[] = [
  // ----- The term and the office --------------------------------------------------------------
  {
    id: 'nl.took-office',
    priority: 0,
    scope: 'all',
    headline: '{president} Takes Office as President',
    deck: "{party}'s candidate took the oath under the dome this morning. Parliament sits with {seatsV} Vanguard, {seatsC} Collective and {seatsA} Alliance. The old term's bills lapse.",
  },
  {
    id: 'nl.result',
    priority: 0,
    scope: 'all',
    headline: '{president} Elected President, to Be Confirmed Tomorrow',
    deck: "{party} {scoreP} to {second} {scoreS}: the votes and the republic's opinion, counted together. Parliament: {seatsV} · {seatsC} · {seatsA}. The oath is tomorrow.",
  },
  {
    id: 'nl.removed',
    priority: 0,
    scope: 'all',
    headline: 'Parliament Removes {president}',
    deck: "{forVotes} of sixty. {successor}, the runner-up in {month}'s election, is President for the rest of the term.",
  },
  {
    id: 'nl.survived',
    priority: 0,
    scope: 'all',
    headline: '{president} Survives the Vote',
    deck: '{forVotes} of the forty needed. The President stays; the vote cannot return for a week.',
  },
  // ----- Laws ---------------------------------------------------------------------------------
  {
    id: 'nl.law-in-force',
    priority: 1,
    scope: 'all',
    headline: '{law} in Force',
    deck: '{lawLine} In every city for {days} days, by vote of Parliament. Put to the chamber by {by}.',
  },
  {
    id: 'nl.law-vetoed',
    priority: 1,
    scope: 'all',
    headline: '{president} Vetoes {law}',
    deck: 'Passed by {forVotes}, stopped at the signature. Parliament may vote it through anyway with forty.',
  },
  {
    id: 'nl.law-overridden',
    priority: 1,
    scope: 'all',
    headline: 'Parliament Votes {law} Through Anyway',
    deck: '{forVotes} of sixty against the veto. In force from tomorrow for {days} days.',
  },
  {
    id: 'nl.law-struck',
    priority: 1,
    scope: 'all',
    headline: 'Parliament Strikes Out {law}',
    deck: '{forVotes} of sixty. The law ends tonight; its line comes off every ticket in the republic.',
  },
  {
    id: 'nl.law-failed',
    priority: 2,
    scope: 'all',
    headline: '{law} Falls in Parliament',
    deck: '{forVotes} of the {needed} needed. {by} may not put it back for a week.',
  },
  {
    id: 'nl.law-tabled',
    priority: 2,
    scope: 'all',
    headline: '{law} Put to Parliament by {by}',
    deck: '{lawLine} Deputies vote until {until}; {needed} of sixty carry it.',
  },
  {
    id: 'nl.law-expired',
    priority: 2,
    scope: 'all',
    headline: '{law} Expires',
    deck: '{days} days, as voted. The line comes off the tickets this morning.',
  },
  // ----- The national election ----------------------------------------------------------------
  {
    id: 'nl.names-in',
    priority: 1,
    scope: 'all',
    headline: 'Names In for President and Parliament',
    deck: 'Two days for candidates. A President needs a term as deputy; a deputy needs a term as Governor or Mayor, or three on a council. The parties pick on {weekdayPick}.',
  },
  {
    id: 'nl.party-pick',
    priority: 1,
    scope: 'all',
    headline: 'The Parties Pick Their Candidates',
    deck: "The Acclamation, the Congress and the Convention sit until {until}. Every member votes; the party's own figure is on each ballot.",
  },
  {
    id: 'nl.voting-open',
    priority: 0,
    scope: 'all',
    headline: 'The Republic Votes',
    deck: 'Three candidates for President, one vote each, until {until}. Half the result is the votes; half is who holds the five cities.',
  },
  // ----- Who holds the republic ---------------------------------------------------------------
  {
    id: 'nl.leader-change',
    priority: 1,
    scope: 'all',
    headline: 'The {leader} Now Leads the Republic',
    deck: '{leaderShare} to {secondShare}, on the five cities weighted. {cityMoved} did it.',
  },
  {
    id: 'nl.leader-line',
    priority: 3,
    scope: 'all',
    headline: 'The {leader} Leads the Republic',
    deck: 'The {leader} hold {leaderShare} per cent of the republic, the {second} {secondShare}, the {third} {thirdShare}. Laws in force: {lawsCount} of five.',
  },
  {
    id: 'nl.clearwater-control',
    priority: 1,
    scope: 'all',
    headline: 'The {faction} Takes Clearwater',
    deck: "Above fifty on the lake at last night's count of opinion. Thirty per cent of the republic has a majority.",
  },
  {
    id: 'nl.clearwater-lost',
    priority: 1,
    scope: 'all',
    headline: 'The {faction} Loses Clearwater',
    deck: "Below fifty at the boundary. A comeback begins: its members' work there gains five per cent a day.",
  },
  // ----- Councils and petitions ---------------------------------------------------------------
  {
    id: 'nl.council-dissolved',
    priority: 1,
    scope: 'all',
    headline: '{city} Council Dissolved by Petition',
    deck: "{signatures} residents signed. The rule in force runs out its days, the council's chair goes to a local, and local candidates sit until {weekday}'s result.",
  },
  // ----- The Chair (the faction's members) ------------------------------------------------------
  {
    id: 'nl.chair-elected',
    priority: 1,
    scope: 'faction',
    headline: '{name} Elected Chair of the {faction}',
    deck: "{votes} votes to the secretary's {secretaryVotes}. The orders, the party line and the fixture are the Chair's from tomorrow.",
  },
  {
    id: 'nl.chair-secretary',
    priority: 2,
    scope: 'faction',
    headline: "{secretary} Keeps the {faction}'s Orders",
    deck: '{reason}. The next election for Chair is in four weeks.',
  },
  {
    id: 'nl.chair-removed',
    priority: 1,
    scope: 'faction',
    headline: '{faction} Members Remove {name} as Chair',
    deck: '{noVotes} of {cast} votes: no confidence. {secretary} acts until the next election.',
  },
  {
    id: 'nl.target-met',
    priority: 2,
    scope: 'contributors',
    headline: "The {faction} Takes {place}'s Doors",
    deck: '{count} of {target} by midnight. Everyone who knocked gets +10 Party XP this morning.',
  },
];
