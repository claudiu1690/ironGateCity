/**
 * Review 5 phase 10 (docs/design/review-5-answers.md §19; GDD §7.1, §17.1; tech design
 * docs/tech/review-5.md §12, T25): *Coming home* word for word against the answers: the three beats,
 * the favours and their orders, the welcome decks, the post and the Ambitions it sets, the demob
 * suit, the art, the content-policy check of the Vanguard strings, and no *father* anywhere a player
 * reads. Replaces review 4's `review4.prologue.test.ts` (*The Last Train In*); ids are unchanged.
 */
import { describe, expect, it } from 'vitest';
import ANSWERS from '../../../docs/design/review-5-answers.md?raw';
import { isCheckedAction, isWelcomeAction, loadContent, rawContent, sentenceCount } from '../src';
import { copy } from '../src/data/copy';
import { asBuiltDeck, expectChapterRestrung } from './review5';
import { playerStrings } from './vocabulary';

const content = loadContent();
const [counter, kitbag, post] = content.origin.steps;

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
const rowsOf = (sec: string, ids: RegExp) =>
  sec
    .split('\n')
    .filter((l) => ids.test(l))
    .map(cells);

describe('beat 1, the counter (answers §19.2)', () => {
  const sec = section('### 19.2 Beat 1', '### 19.3');

  it('kicker, title, narrative, the note; no step portrait; the demobilisation office’s picture', () => {
    expect(counter.id).toBe('origin.step-platform');
    expect(counter.title).toBe('The counter');
    expect(sec).toContain(`kicker *${counter.kicker}*`);
    expect(sec).toContain(`*${counter.narrative}*`);
    expect(counter.portrait).toBeNull();
    expect(sec).toContain(`*${counter.note}*`);
    // The art note at the end of §19 (8 Oct): the dedicated scene replaces the ministry's stand-in.
    expect(counter.art).toBe('scene.demob-office');
  });

  it('the three rows: ask, two lines, portrait, the confirm and the echo, word for word', () => {
    const rows = rowsOf(sec, /^\| `(holm|stahl|grey)` \|/);
    expect(rows).toHaveLength(3);
    const answers = counter.questions[0].answers;
    rows.forEach(([id, ask, line1, line2], i) => {
      const a = answers[i]!;
      expect(a.id).toBe(plain(id!));
      expect(a.text).toBe(plain(ask!));
      expect(a.lines).toEqual([line1, line2]);
      expect(a.portrait).toBe(`portrait.${a.id}`);
      expect(sec).toContain(`***${a.confirm}***`);
      expect(sec).toContain(`*${a.echo}*`);
    });
    expect(answers.map((a) => a.confirm)).toEqual([
      "Go for the work · the six o'clock to Coalport",
      "Go for the stamp · the six o'clock to Duskwall",
      "Go for the flat · the six o'clock to Ashford",
    ]);
    expect(answers.map((a) => a.echo)).toEqual([
      'You went for the work.',
      'You went for the stamp.',
      'You went for the flat.',
    ]);
  });

  it('the problem you chase is your party: one faction each, the secretary as the person', () => {
    expect(counter.questions[0].answers.map((a) => a.effects)).toEqual([
      [{ kind: 'faction', factionId: 'collective', person: 'holm' }],
      [{ kind: 'faction', factionId: 'vanguard', person: 'stahl' }],
      [{ kind: 'faction', factionId: 'alliance', person: 'grey' }],
    ]);
  });
});

describe('beat 2, the kitbag (answers §19.3)', () => {
  const sec = section('### 19.3 Beat 2', '### 19.4');

  it('kicker and narrative with the placeholders; the helper beside it; the compartment', () => {
    expect([kitbag.id, kitbag.title]).toEqual(['origin.step-suitcase', 'The kitbag']);
    expect(sec).toContain(`kicker *${kitbag.kicker}*`);
    expect(sec).toContain(`*${kitbag.narrative}*`);
    expect(kitbag.art).toBe('scene.train-compartment');
    expect(kitbag.portrait).toBe('helper');
  });

  it('three answers with their +6 / +1 and echo lines', () => {
    const rows = rowsOf(sec, /^\| `(tools|books|light)` \|/);
    expect(rows).toHaveLength(3);
    rows.forEach(([id, text, effect, echo], i) => {
      const a = kitbag.questions[0].answers[i]!;
      expect([a.id, a.text, a.echo]).toEqual([plain(id!), plain(text!), echo]);
      const want = [...effect!.matchAll(/\+(\d) (STR|INT|AGI)/g)].map((m) => [m[2]!.toLowerCase(), Number(m[1])]);
      expect(a.effects.map((e) => (e.kind === 'stat' ? [e.stat, e.value] : [e.kind]))).toEqual(want);
    });
  });
});

