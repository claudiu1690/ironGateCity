import type { City } from '../../schemas';
import { withMissions } from '../missions/attach';
import { townHall } from './townHall';
import { irongateMissions } from '../missions/irongate';

/**
 * Irongate, the capital and the battleground (GDD §14.1, §14.9, §14.11). Districts, locations, actions
 * and text: docs/design/slice-4-battleground.md §4 (generated from its tables, then checked word for
 * word by test/slice4.irongate.test.ts). Rewards are not data: they follow from the type and Energy
 * at the §5.5 rates; opinion goes to the district's meter.
 */

const canvass = { tier: 1, type: 'canvass', energy: 10, givesFxp: true, givesOpinion: true } as const;
const speech = { tier: 1, type: 'speech', energy: 12, givesFxp: true, givesOpinion: true } as const;
const propaganda = { tier: 1, type: 'propaganda', energy: 8, givesFxp: true, givesOpinion: true } as const;
const intelligence = { tier: 1, type: 'intelligence', givesFxp: false, givesOpinion: false } as const;
/** GDD §8.4 (review 1): a committee session is a best-stat check (the design table's INT is a slip). */
const council = { tier: 1, type: 'council', energy: 10, givesFxp: true, givesOpinion: false } as const;

export const irongate: City = {
  id: 'irongate',
  name: 'Irongate',
  role: 'battleground',
  // Design §4: the equal average of the five district baselines (§4.1).
  baselineOpinion: { vanguard: 21, collective: 21, alliance: 21, neutral: 37 },
  map: { day: 'map.irongate.day', night: 'map.irongate.night' },
  clouds: true,
  // Design §4.1 (baselines, character), §4.2 (frames: the pins' box + 0.06, clamped); the overview
  // pins' anchors from slice-4-screens.md §5.1. The quarters are the five districts, in pin order.
  quarters: [
    {
      id: 'irongate.government-quarter',
      name: 'Government Quarter',
      frame: { x0: 0.4, y0: 0.18, x1: 0.72, y1: 0.43 },
      blurb:
        'White stone and green copper: Parliament, the ministries, the court, the opera and the lawyers between them',
      district: {
        n: 1,
        baselineOpinion: { vanguard: 20, collective: 20, alliance: 20, neutral: 40 },
        anchor: { x: 0.53, y: 0.3 },
      },
      outline: [[0.43, 0], [0.7, 0], [0.69, 0.14], [0.71, 0.22], [0.73, 0.3], [0.74, 0.37], [0.75, 0.49], [0.62, 0.47], [0.6, 0.47], [0.5, 0.45], [0.43, 0.43], [0.42, 0.355], [0.41, 0.28], [0.42, 0.16]],
      label: { x: 0.53, y: 0.3 },
    },
    {
      id: 'irongate.old-town',
      name: 'Old Town',
      frame: { x0: 0.06, y0: 0.07, x1: 0.43, y1: 0.38 },
      blurb: "Cobbles, cafés, the basilica, the Herald and the Press Club; the Alliance's ground",
      district: {
        n: 2,
        baselineOpinion: { vanguard: 15, collective: 15, alliance: 35, neutral: 35 },
        anchor: { x: 0.24, y: 0.25 },
      },
      outline: [[0, 0], [0.43, 0], [0.42, 0.16], [0.41, 0.28], [0.42, 0.355], [0.43, 0.43], [0.2, 0.4], [0, 0.37]],
      label: { x: 0.24, y: 0.25 },
    },
    {
      id: 'irongate.station-market',
      name: 'Station & Market',
      frame: { x0: 0.29, y0: 0.49, x1: 0.62, y1: 0.74 },
      blurb:
        'Every train in the republic ends here: crowds, trams, traders, hotels and the bombed blocks behind the market',
      district: {
        n: 3,
        baselineOpinion: { vanguard: 20, collective: 20, alliance: 20, neutral: 40 },
        anchor: { x: 0.4, y: 0.6 },
      },
      outline: [[0, 0.37], [0.2, 0.4], [0.43, 0.43], [0.5, 0.45], [0.6, 0.47], [0.605, 0.53], [0.6, 0.58], [0.585, 0.62], [0.575, 0.64], [0.53, 0.64], [0.52, 0.7], [0.5, 0.745], [0.52, 0.85], [0.53, 1], [0, 1]],
      label: { x: 0.4, y: 0.6 },
    },
    {
      id: 'irongate.eastside',
      name: 'Eastside',
      frame: { x0: 0.5, y0: 0.44, x1: 0.98, y1: 0.78 },
      blurb: "The cranes, the works, the quays and the tenements on the far bank; the Collective's ground",
      district: {
        n: 4,
        baselineOpinion: { vanguard: 15, collective: 35, alliance: 15, neutral: 35 },
        anchor: { x: 0.76, y: 0.62 },
      },
      outline: [[0.6, 0.47], [0.62, 0.47], [0.75, 0.49], [1, 0.54], [1, 1], [0.53, 1], [0.52, 0.85], [0.5, 0.745], [0.52, 0.7], [0.53, 0.64], [0.575, 0.64], [0.585, 0.62], [0.6, 0.58], [0.605, 0.53]],
      label: { x: 0.76, y: 0.62 },
    },
    {
      id: 'irongate.garrison-hill',
      name: 'Garrison Hill',
      frame: { x0: 0.72, y0: 0.01, x1: 0.97, y1: 0.33 },
      blurb:
        "The old citadel, now police headquarters, the esplanade below it and the villas behind their walls; the Vanguard's ground",
      district: {
        n: 5,
        baselineOpinion: { vanguard: 35, collective: 15, alliance: 15, neutral: 35 },
        anchor: { x: 0.85, y: 0.16 },
      },
      outline: [[0.7, 0], [1, 0], [1, 0.54], [0.75, 0.49], [0.74, 0.37], [0.73, 0.3], [0.71, 0.22], [0.69, 0.14]],
      label: { x: 0.85, y: 0.16 },
    },
  ],
  paper: {
    name: 'The Irongate Herald',
    shortName: 'Herald',
    strapline: 'All the republic, every morning',
    price: '6 marks',
  },
  // Slice 3 (GDD §2): offset 0; ten seats, two per district (§15.3). Design §4, §19 #7: the City Hall,
  // the clock-tower hall between Parliament and the Opera. Review 4 (ADR 0077): the hall is a location.
  council: { offset: 0, seats: 10, hall: { locationId: 'irongate.city-hall' } },
  locations: withMissions([
    {
      id: 'irongate.parliament',
      name: 'Parliament',
      kind: 'parliament',
      blurb:
        'The dome the whole republic argues under. The public gallery opens at ten; the lobby clerks know more than the deputies.',
      // Pin 1: the survey pin (mapPins.irongate).
      map: { x: 0.53, y: 0.32 },
      quarterId: 'irongate.government-quarter',
      actions: [
        {
          ...intelligence,
          id: 'irongate.parliament.gallery',
          name: 'Watch from the public gallery',
          stats: ['int'],
          energy: 4,
          text: {
            success: {
              headline: 'Who sat with whom',
              body: 'Two hours in the gallery with a pencil. Who left before the vote, who came back with whom, which minister read his notes and which read the Herald. Three names go in your notebook.',
            },
            partial: {
              headline: 'A dull sitting',
              body: 'Estimates, a point of order, estimates again. You get one name worth writing down before the Speaker rises for lunch. Come back on a voting day.',
            },
          },
        },
        {
          ...canvass,
          id: 'irongate.parliament.lobby',
          name: 'Talk to the lobby clerks',
          stats: ['int'],
          text: {
            success: {
              headline: 'They know the numbers',
              body: "The lobby clerks come out at six with the day's voting lists under their arms. They read for a living, so you don't waste words. One takes ten flyers for the messengers' room, where the real votes are counted.",
            },
            partial: {
              headline: 'Most of them have a tram to catch',
              body: 'The clerks come down the steps in a body and most of it heads for the Forecourt. You press flyers on the slow ones. Two stop to correct your figures, which is a start.',
            },
          },
        },
        {
          ...speech,
          id: 'irongate.parliament.steps',
          name: 'Speak from the Parliament steps',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The Quarter stops to listen',
              body: 'The top step at the lunch adjournment, with the whole Forecourt for a gallery. You keep it short and keep it about them: rents, the cuts, who decides. A deputy heckles and the crowd laughs on your side.',
            },
            partial: {
              headline: 'The bell cuts you off',
              body: 'You get through the cuts before the bell for the vote goes and the steps empty of everyone who matters. A few clerks stay to hear the end. One asks which party. You tell him.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.forecourt',
      name: 'The Forecourt',
      ref: 'the Forecourt',
      kind: 'square',
      blurb:
        'The paved square before Parliament, a statue in the middle and a pool nobody sits by. Every tram in the Quarter stops here at one.',
      // Pin 2: the survey pin (mapPins.irongate).
      map: { x: 0.52, y: 0.37 },
      quarterId: 'irongate.government-quarter',
      actions: [
        {
          ...canvass,
          id: 'irongate.forecourt.canvass',
          name: "Talk to the one o'clock crowd",
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'A thousand lunches',
              body: "At one the Quarter comes out to eat on the Forecourt and has nowhere to go for an hour. You work the benches with the flyer and the case for your party. By two, half of them know what you'd do about the cuts.",
            },
            partial: {
              headline: 'It rains at a quarter past',
              body: "You've done two benches when the rain comes off the dome and the Forecourt empties under the arcades. A few flyers go into coat pockets. One old man reads his under the statue, in the wet.",
            },
          },
        },
        {
          ...propaganda,
          id: 'irongate.forecourt.leaflets',
          name: 'Hand out flyers at the tram stops on the Forecourt',
          stats: ['agi'],
          text: {
            success: {
              headline: 'Six stops, empty bag',
              body: 'Every tram in the Quarter stops here and every queue is bored. You work the six shelters at a trot, a flyer into every hand before the tram comes. The bag is empty in ten minutes.',
            },
            partial: {
              headline: 'The trams come early',
              body: 'Three shelters done when four trams arrive together and take the queues with them. Half the bag is gone. The other half waits for the next tram, which is late.',
            },
          },
        },
        {
          ...speech,
          id: 'irongate.forecourt.speech',
          name: 'Speak beneath the statue',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'A crowd round the statue',
              body: "The plinth is a step up and a hundred yards of stone for a voice. Rents, the cuts, the gala nobody was asked about. A policeman looks bored, which is permission. By the end there's a ring three deep.",
            },
            partial: {
              headline: 'The pool is a poor stage',
              body: "You take the plinth and the wind takes half of it. The ring is thin and the clerks at the back are eating. A woman with a pram stays to the end and says her husband's a clerk. That's something.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.ministries',
      name: 'The Ministries',
      ref: 'the Ministries',
      kind: 'ministry',
      blurb:
        'Three stone blocks of clerks, one under scaffolding since the war. They come out at five, in order of seniority.',
      // Pin 3: the survey pin (mapPins.irongate).
      map: { x: 0.46, y: 0.24 },
      quarterId: 'irongate.government-quarter',
      actions: [
        {
          ...canvass,
          id: 'irongate.ministries.clerks',
          name: 'Talk to the clerks at five',
          stats: ['int'],
          text: {
            success: {
              headline: 'In order of seniority',
              body: 'At five the three blocks empty in order, juniors first. You catch the juniors, who have the least to lose and the most to say about the cuts. A whole room of the Board of Works takes flyers.',
            },
            partial: {
              headline: 'Seniors only',
              body: "You're late and the juniors have gone. The seniors come out slowly and take flyers the way they take memoranda, without reading. One asks you to send it through the proper channel.",
            },
          },
        },
        {
          ...intelligence,
          id: 'irongate.ministries.notices',
          name: 'Read the notice boards',
          stats: ['int'],
          energy: 3,
          text: {
            success: {
              headline: 'The board says more than the minister',
              body: 'Postings, retirements, a room to let, a tender for scaffolding nobody asked for. Two names and a date go in your notebook. The porter watches you copy them and says nothing.',
            },
            partial: {
              headline: 'Mostly rooms to let',
              body: "Rooms, a bicycle, a lost umbrella. One posting worth writing down, to a ministry that shouldn't need it. The porter moves you on.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.supreme-court',
      name: 'The Supreme Court',
      ref: 'the Supreme Court',
      kind: 'court',
      blurb:
        "The republic's highest court in a red-roofed quadrangle. The petitioners' queue forms at eight and moves at the law's pace.",
      // Pin 4: the survey pin (mapPins.irongate).
      map: { x: 0.57, y: 0.25 },
      quarterId: 'irongate.government-quarter',
      actions: [
        {
          ...canvass,
          id: 'irongate.supreme-court.queue',
          name: "Talk to people in the petitioners' queue",
          stats: ['int'],
          text: {
            success: {
              headline: "The queue can't leave",
              body: "Fifty petitioners, one door, and the law's own pace. You work the line with the flyer and the case list. Everyone here has a grievance already; by the door most of them have your party's answer to it.",
            },
            partial: {
              headline: 'The usher opens early',
              body: "The door opens at half past nine and the queue becomes a crush on the steps. A few flyers go into coat pockets. One woman says she'll read it while she waits, which will be all day.",
            },
          },
        },
        {
          id: 'irongate.supreme-court.law-library',
          name: 'Study in the law library',
          tier: 1,
          type: 'training',
          trains: 'int',
          verb: 'Study',
          text: {
            success: {
              headline: 'An evening among the reports',
              body: "The library lets anyone in who is quiet and owns a collar. Statutes, the electoral acts, judgments nobody has read since they were given. You leave knowing the argument better than the man who'll make it against you.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.opera',
      name: 'The Opera',
      ref: 'the Opera',
      kind: 'theatre',
      blurb:
        'Columns, a pediment and a foyer where ministers are seen. The season opens Saturday and the boxes are spoken for.',
      // Pin 5: the survey pin (mapPins.irongate).
      map: { x: 0.66, y: 0.34 },
      quarterId: 'irongate.government-quarter',
      actions: [
        {
          ...canvass,
          id: 'irongate.opera.foyer',
          name: 'Talk to people in the foyer at the interval',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'Twenty minutes and champagne',
              body: "The interval is twenty minutes and nobody in the foyer can leave it. You work the stairs with a coat that passes and a flyer that doesn't. A minister's wife takes one, for the joke, and reads it in the second act.",
            },
            partial: {
              headline: 'Wrong coat',
              body: "The doorman looks at your coat and then at the door. You get the foyer's edge and the pavement smokers. Two take a flyer. One says he'd vote for anyone who shortened the second act.",
            },
          },
        },
        {
          ...intelligence,
          id: 'irongate.opera.boxes',
          name: 'Watch the boxes',
          stats: ['int'],
          energy: 4,
          text: {
            success: {
              headline: 'Who sat in the second box',
              body: "From the gods you can see every box and who visits it at the interval. A minister, a man who isn't his secretary, a lawyer from Chancery Row. Three names and a time in the notebook.",
            },
            partial: {
              headline: 'The lights go down',
              body: "You get the minister's box and nothing else before the lights go and the boxes are shadows. One name. The music is good, which isn't what you came for.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.chancery-row',
      name: 'Chancery Row',
      kind: 'street',
      blurb:
        "The lawyers' chambers between the ministries and the opera. Brass plates, railings, and lobbyists who bill by the quarter hour.",
      // Pin 6: the survey pin (mapPins.irongate).
      map: { x: 0.62, y: 0.29 },
      quarterId: 'irongate.government-quarter',
      actions: [
        {
          ...canvass,
          id: 'irongate.chancery-row.chambers',
          name: "Talk to the lawyers' clerks",
          stats: ['int'],
          text: {
            success: {
              headline: 'Brass plates, open doors',
              body: 'The clerks of chambers take deliveries all day and a flyer is a delivery. You work the row plate by plate. A junior counsel comes down to argue and stays to agree.',
            },
            partial: {
              headline: 'Not without an appointment',
              body: "Half the doors want an appointment and the other half want the tradesmen's entrance. You get flyers to the clerks who'll take them. One says his principal already votes your way, in private.",
            },
          },
        },
        {
          ...propaganda,
          id: 'irongate.chancery-row.bills',
          name: "Put up posters on the lawyers' railings",
          stats: ['str'],
          text: {
            success: {
              headline: 'A row of railings, a row of bills',
              body: "Bucket, brush and the Row's iron railings. You get twelve bills up straight, one to every set of chambers, before the first clerk arrives. The lawyers will read them on the way in, and bill someone for the time.",
            },
            partial: {
              headline: "The paste won't hold on iron",
              body: "Wet railings and paste that runs. Five bills stay up; the rest slide into the area. Five is five, and one is on the Attorney's railings.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.herald-house',
      name: 'Herald House',
      kind: 'press',
      blurb:
        'The long grey offices of the Irongate Herald. The presses run at four and the republic reads the result by seven.',
      // Pin 7: the survey pin (mapPins.irongate).
      map: { x: 0.28, y: 0.32 },
      quarterId: 'irongate.old-town',
      actions: [
        {
          ...canvass,
          id: 'irongate.herald-house.print-room',
          name: 'Talk to the printers coming off shift',
          stats: ['int'],
          text: {
            success: {
              headline: 'Ink to the elbow',
              body: "The print-room shift comes off at four and reads for a living. Rents, the raids, the tram fare: you keep it short. A compositor takes ten flyers for the stone, where tomorrow's leader is set.",
            },
            partial: {
              headline: 'Most of them head for the tram',
              body: 'The shift comes off in a hurry and most of it makes for the Junction. You press flyers on the ones who slow down. Two stop to argue the raids; one gives you his street.',
            },
          },
        },
        {
          ...intelligence,
          id: 'irongate.herald-house.wires',
          name: 'Read the news as it comes in',
          stats: ['int'],
          energy: 3,
          text: {
            success: {
              headline: 'The wire room at midnight',
              body: "The night editor lets you sit by the machine if you keep quiet. Coalport, Duskwall, the frontier: who's meeting whom, which bill is stuck. Two names go in your notebook.",
            },
            partial: {
              headline: 'A slow night',
              body: 'The machine chatters about grain prices and a regatta. One thing worth writing down before the night editor wants his chair back. Come back on a sitting night.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.concord-house',
      name: 'Concord House',
      kind: 'faction-hq',
      blurb:
        "The Alliance's capital office, a red-roofed hall behind the basilica. Committee on the first floor; the founders on the stairs.",
      // Pin 8: the survey pin (mapPins.irongate).
      map: { x: 0.12, y: 0.13 },
      quarterId: 'irongate.old-town',
      factionId: 'alliance',
      actions: [
        {
          ...council,
          id: 'irongate.concord-house.committee',
          name: 'Go to the capital meeting',
          stats: ['best'],
          text: {
            success: {
              headline: 'Minutes taken, proposal carried',
              body: 'Tea, a district map on the piano, and a chairman who believes in procedure. The committee wants the Old Town returns redone by street and you say how. Your name goes in the minutes. In this house, that counts.',
            },
            partial: {
              headline: 'A long meeting',
              body: "Two hours on the returns and a point of order about the biscuits. You get one word in before the chairman moves on. Mr Grey's man marks you present, which is what matters this week.",
            },
          },
        },
        {
          ...propaganda,
          id: 'irongate.concord-house.duplicator',
          name: 'Print five hundred flyers',
          stats: ['int'],
          text: {
            success: {
              headline: 'Five hundred copies, still wet',
              body: 'The stencil holds and the drum turns. Five hundred flyers in an hour, stacked for the morning runners to the Junction. Your hands are purple to the wrist.',
            },
            partial: {
              headline: 'The stencil tears',
              body: 'The stencil tears at copy two hundred and the rest come out ghosted. Half a stack goes out; the other half goes in the grate. The agent shows you how to cut the next one.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.basilica-square',
      name: 'Basilica Square',
      kind: 'square',
      blurb:
        'The square under the dome. Mass ends at eleven and the whole Old Town comes down the steps arguing.',
      // Pin 9: the survey pin (mapPins.irongate).
      map: { x: 0.24, y: 0.23 },
      quarterId: 'irongate.old-town',
      actions: [
        {
          ...canvass,
          id: 'irongate.basilica-square.canvass',
          name: 'Talk to people on the steps after Mass',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: "Eleven o'clock, the whole Old Town",
              body: 'Mass ends at eleven and the square fills from the steps down. You work the families with the flyer folded small, Sunday manners and no shouting. By the fountain, half the Old Town has one in a pocket.',
            },
            partial: {
              headline: 'The canon watches',
              body: "The canon stands at the top of the steps and the families move faster past you than they would. A few flyers go into missals. One old woman says she'll pray about it, which is not a no.",
            },
          },
        },
        {
          ...speech,
          id: 'irongate.basilica-square.speech',
          name: 'Speak from the basilica steps',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The square listens',
              body: 'The top step after Mass, the dome behind you for a sounding board. The raids, the fever, the rents in the lanes. The canon frowns, the square laughs, and by the end the laughs are on your side.',
            },
            partial: {
              headline: 'The bells take half of it',
              body: "You're through the raids when the bells go for noon and take the rest with them. A knot of students stays to argue. The canon says next time, not on his steps.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.st-agnes',
      name: 'St Agnes Hospital',
      kind: 'hospital',
      blurb:
        "The sisters' hospital under the spire, forty beds and a queue of visitors at two. The porters carry what the sisters can't.",
      // Pin 10: the survey pin (mapPins.irongate).
      map: { x: 0.37, y: 0.31 },
      quarterId: 'irongate.old-town',
      // Review 5 (answers §8, §18 Q14): *Get patched up* on the sheet; the carer's word.
      treatment: { carer: 'sister' },
      actions: [
        {
          ...canvass,
          id: 'irongate.st-agnes.visitors',
          name: "Talk to people in the visitors' queue",
          stats: ['int'],
          text: {
            success: {
              headline: "Two o'clock, forty visitors",
              body: "Visiting is at two and the queue at the gate is anxious, patient and can't leave. You work it gently: the fever, the beds, who pays. By the time the sister opens the gate most of it has your party's line and a flyer in a basket.",
            },
            partial: {
              headline: 'The sister opens early',
              body: 'The gate opens at ten to two and the queue is gone up the steps. A few flyers go into baskets. One man says his wife is on the fever ward and takes two.',
            },
          },
        },
        {
          id: 'irongate.st-agnes.porters',
          name: 'Carry for the porters',
          tier: 1,
          type: 'training',
          trains: 'str',
          verb: 'Carry',
          text: {
            success: {
              headline: 'Stretchers up four flights',
              body: "The porters don't ask which party you're with; they ask if you can take the foot end up four flights without stopping. You can, by the end. Your back will tell you about it tomorrow.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.lantern-lane',
      name: 'Lantern Lane',
      kind: 'street',
      blurb:
        "Cafés, bookshops and a lamp at every door. The Old Town reads here, out loud, over coffee it can't afford.",
      // Pin 11: the survey pin (mapPins.irongate).
      map: { x: 0.15, y: 0.2 },
      quarterId: 'irongate.old-town',
      actions: [
        {
          ...canvass,
          id: 'irongate.lantern-lane.cafes',
          name: 'Talk to people at the café tables',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'A chair at every table',
              body: 'The pavement tables are full by ten. You work them one by one, a chair borrowed at each. The raids, the fever, the tram fare. By the third café the waiters know your name and one has taken a flyer for the kitchen.',
            },
            partial: {
              headline: 'Nobody wants company',
              body: "It's a reading morning and the tables are hidden behind the Herald. You get a word at three of them and a flyer under the saucer at the rest. One man lowers his paper to argue. That's a start.",
            },
          },
        },
        {
          ...propaganda,
          id: 'irongate.lantern-lane.bookshops',
          name: 'Leave flyers in the bookshops',
          stats: ['agi'],
          text: {
            success: {
              headline: 'Between the pages',
              body: 'Six bookshops and nobody watches the back shelves. A flyer in every second-hand novel on the political shelf, and a stack by the till where the owner will find it and, being Old Town, leave it. Someone will read them for years.',
            },
            partial: {
              headline: 'The owner finds the stack',
              body: 'Three shops done when a bookseller catches you at the political shelf and asks whose paper it is. You tell him. He keeps the stack, to sell.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.press-club',
      name: 'The Press Club',
      ref: 'the Press Club',
      kind: 'bar',
      blurb:
        "Where the Herald's reporters drink and the Alliance's lawyers listen. The Thursday debate is open to anyone who can hold the floor.",
      // Pin 12: the survey pin (mapPins.irongate).
      map: { x: 0.2, y: 0.3 },
      quarterId: 'irongate.old-town',
      actions: [
        {
          ...intelligence,
          id: 'irongate.press-club.bar',
          name: 'Listen at the club bar',
          stats: ['int'],
          energy: 3,
          text: {
            success: {
              headline: 'Reporters talk',
              body: "You buy one drink and listen to four. Which minister is out, which raid was tipped off, who the Herald won't print and why. Two names and a rumour go in your notebook.",
            },
            partial: {
              headline: 'A quiet night',
              body: "Two reporters and a crossword. One thing worth writing down, about a raid that hasn't happened yet. Come back on press night.",
            },
          },
        },
        {
          ...speech,
          id: 'irongate.press-club.debate',
          name: 'Speak at the Thursday debate',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The house votes',
              body: 'The Thursday debate takes anyone who can hold the floor for ten minutes against reporters. You hold it for twelve: the raids, the warrant, the right to print. The house votes and the proposal carries. A leader-writer asks your name.',
            },
            partial: {
              headline: 'Points of order',
              body: 'Six minutes in, the reporters start raising points of order for the sport of it and the chair enjoys them. The proposal is lost by four. Two young ones ask for a flyer on the way out.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.market-square',
      name: 'Market Square',
      kind: 'market',
      blurb:
        'Striped awnings round a column, bread, fish, bootlaces, and the tram queue that has an opinion on everything.',
      // Pin 13: the survey pin (mapPins.irongate).
      map: { x: 0.49, y: 0.595 },
      quarterId: 'irongate.station-market',
      actions: [
        {
          ...canvass,
          id: 'irongate.market-square.tram-queue',
          name: 'Talk to people in the tram queue',
          stats: ['int'],
          text: {
            success: {
              headline: 'The queue has time to talk',
              body: 'Forty people and one tram every ten minutes. You work the line with the fare table in one hand and the flyer in the other. By the time the tram comes, half the queue knows what your party would do about the penny.',
            },
            partial: {
              headline: 'The tram comes early',
              body: "You're three people in when the tram pulls up and the queue becomes a scrum. A few flyers go into shopping bags. One old man folds his and says he'll read it on the tram, standing.",
            },
          },
        },
        {
          ...speech,
          id: 'irongate.market-square.speech',
          name: 'Speak from the market column',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'A crowd at the column',
              body: "The column's plinth between the fish stall and the tram stop. The fare, the bread queue, who pays and who doesn't. The stallholders heckle, the crowd laughs, and by the end the laughs are on your side.",
            },
            partial: {
              headline: 'The tram takes half of them',
              body: "You've a decent crowd until the number 4 pulls in and takes most of it. You finish for the stallholders and a policeman who looks bored. The fishmonger gives you a nod.",
            },
          },
        },
        {
          ...propaganda,
          id: 'irongate.market-square.leaflets',
          name: 'Hand out flyers between the stalls',
          stats: ['agi'],
          text: {
            success: {
              headline: 'Quick hands, empty bag',
              body: 'You work the aisles at a trot, a flyer into every basket before its owner has noticed. The bag is empty in ten minutes and the market beadle never sees you.',
            },
            partial: {
              headline: 'The beadle sees you',
              body: "Half the bag is gone when the beadle plants himself in the aisle and asks about your permit. You leave by the fish stall, slower than you'd like. The flyers you handed out are still out there.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.tram-junction',
      name: 'Tram Junction',
      ref: 'the Tram Junction',
      kind: 'square',
      blurb:
        'Every line in the capital crosses here. Trams to all five districts, instant and free, and a shelter on every corner for posters.',
      // Pin 14: the survey pin (mapPins.irongate).
      map: { x: 0.43, y: 0.68 },
      quarterId: 'irongate.station-market',
      // Review 4 #9 (answers §9.3): the paid bed, off the residence card and onto a place.
      lodgings: { line: 'A bed on the tram line · 7 nights · 100 Iron' },
      actions: [
        {
          ...canvass,
          id: 'irongate.tram-junction.canvass',
          name: 'Talk to people on the platforms',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'Five platforms, five districts',
              body: 'Every line crosses here and every platform is a district waiting. You work them in turn, a different first sentence for the Hill and the Quays. By the last tram the flyers are in five districts and so is your name.',
            },
            partial: {
              headline: 'The trams keep coming',
              body: "You can't hold a platform for a minute before a tram takes it. Flyers go into hands and away. One conductor takes a bundle for the depot, which is more than you'd planned.",
            },
          },
        },
        {
          ...propaganda,
          id: 'irongate.tram-junction.posters',
          name: 'Put up posters on the tram shelters',
          stats: ['str'],
          text: {
            success: {
              headline: 'A shelter on every corner',
              body: "Bucket, brush and eight shelters. You get a poster up in each, high enough that nobody's tearing it down without a ladder. Every tram queue in the capital will read them by noon.",
            },
            partial: {
              headline: "The paste won't hold",
              body: 'Rain, and paste that runs off the glass. Three posters stay up; the rest go under the trams. Three is three, and one is on the Hill platform.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.central-station',
      name: 'Central Station',
      kind: 'station',
      blurb:
        'Three glass arches and every train in the republic. Arrivals at the barrier, porters on the platforms, the boards changing overhead.',
      // Pin 15: the survey pin (mapPins.irongate).
      map: { x: 0.35, y: 0.555 },
      quarterId: 'irongate.station-market',
      actions: [
        {
          ...canvass,
          id: 'irongate.central-station.arrivals',
          name: 'Talk to people in the arrivals hall',
          stats: ['int'],
          text: {
            success: {
              headline: 'Every train in the republic',
              body: 'The barrier at the arrivals hall, where the whole republic comes through with a case in each hand. You work the queue for the cabs: Coalport voices, Duskwall coats, Ashford collars. Everyone takes a flyer to read on the tram.',
            },
            partial: {
              headline: 'The porters move you on',
              body: "The stationmaster's man asks for your permit and you work the cab rank instead. A few flyers go into gloves. A woman from Ashford says she'd heard the capital was like this.",
            },
          },
        },
        {
          ...intelligence,
          id: 'irongate.central-station.boards',
          name: 'Watch the platforms',
          stats: ['int'],
          energy: 4,
          text: {
            success: {
              headline: 'Who came in on the 14:10',
              body: "A bench by the boards and a paper you don't read. Who met the Duskwall train, who got off the Coalport one with a parcel, which platform the police watched. Three names go in your notebook.",
            },
            partial: {
              headline: 'Nothing on the boards',
              body: 'Two trains late and nobody worth meeting. One name, off the Ashford train and into a ministry car. Not nothing.',
            },
          },
        },
        {
          id: 'irongate.central-station.platforms',
          name: 'Run the platforms for the stationmaster',
          tier: 1,
          type: 'training',
          trains: 'agi',
          verb: 'Run',
          text: {
            success: {
              headline: 'Twelve platforms, one hour',
              body: 'The stationmaster wants messages run between the platforms faster than the trains, and pays in nothing. You learn the subways, the short cuts and the barriers you can vault. By the end you could do it in the dark.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.grand-hotel',
      name: 'The Grand Hotel',
      ref: 'the Grand Hotel',
      kind: 'hotel',
      blurb:
        "The tall stone hotel at the junction, where deputies dine and lobbyists wait in the lobby with a paper they aren't reading.",
      // Pin 16: the survey pin (mapPins.irongate).
      map: { x: 0.45, y: 0.62 },
      quarterId: 'irongate.station-market',
      actions: [
        {
          ...canvass,
          id: 'irongate.grand-hotel.lobby',
          name: 'Talk to people in the lobby',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'Waiting rooms vote too',
              body: "The lobby is full of people waiting for someone important and pretending not to. You work the armchairs with a coat that passes. A deputy's secretary takes a flyer for her employer, and one for herself.",
            },
            partial: {
              headline: 'The hall porter has a view',
              body: 'The hall porter watches you cross the lobby and meets you at the third armchair. You get two flyers out on the way to the door. One lobbyist follows you out to argue, which he does for a living.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.bombed-blocks',
      name: 'The Bombed Blocks',
      ref: 'the Bombed Blocks',
      kind: 'street',
      blurb:
        'The block behind the market the war gutted: roofless shells, a street of sound houses beside them. Repair crews by day, families in the sound halves, boards round the rest.',
      // Pin 17: the survey pin (mapPins.irongate).
      map: { x: 0.555, y: 0.62 },
      quarterId: 'irongate.station-market',
      actions: [
        {
          ...canvass,
          id: 'irongate.bombed-blocks.crews',
          name: 'Talk to the repair crews',
          stats: ['str'],
          text: {
            success: {
              headline: 'They stop for one who can lift',
              body: "The crews knock off at four with dust to the knees. You've the shoulders for it, so they stop. Rents, the evictions, who's rebuilding what for whom. A ganger takes ten flyers for the yard hut.",
            },
            partial: {
              headline: 'The whistle goes early',
              body: "The crews are away to the buffet before you've said rent. You press flyers on the stragglers. One says his sister's on Foundry Row and takes two.",
            },
          },
        },
        {
          ...propaganda,
          id: 'irongate.bombed-blocks.hoardings',
          name: 'Chalk the boards round the ruins',
          stats: ['agi'],
          text: {
            success: {
              headline: 'Letters a yard high',
              body: "The boards round the gutted shells are the biggest wall in the district. You get your party's name up in fair capitals and ROOFS BEFORE RENTS beneath it before the watchman comes round. Then you're away down the entry.",
            },
            partial: {
              headline: 'Half a board',
              body: 'You get the name up before a window goes up and someone shouts about the noise. You finish small and leave by the yard. It reads, just about.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.station-buffet',
      name: 'The Station Buffet',
      ref: 'the Station Buffet',
      kind: 'bar',
      blurb:
        'The buffet under the east arch: coffee at dawn, beer at midnight, and the night shift from three districts at the same tables.',
      // Pin 18: the survey pin (mapPins.irongate).
      map: { x: 0.4, y: 0.585 },
      quarterId: 'irongate.station-market',
      actions: [
        {
          ...intelligence,
          id: 'irongate.station-buffet.counter',
          name: 'Listen at the buffet counter',
          stats: ['int'],
          energy: 3,
          text: {
            success: {
              headline: 'Three districts at one counter',
              body: "The night shift from the quays, the station and the Hill drink here at the same counter and talk across it. Which crane is stopped, which platform is watched, who's leaving the Hill. Two names in the notebook.",
            },
            partial: {
              headline: 'Coffee and the racing page',
              body: 'A slow night and a counterman who says nothing to anyone. One thing worth writing down, from a porter who talks in his sleep. Come back at midnight.',
            },
          },
        },
        {
          ...speech,
          id: 'irongate.station-buffet.tables',
          name: 'Speak to the night-shift tables',
          stats: ['cha', 'str'],
          text: {
            success: {
              headline: 'Midnight, and they put their cups down',
              body: "You stand on a chair at midnight and speak to twenty tables of men who've earned the right not to listen. You keep it to wages and the fare. They put their cups down. That's the compliment here.",
            },
            partial: {
              headline: 'The counterman objects',
              body: 'You get through the fare before the counterman says chairs are for sitting. Half the tables heard you. One porter says come back tomorrow, same chair.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.union-house',
      name: 'Union House',
      kind: 'faction-hq',
      blurb:
        "The Collective's capital office, a yellow terrace above the quays. Committee upstairs; the duplicator never stops.",
      // Pin 19: the survey pin (mapPins.irongate).
      map: { x: 0.56, y: 0.66 },
      quarterId: 'irongate.eastside',
      factionId: 'collective',
      actions: [
        {
          ...council,
          id: 'irongate.union-house.committee',
          name: 'Go to the capital meeting',
          stats: ['best'],
          text: {
            success: {
              headline: 'Minutes taken, proposal carried',
              body: 'Tea, a wall map of the quays stuck with pins, and a chairman who likes short answers. The committee wants the Eastside lists redone by stair and you say how. Your name goes in the minutes. In this house, that counts.',
            },
            partial: {
              headline: 'A long meeting',
              body: "Two hours on the stair lists and the price of paper. You get one point in before the chairman moves on. Secretary Holm's man marks you present, which is what matters this week.",
            },
          },
        },
        {
          ...propaganda,
          id: 'irongate.union-house.duplicator',
          name: 'Print five hundred flyers',
          stats: ['int'],
          text: {
            success: {
              headline: 'Five hundred copies, still wet',
              body: 'The stencil holds and the drum turns. Five hundred bulletins in an hour, stacked for the runners to the quays. Your hands are purple to the wrist and the room smells of spirit.',
            },
            partial: {
              headline: 'The stencil tears',
              body: 'The stencil tears at copy two hundred and the rest come out ghosted. Half a stack goes out; the other half goes in the stove. Somebody shows you how to cut the next one.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.riverside-quays',
      name: 'Riverside Quays',
      kind: 'docks',
      blurb:
        'Cranes, bales and barges on the east bank. The dockers eat on the bollards at noon and the lorries queue to the bridge.',
      // Pin 20: the survey pin (mapPins.irongate).
      map: { x: 0.68, y: 0.58 },
      quarterId: 'irongate.eastside',
      actions: [
        {
          ...canvass,
          id: 'irongate.riverside-quays.dockers',
          name: 'Talk to the dockers at the break',
          stats: ['str'],
          text: {
            success: {
              headline: 'They make room on the bollard',
              body: "The dockers eat on the bollards with their backs to the river. You've the hands for the work and it shows, so they make room. By the whistle the gang has agreed to send two men to your party's office.",
            },
            partial: {
              headline: 'Bread and silence',
              body: 'The gang eats and lets you talk. A couple of nods, one argument about the strike that goes nowhere. The ganger takes a flyer for later.',
            },
          },
        },
        {
          ...speech,
          id: 'irongate.riverside-quays.bale',
          name: 'Speak from a bale',
          stats: ['cha', 'str'],
          text: {
            success: {
              headline: 'A bale for a platform',
              body: 'A cotton bale, a crane for a backdrop and two hundred dockers at the break. The strike, the rates, who owns the cranes. Nobody heckles a voice that carries over a crane. The ganger nods when you climb down.',
            },
            partial: {
              headline: 'The crane starts up',
              body: 'You get through the rates before the crane starts and takes the rest of it. A knot of lads at the back stays to argue. The ganger looks at his watch.',
            },
          },
        },
        {
          ...intelligence,
          id: 'irongate.riverside-quays.manifests',
          name: 'Note which barges carry what',
          stats: ['int'],
          energy: 3,
          text: {
            success: {
              headline: 'Barges, firms, times',
              body: "A bollard, a pencil and the checker's hut in view. Three barges for one firm, two sealed, one that unloads without a stamp. It goes in your notebook for later.",
            },
            partial: {
              headline: 'Nothing much moves',
              body: 'An hour on the bollard and one barge, checked, stamped and moored. A firm and a time. Not nothing.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.ironworks-gate',
      name: 'The Ironworks Gate',
      ref: 'the Ironworks Gate',
      kind: 'factory-gate',
      blurb:
        'The gate of the works under the chimneys. Three shifts a day, and the wall beside it takes a poster well.',
      // Pin 21: the survey pin (mapPins.irongate).
      map: { x: 0.8, y: 0.6 },
      quarterId: 'irongate.eastside',
      actions: [
        {
          ...canvass,
          id: 'irongate.ironworks-gate.canvass',
          name: 'Talk to the workers coming off shift',
          stats: ['str'],
          text: {
            success: {
              headline: 'The hooter goes, and they stop',
              body: "You're at the gate before the shift comes off. Soot, tired faces, no time for speeches. But the flyers go hand to hand, and a foreman says come back Thursday. That's how a district is won.",
            },
            partial: {
              headline: 'Most of them walk past',
              body: 'The shift comes off in a hurry and most of it heads for the bridge. You press flyers on the ones who slow down. Two stop to argue; one gives you his stair.',
            },
          },
        },
        {
          ...propaganda,
          id: 'irongate.ironworks-gate.posters',
          name: 'Put up posters on the works wall',
          stats: ['str'],
          text: {
            success: {
              headline: "A wall's length of paper",
              body: 'Bucket, brush and a hundred yards of works wall. You get twelve posters up straight and high, one to every bay. Three shifts a day will read them, and the lorries from the quays.',
            },
            partial: {
              headline: "The paste won't hold",
              body: "The wind off the river is against you and the paste won't take on the sooted brick. Five posters stay up; the rest go in the gutter. Five is five.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.red-lantern',
      name: 'The Red Lantern',
      ref: 'the Red Lantern',
      kind: 'bar',
      blurb:
        "The dockers' bar at the end of the quays. A lamp, a piano nobody plays, and every rumour from the river.",
      // Pin 22: the survey pin (mapPins.irongate).
      map: { x: 0.92, y: 0.66 },
      quarterId: 'irongate.eastside',
      actions: [
        {
          ...intelligence,
          id: 'irongate.red-lantern.listen',
          name: 'Listen at the bar',
          stats: ['int'],
          energy: 3,
          text: {
            success: {
              headline: 'The river talks',
              body: "You buy one drink and listen to the quays. Which barge came in sealed, which ganger is out, who's collecting for the strike and who's collecting for himself. Two names and a rumour in the notebook.",
            },
            partial: {
              headline: 'A quiet night',
              body: "Two dockers and the piano nobody plays. One thing worth writing down, about a crane that'll stop on Monday. Come back on pay night.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.foundry-row',
      name: 'Foundry Row',
      kind: 'street',
      blurb:
        'Tenements four floors round a yard, between the works and the river. Washing lines, children, and a landlord who never comes.',
      // Pin 23: the survey pin (mapPins.irongate).
      map: { x: 0.7, y: 0.72 },
      quarterId: 'irongate.eastside',
      actions: [
        {
          ...canvass,
          id: 'irongate.foundry-row.canvass',
          name: 'Knock on doors',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The kettle goes on',
              body: 'Sixty doors up four flights. Most open a crack; a dozen open wide, and at three the kettle goes on. The notices, the rent, the landlord nobody has met. You leave with a list of names and a stair that will turn out.',
            },
            partial: {
              headline: 'Doors on the chain',
              body: "It's tea-time and the doors stay on the chain. You get the flyer through the gap and a word with the ones on the landing. One woman says her husband's on the quays already. Come back Sunday.",
            },
          },
        },
        {
          id: 'irongate.foundry-row.run',
          name: 'Run messages up and down the stairs',
          tier: 1,
          type: 'training',
          trains: 'agi',
          verb: 'Run',
          text: {
            success: {
              headline: 'Every stair in the Row',
              body: 'Six notes, four stairwells, one hour. You learn which landings connect and which end in a locked door, and you learn them at a run. By the end you could do it in the dark.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.iron-bridge',
      name: 'The Iron Bridge',
      ref: 'the Iron Bridge',
      kind: 'square',
      blurb:
        'The lattice bridge the tram crosses. At the shift change the whole east bank walks over it, and a speech at the bridge end carries both ways.',
      // Pin 24: the survey pin (mapPins.irongate).
      map: { x: 0.62, y: 0.5 },
      quarterId: 'irongate.eastside',
      actions: [
        {
          ...speech,
          id: 'irongate.iron-bridge.speech',
          name: 'Speak from the bridge end',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'Both banks hear it',
              body: 'The bridge end at the shift change, the river for a sounding board and the whole east bank walking past. The strike, the evictions, the fare. Both banks slow down. A tram conductor rings his bell for you, twice.',
            },
            partial: {
              headline: 'The tram takes half of them',
              body: "You've a decent crowd until the tram comes over and takes most of it. You finish for the ones on foot and a policeman who looks bored. A docker gives you a nod.",
            },
          },
        },
        {
          ...propaganda,
          id: 'irongate.iron-bridge.leaflets',
          name: 'Hand out flyers on the bridge at the shift change',
          stats: ['agi'],
          text: {
            success: {
              headline: 'A thousand across the river',
              body: "The shift comes over the bridge at four in a body and can't stop. You stand at the narrow end and put a flyer into every hand that passes. The bag is empty before the crowd is.",
            },
            partial: {
              headline: 'The wind off the river',
              body: 'Half the bag goes into hands and half into the river when the wind gets up. The ones that stayed dry are still out there. One docker fishes his out of the water and reads it anyway.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.vanguard-house',
      name: 'Vanguard House',
      kind: 'faction-hq',
      blurb:
        "The Vanguard's capital office and club, a red quadrangle round a formal garden. Committee in the long room; the gymnasium in the wing.",
      // Pin 25: the survey pin (mapPins.irongate).
      map: { x: 0.88, y: 0.07 },
      quarterId: 'irongate.garrison-hill',
      factionId: 'vanguard',
      actions: [
        {
          ...council,
          id: 'irongate.vanguard-house.committee',
          name: 'Go to the capital meeting',
          stats: ['best'],
          text: {
            success: {
              headline: 'Minutes taken, proposal carried',
              body: 'Coffee, a district map stuck with pins, and a chairman who likes short answers. The committee wants the Hill lists redone by street and you say how. Your name goes in the minutes. In this house, that counts.',
            },
            partial: {
              headline: 'A long meeting',
              body: "Two hours on the Hill lists and the price of paper. You get one point in before the chairman moves on. Organiser Stahl's man marks you present, which is what matters this week.",
            },
          },
        },
        {
          id: 'irongate.vanguard-house.gymnasium',
          name: 'Train in the gymnasium',
          tier: 1,
          type: 'training',
          trains: 'str',
          verb: 'Lift',
          text: {
            success: {
              headline: 'An hour in the wing',
              body: "The club's gymnasium is ropes, bars and a man who counts out loud. He doesn't ask about the district; he asks for ten more. You give him ten more. Your shoulders will tell you about it tomorrow.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.police-hq',
      name: 'Police Headquarters',
      kind: 'ministry',
      blurb:
        "The old citadel, now the republic's police headquarters. Permits at the gatehouse, a queue by nine, and a gazette on the wall.",
      // Pin 26: the survey pin (mapPins.irongate).
      map: { x: 0.78, y: 0.215 },
      quarterId: 'irongate.garrison-hill',
      actions: [
        {
          ...canvass,
          id: 'irongate.police-hq.permits',
          name: 'Talk to people in the permits queue',
          stats: ['int'],
          text: {
            success: {
              headline: 'A queue for everything',
              body: 'Permits for stalls, for meetings, for a room to let: the queue at the gatehouse is the whole Hill by nine. You work it with the flyer and the case for fewer permits, or more, depending on the party. It listens; it has nothing else to do.',
            },
            partial: {
              headline: 'The duty officer has a view',
              body: 'The duty officer looks at your flyers and then at the door. You work the end of the queue on the pavement. One clerk takes two, one for the office, and says nothing.',
            },
          },
        },
        {
          ...intelligence,
          id: 'irongate.police-hq.gazette',
          name: 'Read the police notices',
          stats: ['int'],
          energy: 4,
          text: {
            success: {
              headline: 'Names on the wall',
              body: "The gazette on the gatehouse wall lists the week's warrants, permits refused and rooms searched. Two names and an address go in your notebook while the duty officer is on the telephone.",
            },
            partial: {
              headline: "Last week's sheet",
              body: "The gazette is last week's and the duty officer is watching. One name worth writing down, from the permits refused. Come back on Monday.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.esplanade',
      name: 'The Esplanade',
      ref: 'the Esplanade',
      kind: 'square',
      blurb:
        'The open ground below the citadel walls. The town walks here on Sundays, the band plays at three, and the tram terminus is at the gate.',
      // Pin 27: the survey pin (mapPins.irongate).
      map: { x: 0.91, y: 0.17 },
      quarterId: 'irongate.garrison-hill',
      actions: [
        {
          ...canvass,
          id: 'irongate.esplanade.canvass',
          name: 'Talk to the Sunday walkers',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The whole Hill takes the air',
              body: "On Sunday the Hill walks the Esplanade in its second-best coat and can't hurry. You work the benches and the bandstand rail: the curfew, the census, who runs the Hill. By three, half the Esplanade has a flyer in a pocket.",
            },
            partial: {
              headline: 'The band starts',
              body: "The band strikes up at three and takes the Esplanade's attention with it. A few flyers go into gloves. One retired clerk says he'll read it after the march, which is a tune.",
            },
          },
        },
        {
          ...speech,
          id: 'irongate.esplanade.bandstand',
          name: 'Speak from the bandstand',
          stats: ['cha', 'str'],
          text: {
            success: {
              headline: "Between the band's numbers",
              body: 'The bandstand is empty between numbers and nobody has told you not to. The curfew, the census, the rents on the Hill road. The Hill listens the way it does everything, in order. The bandmaster lets you finish before he lifts his baton.',
            },
            partial: {
              headline: 'The band drowns the end of it',
              body: "You get through the curfew before the band decides it's time and plays you off. A knot of clerks at the rail stays to argue. The bandmaster looks at his watch.",
            },
          },
        },
        {
          ...propaganda,
          id: 'irongate.esplanade.leaflets',
          name: 'Hand out flyers at the tram terminus',
          stats: ['agi'],
          text: {
            success: {
              headline: 'Every tram down the Hill',
              body: "The terminus at the gate, a tram every six minutes and a queue that can't leave. You work it at a trot, a flyer into every hand. The bag is empty in ten minutes and the inspector never sees you.",
            },
            partial: {
              headline: 'The inspector sees you',
              body: "Half the bag is gone when the tram inspector asks for your permit, on the Hill, where they mean it. You leave by the Esplanade, slower than you'd like. The flyers you handed out are still out there.",
            },
          },
        },
      ],
    },
    {
      id: 'irongate.villas',
      name: 'The Villas',
      ref: 'the Villas',
      kind: 'street',
      blurb:
        "Officials' villas behind garden walls on the road up the Hill. Bells, maids, and a view of the town they administer.",
      // Pin 28: the survey pin (mapPins.irongate).
      map: { x: 0.82, y: 0.12 },
      quarterId: 'irongate.garrison-hill',
      actions: [
        {
          ...canvass,
          id: 'irongate.villas.canvass',
          name: "Knock on the villas' doors",
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The maids open the doors',
              body: 'Twenty villas, twenty bells, twenty maids. You have a coat that passes and a flyer that argues, and at six of them the mistress comes to the door herself. The Hill decides things over tea. Today one of them is your party.',
            },
            partial: {
              headline: "Tradesmen's entrance",
              body: "The maids take the flyer at the side door and close it. One mistress reads hers on the step and says the party has some sense, for once. That's the Hill's way of saying maybe.",
            },
          },
        },
        {
          ...propaganda,
          id: 'irongate.villas.bills',
          name: 'Put up posters on the garden walls',
          stats: ['str'],
          text: {
            success: {
              headline: 'A wall a villa',
              body: 'Bucket, brush and the long garden walls of the Hill road. You get a bill on every wall, high and straight, before the first gardener is out. The Hill will read them from its carriages.',
            },
            partial: {
              headline: 'A gardener with a hose',
              body: 'Five bills up when a gardener comes out with a hose and a view about walls. Five stay up, wet. The rest go home in the bucket.',
            },
          },
        },
      ],
    },
    {
      id: 'irongate.gate-tavern',
      name: 'The Gate Tavern',
      ref: 'the Gate Tavern',
      kind: 'bar',
      blurb:
        'The tavern by the Hill Gate where the tram turns. Clerks from headquarters, gardeners from the villas, and talk that stops when you sit down.',
      // Pin 29: the survey pin (mapPins.irongate).
      map: { x: 0.86, y: 0.27 },
      quarterId: 'irongate.garrison-hill',
      actions: [
        {
          ...intelligence,
          id: 'irongate.gate-tavern.listen',
          name: 'Listen at the tavern',
          stats: ['int'],
          energy: 3,
          text: {
            success: {
              headline: 'Talk that stops, then starts again',
              body: "Clerks from headquarters and gardeners from the villas, and talk that stops when you sit down and starts again when you buy a round. Which permits are refused, which villa is empty, who's leaving the Hill. Two names in the notebook.",
            },
            partial: {
              headline: 'Only the gardeners',
              body: "The clerks aren't in and the gardeners talk about roses. One thing worth writing down, about a villa that's been let to a ministry. Come back on pay night.",
            },
          },
        },
        {
          ...speech,
          id: 'irongate.gate-tavern.speech',
          name: 'Speak to the tavern',
          stats: ['cha', 'str'],
          text: {
            success: {
              headline: 'The back room fills',
              body: "The landlord gives you the back room and the front room follows. The curfew, the census, the fare down the Hill. Nobody heckles here; they wait, and then they ask questions in order. That's the compliment on the Hill.",
            },
            partial: {
              headline: 'The landlord calls time',
              body: "You get through the curfew before the landlord calls time on politics in his house. Half the room heard you. A clerk says he'll bring his brother next week.",
            },
          },
        },
      ],
    },
    // Review 4 (answers §11.1, ADR 0077): the council's hall, a place open at every Level; appended
    // last so no pin renumbers (answers §29 Q10). Its pin is the survey's.
    townHall({
      id: 'irongate.city-hall',
      name: 'City Hall',
      ref: 'the City Hall',
      blurb:
        "Baroque, copper-domed, between Parliament and the Opera: the capital's own council, ten seats from five districts, and the rule they can agree on, when they can.",
      map: { x: 0.57, y: 0.345 },
      quarterId: 'irongate.government-quarter',
    }),
  ], irongateMissions),
  // Slice 5 (design §8.1, §9.2): where the game sends a player in this city.
  services: { cells: 'irongate.police-hq', infirmary: 'irongate.st-agnes' },
};
