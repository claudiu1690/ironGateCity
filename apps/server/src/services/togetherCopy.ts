import { copy } from '@irongate/content/copy';

/**
 * Slice 6 (tech design §10.2, design §11): the server's player-facing strings for the together
 * modals, from `copy.together.modal.*` and `copy.together.event.next` (the game designer's text,
 * 55d14b7). Templates carry `{placeholders}`; `{at}` and `{until}` are left for the client (the
 * player's clock), as every PoliticalResult does. Chat's system lines are worded by the client from
 * their kind and payload (`copy.together.system.*`).
 */

type Vars = Record<string, string | number>;

export const fill = (template: string, vars: Vars): string =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

const m = copy.together.modal;

const TEXT = {
  'modal.hand': m.hand,
  'modal.call.stamp': m.call.stamp,
  'modal.call.headline': m.call.headline,
  'modal.call.body': m.call.body,
  'modal.call.next': m.call.next,
  'modal.signUp.stamp': m.signUp.stamp,
  'modal.signUp.headline': m.signUp.headline,
  'modal.signUp.body': m.signUp.body,
  'modal.signUp.next': m.signUp.next,
  'modal.calledOff.stamp': m.calledOff.stamp,
  'modal.calledOff.headline': m.calledOff.headline,
  'modal.calledOff.body': m.calledOff.body,
  'modal.calledOff.next': m.calledOff.next,
  'modal.bailPosted.stamp': m.bailPosted.stamp,
  'modal.bailPosted.headline': m.bailPosted.headline,
  'modal.bailPosted.body': m.bailPosted.body,
  'modal.bailPosted.next': m.bailPosted.next,
  'modal.visit.stamp': m.visit.stamp,
  'modal.visit.headline': m.visit.headline,
  'modal.visit.body': m.visit.body,
  'modal.visit.bodyGrapes': m.visit.bodyGrapes,
  'modal.visit.next': m.visit.next,
  'modal.releasedBail.headline': m.releasedBail.headline,
  'modal.releasedBail.body': m.releasedBail.body,
  'event.next': copy.together.event.next,
} as const;

export type TogetherKey = keyof typeof TEXT;

/** A together string by key, with its `{placeholders}` filled. */
export const t6 = (key: TogetherKey, vars: Vars = {}): string => fill(TEXT[key], vars);
