/**
 * Review 4 #2 (docs/design/review-4-answers.md §2, §29; GDD §7.1; ADR 0073; tech design
 * docs/tech/review-4.md §4.1, T25): *The Last Train In* word for word against the answers: the three
 * beats, the favours and their orders, the welcome decks, the chapter-1 openers, the art, and the
 * content-policy check of the Vanguard strings.
 */
import { describe, expect, it } from 'vitest';
import ANSWERS from '../../../docs/design/review-4-answers.md?raw';
import { isCheckedAction, isWelcomeAction, loadContent } from '../src';
import { REVIEW4_PROLOGUE_REWORDED } from './review4';

const content = loadContent();
const [platform, suitcase, lining] = content.origin.steps;

function section(start: string, end: string): string {
  const from = ANSWERS.indexOf(start);
  expect(from, start).toBeGreaterThan(-1);
  const to = ANSWERS.indexOf(end, from + 1);
  return ANSWERS.slice(from, to < 0 ? undefined : to);
}
const cells = (line: string) =>
  line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
const plain = (s: string) => s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
/** The answers' wording, or the developer's rewording recorded in `REVIEW4_PROLOGUE_REWORDED`. */
const asBuilt = (s: string) => REVIEW4_PROLOGUE_REWORDED[s] ?? s;

describe('beat 1, the platform (answers §2.3)', () => {
  const sec = section('### 2.3 Beat 1', '### 2.4');

  it('kicker, narrative, art, the note; no step portrait', () => {
    expect(platform.id).toBe('origin.step-platform');
    expect(sec).toContain(`kicker ***${platform.kicker}***`);
    expect(sec).toContain(`*${platform.narrative}*`);
    expect(platform.art).toBe('scene.station');
    expect(platform.portrait).toBeNull();
    expect(sec).toContain(`*${platform.note}*`);
  });

  it('the three rows: ask, two lines, portrait, the confirm and the echo, word for word', () => {
    const rows = sec
      .split('\n')
      .filter((l) => /^\| `(holm|stahl|grey)` \|/.test(l))
      .map(cells);
    expect(rows).toHaveLength(3);
    const answers = platform.questions[0].answers;
    rows.forEach(([id, ask, line1, line2], i) => {
      const a = answers[i]!;
      expect(a.id).toBe(plain(id!));
      expect(a.text).toBe(plain(ask!).replace(/[“”]/g, '"'));
      expect(a.lines).toEqual([line1, line2]);
      expect(a.portrait).toBe(`portrait.${a.id}`);
      expect(sec).toContain(`***${a.confirm}***`);
      expect(sec).toContain(`*${a.echo}*`);
    });
  });
});

describe('beat 2, the suitcase (answers §2.4)', () => {
  const sec = section('### 2.4 Beat 2', '### 2.5');

  it('kicker and narrative with the placeholders for Holm, She and the city; the helper beside it', () => {
    const designed = (s: string) =>
      s.replace('{helper}', '{Holm}').replace('{helperPronoun}', '{She}').replace('{city}', '{City}');
    expect(sec).toContain(`kicker ***${designed(suitcase.kicker)}***`);
    expect(sec).toContain(`*${designed(suitcase.narrative)}*`);
    expect(suitcase.art).toBe('scene.train-compartment');
    expect(suitcase.portrait).toBe('helper');
  });

  it('three answers with their +6 / +1 and echo lines', () => {
    const rows = sec
      .split('\n')
      .filter((l) => /^\| `(tools|books|light)` \|/.test(l))
      .map(cells);
    expect(rows).toHaveLength(3);
    rows.forEach(([id, text, effect, echo], i) => {
      const a = suitcase.questions[0].answers[i]!;
      expect([a.id, a.text, a.echo]).toEqual([plain(id!), plain(text!), echo]);
      const want = [...effect!.matchAll(/\+(\d) (STR|INT|AGI)/g)].map((m) => [m[2]!.toLowerCase(), Number(m[1])]);
      expect(a.effects.map((e) => (e.kind === 'stat' ? [e.stat, e.value] : [e.kind]))).toEqual(want);
    });
  });
});

describe('beat 3, the lining (answers §2.5)', () => {
  const sec = section('### 2.5 Beat 3', '### 2.6');

  it('kicker, narrative, no portrait; three keepsakes with their hints, Ambitions and the coat', () => {
    expect(sec).toContain(`kicker ***${lining.kicker}***`);
    expect(sec).toContain(`*${lining.narrative}*`);
    expect(lining.portrait).toBeNull();
    const rows = sec
      .split('\n')
      .filter((l) => /^\| `(ward-book|letter|marker)` \|/.test(l))
      .map(cells);
    expect(rows).toHaveLength(3);
    rows.forEach(([id, text, hint, effect], i) => {
      const a = lining.questions[0].answers[i]!;
      expect([a.id, a.text, a.hint]).toEqual([plain(id!), plain(text!), plain(hint!)]);
      const ambition = effect!.match(/ambition: ([a-z-]+)/)![1];
      expect(a.effects).toEqual([
        { kind: 'ambition', ambitionId: ambition },
        { kind: 'wear', itemId: 'outfit.fathers-coat' },
      ]);
    });
  });

  it('the reference recruit answers Holm · books · his ward book (§2.7)', () => {
    expect(content.origin.reference).toEqual([
      { questionId: 'origin.platform', answerId: 'holm' },
      { questionId: 'origin.suitcase', answerId: 'books' },
      { questionId: 'origin.lining', answerId: 'ward-book' },
    ]);
  });
});

