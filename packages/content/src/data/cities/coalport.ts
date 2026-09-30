import type { City } from '../../schemas';

/**
 * Coalport, home city of the Collective (GDD §14.1, §14.11). Locations, actions and text:
 * docs/design/slice-1-content.md §1–§2 (the Mill Gate canvass is the slice-0 text, unchanged).
 * Rewards are not data: they follow from the type and Energy at the §5.5 rates.
 */

const canvass = { tier: 1, type: 'canvass', energy: 10, givesFxp: true, givesOpinion: true } as const;
const speech = { tier: 1, type: 'speech', energy: 12, givesFxp: true, givesOpinion: true } as const;
const propaganda = { tier: 1, type: 'propaganda', energy: 8, givesFxp: true, givesOpinion: true } as const;
const intelligence = { tier: 1, type: 'intelligence', givesFxp: false, givesOpinion: false } as const;

export const coalport: City = {
  id: 'coalport',
  name: 'Coalport',
  role: 'home',
  homeFactionId: 'collective',
  // §14.11 baseline, pinned for Coalport.
  baselineOpinion: { vanguard: 9, collective: 70, alliance: 6, neutral: 15 },
  map: { day: 'map.coalport.day', night: 'map.coalport.night' },
  paper: {
    name: 'The Coalport Clarion',
    shortName: 'Clarion',
    strapline: 'The voice of the mill and the quays',
    price: '5 marks',
  },
  // Slice 3 (GDD §2): the council cycle's offset (Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4).
  council: { offset: 2, seats: 7 },
  locations: [
    {
      id: 'coalport.mill-gate',
      name: 'Mill Gate',
      ref: 'the Mill Gate',
      kind: 'factory-gate',
      blurb:
        'The gates of the Coalport Steel Mill. Three shifts a day, and every one of them walks past here.',
      map: { x: 0.36, y: 0.44 },
      actions: [
        {
          ...canvass,
          id: 'coalport.mill-gate.canvass',
          name: 'Talk to the workers coming off shift',
          stats: ['int'],
          text: {
            success: {
              headline: 'The whistle goes, and they stop',
              body: "You're at the gate before the shift comes off. Coal dust, tired faces, no time for speeches. But the flyers go hand to hand, and a foreman says come back Thursday. That's how a street is won.",
            },
            partial: {
              headline: 'Most of them walk past',
              body: 'The shift comes off in a hurry and most of it heads straight for the tram. You press flyers on the ones who slow down. Two stop to argue; one gives you his street. A start, not a win.',
            },
          },
        },
        {
          ...speech,
          id: 'coalport.mill-gate.speech',
          name: 'Speak from the gate steps',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'Two hundred faces, and they listen',
              body: "You climb the gate steps as the hooters go. Wages, the coal ration, the foreman's book: you keep it short and you keep it theirs. When you come down, a woman from the rolling mill shakes your hand and asks when the next meeting is.",
            },
            partial: {
              headline: 'The hooter drowns the end of it',
              body: 'You get through wages and the ration before the second hooter goes and the crowd breaks for the trams. A knot of lads at the back stays to argue, which is something. Next time, start earlier.',
            },
          },
        },
      ],
    },
    {
      id: 'coalport.market-row',
      name: 'Market Row',
      kind: 'market',
      blurb:
        'Striped awnings between the mill and the quay. Bread, fish, bootlaces, and every opinion in Coalport, out loud.',
      map: { x: 0.43, y: 0.5 },
      actions: [
        {
          ...canvass,
          id: 'coalport.market-row.canvass',
          name: 'Talk to people in the bread queue',
          stats: ['int'],
          text: {
            success: {
              headline: 'The queue has time to talk',
              body: "Forty people and one baker's window. You work the line with the price list in one hand and the flyer in the other. By the time the shutters go up, half the queue knows what the Collective would do about the flour ration.",
            },
            partial: {
              headline: 'The loaves come out early',
              body: "You're three people in when the shutters go up and the queue becomes a scrum. A few flyers go into shopping bags. One old man folds his carefully and says he'll read it after his tea.",
            },
          },
        },
        {
          ...speech,
          id: 'coalport.market-row.speech',
          name: 'Speak from the market cross',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'A crowd at the cross',
              body: "You get up on the plinth between the fish stall and the tram stop. Prices, rents, who pays and who doesn't. The stallholders heckle, the crowd laughs, and by the end the laughs are on your side.",
            },
            partial: {
              headline: 'The tram takes half of them',
              body: "You've a decent crowd until the number 4 pulls in and takes most of it. You finish for the stallholders and a policeman who looks bored. The fishmonger gives you a nod. It's a start.",
            },
          },
        },
        {
          ...propaganda,
          id: 'coalport.market-row.leaflets',
          name: 'Hand out flyers between the stalls',
          stats: ['agi'],
          text: {
            success: {
              headline: 'Quick hands, empty bag',
              body: 'You work the aisles at a trot, a flyer into every basket before its owner has noticed. The bag is empty in ten minutes and the market inspector never sees you.',
            },
            partial: {
              headline: 'The inspector sees you',
              body: "Half the bag is gone when the market inspector plants himself in the aisle and asks about your permit. You leave by the fish stall, slower than you'd like. The flyers you handed out are still out there.",
            },
          },
        },
      ],
    },
    {
      id: 'coalport.union-hall',
      name: 'Union Hall',
      kind: 'faction-hq',
      blurb:
        "The Collective's hall: columns out front, smoke and a mimeograph inside. The branch committee sits in the back room.",
      map: { x: 0.66, y: 0.3 },
      actions: [
        {
          id: 'coalport.union-hall.committee',
          name: 'Go to the branch meeting',
          tier: 1,
          type: 'council',
          stats: ['best'],
          energy: 10,
          givesFxp: true,
          givesOpinion: false,
          text: {
            success: {
              headline: 'Minutes taken, proposal carried',
              body: "Smoke, coffee, and a mimeograph that never stops. The committee wants the street lists redone by district and you're the one who says how. Your name goes in the minutes. In this hall, that counts.",
            },
            partial: {
              headline: 'A long meeting',
              body: 'Two hours on the street lists and the price of paper. You get one point in before the chair moves on. The secretary marks you present, which is what matters this week.',
            },
          },
        },
        {
          ...propaganda,
          id: 'coalport.union-hall.mimeograph',
          name: 'Print five hundred flyers',
          stats: ['int'],
          text: {
            success: {
              headline: 'Five hundred copies, still wet',
              body: 'The stencil holds and the drum turns. Five hundred flyers in an hour, stacked for the morning runners. Your hands are purple to the wrist and the hall smells of spirit.',
            },
            partial: {
              headline: 'The stencil tears',
              body: 'The stencil tears at copy two hundred and the rest of the run comes out ghosted. Half a stack goes out; the other half goes in the stove. The secretary shows you how to cut the next one.',
            },
          },
        },
        {
          id: 'coalport.union-hall.reading-room',
          name: 'Study in the reading room',
          tier: 1,
          type: 'training',
          trains: 'int',
          text: {
            success: {
              headline: 'An evening with the pamphlets',
              body: "The reading room is cold and the light is bad, but the shelves have everything from the factory acts to the price of coal in 1913. You leave knowing the argument better than the man who'll make it against you.",
            },
          },
        },
      ],
    },
    {
      id: 'coalport.terraces',
      name: 'Foundry Row',
      kind: 'street',
      blurb:
        'Row on row of brick terraces above the mill. Washing lines, children, and doors that open for the right accent.',
      map: { x: 0.6, y: 0.14 },
      actions: [
        {
          ...canvass,
          id: 'coalport.terraces.canvass',
          name: 'Knock on doors',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'The kettle goes on',
              body: 'Sixty doors in the long terrace. Most open a crack; a dozen open wide, and at three of them the kettle goes on. You leave with a list of names and the name of the man who collects the rent.',
            },
            partial: {
              headline: 'Doors on the chain',
              body: "It's tea-time and the doors stay on the chain. You get the flyer through the gap and a word with the ones who stand on the step. One woman says her husband's in the Union already. Come back after the shift.",
            },
          },
        },
        {
          ...propaganda,
          id: 'coalport.terraces.chalk',
          name: 'Chalk the slogan on the end wall',
          stats: ['agi'],
          text: {
            success: {
              headline: 'White letters on the gable end',
              body: "The gable end at the top of the terrace is the biggest wall in the district. You get the whole slogan up in fair capitals before the rent-man's boy comes round the corner, and you're away down the entry.",
            },
            partial: {
              headline: 'Half a slogan',
              body: 'You get as far as BREAD AND before a window goes up and someone shouts about their wall. You finish the last word small and leave by the back entry. It reads, just about.',
            },
          },
        },
        {
          id: 'coalport.terraces.run',
          name: 'Run messages around the streets',
          tier: 1,
          type: 'training',
          trains: 'agi',
          text: {
            success: {
              headline: 'Every entry in the district',
              body: 'Six notes, five streets, one hour. You learn which entries connect and which end in a wall, and you learn them at a run. By the end you could do it in the dark.',
            },
          },
        },
      ],
    },
    {
      id: 'coalport.quays',
      name: 'Harbour Quays',
      kind: 'docks',
      blurb:
        'Warehouses, cranes and the coal barges. The dockers eat on the quay with their backs to the wind.',
      map: { x: 0.5, y: 0.63 },
      actions: [
        {
          ...canvass,
          id: 'coalport.quays.noon-break',
          name: 'Talk to the dockers at the noon break',
          stats: ['str'],
          text: {
            success: {
              headline: 'They make room on the bollard',
              body: "The dockers eat on the quay with their backs to the wind. You've the hands for the work and it shows, so they make room on the bollard. By the time the whistle goes, the gang has agreed to send two men to the hall.",
            },
            partial: {
              headline: 'Bread and silence',
              body: "The gang eats and lets you talk. A couple of nods, one argument about the coal ration that goes nowhere. The ganger takes a flyer for later. Nobody gets up when the whistle goes, which is the dockers' way of saying maybe.",
            },
          },
        },
        {
          ...propaganda,
          id: 'coalport.quays.posters',
          name: 'Put up posters on the warehouse walls',
          stats: ['str'],
          text: {
            success: {
              headline: 'A hundred yards of brick',
              body: "Bucket, brush, and a long stretch of warehouse wall. You get twelve posters up straight and high enough that nobody's tearing them down without a ladder. Every barge coming up the river will read them.",
            },
            partial: {
              headline: "The paste won't hold",
              body: "The wind off the river is against you and the paste won't hold on the wet brick. Five posters stay up; the rest go into the water. Five is five.",
            },
          },
        },
        {
          id: 'coalport.quays.haul',
          name: 'Lift cargo with the dockers',
          tier: 1,
          type: 'training',
          trains: 'str',
          text: {
            success: {
              headline: 'A shift on the hooks',
              body: "You take a hook and a place on the gang and don't ask to be paid. Sacks, crates, a crate that needs four. Your shoulders will tell you about it tomorrow; that's the point.",
            },
          },
        },
        {
          ...intelligence,
          id: 'coalport.quays.customs',
          name: 'Watch the customs shed',
          stats: ['int'],
          energy: 4,
          text: {
            success: {
              headline: 'Lorries, times, names',
              body: "You sit on a bollard with a paper and a pencil and watch the customs shed. Three lorries, two of them with the same firm's name, one that leaves without stopping. It goes in your notebook for later.",
            },
            partial: {
              headline: 'Nothing much moves',
              body: 'An hour on the bollard and one lorry, which stops, gets stamped and goes. Your notebook has a name and a time. Not nothing.',
            },
          },
        },
      ],
    },
    {
      id: 'coalport.anchor',
      name: 'The Anchor',
      kind: 'bar',
      blurb:
        "Dockers' bar at the bottom of the town. The barman hears everything and sells about half of it.",
      map: { x: 0.15, y: 0.89 },
      actions: [
        {
          ...canvass,
          id: 'coalport.anchor.regulars',
          name: 'Win over the regulars',
          stats: ['cha', 'int'],
          text: {
            success: {
              headline: 'A table by the stove',
              body: "The regulars have a table by the stove and, once you've listened for a while, a place at it. You talk rents and wages and let them talk longer. By closing time two of them have asked where the branch meets.",
            },
            partial: {
              headline: 'Talked over',
              body: 'The table by the stove is louder than you are. You get a word in between the dominoes and a song. One docker wants a flyer; another wants to argue about 1919. You leave the argument where you found it.',
            },
          },
        },
        {
          ...intelligence,
          id: 'coalport.anchor.listen',
          name: 'Listen at the bar',
          stats: ['int'],
          energy: 3,
          text: {
            success: {
              headline: 'The barman hears everything',
              body: "You nurse a half and let the bar talk. Who's hiring at the yard, whose rent went up, which foreman is taking a cut. The barman catches your eye and adds a name.",
            },
            partial: {
              headline: 'A quiet night',
              body: 'Dominoes, the wireless, and two men arguing about a horse. You pick up one thing worth writing down. Come back on a Friday.',
            },
          },
        },
        {
          ...speech,
          id: 'coalport.anchor.songs',
          name: 'Lead the singing',
          stats: ['cha', 'str'],
          text: {
            success: {
              headline: 'The whole bar joins in',
              body: 'Somebody starts the old mill song and you take it up loud enough to carry. By the second verse the whole bar is in, dockers and all. Nobody remembers who started it, and everybody remembers the words.',
            },
            partial: {
              headline: 'Two verses',
              body: 'You get two verses out before the domino table wins. A few voices come in on the chorus. The barman turns the wireless down, which from him is applause.',
            },
          },
        },
      ],
    },
  ],
};
