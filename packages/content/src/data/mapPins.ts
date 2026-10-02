import type { MapPins } from '../schemas';

/**
 * Maps v3 §5.4: the survey of the painted art, transcribed from the approved
 * art-direction/maps-v3/pins/pins.json (fractions of each master; quarter = the quarter, or in
 * Irongate the district, it is painted in). **Not game content**: nothing in the server reads it.
 * Its two users are the content test (every location's `map` equals its pin here) and the dev map
 * viewer. A later slice makes a place playable by copying its pin into a new location.
 *
 * The nation's pins are the five cities (id = the city id; quarter 1, the picture has none), on
 * nation-day-9216.png, approved by the user on 2 Oct 2026 (design §5.5, §8 Q1). Slice 4 reads them
 * for the nation screen.
 */
export const mapPins: MapPins = {
  coalport: {
    // Measured on coalport-A-big2.png.
    pins: [
      { id: 'coalport.mill-gate', name: 'Mill Gate', x: 0.75, y: 0.2, quarter: 1 },
      { id: 'coalport.market-row', name: 'Market Row', x: 0.4, y: 0.44, quarter: 1 },
      { id: 'coalport.union-hall', name: 'Union Hall', x: 0.42, y: 0.35, quarter: 1 },
      { id: 'coalport.terraces', name: 'Foundry Row', x: 0.65, y: 0.08, quarter: 1 },
      { id: 'coalport.quays', name: 'Harbour Quays', x: 0.71, y: 0.43, quarter: 1 },
      { id: 'coalport.anchor', name: 'The Anchor', x: 0.62, y: 0.56, quarter: 1 },
      { id: 'coalport.shipyard', name: 'The Shipyard', x: 0.86, y: 0.46, quarter: 2 },
      { id: 'coalport.customs-house', name: 'Customs House', x: 0.66, y: 0.66, quarter: 2 },
      { id: 'coalport.infirmary', name: 'The Infirmary', x: 0.17, y: 0.5, quarter: 2 },
      { id: 'coalport.harbour-police', name: 'Harbour Police', x: 0.56, y: 0.83, quarter: 2 },
      { id: 'coalport.far-bank', name: 'The Far Bank', x: 0.93, y: 0.62, quarter: 2 },
      { id: 'coalport.station', name: 'Coalport Station', x: 0.46, y: 0.62, quarter: 3 },
      { id: 'coalport.coal-yards', name: 'Coal Yards', x: 0.44, y: 0.84, quarter: 3 },
      { id: 'coalport.tram-depot', name: 'Tram Depot', x: 0.29, y: 0.59, quarter: 3 },
      { id: 'coalport.st-barbaras', name: "St Barbara's", x: 0.24, y: 0.27, quarter: 3 },
    ],
  },
  duskwall: {
    // Measured on duskwall-A-big.png.
    pins: [
      { id: 'duskwall.garrison-gate', name: 'Fortress Gate', x: 0.59, y: 0.37, quarter: 1 },
      { id: 'duskwall.quartermaster-market', name: 'Customs Market', x: 0.44, y: 0.53, quarter: 1 },
      { id: 'duskwall.beacon-house', name: 'Beacon House', x: 0.38, y: 0.45, quarter: 1 },
      { id: 'duskwall.archives', name: 'State Archives', x: 0.58, y: 0.12, quarter: 1 },
      { id: 'duskwall.goods-yard', name: 'Goods Yard', x: 0.13, y: 0.85, quarter: 1 },
      { id: 'duskwall.rampart-row', name: 'Rampart Row', x: 0.22, y: 0.38, quarter: 1 },
      { id: 'duskwall.checkpoint', name: 'Frontier Checkpoint', x: 0.8, y: 0.1, quarter: 2 },
      { id: 'duskwall.mountain-inn', name: 'Mountain Inn', x: 0.87, y: 0.04, quarter: 2 },
      { id: 'duskwall.sawmill', name: 'Sawmill', x: 0.88, y: 0.68, quarter: 2 },
      { id: 'duskwall.lock-up', name: 'Lock-up', x: 0.76, y: 0.13, quarter: 2 },
      { id: 'duskwall.infirmary', name: 'Infirmary', x: 0.88, y: 0.4, quarter: 2 },
      { id: 'duskwall.station', name: 'Duskwall Station', x: 0.2, y: 0.73, quarter: 3 },
      { id: 'duskwall.town-square', name: 'Town Square', x: 0.48, y: 0.73, quarter: 3 },
      { id: 'duskwall.signal-lamp', name: 'The Signal Lamp', x: 0.33, y: 0.66, quarter: 3 },
      { id: 'duskwall.brewery', name: 'Brewery', x: 0.1, y: 0.18, quarter: 3 },
    ],
  },
  ashford: {
    // Measured on ashford-A-big.png.
    pins: [
      { id: 'ashford.gazette-house', name: 'Gazette House', x: 0.53, y: 0.47, quarter: 1 },
      { id: 'ashford.assembly-rooms', name: 'Assembly Rooms', x: 0.69, y: 0.27, quarter: 1 },
      { id: 'ashford.university', name: 'University Quad', x: 0.49, y: 0.25, quarter: 1 },
      { id: 'ashford.courts', name: 'The Courts', x: 0.7, y: 0.37, quarter: 1 },
      { id: 'ashford.bridge-street', name: 'Bridge Street', x: 0.4, y: 0.55, quarter: 1 },
      { id: 'ashford.weavers-row', name: "Weavers' Row", x: 0.3, y: 0.62, quarter: 1 },
      { id: 'ashford.wharf', name: 'The Wharf', x: 0.79, y: 0.77, quarter: 2 },
      { id: 'ashford.brewery', name: 'Brewery', x: 0.92, y: 0.82, quarter: 2 },
      { id: 'ashford.cattle-market', name: 'Cattle Market', x: 0.25, y: 0.77, quarter: 2 },
      { id: 'ashford.infirmary', name: 'County Infirmary', x: 0.2, y: 0.47, quarter: 2 },
      { id: 'ashford.police', name: 'Police Station', x: 0.72, y: 0.52, quarter: 2 },
      { id: 'ashford.station', name: 'Ashford Station', x: 0.82, y: 0.08, quarter: 3 },
      { id: 'ashford.town-hall', name: 'Town Hall', x: 0.8, y: 0.235, quarter: 3 },
      { id: 'ashford.corn-exchange', name: 'Corn Exchange', x: 0.63, y: 0.5, quarter: 3 },
      { id: 'ashford.theatre', name: 'Theatre', x: 0.78, y: 0.4, quarter: 3 },
      { id: 'ashford.park', name: 'Park and Bandstand', x: 0.21, y: 0.1, quarter: 3 },
      { id: 'ashford.press-club', name: 'Press Club', x: 0.47, y: 0.57, quarter: 3 },
    ],
  },
  irongate: {
    // Measured on irongate-C-big.png.
    pins: [
      { id: 'irongate.parliament', name: 'Parliament', x: 0.53, y: 0.32, quarter: 1 },
      { id: 'irongate.forecourt', name: 'The Forecourt', x: 0.52, y: 0.37, quarter: 1 },
      { id: 'irongate.ministries', name: 'The Ministries', x: 0.46, y: 0.24, quarter: 1 },
      { id: 'irongate.supreme-court', name: 'The Supreme Court', x: 0.57, y: 0.25, quarter: 1 },
      { id: 'irongate.opera', name: 'The Opera', x: 0.66, y: 0.34, quarter: 1 },
      { id: 'irongate.chancery-row', name: 'Chancery Row', x: 0.62, y: 0.29, quarter: 1 },
      { id: 'irongate.herald-house', name: 'Herald House', x: 0.28, y: 0.32, quarter: 2 },
      { id: 'irongate.concord-house', name: 'Concord House', x: 0.12, y: 0.13, quarter: 2 },
      { id: 'irongate.basilica-square', name: 'Basilica Square', x: 0.24, y: 0.23, quarter: 2 },
      { id: 'irongate.st-agnes', name: 'St Agnes Hospital', x: 0.37, y: 0.31, quarter: 2 },
      { id: 'irongate.lantern-lane', name: 'Lantern Lane', x: 0.15, y: 0.2, quarter: 2 },
      { id: 'irongate.press-club', name: 'The Press Club', x: 0.2, y: 0.3, quarter: 2 },
      { id: 'irongate.market-square', name: 'Market Square', x: 0.49, y: 0.595, quarter: 3 },
      { id: 'irongate.tram-junction', name: 'Tram Junction', x: 0.43, y: 0.68, quarter: 3 },
      { id: 'irongate.central-station', name: 'Central Station', x: 0.35, y: 0.555, quarter: 3 },
      { id: 'irongate.grand-hotel', name: 'The Grand Hotel', x: 0.45, y: 0.62, quarter: 3 },
      // Moved 2 Oct 2026 from 0.56, 0.645 (the block's lower edge) onto the painted gutted shells.
      { id: 'irongate.bombed-blocks', name: 'The Bombed Blocks', x: 0.555, y: 0.62, quarter: 3 },
      { id: 'irongate.station-buffet', name: 'The Station Buffet', x: 0.4, y: 0.585, quarter: 3 },
      { id: 'irongate.union-house', name: 'Union House', x: 0.56, y: 0.66, quarter: 4 },
      { id: 'irongate.riverside-quays', name: 'Riverside Quays', x: 0.68, y: 0.58, quarter: 4 },
      { id: 'irongate.ironworks-gate', name: 'The Ironworks Gate', x: 0.8, y: 0.6, quarter: 4 },
      { id: 'irongate.red-lantern', name: 'The Red Lantern', x: 0.92, y: 0.66, quarter: 4 },
      { id: 'irongate.foundry-row', name: 'Foundry Row', x: 0.7, y: 0.72, quarter: 4 },
      { id: 'irongate.iron-bridge', name: 'The Iron Bridge', x: 0.62, y: 0.5, quarter: 4 },
      { id: 'irongate.vanguard-house', name: 'Vanguard House', x: 0.88, y: 0.07, quarter: 5 },
      { id: 'irongate.police-hq', name: 'Police Headquarters', x: 0.78, y: 0.215, quarter: 5 },
      { id: 'irongate.esplanade', name: 'The Esplanade', x: 0.91, y: 0.17, quarter: 5 },
      { id: 'irongate.villas', name: 'The Villas', x: 0.82, y: 0.12, quarter: 5 },
      { id: 'irongate.gate-tavern', name: 'The Gate Tavern', x: 0.86, y: 0.27, quarter: 5 },
    ],
  },
  clearwater: {
    // Measured on clearwater-A-big.png.
    pins: [
      { id: 'clearwater.promenade', name: 'The Promenade', x: 0.2, y: 0.69, quarter: 1 },
      { id: 'clearwater.casino', name: 'The Casino', x: 0.33, y: 0.6, quarter: 1 },
      { id: 'clearwater.lido', name: 'The Lido', x: 0.42, y: 0.88, quarter: 1 },
      { id: 'clearwater.pier-hotel', name: 'The Pier Hotel', x: 0.56, y: 0.82, quarter: 1 },
      { id: 'clearwater.tram-depot', name: 'Tram Depot', x: 0.38, y: 0.32, quarter: 2 },
      { id: 'clearwater.back-lane-market', name: 'Back Lane Market', x: 0.45, y: 0.4, quarter: 2 },
      { id: 'clearwater.rows', name: 'The Rows', x: 0.52, y: 0.47, quarter: 2 },
      // Renamed from "The Tin Chapel" (2 Oct 2026): the painted church is stone with a green spire.
      { id: 'clearwater.st-martins', name: "St Martin's", x: 0.55, y: 0.22, quarter: 2 },
      { id: 'clearwater.sanatorium', name: 'The Sanatorium', x: 0.71, y: 0.12, quarter: 2 },
      { id: 'clearwater.harbour', name: 'The Harbour', x: 0.72, y: 0.62, quarter: 3 },
      { id: 'clearwater.cannery', name: 'The Cannery', x: 0.92, y: 0.47, quarter: 3 },
      { id: 'clearwater.station', name: 'Clearwater Station', x: 0.8, y: 0.5, quarter: 3 },
      { id: 'clearwater.harbour-police', name: 'Harbour Police', x: 0.8, y: 0.76, quarter: 3 },
    ],
  },
  nation: {
    // Measured on nation-day-9216.png (pins/nation-pins.jpg).
    pins: [
      { id: 'irongate', name: 'Irongate', x: 0.52, y: 0.53, quarter: 1 },
      { id: 'ashford', name: 'Ashford', x: 0.12, y: 0.17, quarter: 1 },
      { id: 'duskwall', name: 'Duskwall', x: 0.88, y: 0.25, quarter: 1 },
      { id: 'coalport', name: 'Coalport', x: 0.18, y: 0.8, quarter: 1 },
      { id: 'clearwater', name: 'Clearwater', x: 0.88, y: 0.85, quarter: 1 },
    ],
  },
};