describe('the favour (answers §2.6, §29.2)', () => {
  const sec = section('### 2.6 The favour', '### 2.7');
  const heads = section('### 29.2 Q3', '### 29.3');
  const rows = sec
    .split('\n')
    .filter((l) => /^\| (Collective|Vanguard|Alliance) \|/.test(l))
    .map(cells);
  const FAVOURS = [
    ['collective', 'coalport.union-hall', 'coalport.union-hall.favour', 'dir.welcome-b'],
    ['vanguard', 'duskwall.beacon-house', 'duskwall.beacon-house.favour', 'dir.v.welcome-b'],
    ['alliance', 'ashford.assembly-rooms', 'ashford.assembly-rooms.favour', 'dir.a.welcome-b'],
  ] as const;

  it('three favours: first on the HQ’s sheet, a council session at 10 Energy, once only, word for word', () => {
    expect(rows).toHaveLength(3);
    FAVOURS.forEach(([factionId, locationId, actionId, orderId], i) => {
      const [, order, title, success, partial] = rows[i]!;
      const found = content.action(actionId)!;
      expect(found.location.id).toBe(locationId);
      expect(found.location.actions[0]!.id).toBe(actionId);
      const a = found.action;
      expect(isWelcomeAction(a)).toBe(true);
      if (!isCheckedAction(a)) throw new Error('a favour is a checked action');
      expect([a.name, a.type, a.stats, a.energy, a.givesFxp, a.givesOpinion]).toEqual([
        plain(title!),
        'council',
        ['best'],
        10,
        true,
        false,
      ]);
      expect(a.text.success.body).toBe(asBuilt(success!));
      expect(a.text.partial.body).toBe(asBuilt(partial!));
      const headline = heads.split('\n').find((l) => l.includes(`\`${actionId}\``))!;
      const [, s, p] = cells(headline);
      expect([a.text.success.headline, a.text.partial.headline]).toEqual([plain(s!), plain(p!)]);
      // The order: slot B of the welcome set, title and line word for word (the signature is the
      // panel's own, so the line leaves it off).
      const t = content.orderTemplates.find((x) => x.id === orderId)!;
      const [orderTitle, orderLine] = order!.split(' · ');
      expect([t.factionId, t.slot, t.use, t.match, t.target, t.counts]).toEqual([
        factionId,
        'B',
        'welcome',
        { actionIds: [actionId] },
        1,
        'attempts',
      ]);
      expect(t.title).toBe(plain(orderTitle!));
      expect(`${t.line} ${content.faction(factionId).secretary.signature}`).toBe(plain(orderLine!));
      expect(content.faction(factionId).welcomeOrders.B).toBe(orderId);
    });
  });

  it('every favour and origin text is at most 240 characters', () => {
    for (const [, , actionId] of FAVOURS) {
      const a = content.action(actionId)!.action;
      if (!isCheckedAction(a)) continue;
      for (const t of [a.text.success, a.text.partial]) expect(t.body.length).toBeLessThanOrEqual(240);
    }
    for (const step of content.origin.steps) expect(step.narrative.length).toBeLessThanOrEqual(240);
  });
});

describe('the Ambition re-anchored (answers §2.8)', () => {
  const sec = section('### 2.8 The Ambition', '### 2.9');
  it('the three chapter-1 openers word for word', () => {
    for (const amb of content.ambitions) {
      const narrative = amb.chapters[0]!.story!.choose.narrative;
      expect(sec, amb.id).toContain(`*${narrative}*`);
    }
  });
});

describe('art and the people (answers §2.9, §29.3)', () => {
  it('the compartment scene with its alt text; the secretaries carry pronouns', () => {
    const asset = content.asset('scene.train-compartment');
    expect([asset.kind, asset.width, asset.height, asset.source]).toEqual([
      'scene',
      2688,
      1520,
      'mvp/scenes/train-compartment.png',
    ]);
    expect(section('### 29.3', '## Appendix A')).toContain(`*${asset.alt}*`);
    expect(['holm', 'stahl', 'grey'].map((id) => content.npc(id)!.pronoun)).toEqual(['she', 'he', 'he']);
  });
});

describe('content policy (answers §26; content-policy-review.md)', () => {
  it('the Vanguard row and favour carry no uniform, rank of the army, symbol, salute or slogan', () => {
    const stahl = platform.questions[0].answers.find((a) => a.id === 'stahl')!;
    const favour = content.action('duskwall.beacon-house.favour')!.action;
    const words = [
      stahl.text,
      ...(stahl.lines ?? []),
      stahl.confirm,
      stahl.echo,
      favour.name,
      favour.text.success.headline,
      favour.text.success.body,
      ...(isCheckedAction(favour) ? [favour.text.partial.headline, favour.text.partial.body] : []),
    ].join(' ');
    expect(words).not.toMatch(
      /\b(uniforms?|march(es|ing)?|salutes?|soldiers?|veterans?|sergeants?|captains?|banners?|flags?|troops|militia|ex-servicemen|above all|the nation first)\b/i,
    );
  });
});
