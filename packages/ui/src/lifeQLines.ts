import { copy } from '@irongate/content/copy';
import type { ActionResult, PoliticalResult } from '@irongate/rules';
import type { StampTone } from './components/Stamp';

/**
 * Slice 8 phase C, lane Q (tech design §10.1–§10.3): the Dossier's, Legacy's, a patron's Favour and
 * the Requests' knock-on lines, all worded by the server. On a political modal they follow the life
 * act's own lines; on an action's they are `life:*` lines in the knock-on list.
 */
export function lifeQPoliticalLines(r: PoliticalResult): Array<{ id: string; text: string }> {
  const k = r.knockOns;
  const out: Array<{ id: string; text: string }> = [];
  if (k.dossier) out.push({ id: 'dossier', text: k.dossier.line });
  if (k.legacy) out.push({ id: 'legacy', text: k.legacy.line });
  if (k.favour) out.push({ id: 'favour', text: k.favour.line });
  (k.requests ?? []).forEach((q, i) => out.push({ id: `request-${i}`, text: q.line }));
  return out;
}

/** An action's lane-Q lines, by id (`life:expose:0`, `life:dossier:1`, `life:favour`, `life:request:0`). */
export function lifeQActionLines(r: ActionResult): Array<{ id: string; text: string }> {
  const e = r.effects;
  const out: Array<{ id: string; text: string }> = [];
  // The exposé's lines carry its Requests already (the story modal, tech design §10.2).
  (e.expose?.lines ?? []).forEach((text, i) => out.push({ id: `life:expose:${i}`, text }));
  (e.dossier ?? []).forEach((d, i) => out.push({ id: `life:dossier:${i}`, text: d.line }));
  if (e.favour) out.push({ id: 'life:favour', text: e.favour.line });
  if (!e.expose) (e.requests ?? []).forEach((q, i) => out.push({ id: `life:request:${i}`, text: q.line }));
  return out;
}

/** Screens §7: the exposé's stamp, *Printed* / *Page three* / *Spiked*. */
export function exposeStamp(r: ActionResult): { label: string; tone: StampTone } | null {
  const x = r.effects.expose;
  if (r.kind !== 'expose' || !x) return null;
  return {
    label: copy.life.expose.stamps[x.outcome],
    tone: x.outcome === 'success' ? 'success' : x.outcome === 'partial' ? 'partial' : 'failure',
  };
}
