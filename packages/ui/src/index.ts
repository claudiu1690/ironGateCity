export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant } from './components/Button';
export {
  CityMap,
  FRAME_PAN_MARGIN,
  FREE_ZOOM_STEP,
  NIGHT_FADE_MS,
  PIN_GAP,
  REST_PAN_MARGIN,
  ZOOM_MS,
  bboxOf,
  NARROW_NAMES,
  contentFor,
  coverRestView,
  coversBox,
  fitPinsView,
  labelSide,
  freePanLimits,
  freeZoomLimits,
  nameHalfWidth,
  namesRestView,
  nativeScale,
  panLimits,
  placeNames,
  restPanLimits,
  restFromView,
  viewFromRest,
  zoomAt,
  zoomScale,
  zoomView,
} from './components/CityMap';
export type {
  CityMapProps,
  MapCover,
  MapHotspot,
  MapInsets,
  MapRect,
  MapView,
  NamePlace,
  NameSpot,
  RestView,
} from './components/CityMap';
export { TileLayer } from './components/TileLayer';
export { TravelPin, travelLabelAbove, travelLabelLeft } from './components/TravelPin';
export type { MapTraveller, TravelPinProps } from './components/TravelPin';
export { CloudLayer } from './components/CloudLayer';
export type { CloudLayerProps } from './components/CloudLayer';
export { CLOUDS, cloudPass, cloudPaths, cloudPlane, spriteCount } from './clouds';
export type { CloudConfig, CloudDepth, CloudDepthName, CloudKind, CloudPath, CloudSprite } from './clouds';
export type { TileLayerProps } from './components/TileLayer';
export {
  TILE_MAX_DPR,
  backdropUrl,
  detailLevelFor,
  levelFor,
  levelGrid,
  levelSize,
  maxLevelFor,
  pyramidFor,
  tileCount,
  tileUrl,
  tilesFor,
} from './tiles';
export type { Tile, TileFormat, TilePyramid, TileSourceLike } from './tiles';
export { FACTION_STYLE, FactionCrest } from './components/FactionCrest';
export type { FactionCrestProps } from './components/FactionCrest';
export { Field } from './components/Field';
export type { FieldProps } from './components/Field';
export { Gauge } from './components/Gauge';
export { ArtPanel, HallHeader, MAP_CROP_W, MapCrop } from './components/HallHeader';
export { PaperSheet } from './components/PaperSheet';
export { RankLadderSheet } from './components/RankLadder';
export type { RankLadderSheetProps } from './components/RankLadder';
export type { ArtPanelProps, HallHeaderProps, MapCropProps } from './components/HallHeader';
export { HelpButton, helpMark, notesFrom, pickNoteAt } from './components/Help';
export type { HelpButtonProps, HelpNote, NoteBox } from './components/Help';
export type { GaugeProps } from './components/Gauge';
export { HudBar } from './components/HudBar';
export type { HudBarProps } from './components/HudBar';
export { DeskList, Masthead, OrdersList, TodayStrip } from './components/Paper';
export type { OrdersListProps } from './components/Paper';
export { OrdersComplete } from './components/OrdersComplete';
export type { OrdersCompleteProps } from './components/OrdersComplete';
export { Picture, artUrl } from './components/Picture';
export type { PictureProps } from './components/Picture';
export { IssueChip, PlacesList } from './components/Places';
export type { PlaceRow, PlacesListProps, WhatsHereBlocks } from './components/Places';
export { Plate } from './components/Plate';
export type { PlateProps } from './components/Plate';
export { ProgressBar } from './components/ProgressBar';
export type { ProgressBarProps } from './components/ProgressBar';
export { ResultModal, ordinanceTagText, stampFor } from './components/ResultModal';
export { CandidateRow, ElectionCard, FrontPage, PersonMark, Slate, electionLines } from './components/Politics';
export type { BallotInline, CandidateRowProps, ElectionCardProps, ElectionLines, SlateProps } from './components/Politics';
export {
  CouncilRows,
  HowTheVoteWorks,
  OrdinanceRow,
  RuleCard,
  RuleCards,
  RuleChip,
  RulePicker,
  StandCard,
  councilRuleNote,
  howWords,
  ruleWinnerLines,
  whoseLine,
} from './components/RuleCard';
export type {
  CouncilRowsProps,
  HowTheVoteWorksProps,
  OrdinanceRowProps,
  RuleCardMode,
  RuleCardProps,
  RuleCardResult,
  RuleCardsProps,
  RuleChipProps,
  RulePickerProps,
  StandCardProps,
} from './components/RuleCard';
export type { JourneyArrivalResult, ResultModalProps } from './components/ResultModal';
export { BottomSheet, JobsCard, LocationSheet, OutOfEnergyCard } from './components/Sheets';
export type {
  BottomSheetProps,
  JobsCardProps,
  LocationLayout,
  LocationSheetProps,
  OutOfEnergyCardProps,
} from './components/Sheets';
export { StatPointsPanel, TabBar } from './components/Shell';
export type { StatPointsPanelProps, TabBarProps, TabId, TabItem } from './components/Shell';
export { Stamp } from './components/Stamp';
// Slice 5 (tech design §12.2).
export {
  MissionBriefing,
  MissionTicket,
  RiskLine,
  WayRow,
  missionLabel,
  missionLockText,
  missionRiskWord,
  riskLineText,
  ticketWay,
} from './components/Missions';
export type { MissionBriefingProps, MissionTicketProps, RiskLineProps, WayRowProps } from './components/Missions';
export {
  EncounterModal,
  EncounterRow,
  HealthBar,
  HeatRow,
  RiskRows,
  RunInBlock,
  fadesOnLine,
  healthNow,
  heatNow,
  heatWord,
  recordText,
  recordWord,
  runInReason,
} from './components/Street';
export type { EncounterModalProps, EncounterRowProps, RiskRowsProps, RunInChoice } from './components/Street';
// Review 5 (answers §8): the infirmary's Treatment card.
export { TreatmentCard } from './components/Treatment';
export type { TreatmentCardProps } from './components/Treatment';
// Review 5 (answers §10.2, ADR 0082): the rival plate's header.
export { PushBar, RivalHeader, pointsWord, rivalHeaderLines } from './components/RivalHeader';
export type { RivalHeaderInput } from './components/RivalHeader';
export { CellsNowCard, HeldScreen, heldVoiceLine, minutesLeft } from './components/Held';
export type { CellsNowCardProps, HeldPending, HeldScreenProps } from './components/Held';
export type { StampProps, StampTone } from './components/Stamp';
export { TYPE_LABEL, Ticket, placeTagText } from './components/Ticket';
export { GroundSash, groundOf } from './components/GroundSash';
export type { Ground, GroundSashProps } from './components/GroundSash';
export {
  DistrictCard,
  DistrictResultTable,
  DistrictSwitcher,
  DistrictsList,
  IssueRow,
  IssuesSection,
  LockMark,
  LodgingsCard,
  OpinionBars,
  PartyRow,
  LockedPinSheet,
  RegisterSheet,
  ResidenceCard,
  Rosette,
  ScoreboardLine,
  ScoreboardTable,
  TramBar,
  comebackLine,
  districtStateWord,
  districtSubtitle,
  formatSwing,
  ordinal,
  residenceLines,
  scoreboardText,
  weekdayOf,
} from './components/Capital';
export type {
  DistrictCardProps,
  DistrictSwitcherProps,
  DistrictsListProps,
  FactionNames,
  IssueRowProps,
  IssuesSectionProps,
  LodgingsCardProps,
  PartyRowProps,
  OpinionBarsProps,
  LockedPinSheetProps,
  RegisterSheetProps,
  ResidenceCardProps,
  TramBarProps,
} from './components/Capital';
export {
  CitiesList,
  CityCard,
  JourneyCard,
  JourneyCardSheet,
  JourneyProgress,
  TrainsCard,
  boardButton,
  choiceLine,
  cityCardNote,
  cityRowLine,
} from './components/Travel';
export type {
  CitiesListProps,
  CityCardProps,
  JourneyCardProps,
  JourneyCardSheetProps,
  JourneyProgressProps,
  TrainsCardProps,
} from './components/Travel';
export type { TicketProps } from './components/Ticket';
export * from './format';
export { bandNote, batchReasons, oddsBand, oddsTag, reasonFor, statLine, statName, ticketOdds } from './odds';
export type { OddsBand, Reason, TrainingPlaces } from './odds';
export { KNOCK_ONS_SHOWN, fitTagCount, howItWent, knockOnLines, rowsReason } from './result';
export type { BatchReasons, HowItWent, KnockOnKey, KnockOnLine } from './result';
export {
  AvatarPicker,
  ItemLine,
  LettersRow,
  STORY_SETTLE_MS,
  StoryScreen,
} from './components/Story';
export type { AvatarPickerProps, StoryScreenProps } from './components/Story';
export { TownHallBlocks, WhatNowCard } from './components/TownHall';
export type { DeskActs, TownHallBlocksProps, WhatNowCardProps } from './components/TownHall';
// Slice 6 (lane A): the Faction tab's strip, the events' cards, page parts, ticket and here-now line.
export { FACTION_TABS, FactionTabs } from './components/FactionTabs';
export type { FactionTab, FactionTabsProps } from './components/FactionTabs';
// Slice 6 (lane B): Members, the profile, favours, the faction scoreboard, chat.
export { FactionScoreboard, FavourSheet, MemberFace, MemberRow, ProfileSheet, favourLabel, memberStatusText } from './components/Members';
export type { FactionScoreboardProps, FavourSheetProps, MemberRowProps, ProfileSheetProps } from './components/Members';
export { ChatLine, ChatPanel, SystemLine, chatLength, systemButtonLabel, systemLineText } from './components/Chat';
export type { ChatPanelProps } from './components/Chat';
export { PaperEvents, SignedUpRows } from './components/PaperEvents';
export type { PaperEventsProps } from './components/PaperEvents';
export { EventCard, EventResultLine, bandStamp, calledByText, eventTagText } from './components/EventCard';
export type { EventCardProps, EventResultLineProps } from './components/EventCard';
export { EventHeader, HandsRow, PaysTiles, RoleRow, RolesKicker, VolunteersNote, roleGateText, roleOdds } from './components/EventPage';
export type { EventHeaderProps, HandsRowProps, PaysTilesProps, RoleRowProps } from './components/EventPage';
export { CallEventSheet, TimeChips, callGuardText } from './components/CallEventSheet';
export type { CallEventSheetProps, TimeChipsProps } from './components/CallEventSheet';
export { EventBody } from './components/EventResult';
export type { EventBodyProps } from './components/EventResult';
export { EventTicket, HereNowLine } from './components/EventTicket';
export type { EventTicketProps, HereNowLineProps } from './components/EventTicket';