describe('beat 3, the post (answers §19.4)', () => {
  const sec = section('### 19.4 Beat 3', '### 19.5');

  it('kicker, title, narrative, no portrait; three envelopes with their hints, Ambitions and the suit', () => {
    expect([post.id, post.title]).toEqual(['origin.step-lining', 'The post']);
    expect(sec).toContain(`kicker *${post.kicker}*`);
    expect(sec).toContain(`*${post.narrative}*`);
    expect(post.portrait).toBeNull();
    const rows = rowsOf(sec, /^\| `(ward-book|letter|marker)` \|/);
    expect(rows).toHaveLength(3);
    const ambitions = ['finish-his-work', 'clear-his-name', 'settle-his-debts'];
    rows.forEach(([id, text, hint, sets], i) => {
      const a = post.questions[0].answers[i]!;
      expect([a.id, a.text, a.hint]).toEqual([plain(id!), plain(text!), plain(hint!)]);
      expect(a.effects).toEqual([
        { kind: 'ambition', ambitionId: ambitions[i] },
        { kind: 'wear', itemId: 'outfit.fathers-coat' },
      ]);
      // The Ambition's new title is the first bold-italic name in the row.
      expect(content.ambition(ambitions[i]!)!.title).toBe(sets!.match(/\*\*\*(.+?)\*\*\*/)![1]);
    });
  });

  it('the demob suit: the coat’s id renamed, Tier I, CHA 5, worn by everyone', () => {
    expect(sec).toContain('`outfit.fathers-coat` renamed ***The demob suit*** (Tier I, CHA 5)');
    const suit = content.item('outfit.fathers-coat')!;
    expect([suit.name, suit.slot, suit.tier, suit.cha, suit.keepsake]).toEqual([
      'The demob suit',
      'clothing',
      1,
      5,
      false,
    ]);
  });

  it('the reference recruit answers Holm · books · the unit’s list (§19.6)', () => {
    expect(section('### 19.6', '### 19.7')).toContain('the reference answers (`holm · books · ward-book`)');
    expect(content.origin.reference).toEqual([
      { questionId: 'origin.platform', answerId: 'holm' },
      { questionId: 'origin.suitcase', answerId: 'books' },
      { questionId: 'origin.lining', answerId: 'ward-book' },
    ]);
  });
});

