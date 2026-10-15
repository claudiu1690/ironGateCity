import type { GameContent } from '@irongate/content';
import { Contribution, FactionState } from '@irongate/db';
import type { CharacterDoc, FactionStateDoc } from '@irongate/db';
import { fillTemplate, itemSpec, pushMet, standingOn } from '@irongate/rules';
import type { DayKey, FactionId, LiveHeadline, TargetBarView } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { orderText, orderVars, pushPlaceName, toOrdersState } from './views';

/**
 * Slice 7 (docs/tech/slice-7.md §11.1–§11.2; design §4.2, §11.2; ADR 0046): the Chair's push as the
 * member reads it, live: `hl.*.pushed` (*The Chair Wants Eastside*) while today's orders hold the
 * pushed item and it counts (the member can reach the place: Level 10+), and the orders' target bar
 * (`OrdersView.target`, the party's attempts at the place today against the target).
 */

/** The party's attempts at the pushed place on `day`: every member's own `push|{f}|{day}` row summed (ADR 0046). */
export async function pushCountOf(f: FactionId, day: DayKey, session: ClientSession | null = null): Promise<number> {
  const agg = Contribution.aggregate<{ n: number }>([
    { $match: { scope: `push|${f}|${day}` } },
    { $group: { _id: null, n: { $sum: '$amount' } } },
  ]);
  const rows = await (session ? agg.session(session) : agg);
  return rows[0]?.n ?? 0;
}

/**
 * `OrdersView.target` (tech design §11.1 *Party orders*, screens §5.1 item 5): while today's standing
 * orders carry a push and the member's orders today hold the pushed item (below Level 10 too: the bar
 * is the party's), the live count, the target, *doors* and the place. Null otherwise (no push, the
 * welcome or crisis set, the orders off after an arrest).
 */
export async function ordersTargetOf(
  content: GameContent,
  c: CharacterDoc,
  today: DayKey,
  faction?: FactionStateDoc | null,
): Promise<TargetBarView | null> {
  if (c.orders?.day !== today || c.orders.off) return null;
  if (!toOrdersState(c.orders).items.some((i) => i.push)) return null;
  const fs = faction === undefined ? await FactionState.findById(c.factionId).lean<FactionStateDoc>() : faction;
  const push = fs ? standingOn(fs.orders, today)?.push : null;
  if (!push) return null;
  const count = await pushCountOf(c.factionId, today);
  return { count, target: push.target, unit: 'doors', place: pushPlaceName(content, push), met: pushMet(count, push.target) };
}

/** Today's pushed item, when it counts, with the standing orders' push (its target) behind it. */
async function pushToday(c: CharacterDoc, today: DayKey, faction?: FactionStateDoc | null) {
  if (c.orders?.day !== today || c.orders.off) return null;
  const state = toOrdersState(c.orders);
  const item = state.items.find((i) => i.push?.counts);
  if (!item?.push) return null;
  const fs = faction === undefined ? await FactionState.findById(c.factionId).lean<FactionStateDoc>() : faction;
  const standing = fs ? standingOn(fs.orders, today) : null;
  if (!standing?.push) return null;
  return { item, push: item.push, target: standing.push.target, standing: standing.push };
}

/** `hl.*.pushed` in the reader's paper (priority 3, personal), or null. */
export async function pushedHeadline(
  content: GameContent,
  c: CharacterDoc,
  paperCityId: string,
  today: DayKey,
  faction?: FactionStateDoc | null,
): Promise<LiveHeadline | null> {
  const template = content.headlinesOf(paperCityId).find((t) => t.when.some((w) => w.kind === 'pushed'));
  if (!template) return null;
  const p = await pushToday(c, today, faction);
  if (!p) return null;
  const t = content.ordersOf(c.factionId).find((x) => x.id === p.item.templateId);
  if (!t) return null;
  const place = pushPlaceName(content, p.push);
  // The order's title in a sentence: its `{place}` named, its count (*· 3*) left to the orders list.
  const orderTitle = orderText(itemSpec(p.item, t).title, orderVars(content, c, null))
    .replaceAll('{place}', place)
    .replace(/\s*·\s*\d+$/, '');
  const vars = { place, orderTitle, target: String(p.target) };
  const fill = (x: string) => fillTemplate(x, vars as Parameters<typeof fillTemplate>[1]);
  return {
    templateId: template.id,
    group: template.group,
    priority: template.priority,
    headline: fill(template.headline),
    ...(template.deck ? { deck: fill(template.deck) } : {}),
  };
}
