import type { ContentInput } from '../schemas';

/**
 * Slice 4: the Issues of the Week, nineteen (docs/design/slice-4-battleground.md §9.5; GDD §14.6;
 * ADR 0029). `where` lists each city an Issue can be drawn in (in Irongate, its district) and the
 * feeds that tag an action there (an OR of matches; each match an AND). The effect runs in the
 * whole city for the week after it is owned; the stance is flavour, printed as the winner's deck.
 * `effectLine` is the player's line in the pattern of the council rules (review 2 §1.10).
 * Slice 5 adds five (docs/design/slice-5-risk.md §12.1) and extends three Issues' feeds.
 */
export const issues: ContentInput['issues'] = [
  {
    id: 'issue.tram-fares',
    name: 'Tram Fare Hike',
    short: 'the tram fares',
    blurb:
      'The tramway company wants a penny on every fare from Monday. The queues at the Junction have views.',
    where: [
      {
        cityId: 'irongate',
        districtId: 'irongate.station-market',
        feeds: [
          {
            actionTypes: ['canvass', 'speech', 'propaganda'],
            locationIds: ['irongate.tram-junction', 'irongate.central-station', 'irongate.market-square'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'ticketPct',
        value: -50,
      },
    ],
    effectLine: 'Tickets from Irongate: half price',
    stances: {
      vanguard: 'Trams to time and to the timetable, and no penny until they run to either.',
      collective: 'Nobody pays the new fare. A boycott from the Junction to the Quays.',
      alliance: "An inquiry into the company's books before a penny changes hands.",
    },
  },
  {
    id: 'issue.press-raids',
    name: 'Press Raids in Old Town',
    short: 'the press raids',
    blurb: 'Police took the plates from two Old Town print rooms on Tuesday, with a warrant nobody has seen.',
    where: [
      {
        cityId: 'irongate',
        districtId: 'irongate.old-town',
        feeds: [
          {
            actionTypes: ['propaganda'],
            districtId: 'irongate.old-town',
          },
          {
            actionTypes: ['canvass', 'speech'],
            locationIds: ['irongate.herald-house', 'irongate.press-club'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'swingPct',
        actionType: 'propaganda',
        value: 15,
      },
    ],
    effectLine: 'Posters and flyers: opinion +15 %',
    stances: {
      vanguard: 'Subversive sheets shut by warrant, in daylight, and the warrant printed.',
      collective: 'A press in every cellar. Print regardless, and print the raid.',
      alliance: 'The warrant before a judge by Friday, and the plates back.',
    },
  },
  {
    id: 'issue.evictions',
    name: 'Eviction Notices in Eastside',
    short: 'the evictions',
    blurb:
      "Forty households on Foundry Row have a fortnight's notice and a landlord who never comes himself.",
    where: [
      {
        cityId: 'irongate',
        districtId: 'irongate.eastside',
        feeds: [
          {
            actionTypes: ['canvass'],
            locationIds: ['irongate.foundry-row', 'irongate.riverside-quays'],
          },
          {
            actionTypes: ['speech'],
            locationIds: ['irongate.iron-bridge'],
          },
          {
            actionTypes: ['propaganda'],
            districtId: 'irongate.eastside',
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'roomPct',
        value: -50,
      },
    ],
    effectLine: 'A room in Irongate: half price',
    stances: {
      vanguard: 'Rent paid on Friday and the stair swept, and no landlord above the law either.',
      collective: 'A rent strike on Foundry Row: nobody pays, nobody leaves.',
      alliance: 'A rent tribunal that sits this month, and notices frozen until it does.',
    },
  },
  {
    id: 'issue.ministry-cuts',
    name: 'The Ministry Cuts',
    short: 'the cuts',
    blurb:
      'The estimates are late and the ministries are told to lose one clerk in ten. The clerks have noticed.',
    where: [
      {
        cityId: 'irongate',
        districtId: 'irongate.government-quarter',
        feeds: [
          {
            actionTypes: ['canvass'],
            locationIds: ['irongate.ministries', 'irongate.forecourt'],
          },
          {
            actionTypes: ['speech'],
            locationIds: ['irongate.forecourt', 'irongate.parliament'],
          },
          {
            actionTypes: ['intelligence'],
            locationIds: ['irongate.parliament'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'jobPayPct',
        value: 10,
      },
    ],
    effectLine: 'Job pay +10 %',
    stances: {
      vanguard: 'One clerk in ten? Ten in ten who cannot do the work. Order in the offices first.',
      collective: 'Not one clerk out of a job while a minister keeps a car.',
      alliance: 'Publish the estimates. A cut nobody can read is a cut nobody voted for.',
    },
  },
  {
    id: 'issue.hill-curfew',
    name: 'Curfew on the Hill',
    short: 'the curfew',
    blurb: 'Police headquarters wants the Esplanade cleared by ten. The Hill likes its Sundays late.',
    where: [
      {
        cityId: 'irongate',
        districtId: 'irongate.garrison-hill',
        feeds: [
          {
            actionTypes: ['canvass'],
            locationIds: ['irongate.villas', 'irongate.esplanade'],
          },
          {
            actionTypes: ['speech'],
            locationIds: ['irongate.esplanade', 'irongate.gate-tavern'],
          },
          {
            actionTypes: ['intelligence'],
            locationIds: ['irongate.police-hq'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'energyDelta',
        actionType: 'speech',
        value: -2,
      },
    ],
    effectLine: 'Speeches: −2 Energy',
    stances: {
      vanguard: 'Quiet streets by ten. The Hill sets the example for the town.',
      collective: 'The Esplanade belongs to the people who walk on it, at any hour.',
      alliance: "No curfew without the town's vote, and the town has not voted for one.",
    },
  },
  {
    id: 'issue.bread-queues',
    name: 'Bread Queues at the Market',
    short: 'the bread queues',
    blurb: 'Flour is short, the Market Square queue starts at six, and the bakers say it is not their doing.',
    where: [
      {
        cityId: 'irongate',
        districtId: 'irongate.station-market',
        feeds: [
          {
            actionTypes: ['canvass', 'speech', 'propaganda'],
            locationIds: ['irongate.market-square'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'ironPct',
        scope: 'checked',
        value: 15,
      },
    ],
    effectLine: 'Iron from actions +15 %',
    stances: {
      vanguard: 'The speculators named and the queue in good order. Both by Monday.',
      collective: 'Bread at a fixed price and the flour books opened.',
      alliance: "A subsidy on the loaf until the harvest, paid from the ministries' cars.",
    },
  },
  {
    id: 'issue.quays-strike',
    name: 'Strike at the Quays',
    short: 'the quays strike',
    blurb:
      'The cranes on the Quays have stood since Thursday. The barges are backing up to the lower bridge.',
    where: [
      {
        cityId: 'irongate',
        districtId: 'irongate.eastside',
        feeds: [
          {
            actionTypes: ['canvass'],
            locationIds: ['irongate.riverside-quays', 'irongate.ironworks-gate'],
          },
          {
            actionTypes: ['speech'],
            locationIds: ['irongate.iron-bridge', 'irongate.riverside-quays'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'fxpPct',
        scope: 'actions',
        value: 25,
      },
    ],
    effectLine: 'Party XP +25 % on actions',
    stances: {
      vanguard: 'The cranes turn by Monday. The company and the men can argue afterwards.',
      collective: 'The Quays hold. Every member on the picket line, in shifts.',
      alliance: 'A mediator on the Quays by Wednesday and both sides at his table.',
    },
  },
  {
    id: 'issue.opera-gala',
    name: 'The Opera Gala',
    short: 'the gala',
    blurb: 'The season opens Saturday and every minister has a box. The rest of the town has the pavement.',
    where: [
      {
        cityId: 'irongate',
        districtId: 'irongate.government-quarter',
        feeds: [
          {
            actionTypes: ['canvass'],
            locationIds: ['irongate.opera', 'irongate.chancery-row'],
          },
          {
            actionTypes: ['speech'],
            locationIds: ['irongate.parliament'],
          },
          {
            actionTypes: ['intelligence'],
            locationIds: ['irongate.opera'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'chancePct',
        actionType: 'canvass',
        value: 4,
      },
    ],
    effectLine: 'Talking to voters: better odds',
    stances: {
      vanguard: 'A gala for the town, with the boxes open to the streets that earned them.',
      collective: "Every box a workers' box for one night. The rest of the season can follow.",
      alliance: 'Half the boxes by public draw. The Opera takes public money and can say so.',
    },
  },
  {
    id: 'issue.fever-st-agnes',
    name: 'Fever at St Agnes',
    short: 'the fever',
    blurb:
      'St Agnes has forty fever cases and thirty beds. The sisters are asking the parties, since nobody else answers.',
    where: [
      {
        cityId: 'irongate',
        districtId: 'irongate.old-town',
        feeds: [
          {
            actionTypes: ['canvass'],
            locationIds: ['irongate.st-agnes', 'irongate.lantern-lane'],
          },
          {
            actionTypes: ['speech', 'propaganda'],
            locationIds: ['irongate.basilica-square'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'restedCapDelta',
        value: 50,
      },
    ],
    effectLine: 'Rested cap +50',
    stances: {
      vanguard: 'The fever ward quarantined and the tenements inspected, street by street.',
      collective: 'Free clinics on every stair, staffed by the branch until the ministry wakes.',
      alliance: 'A public health board, sitting this week, with the sisters on it.',
    },
  },
  {
    id: 'issue.census-hill',
    name: 'The Census on the Hill',
    short: 'the census',
    blurb:
      'Police headquarters is counting every household on the Hill, door by door. The Hill wants to know why.',
    where: [
      {
        cityId: 'irongate',
        districtId: 'irongate.garrison-hill',
        feeds: [
          {
            actionTypes: ['canvass'],
            locationIds: ['irongate.villas', 'irongate.esplanade'],
          },
          {
            actionTypes: ['intelligence'],
            locationIds: ['irongate.police-hq', 'irongate.gate-tavern'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'standingMultiplier',
        value: 2,
      },
    ],
    effectLine: 'Reputation: every win counts twice',
    stances: {
      vanguard: 'Every household on the register. A town that is counted is a town in order.',
      collective: 'Count the villas first. The tenements have been counted enough.',
      alliance: 'A census by the council, published, or no census at all.',
    },
  },
  {
    id: 'issue.mill-strike',
    name: 'Strike at the Mill',
    short: 'the mill strike',
    blurb:
      "The rolling mill has been out since Monday over the foreman's book. The gate is quiet and the town is not.",
    where: [
      {
        cityId: 'coalport',
        feeds: [
          {
            actionTypes: ['canvass', 'speech'],
            locationIds: ['coalport.mill-gate'],
          },
          {
            actionTypes: ['council'],
            locationIds: ['coalport.union-hall'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'seniorityDays',
        value: 2,
      },
    ],
    effectLine: 'Seniority ×2',
    stances: {
      vanguard: 'The mill runs. The book can be argued in an office, after the shift.',
      collective: 'The gate holds until the book is burned. Every member on the picket.',
      alliance: 'A mediator at the gate by Wednesday, and the book on his table.',
    },
  },
  {
    id: 'issue.harbour-rates',
    name: 'Harbour Rates',
    short: 'the harbour rates',
    blurb:
      "The harbour board wants a shilling more on every ton across the quay. The barges say they'll go to Clearwater.",
    where: [
      {
        cityId: 'coalport',
        feeds: [
          {
            actionTypes: ['canvass', 'speech', 'propaganda'],
            locationIds: ['coalport.quays'],
          },
          {
            actionTypes: ['propaganda'],
            locationIds: ['coalport.market-row'],
          },
          // Slice 5 (design §12.1): the new places take part.
          {
            actionTypes: ['canvass', 'speech'],
            locationIds: ['coalport.customs-house', 'coalport.far-bank'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'ironPct',
        scope: 'checked',
        value: 15,
      },
    ],
    effectLine: 'Iron from actions +15 %',
    stances: {
      vanguard: "Rates fixed for a year and the board's accounts on the notice board.",
      collective: 'Not a penny more until the board opens its books to the men who load the tons.',
      alliance: 'An inquiry into the board, in public, before any rate changes.',
    },
  },
  {
    id: 'issue.frontier-shut',
    name: 'The Frontier Shut',
    short: 'the frontier',
    blurb:
      "The pass has been closed since Tuesday and the goods yard is empty. The town is counting what's left in the stores.",
    where: [
      {
        cityId: 'duskwall',
        feeds: [
          {
            actionTypes: ['canvass', 'speech'],
            locationIds: ['duskwall.garrison-gate'],
          },
          {
            actionTypes: ['canvass', 'intelligence'],
            locationIds: ['duskwall.goods-yard'],
          },
          // Slice 5 (design §12.1): the new places take part.
          {
            actionTypes: ['canvass', 'speech'],
            locationIds: ['duskwall.checkpoint'],
          },
          {
            actionTypes: ['intelligence'],
            locationIds: ['duskwall.mountain-inn'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'jobPayPct',
        value: 10,
      },
    ],
    effectLine: 'Job pay +10 %',
    stances: {
      vanguard: 'The frontier shut until the district is in order, and the stores rationed by the book.',
      collective: 'Open the pass. A shut frontier feeds nobody but the customs.',
      alliance: 'Talks at the frontier post this week, and the pass open for food by Sunday.',
    },
  },
  {
    id: 'issue.ration-books',
    name: 'Ration Books',
    short: 'the ration',
    blurb:
      'The new issue of ration books is late and the Customs Market is selling coupons. Everybody knows who.',
    where: [
      {
        cityId: 'duskwall',
        feeds: [
          {
            actionTypes: ['canvass', 'speech', 'propaganda'],
            locationIds: ['duskwall.quartermaster-market'],
          },
          {
            actionTypes: ['intelligence'],
            locationIds: ['duskwall.archives'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'standingMultiplier',
        value: 2,
      },
    ],
    effectLine: 'Reputation: every win counts twice',
    stances: {
      vanguard: 'One book, one household, no exceptions, and the coupon sellers named.',
      collective: 'Books for everyone by Friday or the market sets its own ration.',
      alliance: 'The books issued by the council, in public, from the Archives counter.',
    },
  },
  {
    id: 'issue.college-protests',
    name: 'Protests at the College',
    short: 'the college protests',
    blurb:
      'The students have occupied the quad over the franchise. The dons are divided and the town is amused.',
    where: [
      {
        cityId: 'ashford',
        feeds: [
          {
            actionTypes: ['canvass', 'speech'],
            locationIds: ['ashford.university'],
          },
          {
            actionTypes: ['speech'],
            locationIds: ['ashford.courts'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'trainingEnergyPct',
        value: -20,
      },
    ],
    effectLine: 'Training: −20 % Energy',
    stances: {
      vanguard: 'The quad cleared and the term resumed. Students are for lectures.',
      collective: "The branch joins the students. The franchise is the workers' too.",
      alliance: 'Open debate in the Union, and a vote on the question, not on the students.',
    },
  },
  {
    id: 'issue.court-backlog',
    name: 'The Court Backlog',
    short: 'the court queue',
    blurb:
      'The county courts are six months behind and the public queue starts before dawn. The clerks blame the judge.',
    where: [
      {
        cityId: 'ashford',
        feeds: [
          {
            actionTypes: ['canvass', 'speech', 'intelligence'],
            locationIds: ['ashford.courts'],
          },
          {
            actionTypes: ['canvass'],
            locationIds: ['ashford.bridge-street'],
          },
          // Slice 5 (design §12.1): the new places take part.
          {
            actionTypes: ['canvass'],
            locationIds: ['ashford.police'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'chancePct',
        actionType: 'canvass',
        value: 4,
      },
    ],
    effectLine: 'Talking to voters: better odds',
    stances: {
      vanguard: 'A second sitting every day and the queue in numbered order.',
      collective: 'Rent cases first. A landlord can wait; a family cannot.',
      alliance: 'Two more clerks, paid for, and the list published every Monday.',
    },
  },
  {
    id: 'issue.labour-exchange',
    name: 'Men at the Labour Exchange',
    short: 'the exchange',
    blurb:
      'The exchange queue is round the block and the board has no cards. The town counts them on the way to work.',
    where: [
      {
        cityId: 'coalport',
        feeds: [
          {
            actionTypes: ['canvass'],
          },
        ],
      },
      {
        cityId: 'duskwall',
        feeds: [
          {
            actionTypes: ['canvass'],
          },
        ],
      },
      {
        cityId: 'ashford',
        feeds: [
          {
            actionTypes: ['canvass'],
          },
        ],
      },
      {
        cityId: 'irongate',
        districtId: 'irongate.station-market',
        feeds: [
          {
            actionTypes: ['canvass'],
            districtId: 'irongate.station-market',
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'jobPayPct',
        value: 10,
      },
    ],
    effectLine: 'Job pay +10 %',
    stances: {
      vanguard: 'Public works under discipline, and a card for every man who turns up on time.',
      collective: "Workers' co-operatives on the empty sites, and the exchange run by the union.",
      alliance: "A retraining scheme at the college, and the exchange's books opened.",
    },
  },
  {
    id: 'issue.price-of-coal',
    name: 'The Price of Coal',
    short: 'the coal price',
    blurb:
      "Coal is up a third since the frost and the merchants say it's the railway. The railway says otherwise.",
    where: [
      {
        cityId: 'coalport',
        feeds: [
          {
            actionTypes: ['canvass'],
            locationKinds: ['street'],
          },
          {
            actionTypes: ['propaganda'],
            locationKinds: ['market'],
          },
        ],
      },
      {
        cityId: 'duskwall',
        feeds: [
          {
            actionTypes: ['canvass'],
            locationKinds: ['street'],
          },
          {
            actionTypes: ['propaganda'],
            locationKinds: ['market'],
          },
        ],
      },
      {
        cityId: 'ashford',
        feeds: [
          {
            actionTypes: ['canvass'],
            locationKinds: ['street'],
          },
          {
            actionTypes: ['propaganda'],
            locationKinds: ['market'],
          },
        ],
      },
      {
        cityId: 'irongate',
        districtId: 'irongate.eastside',
        feeds: [
          {
            actionTypes: ['canvass'],
            locationKinds: ['street'],
            districtId: 'irongate.eastside',
          },
          {
            actionTypes: ['propaganda'],
            locationKinds: ['market'],
            districtId: 'irongate.eastside',
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'restedCapDelta',
        value: 50,
      },
    ],
    effectLine: 'Rested cap +50',
    stances: {
      vanguard: "The merchants' prices fixed and their yards inspected, this week.",
      collective: 'Coal at the pithead price for every household with a ration book.',
      alliance: 'An inquiry into the merchants and the railway, and the findings printed.',
    },
  },
  {
    id: 'issue.lights-out',
    name: 'Lights Out',
    short: 'the street lamps',
    blurb:
      'Half the street lamps are dark and the gas company says the town owes it money. The town says the reverse.',
    where: [
      {
        cityId: 'coalport',
        feeds: [
          {
            actionTypes: ['intelligence'],
          },
          {
            actionTypes: ['propaganda'],
          },
        ],
      },
      {
        cityId: 'duskwall',
        feeds: [
          {
            actionTypes: ['intelligence'],
          },
          {
            actionTypes: ['propaganda'],
          },
        ],
      },
      {
        cityId: 'ashford',
        feeds: [
          {
            actionTypes: ['intelligence'],
          },
          {
            actionTypes: ['propaganda'],
          },
        ],
      },
      {
        cityId: 'irongate',
        districtId: 'irongate.old-town',
        feeds: [
          {
            actionTypes: ['intelligence'],
            districtId: 'irongate.old-town',
          },
          {
            actionTypes: ['propaganda'],
            districtId: 'irongate.old-town',
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'energyDelta',
        actionType: 'intelligence',
        value: -1,
      },
    ],
    effectLine: 'Watching and listening: −1 Energy',
    stances: {
      vanguard: "The lamps lit by order and the company's books audited by the council.",
      collective: 'The lamps lit, the company taken over, the bill sent to the shareholders.',
      alliance: "The company's contract published, and the lamps lit while the lawyers read it.",
    },
  },
  // Slice 5 (docs/design/slice-5-risk.md §12.1): five Issues for the new places; the deck is 24. A
  // mission is tagged by the same feeds, seen as `speech` or `intelligence` (a watch is
  // intelligence); the illegal types match no Issue.
  {
    id: 'issue.customs-strike',
    name: 'Customs Strike',
    short: 'the customs strike',
    blurb:
      "The customs inspectors have downed stamps over their pay. Nothing crosses the mole, and the sheds are filling with other people's crates.",
    where: [
      {
        cityId: 'coalport',
        feeds: [
          {
            actionTypes: ['canvass', 'speech'],
            locationIds: ['coalport.customs-house', 'coalport.quays'],
          },
          {
            actionTypes: ['intelligence'],
            locationIds: ['coalport.customs-house'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'heatCoolPct',
        value: 50,
      },
    ],
    effectLine: 'Heat cools half again as fast',
    stances: {
      vanguard: 'The inspectors back at the sheds by Monday, and the ringleaders named.',
      collective: "The inspectors' pay met. A stamp is work like any other.",
      alliance: 'An arbitrator on the mole by Wednesday, and both sides at his table.',
    },
  },
  {
    id: 'issue.ferry-fares',
    name: 'Ferry Fares',
    short: 'the ferry penny',
    blurb:
      'The ferry company wants a penny on the crossing. The Far Bank crosses twice a day and has done its sums.',
    where: [
      {
        cityId: 'coalport',
        feeds: [
          {
            actionTypes: ['canvass', 'speech', 'propaganda'],
            locationIds: ['coalport.far-bank'],
          },
          {
            actionTypes: ['canvass'],
            locationIds: ['coalport.harbour-police'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'ticketPct',
        value: -50,
      },
    ],
    effectLine: 'Train tickets from Coalport: half price',
    stances: {
      vanguard: 'The ferry to time, to the timetable, and no penny until it runs to either.',
      collective: 'Nobody pays the penny. A free crossing, or the men row themselves.',
      alliance: "The company's books open at the Town Hall before any penny changes hands.",
    },
  },
  {
    id: 'issue.timber-rates',
    name: 'Timber Rates',
    short: 'the timber rates',
    blurb:
      "The sawmill has cut the rate for a cord of mountain timber. The carters say they'll leave it on the hill.",
    where: [
      {
        cityId: 'duskwall',
        feeds: [
          {
            actionTypes: ['canvass', 'speech'],
            locationIds: ['duskwall.sawmill', 'duskwall.checkpoint'],
          },
          {
            actionTypes: ['intelligence'],
            locationIds: ['duskwall.mountain-inn'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'ironPct',
        scope: 'checked',
        value: 15,
      },
    ],
    effectLine: 'Iron from actions +15 %',
    stances: {
      vanguard: "The rate fixed by the district for the season, and the carters' loads in order.",
      collective: 'Not a cord down the pass until the rate goes back up. The yard can wait.',
      alliance: "A fair rate set by the council, published, with the mill's accounts beside it.",
    },
  },
  {
    id: 'issue.market-tolls',
    name: 'Market Tolls',
    short: 'the market tolls',
    blurb:
      'The market board has doubled the toll on every beast through the gate. The county is talking about Clearwater.',
    where: [
      {
        cityId: 'ashford',
        feeds: [
          {
            actionTypes: ['canvass', 'speech'],
            locationIds: ['ashford.cattle-market', 'ashford.wharf'],
          },
          {
            actionTypes: ['propaganda'],
            locationIds: ['ashford.brewery'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'jobPayPct',
        value: 10,
      },
    ],
    effectLine: 'Job pay +10 %',
    stances: {
      vanguard: "Tolls fixed for a year and the board's accounts on the auction-shed wall.",
      collective: 'No toll on a beast a family raised. The board can tax the dealers.',
      alliance: 'An inquiry into the board, in public, before any toll changes.',
    },
  },
  {
    id: 'issue.cells-full',
    name: 'The Cells Are Full',
    short: 'the cells',
    blurb:
      'Police headquarters has more people in the cells than cells, and the magistrate is away. The Hill has noticed the queue at the gate.',
    where: [
      {
        cityId: 'irongate',
        districtId: 'irongate.garrison-hill',
        feeds: [
          {
            actionTypes: ['canvass', 'intelligence'],
            locationIds: ['irongate.police-hq'],
          },
          {
            actionTypes: ['speech'],
            locationIds: ['irongate.gate-tavern'],
          },
          {
            actionTypes: ['canvass'],
            locationIds: ['irongate.villas'],
          },
        ],
      },
    ],
    effects: [
      {
        kind: 'bailPct',
        value: -50,
      },
    ],
    effectLine: 'Bail in Irongate: half price',
    stances: {
      vanguard: 'A second magistrate sitting daily, and the cells cleared in order.',
      collective: 'Bail at a wage a porter can pay, or no bail at all.',
      alliance: 'Every case before a magistrate within a day, by law, and the Herald told the names.',
    },
  },
];