describe('the favours (answers §19.5)', () => {
  const sec = section('### 19.5 The favours', '### 19.6');
  const rows = rowsOf(sec, /^\| (Collective|Vanguard|Alliance) \|/);
  const FAVOURS = [
    ['collective', 'coalport.union-hall', 'coalport.union-hall.favour', 'dir.welcome-b', 'hl.welcome'],
    ['vanguard', 'duskwall.beacon-house', 'duskwall.beacon-house.favour', 'dir.v.welcome-b', 'hl.v.welcome'],
    ['alliance', 'ashford.assembly-rooms', 'ashford.assembly-rooms.favour', 'dir.a.welcome-b', 'hl.a.welcome'],
  ] as const;

  it('three favours: first on the HQ’s sheet, a council session at 10 Energy, once only, word for word', () => {
    expect(rows).toHaveLength(3);
    FAVOURS.forEach(([factionId, locationId, actionId, orderId], i) => {
      const [, order, ticket, success, partial] = rows[i]!;
      const found = content.action(actionId)!;
      expect(found.location.id).toBe(locationId);
      expect(found.location.actions[0]!.id).toBe(actionId);
      const a = found.action;
      expect(isWelcomeAction(a)).toBe(true);
      if (!isCheckedAction(a)) throw new Error('a favour is a checked action');
      expect([a.name, a.type, a.stats, a.energy, a.givesFxp, a.givesOpinion, a.tier]).toEqual([
        plain(ticket!),
        'council',
        ['best'],
        10,
        true,
        false,
        1,
      ]);
      // Success and Partial: **headline** · body (the body's italics are the paper's emphasis).
      for (const [cell, t] of [
        [success!, a.text.success],
        [partial!, a.text.partial],
      ] as const) {
        const [headline, ...body] = cell.split(' · ');
        expect(t.headline).toBe(plain(headline!));
        expect(t.body).toBe(plain(body.join(' · ')));
      }
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

  it('the three welcome decks: the envelope (§19.10.7), the Energy line, the favour at the HQ as {place}', () => {
    const decks = [...sec.matchAll(/\*…(.+?)\*/g)].map((m) => m[1]!);
    expect(decks).toHaveLength(3);
    const first = section('#### 19.10.7', '\n\nThe rest');
    FAVOURS.forEach(([factionId, , , , headlineId], i) => {
      const h = content.headlines.find((x) => x.id === headlineId)!;
      const designed = decks[i]!.replace(/ at (.+); start there\.$/, ' at {place}; start there.');
      const last = asBuiltDeck(`${designed[0]!.toUpperCase()}${designed.slice(1)}`);
      const opening = content.faction(factionId).secretary.addressedAs;
      const sentence = `Three orders from ${opening} below, and the envelope you opened on the train.`;
      expect(first).toContain(`**${sentence}**`);
      expect(h.deck).toBe(`${sentence} Energy refills on its own, five points every ten minutes. ${last}`);
      // The schema's cap on a deck; printed, the HQ's name adds at most five.
      expect(h.deck!.length).toBeLessThanOrEqual(200);
    });
  });

  it('every favour and beat text keeps the story bounds', () => {
    for (const [, , actionId] of FAVOURS) {
      const a = content.action(actionId)!.action;
      if (!isCheckedAction(a)) continue;
      for (const t of [a.text.success, a.text.partial]) {
        expect(t.body.length).toBeLessThanOrEqual(240);
        expect(sentenceCount(t.body)).toBeLessThanOrEqual(4);
      }
    }
    content.origin.steps.forEach((step, i) => {
      expect(step.narrative.length).toBeLessThanOrEqual(240);
      // The counter's news is three short sentences (*The mill is sold…*): beat 1 may run to five.
      expect(sentenceCount(step.narrative)).toBeLessThanOrEqual(i === 0 ? 5 : 4);
    });
    for (const a of counter.questions[0].answers) expect(a.text.length).toBeLessThanOrEqual(240);
  });
});

describe('the long story re-anchored (answers §19.6, §19.10)', () => {
  it('the three Ambitions’ titles; ids, ladders and teasers kept', () => {
    expect(content.ambitions.map((a) => [a.id, a.title, a.chaptersPlanned])).toEqual([
      ['finish-his-work', 'The Names on the Stone', 12],
      ['clear-his-name', 'Who Sold the Homes', 12],
      ['settle-his-debts', 'The Ration Ledger', 12],
    ]);
    expect(content.chapter('finish-his-work', 3)).toMatchObject({ title: 'The deposit', requires: { rank: 3 } });
    expect(content.chapter('clear-his-name', 2)).toMatchObject({ title: 'The night caretaker', requires: { level: 6 } });
    expect(content.chapter('settle-his-debts', 3)).toMatchObject({ title: 'The collector', requires: { rank: 3 } });
  });

  it.each([
    ['finish-his-work', 1, '19.10.1'],
    ['finish-his-work', 2, '19.10.2'],
    ['clear-his-name', 1, '19.10.3'],
    ['settle-his-debts', 1, '19.10.4'],
    ['settle-his-debts', 2, '19.10.5'],
  ] as const)('%s chapter %i: every string word for word against §%s', (id, n, sub) => {
    expectChapterRestrung(content.chapter(id, n), sub);
  });

  it('the suit and the keepsakes carry §19.10.6’s names and notes; the coat picture its alt', () => {
    const sec = section('#### 19.10.6', '#### 19.10.7');
    const rows = rowsOf(sec, /^\| `(outfit|keep)\./);
    expect(rows).toHaveLength(7);
    for (const [id, name, note] of rows) {
      const item = content.item(plain(id!).split(' ')[0]!)!;
      expect([item.name, item.note]).toEqual([name, note]);
    }
    expect(sec).toContain(`**${content.asset('item.winter-coat').alt}**`);
  });
});

describe('art (answers §19.7 and its art note)', () => {
  it('the demobilisation office, with the note’s alt text; the compartment for beats 2 and 3', () => {
    const asset = content.asset('scene.demob-office');
    expect([asset.kind, asset.width, asset.height, asset.source]).toEqual([
      'scene',
      2688,
      1520,
      'mvp/scenes/demob-office.png',
    ]);
    expect(section('**Art, 8 Oct 2026:**', '\n\n')).toContain(`Alt text: *${asset.alt}*`);
    expect([kitbag.art, post.art]).toEqual(['scene.train-compartment', 'scene.train-compartment']);
    expect(['holm', 'stahl', 'grey'].map((id) => content.npc(id)!.pronoun)).toEqual(['she', 'he', 'he']);
  });
});

describe('content policy (answers §19.8; content-policy-review.md §7)', () => {
  it('the Vanguard row and favour are a welfare desk: no uniform, rank, march, symbol or slogan', () => {
    const stahl = counter.questions[0].answers.find((a) => a.id === 'stahl')!;
    const favour = content.action('duskwall.beacon-house.favour')!.action;
    const order = content.orderTemplates.find((x) => x.id === 'dir.v.welcome-b')!;
    const deck = content.headlines.find((x) => x.id === 'hl.v.welcome')!.deck!;
    const words = [
      stahl.text,
      ...(stahl.lines ?? []),
      stahl.confirm,
      stahl.echo,
      favour.name,
      favour.text.success.headline,
      favour.text.success.body,
      ...(isCheckedAction(favour) ? [favour.text.partial.headline, favour.text.partial.body] : []),
      order.title,
      order.line,
      deck,
    ].join(' ');
    expect(words).not.toMatch(
      /\b(uniforms?|march(es|ing)?|salutes?|soldiers?|veterans?|sergeants?|captains?|banners?|flags?|troops|militia|ex-servicemen|patrols?|war|front|above all|the nation first)\b/i,
    );
  });
});

/**
 * §19.9: no player-facing string mentions the father (or *his work*, *his name*, *his debts*, *his
 * coat*, the old Ambitions' titles). The scan is the vocabulary test's walk over the whole content
 * and the UI copy (ids and asset references skipped). The exceptions are deliberate and listed.
 */
describe('no father (answers §19.9; tech design §12)', () => {
  const FATHER = /\bfathers?\b|\bfather's\b|\bhis (coat|work|name|debts|ward book)\b|finish his work|clear his name|settle his debts/i;
  /** Kept on purpose: a yard hand's own father (Ashford's brewery, slice 2), not the player's. */
  const KEPT = [/^cities\[\d+\]\.locations\[\d+\]\.actions\[\d+\]\.text\.partial\.body$/];
  /** Retired pictures of review 4's deathbed scene: catalogued for the build, shown nowhere. */
  const RETIRED_ART = ['portrait.father', 'scene.origin-deathbed'];

  const hits = [
    ...playerStrings(rawContent).map((s) => ({ ...s, source: 'content' })),
    ...playerStrings(copy).map((s) => ({ ...s, source: 'copy' })),
  ].filter((s) => FATHER.test(s.text));

  it('finds none outside the listed exceptions', () => {
    const retiredAlts = new Set(RETIRED_ART.map((id) => content.asset(id).alt));
    const left = hits.filter(
      (h) =>
        !(h.source === 'content' && KEPT.some((k) => k.test(h.path)) && /one says his father's a member/.test(h.text)) &&
        !(h.key === 'alt' && retiredAlts.has(h.text)),
    );
    expect(left.map((h) => `${h.source}:${h.path}: ${h.text}`)).toEqual([]);
  });

  it('the retired pictures are referenced by nothing a player sees', () => {
    const raw = rawContent as Record<string, unknown>;
    const json = JSON.stringify({ ...raw, art: { ...(raw.art as object), assets: [] } });
    for (const id of RETIRED_ART) expect(json, id).not.toContain(`"${id}"`);
  });

  it('the guard catches the old strings', () => {
    for (const bad of [
      "Your father's coat",
      'From your father’s things'.replace('’', "'"),
      'Finish His Work',
      'His ward book',
      'Walk his streets and say whose child you are; his name first',
    ])
      expect(FATHER.test(bad), bad).toBe(true);
  });
});
