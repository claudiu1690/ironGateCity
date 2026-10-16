// Slice 8, phase C lane Q (screens §6–§10, §12): the Dossier, the exposé, patrons, the home, Legacy
// and the paper's life rows. One barrel, so the package index takes one line.
export {
  CaseFileCard,
  ClockGlyph,
  DossierChips,
  DossierHeader,
  DossierList,
  EntryRow,
  ExposeStory,
  ExposeTicket,
  InformantRow,
  NameCard,
  StationSellCard,
  StationSellSheet,
} from './Dossier';
export type { DossierTabId } from './Dossier';
export { PatronCard, PatronClock, RequestRow } from './Patron';
export type { PatronCardProps } from './Patron';
export { HomeCard, LegacyBlock, MeBlock } from './LifeMe';
export { ClockRow, ExposeFrontPage, LifeDeskRows, LifeLetters, PublicExposeLine } from './LifePaper';
