/**
 * Short UI copy for states the action text doesn't cover (designer answer, slice-1 content §12.1).
 * British English, no exclamation marks. Times are formatted by the caller in the player's local
 * clock ("UTC" never appears on a button). Plain data: safe to import in the client.
 */
export const copy = {
  needsEnergy: (cost: number, readyAt: string) => `Needs ${cost} Energy · ready at ${readyAt}`,
  energyFull: (rested: number) => `Rested ${rested}`,
  energyFullAt: (at: string) => `full at ${at}`,
  x3Needs: (cost: number) => `×3 needs ${cost} Energy`,
  shiftWorked: (nextAt: string) => `Shift worked · next at ${nextAt}`,
  shiftNotYourJob: 'Not your job · see the Jobs card',
  shiftNoJob: 'No job yet · take one below',
  takeJob: 'Take the job',
  jobPayLine: (pay: number) => `${pay} a day · half at midnight, half for the shift`,
  switchJob: (energy: number) => `Switch · ${energy} Energy · streak resets`,
  yourJob: (streak: number, sickDaysLeft: number) =>
    `Your job · streak ${streak} ${streak === 1 ? 'day' : 'days'} · ${sickDaysLeft} sick ${sickDaysLeft === 1 ? 'day' : 'days'} left`,
  /** "Needs Level 3, AGI 10": only the unmet requirements, level first. */
  jobNeeds: (parts: string[]) => `Needs ${parts.join(', ')}`,
  jobTaken: (firstPayAt: string) => `Taken · first half pay at ${firstPayAt}`,
  jobTakenOrder: (fxp: number) => `Taken · party order complete: +${fxp} FXP`,
  jobSwitched: (firstPayAt: string) => `Switched · streak reset · first half pay at ${firstPayAt}`,
  orderTag: (progress: number, target: number, pct: number) =>
    `Party order ${progress} / ${target} · +${pct} % FXP`,
  orderDone: 'Order done',
  allOrdersDone: (pc: number) => `All orders carried out · +${pc} PC`,
  pointsToPlace: (n: number) => `${n} ${n === 1 ? 'point' : 'points'} to place`,
  levelPointsToPlace: (level: number, n: number) =>
    `Level ${level} · ${n} stat ${n === 1 ? 'point' : 'points'} to place`,
  statButton: (stat: string, from: number) => `${stat} ${from} → ${from + 1}`,
  levelUpLine: (from: number, to: number, points: number) =>
    to - from > 1 ? `Levels ${from + 1}–${to} · ${points} points to place` : `Level ${to} · place your point`,
  standingUp: (city: string, name: string, bonus: number) => `${city}: ${name} · actions here +${bonus} %`,
  orderComplete: (fxp: number) => `Party order complete: +${fxp} FXP`,
  later: 'Later',
  // Not in the §12.1 table: the out-of-Energy card and the Today strip (tech design §12.2).
  outOfEnergy: 'Out of Energy',
  outOfEnergyRegen: (fullAt: string) => `+5 every 10 min · full at ${fullAt}`,
  outOfEnergyRested: "Rested banks once you're full",
  waitingForYou: 'Waiting for you',
  toTheCity: 'To the city',
  paperIsIn: (paper: string) => `${paper} is in`,
} as const;

export type Copy = typeof copy;
