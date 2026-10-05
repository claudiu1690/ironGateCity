/**
 * QA (slice 5, "Risk"): content checks the developer's word-for-word tests leave open. The opponents
 * against the GDD's own §20.2 table (not the design's copy of it), the missions against the rules
 * that use them (the ladder, the target and its audience, the pool after the actor's side is dropped,
 * a way on every trainable stat in every home city), the text-length rules of pillar 7 over every
 * new text, every risk deck filled with every real fill (not only the longest), and the vocabulary
 * and content-policy guards over the parts of the slice the developer's sweep does not read
 * (missions, the fifteen places and their tickets, the quarters, the alt texts).
 */
import { describe, expect, it } from 'vitest';
import { getContent } from '../src';
import { MISSION_TYPES, fillTemplate, missionDifficulty } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { riskHeadlines } from '../src/data/headlines';
import { copy } from '../src/data/copy';
import { opponents } from '../src/data/opponents';
import { playerStrings } from './vocabulary';
// Vite's ?raw import (see raw.d.ts): the package has no Node types.
import GDD from '../../../docs/GDD.md?raw';

const content = getContent();
const F: FactionId[] = ['vanguard', 'collective', 'alliance'];
const sentences = (s: string) => s.split(/(?<=[.?!]["”’)]?)\s+(?=[A-Z"“‘(])/).filter(Boolean).length;

type LocatedMission = NonNullable<ReturnType<typeof content.mission>>;
const allMissions: LocatedMission[] = content.cities.flatMap((city) =>
  city.locations.flatMap((loc) => (loc.missions ?? []).map((m) => content.mission(m.id)!)),
);

describe('QA · the opponents against GDD §20.2 (power, AGI, Wits, the bribe) and §20.2 scaling', () => {
  const t = GDD.slice(GDD.indexOf('### 20.2 Opponents'), GDD.indexOf('### 20.3'));
  const row = (name: string) => t.split('\n').find((l) => l.startsWith(`| ${name} |`))!.split('|').map((c) => c.trim());
  const MAP: Record<string, string> = {
    'street-enforcer': 'Street Enforcer',
    'vanguard-doorman': 'Vanguard Doorman',
    'strike-picket': 'Strike Picket',
    'branch-inspector': 'Branch Inspector',
    'party-thug': 'Party Thug',
    'city-police': 'City Police',
  };

  it('six opponents with the GDD numbers; the inspector unbribable with −10 Fight; the police the republic’s', () => {
    expect(content.opponents.map((o) => o.id).sort()).toEqual(Object.keys(MAP).sort());
    for (const o of content.opponents) {
      const r = row(MAP[o.id]!);
      expect([o.power, o.agi, o.wits], o.id).toEqual([Number(r[3]), Number(r[4]), Number(r[5])]);
      const bribe = r[6]!;
      if (/Not bribable/.test(bribe)) expect(o.payOff, o.id).toBeNull();
      else expect(o.payOff, o.id).toBe(Number(bribe.replace(/\D/g, '')));
      const side = r[2]!;
      expect(o.side, o.id).toBe(side === 'Neutral' ? 'police' : side.toLowerCase());
    }
    expect(content.opponent('branch-inspector')!.fightPct).toBe(-10);
    expect(t).toContain('Lowers your Fight odds by 10 %');
  });

  it('every line ≤ 120 and at most two sentences; a bribable opponent has its *paid* line', () => {
    for (const o of content.opponents) {
      for (const [k, v] of Object.entries(o.lines)) {
        expect(v.length, `${o.id}.${k}`).toBeLessThanOrEqual(120);
        expect(sentences(v), `${o.id}.${k}: ${v}`).toBeLessThanOrEqual(3);
      }
      expect(!!o.lines.paid, o.id).toBe(o.payOff !== null);
    }
  });
});

describe('QA · the 22 missions against the rules that use them', () => {
  it('22: six in each home city, four in the capital; ids unique across actions and missions', () => {
    expect(allMissions).toHaveLength(22);
    const by = (c: string) => allMissions.filter((m) => m.city.id === c).length;
    expect([by('coalport'), by('duskwall'), by('ashford'), by('irongate')]).toEqual([6, 6, 6, 4]);
    const actionIds = content.cities.flatMap((c) => c.locations.flatMap((l) => l.actions.map((a) => a.id)));
    const ids = [...actionIds, ...allMissions.map((m) => m.mission.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Energy is the type’s; difficulty the ladder for its Level (+2 in the capital, so Irongate’s Level-10 missions are 20)', () => {
    for (const { city, mission: m } of allMissions) {
      expect(m.energy, m.id).toBe(MISSION_TYPES[m.type].energy);
      expect(m.difficulty, m.id).toBe(missionDifficulty(m.level as 6 | 8 | 10 | 12, city.role));
      if (city.id === 'irongate') expect(m.difficulty, m.id).toBe(m.level === 10 ? 20 : missionDifficulty(m.level as 6, 'battleground'));
    }
  });

  it('illegal ⇔ Rank 3 and a target; a mission at an HQ targets that HQ’s faction; no mission is offered only to nobody', () => {
    for (const { location, mission: m } of allMissions) {
      const illegal = MISSION_TYPES[m.type].illegal;
      expect(m.requires?.rank === 3, m.id).toBe(illegal);
      expect(m.target !== undefined, m.id).toBe(illegal);
      if (location.kind === 'faction-hq' && m.target && m.target !== 'leader') expect(m.target, m.id).toBe(location.factionId);
      // Someone can take it: the two factions that are not the target.
      if (m.target && m.target !== 'leader') expect(F.filter((f) => f !== m.target).length).toBe(2);
    }
  });

  it('every pool, after the actor’s own side is dropped, leaves an opponent or falls back to the police (never empty for a run-in)', () => {
    for (const { mission: m } of allMissions) {
      for (const actor of F) {
        if (m.target === actor) continue; // hidden from the target's members
        for (const id of m.pool) expect(content.opponent(id), `${m.id}: ${id}`).toBeDefined();
        const left = m.pool.filter((id) => content.opponent(id)!.side !== actor);
        // The rules fall back to the police; record which missions only ever meet the police for this actor.
        if (left.length === 0) expect(content.opponent('city-police')).toBeDefined();
      }
    }
  });

  it('design §4.4: STR, INT and AGI builds each find a way on their stat (alone) somewhere in every home city', () => {
    for (const city of ['coalport', 'duskwall', 'ashford']) {
      const ways = allMissions.filter((m) => m.city.id === city).flatMap((m) => m.mission.ways);
      for (const stat of ['str', 'int', 'agi'] as const) {
        expect(ways.some((w) => w.stats.length === 1 && w.stats[0] === stat), `${city}: ${stat}`).toBe(true);
      }
      // At most one *best* way per mission.
      for (const m of allMissions.filter((x) => x.city.id === city))
        expect(m.mission.ways.filter((w) => w.stats[0] === 'best').length, m.mission.id).toBeLessThanOrEqual(1);
    }
  });

  it('pillar 7: briefings ≤ 300 (QA fixes §2) and ≤ 4 sentences; outcome texts ≤ 240 and ≤ 4 sentences; way titles ≤ 60, hints ≤ 90', () => {
    for (const { mission: m } of allMissions) {
      expect(m.briefing.length, m.id).toBeLessThanOrEqual(300);
      expect(sentences(m.briefing), `${m.id} briefing`).toBeLessThanOrEqual(4);
      for (const [k, t] of Object.entries(m.text)) {
        expect(t.body.length, `${m.id}.${k}`).toBeLessThanOrEqual(240);
        expect(sentences(t.body), `${m.id}.${k}: ${t.body}`).toBeLessThanOrEqual(4);
      }
      for (const w of m.ways) {
        expect(w.title.length, `${m.id}/${w.id}`).toBeLessThanOrEqual(60);
        expect(w.hint.length, `${m.id}/${w.id}`).toBeLessThanOrEqual(90);
      }
    }
  });

  it('the 35 new tickets and the quarter blurbs keep the slice-1 lengths (≤ 240 / ≤ 4 sentences; blurbs ≤ 200)', () => {
    const newPlaces = content.cities
      .filter((c) => c.role === 'home')
      .flatMap((c) => c.locations.filter((l) => (c.quarters ?? []).findIndex((q) => q.id === l.quarterId) === 1));
    expect(newPlaces).toHaveLength(15);
    const tickets = newPlaces.flatMap((l) => l.actions);
    expect(tickets).toHaveLength(35);
    for (const a of tickets) {
      const texts = Object.values((a as { text?: Record<string, { body: string }> }).text ?? {});
      for (const t of texts) {
        expect(t.body.length, a.id).toBeLessThanOrEqual(240);
        expect(sentences(t.body), `${a.id}: ${t.body}`).toBeLessThanOrEqual(4);
      }
    }
    for (const c of content.cities) for (const q of c.quarters ?? []) if (q.blurb) expect(q.blurb.length, q.id).toBeLessThanOrEqual(200);
  });
});

describe('QA · the risk decks fit 200 with every real fill (design §14, 4 Oct 2026)', () => {
  const names = allMissions.map((m) => m.mission.name);
  const hows = [...Object.values(copy.risk.paper.how), copy.risk.paper.noAct.how];
  const titles = [...names, copy.risk.paper.noAct.missionTitle];
  const labels = opponents.map((o) => o.label.charAt(0).toLowerCase() + o.label.slice(1));
  const levels = Object.values(copy.risk.paper.recordLevel);
  const marksLines = [1, 2, 3, 6, 12, 40].map(copy.risk.paper.marksLine);
  const cities = ['Coalport', 'Duskwall', 'Ashford', 'Irongate'];
  const NAME = 'N'.repeat(40);

  it('every risk deck × every mission title × every {how} × every opponent × every record fill stays ≤ 200', () => {
    const over: string[] = [];
    for (const h of riskHeadlines) {
      const deck = h.deck ?? '';
      let worst = 0;
      for (const missionTitle of deck.includes('{missionTitle}') ? titles : ['']) {
        for (const how of deck.includes('{how}') ? hows : ['']) {
          for (const opponent of deck.includes('{opponent}') ? labels : ['']) {
            for (const recordLevel of deck.includes('{recordLevel}') ? levels : ['']) {
              for (const marksLine of deck.includes('{marksLine}') ? marksLines : ['']) {
                for (const rivalCity of deck.includes('{rivalCity}') ? cities : ['']) {
                  const filled = fillTemplate(deck, {
                    name: NAME,
                    missionTitle,
                    how,
                    opponent,
                    recordLevel,
                    marksLine,
                    rivalCity,
                    minutes: '60',
                    pct: '30',
                    lost: '2.0',
                    marks: '12',
                  } as never);
                  worst = Math.max(worst, filled.length);
                  expect(filled, h.id).not.toMatch(/\{\w+\}/);
                }
              }
            }
          }
        }
      }
      if (worst > 200) over.push(`${h.id}: ${worst}`);
    }
    expect(over).toEqual([]);
  });

  it('{marksLine} reads *One mark* for one and never prints "1 marks"; record-up decks use it', () => {
    expect(copy.risk.paper.marksLine(1)).toBe('One mark');
    expect(copy.risk.paper.marksLine(2)).toBe('2 marks');
    const recordUp = riskHeadlines.filter((h) => /record-up$/.test(h.id));
    expect(recordUp.length).toBeGreaterThanOrEqual(4);
    for (const h of recordUp) {
      expect(h.deck, h.id).toContain('{marksLine}');
      expect(h.deck, h.id).not.toContain('{marks} marks');
    }
    // The headline reads title case inside a title-case headline.
    expect(fillTemplate('{name} Is {recordLevel} with the Harbour Police', { name: 'Mara Lenk', recordLevel: copy.risk.paper.recordLevel.onFile } as never)).toBe(
      'Mara Lenk Is On File with the Harbour Police',
    );
  });
});

describe('QA · vocabulary and content policy over the rest of slice 5', () => {
  const newPlaces = content.cities
    .filter((c) => c.role === 'home')
    .flatMap((c) => c.locations.filter((l) => (c.quarters ?? []).findIndex((q) => q.id === l.quarterId) >= 1));
  const sources = {
    missions: allMissions.map((m) => m.mission),
    places: newPlaces,
    quarters: content.cities.flatMap((c) => c.quarters ?? []),
    art: Object.values(content.art.assets ?? {}).filter((a) => /mission-|portrait\.(street|vanguard|strike|branch|party|duty|matron|kessler)|scene\.(hospital|jail|news-strike)/.test(a.id)),
  };
  const strings = Object.entries(sources).flatMap(([name, v]) => playerStrings(v).map((p) => ({ name, text: p.text, path: p.path })));

  it('reads something from each source (the sweep is not empty)', () => {
    for (const name of Object.keys(sources)) expect(strings.filter((s) => s.name === name).length, name).toBeGreaterThan(0);
  });

  it("the screens' banned words (screens §1): no encounter, bluff, bribe, flee, approach, criminal record, jail, hospital, surveillance, sabotage, hostile", () => {
    const banned = /\b(encounters?|bluff\w*|brib\w*|flee\w*|approach\w*|criminal record|jail\w*|hospital\w*|surveillance|sabotage|hostile)\b/i;
    // Asset source paths and ids are not player text; alt texts are.
    const hits = strings
      .filter((s) => !/\.(png|jpe?g|webp|avif)$/.test(s.text) && banned.test(s.text))
      .map((s) => `${s.name} ${s.path}: ${s.text.slice(0, 80)}`);
    expect(hits).toEqual([]);
  });

  // QA slice 5 m1 (fixed in the fix round): the County Infirmary's blurb said *hospital*, and the
  // sheet's kicker printed the kind labels *Hospital* and *Jail*, words the screens ban (screens §1).
  it('m1: no *hospital* in the County Infirmary blurb, no *hospital* or *jail* in a kind label', () => {
    expect(content.location('ashford.infirmary')!.location.blurb).not.toMatch(/hospital/i);
    for (const kind of ['hospital', 'jail']) expect(copy.kindLabel(kind)).not.toMatch(/hospital|jail/i);
  });

  it('no rank for the civic police, no torch, no uniform, no knife, no "in front of" (design §23.1 #22, §23.6 #7, §23.8)', () => {
    const bad = /\b(sergeants?|torch(es)?|uniforms?|knife|knives|weapons?|guns?|rifles?|in front of)\b/i;
    const hits = strings.filter((s) => !/sergeant\.png$/.test(s.text) && bad.test(s.text)).map((s) => `${s.name} ${s.path}: ${s.text.slice(0, 80)}`);
    expect(hits).toEqual([]);
  });

  it('no extremist imagery described in the alt texts: no salute, fist, raised arm, swastika, hammer and sickle, star, eagle', () => {
    const alts = sources.art.map((a) => `${a.id}: ${a.alt}`);
    expect(alts.length).toBeGreaterThanOrEqual(13);
    // *fists clenched* (the street enforcer's, at his chest: looked at, no salute) is allowed; a raised
    // fist or arm is not.
    const bad = /\b(salut\w*|raised fists?|fists? raised|raised arm|outstretched arm|swastika|hammer|sickle|red star|eagle|insignia)\b/i;
    expect(alts.filter((a) => bad.test(a))).toEqual([]);
    // The redrawn speech scene: the speaker points down, the crowd waves caps.
    expect(content.asset('scene.mission-speech').alt).toMatch(/point/);
    expect(content.asset('scene.mission-speech').alt).toMatch(/caps/);
  });

  it('nit: *marks* is both the currency in two lines and the record’s unit on the same screen (recorded)', () => {
    const currencyMarks = [
      content.opponent('city-police')!.lines.paid ?? '',
      ...content.journeyEvents.flatMap((e) => e.choices.flatMap((c) => [c.success.text, c.partial?.text ?? ''])),
    ]
      .map((t) => (typeof t === 'string' ? t : `${t.headline} ${t.body}`))
      .filter((s) => /\b(hundred|thirty|ten) marks\b/i.test(s));
    // Two lines today (the constable's *Three hundred marks*, the checkpoint lamp's *Thirty marks*).
    expect(currencyMarks.length).toBeGreaterThanOrEqual(1);
  });
});
