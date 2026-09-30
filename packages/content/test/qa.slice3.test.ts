/**
 * QA (slice 3): the political copy rendered at its longest, the NPC standing labels the ballot
 * derives (design §17 Q4), chapter 2's numbers against the GDD text (§17.1), and a slice-3 sweep
 * for war framing and real-world echoes beyond the slice-2 checklist (CLAUDE.md rules 2 and 6).
 */
import { isPoliticalTemplate, standingView } from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import GDD from '../../../docs/GDD.md?raw';
import { copy, loadContent } from '../src';

const content = loadContent();
const LONGEST: Record<string, string> = {
  name: 'N'.repeat(40), // NAME.max (slice-2 §14.2)
  city: 'Coalport',
  paper: 'the Sentinel',
  ordinal: 'seventh',
  votes: '999',
  margin: '99',
  winner: 'Marquardt',
  last: 'Margarethe Vogel',
  voted: 'Margarethe Vogel',
  turnout: '999 of 999',
  npcSeats: '7',
  ordinance: 'Public Meetings Order',
  endorsements: '12',
  n: '12',
  weekday: 'Wednesday',
  countDay: 'Wednesday',
  until: 'Wednesday 01:00',
  at: '01:00 on Wednesday',
};
const render = (t: string, line = '') =>
  t.replace(/\{([a-zA-Z]+)\}/g, (_, k: string) => (k === 'ordinanceLine' ? line : (LONGEST[k] ?? `{${k}}`)));
const longestLine = content.ordinancesMenu().reduce((a, o) => (o.line.length > a.length ? o.line : a), '');
const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean).length;

describe('QA · political copy at its longest (design §8, §17.3)', () => {
  it('every political headline deck stays within 200 characters with the longest values', () => {
    const decks = content.headlines.filter(
      (h) => h.id.includes('.') && h.deck && /\{/.test(h.deck + h.headline),
    );
    const over = decks
      .map((h) => ({ id: h.id, n: render(h.deck!, longestLine).length }))
      .filter((x) => x.n > 200);
    expect(over).toEqual([]);
  });

  it('the six result bodies stay within 240 characters and four sentences', () => {
    for (const [act, t] of Object.entries(content.politics.results)) {
      const body = render(t.body, longestLine);
      expect(body.length, act).toBeLessThanOrEqual(240);
      expect(sentences(body), act).toBeLessThanOrEqual(4);
    }
  });

  it('no text leaves a placeholder the server does not know', () => {
    const known = new Set([...Object.keys(LONGEST), 'ordinanceLine']);
    const texts = [
      ...content.headlines.filter(isPoliticalTemplate).map((h) => [h.id, `${h.headline} ${h.deck ?? ''}`]),
      ...Object.entries(content.politics.results).map(([a, t]) => [a, `${t.headline} ${t.body}`]),
    ];
    expect(texts.length).toBeGreaterThan(50);
    for (const [id, t] of texts)
      for (const m of t!.matchAll(/\{([a-zA-Z]+)\}/g))
        expect(known.has(m[1]!), `${id}: {${m[1]}}`).toBe(true);
  });
});

describe('QA · NPC marking (GDD §15.10, design §17 Q4)', () => {
  it('the top three of every slate read One of Us, the other six Trusted', () => {
    for (const city of content.councilCities()) {
      const labels = content
        .slateOf(city.id)
        .map((c) => content.standingNames[standingView(c.profile * 5).level]);
      expect(labels, city.id).toEqual([...Array(3).fill('One of Us'), ...Array(6).fill('Trusted')]);
    }
  });
});

describe('QA · Ambition chapter 2 against GDD §17.1', () => {
  it('difficulty 14, 15 Energy, 300/80/150 · 150/40/75 · 50/0/0, His election bill, after the first ballot', () => {
    const text = GDD.slice(GDD.indexOf('**Chapter 2 of *Finish His Work* (slice 3)'));
    expect(text).toMatch(/\*\*Difficulty 14, 15 Energy\*\*/);
    expect(text).toMatch(
      /Success \*\*300 XP \/ 80 FXP \/ 150 Iron\*\*, Partial \*\*150 \/ 40 \/ 75\*\*, Failure \*\*50 \/ 0 \/ 0\*\*/,
    );
    const a = content.ambition('finish-his-work');
    const ch = a!.chapters.find((c) => c.n === 2)!;
    expect(ch.story!.check.difficulty).toBe(14);
    expect(ch.story!.check.energy).toBe(15);
    expect(ch.story!.rewards).toEqual({
      success: { xp: 300, fxp: 80, iron: 150 },
      partial: { xp: 150, fxp: 40, iron: 75 },
      failure: { xp: 50, fxp: 0, iron: 0 },
    });
    expect(ch.requires).toMatchObject({ ballotCast: true });
    expect(content.item(ch.story!.keepsake!)?.name).toBe('His election bill');
    expect(ch.story!.letterFrom).toBe('From the back of the ward book');
  });
});

describe('QA · slice-3 copy: campaign vocabulary, no war framing, no real-world echoes', () => {
  const slice3 = JSON.stringify([
    content.ordinances,
    content.candidates,
    content.politics,
    content.headlines.filter((h) =>
      /seat|filed|ballot|voted|moved|council|count|polls|nominations|ordinance|stands-firm/.test(h.id),
    ),
    content.factions.map((f) => [f.platforms, f.branchMotion]),
    content.ambition('finish-his-work')!.chapters.find((c) => c.n === 2),
    Object.values(copy)
      .filter((v) => typeof v === 'string')
      .join(' '),
  ]).replace(/"[a-z0-9_]+([.-][a-z0-9_]+)+"/gi, '"[id]"');

  it('none of: battle, fight, victory, defeat, enemy, crush, smash, march, banner, traitor, loyal, purge, revolution, fatherland, leader of the people', () => {
    const banned =
      /\b(battles?|fight(s|ing)?|victor(y|ies|ious)|defeat(ed|s)?|enem(y|ies)|crush(ed|es)?|smash(ed|es)?|march(ed|es|ing)?|banners?|traitors?|loyal(ty|ists?)?|purges?|revolution(ary)?|fatherland|motherland|homeland|führer|duce|blackshirts?|brownshirts?|soldiers?|troops?|comrades?)\b/gi;
    const hits = [...slice3.matchAll(banned)].map((m) =>
      slice3.slice(Math.max(0, m.index! - 30), m.index! + 30),
    );
    expect(hits).toEqual([]);
  });
});
