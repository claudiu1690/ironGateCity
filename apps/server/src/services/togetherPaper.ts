import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { EVENT_IN_PRINT_NAMES } from '@irongate/content';
import { CampaignEvent } from '@irongate/db';
import type { CampaignEventDoc, CharacterDoc } from '@irongate/db';
import { dayKey, fillTemplate } from '@irongate/rules';
import type { EventRowView, LiveHeadline, PaperViewV6 } from '@irongate/rules';
import { ensureFixtures, typeOf, venueOfEvent } from './eventPlace';
import { callerOf, signupLines } from './eventViews';
import { residenceCityId } from './residence';
import { t6 } from './togetherCopy';

/**
 * Slice 6 (tech design §11.1–§11.2): the paper's live event parts: the *Events* rows (the faction's
 * open events in the residence city, the fixture first; `ensureFixtures` first), the desk's *Signed
 * up* row, and `event-today` (live, selected at read: `isPoliticalTemplate` does not know it).
 */

/** The In Print event headlines, by id (design §10; `EVENT_IN_PRINT_NAMES`). */
export const isEventInPrint = (templateId: string): boolean =>
  (EVENT_IN_PRINT_NAMES as readonly string[]).some((n) => templateId.endsWith(`.${n}`));

export async function togetherPaper(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  i: { firstEdition: boolean; paperCityId: string },
): Promise<{ parts: PaperViewV6; live: LiveHeadline[] }> {
  const today = dayKey(now);
  const cityId = residenceCityId(c);
  await ensureFixtures(content, cityId, today);
  const open = await CampaignEvent.find({
    factionId: c.factionId,
    cityId,
    status: 'open',
    startsAt: { $gt: new Date(now) },
  })
    .sort({ dayIndex: 1, startsAt: 1 })
    .lean<CampaignEventDoc[]>();
  const fixtureFirst = [...open].sort((a, b) => Number(b.kind === 'fixture') - Number(a.kind === 'fixture'));
  const youOn = (ev: CampaignEventDoc) => {
    const type = typeOf(content, ev.typeId);
    const r = ev.roles.find((x) => x.holder?.characterId.equals(c._id));
    if (r) return { roleName: type.roles.find((x) => x.id === r.roleId)?.name ?? r.roleId };
    return ev.hands.some((h) => h.characterId.equals(c._id)) ? { roleName: t6('modal.hand') } : null;
  };
  const events: EventRowView[] = fixtureFirst.map((ev) => ({
    eventId: ev._id.toHexString(),
    name: typeOf(content, ev.typeId).name,
    venueName: venueOfEvent(content, ev).location.name,
    startsAt: ev.startsAt.getTime(),
    calledBy: callerOf(content, ev),
    you: youOn(ev),
    joinAsHand: i.firstEdition,
  }));
  const signedUp = (await signupLines(content, c)).map((x) => ({
    eventName: x.eventName,
    venueName: x.venueName,
    startsAt: x.startsAt,
    roleName: x.roleName,
  }));
  const live: LiveHeadline[] = [];
  const first = fixtureFirst[0];
  const template = content.headlinesOf(i.paperCityId).find((t) => t.when.some((w) => w.kind === 'eventOpenToday'));
  if (first && template) {
    const type = typeOf(content, first.typeId);
    const vars: Record<string, string> = {
      event: type.runningName,
      venue: venueOfEvent(content, first).location.name,
      caller: callerOf(content, first).name,
      open: String(first.roles.filter((r) => r.holder === null).length),
      roles: String(first.roles.length),
      district: first.districtId ? (content.district(first.districtId)?.quarter.name ?? '') : '',
      // `{time}` is a time token (the client's clock); the fixture settles at *midnight*.
      ...(first.kind === 'fixture' ? { time: copy.together.paper.midnight } : {}),
    };
    const fill = (t: string) => fillTemplate(t, vars as Parameters<typeof fillTemplate>[1]);
    live.push({
      templateId: template.id,
      group: template.group,
      priority: template.priority,
      headline: fill(template.headline),
      ...(template.deck ? { deck: fill(template.deck) } : {}),
      ...(first.kind === 'fixture' ? {} : { until: first.startsAt.getTime() }),
    });
  }
  return { parts: { events, signedUp }, live };
}
