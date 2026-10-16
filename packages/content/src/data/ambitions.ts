import type { AmbitionInput } from '../schemas';

/**
 * The three Ambitions (GDD §17.1) with chapter 1 of each (docs/design/slice-2-onboarding.md §3) and
 * the chapter-2 teasers (title and requirement only: not playable in slice 2). A chapter is
 * choose → check → result and never fails as a chapter. Story placeholders: {secretary} {hq} {city}.
 *
 * Review 5 (docs/design/review-5-answers.md §19.6, §19.10): *Coming home* re-anchors the three
 * without the father: *The Names on the Stone*, *Who Sold the Homes* and *The Ration Ledger*. The
 * ids, the ladder, the numbers, the flags and the keepsake ids are unchanged; only the strings move.
 */
const CHAPTER_1_REWARDS = {
  success: { xp: 150, fxp: 40, iron: 100 },
  partial: { xp: 75, fxp: 20, iron: 50 },
  failure: { xp: 25, fxp: 0, iron: 0 },
};
/** §19.10: chapter 1 is the envelope opened on the train (§19.4), read properly at the HQ. */
const LETTER_FROM = "From the office's post";

export const ambitions: AmbitionInput[] = [
  {
    id: 'finish-his-work',
    title: 'The Names on the Stone',
    chaptersPlanned: 12,
    chapters: [
      {
        n: 1,
        title: "The unit's list",
        story: {
          letterFrom: LETTER_FROM,
          choose: {
            title: "The unit's list",
            narrative:
              "The list, opened properly for the first time on the hall's table: forty names in the quartermaster's hand, a home street against each, and the council's notice beside it. The memorial is being cut. Their names aren't on it.",
            choices: [
              {
                id: 'show',
                text: 'Show it to {secretary}',
                hint: 'The branch will know what you carry.',
                flag: 'showed-book',
              },
              {
                id: 'keep',
                text: 'Keep it to yourself for now',
                hint: 'Some things you do alone first.',
                flag: 'kept-book',
              },
            ],
          },
          check: {
            title: 'Three families',
            narrative:
              "Three of the forty had people in {city}: the list gives a street for each. Twenty minutes' walk. You have the flyers, the list and your own name; it's a question of how you use them.",
            approaches: [
              {
                id: 'knock',
                text: 'Knock the three doors and say you were in the same unit',
                stats: ['cha', 'int'],
              },
              { id: 'sort', text: 'Sort the list by street first, then knock', stats: ['int'] },
              // Review 1 (answers §2.1): a third approach on the best trained stat.
              {
                id: 'legwork',
                text: 'Legwork. Walk the three streets yourself, list in hand, and knock until the names answer.',
                stats: ['best'],
              },
            ],
            cta: 'Knock the three doors',
            difficulty: 8,
            energy: 10,
          },
          result: {
            success: {
              headline: 'Two of the three ask you in',
              body: "One cries, one puts the kettle on, one shuts the door and then opens it again. All three take a flyer. The third asks, on the step, whether you'll be standing. You say not yet.",
            },
            partial: {
              headline: 'One door opens',
              body: "New tenants at two of the three; the third knew the name and not much else. She takes a flyer for the landing. It's a start, and the list is still forty names long.",
            },
            failure: {
              headline: 'Nobody home',
              body: 'No one answers at any of the three. You leave a flyer with the name written on each and walk back through the streets in the rain. The list goes back in the kitbag, for now.',
            },
          },
          rewards: CHAPTER_1_REWARDS,
          keepsake: 'keep.ward-book',
          art: 'home-hq',
        },
      },
      // Slice 3 (docs/design/slice-3-politics.md §17.7): after the first ballot, seven days on.
      {
        n: 2,
        title: 'Stand for the stone',
        requires: { ballotCast: true },
        story: {
          letterFrom: "From the branch's press",
          choose: {
            title: 'Your election bill',
            narrative:
              "Off the branch's press this morning: your name in capitals on brown paper, the forty names under it, and the corner by {hq} where the council's man speaks at six. You've cast a vote here now. The bill asks what comes next.",
            choices: [
              {
                id: 'branch',
                text: "Tell {secretary} you'll speak at the corner",
                hint: 'The branch can bring a crowd, and will want a say in what you tell it.',
                flag: 'told-branch',
              },
              {
                id: 'alone',
                text: 'Go at six, alone, and see who stops',
                hint: 'Whoever comes, comes for the names.',
                flag: 'went-alone',
              },
            ],
          },
          check: {
            title: "Six o'clock",
            narrative:
              "Same corner, same hour, the council's man gone home. People slow because a stranger is standing where somebody usually does. You have forty names, your own, the bill in your pocket and about five minutes before they walk on.",
            approaches: [
              { id: 'step', text: 'Speak from the step: the forty names first, then yours', stats: ['cha', 'int'] },
              {
                id: 'edge',
                text: 'Work the edge of the crowd one at a time, the bill in your hand',
                stats: ['int'],
              },
            ],
            cta: 'Stand for the stone',
            difficulty: 14,
            energy: 15,
          },
          result: {
            success: {
              headline: 'They stopped',
              body: "Thirty by the end, and an old woman in the front row who reads the forty aloud and finds her nephew. She asks if you're standing. You say: when the branch lets me. She says she'll hold you to it.",
            },
            partial: {
              headline: 'A few stopped',
              body: 'Nine, two of them because they took it for a tram queue. One old man knew one of the forty and says so, loudly, which helps more than the speech. You get through it. The corner is yours if you want it.',
            },
            failure: {
              headline: 'A corner is only a corner',
              body: "Rain at six, and the square empties before you've read a name. A boy asks who you're talking to. You finish the list anyway, to nobody, and walk home with the bill under your coat. Same corner tomorrow, if the rain lets you.",
            },
          },
          rewards: {
            success: { xp: 300, fxp: 80, iron: 150 },
            partial: { xp: 150, fxp: 40, iron: 75 },
            failure: { xp: 50, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.election-bill',
          art: 'home-hq',
        },
      },
      // Slice 7 (slice-7-nation.md §13, re-strung for the rule ballot in voting-simplified.md §8.11.1
      // as amended by §8.12 #7: standing costs 10 Political Capital, not money, so the chapter is named
      // for the list the name goes on). Rank 3, seven days on; difficulty 16, 15 Energy; the keepsake
      // on every outcome. The flags keep their ids (`fund-marks` / `own-marks`).
      {
        n: 3,
        title: 'The list',
        requires: { rank: 3 },
        story: {
          letterFrom: "From the families' tin",
          choose: {
            title: 'The list',
            narrative:
              // §8.12's sentence ran past a story text's 240; cut to fit, the sense kept.
              "The families' tin: what three streets saved for the stone before the council said no, and the forty names on the lid. The branch wants your name on the list by Tuesday: ten Political Capital, spent and gone, for the names on the lid.",
            choices: [
              {
                id: 'streets',
                text: 'Let the three streets put your name forward',
                hint: 'Their names behind yours, for a seat that puts theirs up. The branch will know whose idea it was.',
                flag: 'fund-marks',
              },
              {
                id: 'own',
                text: 'Put your own name forward',
                hint: 'The name on the list is yours alone. The tin stays shut.',
                flag: 'own-marks',
              },
            ],
          },
          check: {
            title: 'Who stands behind you',
            narrative:
              "Nobody has to back you; the branch's last candidate stood alone and lost the seat on backers. The minute book says why: talked to the hall, not the streets. You have the list, the meeting at six, and three streets that knew the forty.",
            approaches: [
              { id: 'floor', text: 'Ask the branch meeting to back you, from the floor', stats: ['cha', 'int'] },
              { id: 'rule', text: 'Name your rule, say what the stone has to do with it, and show it round', stats: ['int'] },
              {
                id: 'legwork',
                text: 'Walk the three streets with the list and ask the doors that knew the forty',
                stats: ['best'],
              },
            ],
            cta: 'Find your backers',
            difficulty: 16,
            energy: 15,
          },
          result: {
            success: {
              headline: 'Two backers, and a third',
              body: 'Two by nine and a third by ten, an old docker whose boy is on the list and says so. The branch secretary stamps the receipt without looking up. Somebody has to say what the seat is for, so you do.',
            },
            partial: {
              headline: "One backer, and the branch's",
              body: "One from the street and the branch's own, which the secretary says counts, this once. The receipt is stamped. The list gets a new line in your hand: talked to the streets. Mostly.",
            },
            failure: {
              headline: 'The hall, not the streets',
              body: 'The meeting argues about the canteen for an hour and nobody puts a name to yours. You walk home with the receipt unstamped and the list unsigned. Tuesday is still Tuesday. The doors are still there.',
            },
          },
          rewards: {
            success: { xp: 350, fxp: 90, iron: 200 },
            partial: { xp: 175, fxp: 45, iron: 100 },
            failure: { xp: 60, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.deposit-receipt',
          art: 'home-hq',
        },
      },
      // Slice 8 (docs/design/slice-8-life.md §8, §16.1): chapters 4–12, the tier-3 band (18–26),
      // each seven days after the last plus its requirement (`characters.milestones`); the keepsake
      // on every outcome; chapter 12 completes the Ambition (Legacy 30). The spine is the council's
      // memorial rule, *the town's own*. For most players chapter 12 lands in the third month.
      {
        n: 4,
        title: 'The count',
        requires: { councilTerms: 1 },
        story: {
          letterFrom: "From the count's night",
          choose: {
            title: 'The count',
            narrative:
              "The count's night, and your name on the board. The forty's families are at the back of the hall, standing, because the branch's chairs ran out. You have the chalk, the list in your coat and the branch's runner at the door.",
            choices: [
              { id: 'forty', text: 'Chalk the forty under your total', hint: 'The hall will see what the seat is for.', flag: 'forty-total' },
              { id: 'own', text: 'Chalk yours alone', hint: "The board is tonight's.", flag: 'own-total' },
            ],
          },
          check: {
            title: 'The margin',
            narrative:
              "Two seats, three names, and the margin is a handful. The runner says the Rows haven't come in and the hall is drifting home. Somebody has to fetch them.",
            approaches: [
              { id: 'runner', text: "Send the runner with your name and the forty's", stats: ['cha', 'int'] },
              { id: 'street', text: 'Work out which street is short and go there', stats: ['int'] },
              { id: 'legwork', text: 'Legwork. Knock the Rows yourself, list in hand, until the hall is full again', stats: ['best'] },
            ],
            cta: 'Fetch the Rows',
            difficulty: 18,
            energy: 20,
          },
          result: {
            success: {
              headline: 'Full house',
              body: 'The Rows come in wet and loud and the margin stops being a handful. The returning officer writes the figure twice. Under it, in chalk, forty names nobody rubs out.',
            },
            partial: {
              headline: 'Enough',
              body: "Half the Rows, enough of the hall. It holds. The runner says the families fetched the other half themselves, and you say that's what the seat is for.",
            },
            failure: {
              headline: 'The board stays',
              body: 'The Rows stay in and the margin goes the other way. The board is wiped at eleven. You keep the chalk. The count sheet goes in the kitbag with the list.',
            },
          },
          rewards: {
            success: { xp: 400, fxp: 100, iron: 250 },
            partial: { xp: 200, fxp: 50, iron: 125 },
            failure: { xp: 60, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.count-sheet',
          art: 'scene.election-night',
        },
      },
      {
        n: 5,
        title: 'Your seat',
        requires: { rank: 4 },
        story: {
          letterFrom: "From the chamber's back row",
          choose: {
            title: 'Your seat',
            narrative:
              "The branch's minute book, and the back row of the chamber where the newest councillor sits. The last motion in it is the memorial's, moved in the autumn and lost four to three. The secretary says the book is yours to fill now.",
            choices: [
              { id: 'take', text: 'Take the book', hint: "The autumn's pages stay in it.", flag: 'took-book' },
              { id: 'new', text: 'Leave the old pages and start a new one', hint: 'A clean book, your hand.', flag: 'new-book' },
            ],
          },
          check: {
            title: 'The motion that lost',
            narrative:
              'On the last page, the motion in draft: that the stone carry every name the town buried, lodged or paid. The branch meets at six; the Governor wants the hour for the licence. You have the draft and a room that lost once.',
            approaches: [
              { id: 'floor', text: "Move it from the floor in the families' words", stats: ['cha', 'int'] },
              { id: 'cost', text: "Cost it, forty names at the mason's rate, then move it in yours", stats: ['int'] },
              { id: 'legwork', text: 'Legwork. Find three members who voted for it in the autumn and bring them', stats: ['best'] },
            ],
            cta: 'Move the motion',
            difficulty: 18,
            energy: 20,
          },
          result: {
            success: {
              headline: 'Carried',
              body: "The names go to the vote and carry on a show of hands, the Governor's licence pushed to seven. The secretary writes carried in your hand under the autumn's lost.",
            },
            partial: {
              headline: 'Referred',
              body: 'Referred to the next meeting, which is a kind of yes. The Governor is polite about it. The secretary writes referred and underlines nothing.',
            },
            failure: {
              headline: 'Out of time',
              body: "The licence takes the hour and the names wait for another month. You write the date under the autumn's, and the word again.",
            },
          },
          rewards: {
            success: { xp: 400, fxp: 100, iron: 250 },
            partial: { xp: 200, fxp: 50, iron: 125 },
            failure: { xp: 60, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.minute-book',
          art: 'faction-hq',
        },
      },
      {
        n: 6,
        title: 'The hall',
        requires: { chairVote: true },
        story: {
          letterFrom: "From the Chair's ballot",
          choose: {
            title: 'The hall',
            narrative:
              "The party chose its Chair this week and you voted. Your stub is in your coat, and on its back, in your hand, the question the branch never got answered: where does the party stand on the stone? The new Chair's first meeting is Thursday.",
            choices: [
              { id: 'ahead', text: "Send the question to the Chair's clerk in advance", hint: 'The Chair will have an answer ready, or an excuse.', flag: 'sent-ahead' },
              { id: 'floor', text: 'Keep it for the floor', hint: 'A question nobody expects gets an honest answer.', flag: 'kept-for-floor' },
            ],
          },
          check: {
            title: 'The question from the floor',
            narrative:
              "The new Chair's first meeting at the capital house. There's a question from the floor about memorials and nobody asking it: every town has a stone, and every stone has a rule. You have the stub and the forty names.",
            approaches: [
              { id: 'stand', text: 'Ask it, standing, with the names', stats: ['cha', 'int'] },
              { id: 'write', text: "Write it out and hand it to the Chair's clerk", stats: ['int'] },
              { id: 'legwork', text: 'Legwork. Ask three branches first, so the floor is already with you', stats: ['best'] },
            ],
            cta: 'Ask the question',
            difficulty: 20,
            energy: 20,
          },
          result: {
            success: {
              headline: 'Minuted',
              body: 'The Chair answers it and the clerk minutes it under your name: the party will back a memorials rule, town by town. Afterwards the Chair asks how many names. You say forty, so far.',
            },
            partial: {
              headline: 'Noted',
              body: 'Noted, the Chair says, which means tomorrow. Two members stop you at the door to say their towns have a stone like that too.',
            },
            failure: {
              headline: 'Next business',
              body: 'The Chair moves to next business and the floor lets it. You keep the stub. The question is still written on it.',
            },
          },
          rewards: {
            success: { xp: 450, fxp: 120, iron: 300 },
            partial: { xp: 225, fxp: 60, iron: 150 },
            failure: { xp: 70, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.ballot-stub',
          art: 'faction-house',
        },
      },
      {
        n: 7,
        title: 'The cutting',
        requires: { caseFile: true },
        story: {
          letterFrom: "From the Herald's morgue",
          choose: {
            title: 'The cutting',
            narrative:
              'The Herald\'s morgue has a cutting from the autumn: Council Trims Memorial List; "Not the Town\'s Own". Edith Crane has it on her desk when you come in. "I wrote it from the council\'s hand-out. Do you want to know who wrote the hand-out?"',
            choices: [
              // §21.1 Q30: choice A lands no entry; its hint promises none.
              { id: 'yes', text: 'Yes', hint: 'The truth, and a debt to Crane.', flag: 'asked-crane' },
              { id: 'no', text: 'No. The names matter, not the man', hint: 'Some files stay shut.', flag: 'let-it-lie' },
            ],
          },
          check: {
            title: 'The second source',
            narrative:
              "The hand-out called the forty lodgers. The mill's wage book would show they lived in the Rows and paid the town's rates, which makes them the town's own by the council's own rule. Crane will print it, if you bring her a second source.",
            approaches: [
              { id: 'clerk', text: "Find the clerk who kept the mill's wage book", stats: ['int'] },
              { id: 'crane', text: 'Ask Crane to run it on your name alone', stats: ['cha', 'int'] },
              { id: 'legwork', text: 'Legwork. Walk the Rows for anyone who lodged one of the forty', stats: ['best'] },
            ],
            cta: 'Bring her the source',
            difficulty: 20,
            energy: 20,
          },
          result: {
            success: {
              headline: 'Printed',
              body: "Page five, a paragraph: forty men on the town's rates, their names, and the council's rule beside them. Crane signs it. The cutting goes in your coat next to the autumn's.",
            },
            partial: {
              headline: 'A letter',
              body: "A letter to the editor, under your name, printed on Thursday, with the forty names in small type. Crane says it's what she can do with one source.",
            },
            failure: {
              headline: 'Held',
              body: "The clerk is dead and the Rows don't read page five. Crane keeps the cutting on her desk, which she says is a kind of printing.",
            },
          },
          rewards: {
            success: { xp: 450, fxp: 120, iron: 300 },
            partial: { xp: 225, fxp: 60, iron: 150 },
            failure: { xp: 70, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.cutting',
          art: 'scene.newsroom',
          // §21.1 Q31: Favour +5 on every outcome.
          favour: { patronId: 'crane', value: 5 },
        },
      },
      {
        n: 8,
        title: "The stone's rule",
        requires: { governorOrCouncilTerms: 3 },
        story: {
          letterFrom: "From the Governor's desk",
          choose: {
            title: "The stone's rule",
            narrative:
              "The Governor's desk, or the back of three terms: either way the rule that goes first is yours to choose this week. The council's rule is one line, the town's own; the draft that replaces it is in the minute book, costed to the last mark.",
            choices: [
              { id: 'stone', text: "Put the stone's rule first", hint: 'The names, before anything else.', flag: 'stone-rule' },
              { id: 'town', text: 'Put the rule the town needs this week', hint: 'The stone can wait a term.', flag: 'towns-rule' },
            ],
          },
          check: {
            title: 'Four of seven',
            narrative:
              'Four votes of seven, and two councillors who think forty names on a stone is a vanity. One of them owes the branch; the other owes nobody.',
            approaches: [
              { id: 'trade', text: 'Trade the licence hour for the two votes', stats: ['cha', 'int'] },
              { id: 'cost', text: 'Rewrite the costing so the names cost the town nothing', stats: ['int'] },
              { id: 'legwork', text: 'Legwork. Walk both councillors to the Rows and show them the three doors', stats: ['best'] },
            ],
            cta: 'Find the fourth vote',
            difficulty: 22,
            energy: 25,
          },
          result: {
            success: {
              headline: 'Four of seven',
              body: "Carried, four to three, the second councillor's hand going up last and slowest. The rule is in force from Thursday: every name the town buried, lodged or paid. You write carried on the draft and date it.",
            },
            partial: {
              headline: 'Amended',
              body: 'Carried with a cut: the names go on, but on a second tablet, at the back. The families would take half. You take half.',
            },
            failure: {
              headline: 'Three of seven',
              body: "Three. The licence goes first and the stone goes to the next paper. You've learned which councillor owes nobody, which is worth a term.",
            },
          },
          rewards: {
            success: { xp: 500, fxp: 140, iron: 350 },
            partial: { xp: 250, fxp: 70, iron: 175 },
            failure: { xp: 80, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.rule-draft',
          art: 'scene.ministry',
        },
      },
      {
        n: 9,
        title: 'The list',
        requires: { rank: 5 },
        story: {
          letterFrom: "From the party's list",
          choose: {
            title: 'The list',
            narrative:
              "Rank 5. A letter from the party's list committee: would you let your name go forward for Parliament. A town's rule is a town's rule; a law for every stone in the republic needs a seat in the chamber. The letter wants an answer by Friday.",
            choices: [
              { id: 'yes', text: 'Write yes', hint: 'The list, when names are in.', flag: 'wrote-yes' },
              { id: 'stone', text: 'Write the stone first, and then yes', hint: "The town's names first. Then the republic's.", flag: 'stone-first' },
            ],
          },
          check: {
            title: 'The backer',
            narrative:
              "The list goes by backers, and you need one who isn't the branch. The old docker who backed your deposit is still on the quay and still argues.",
            approaches: [
              { id: 'quay', text: 'Ask him, on the quay, in front of the gang', stats: ['cha', 'int'] },
              { id: 'write', text: 'Write to him with the cutting and the forty names', stats: ['int'] },
              { id: 'legwork', text: 'Legwork. Carry for his gang a morning and ask at the break', stats: ['best'] },
            ],
            cta: 'Ask the docker',
            difficulty: 22,
            energy: 25,
          },
          result: {
            success: {
              headline: 'Backed',
              body: "He backs you at the break with the gang watching, and says his boy's name had better be on the first tablet. The letter goes back with yes on it.",
            },
            partial: {
              headline: 'Backed, with a condition',
              body: "He'll back you if the stone gets cut this year. You say it will. He says the council said that.",
            },
            failure: {
              headline: 'The quay says no',
              body: 'Not this term, he says; the stone first. You keep the letter and the reason, which is now two reasons in two hands.',
            },
          },
          rewards: {
            success: { xp: 500, fxp: 140, iron: 350 },
            partial: { xp: 250, fxp: 70, iron: 175 },
            failure: { xp: 80, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.list-letter',
          art: 'faction-house',
        },
      },
      {
        n: 10,
        title: 'The republic votes',
        requires: { nationalVote: true },
        story: {
          letterFrom: 'From the ballot box',
          choose: {
            title: 'The republic votes',
            narrative:
              "The republic voted and so did you. Your polling card has a number on it, and the register the number comes from still carries the forty: nobody struck them, and nobody voted for them either. The registrar's office is on the Forecourt.",
            choices: [
              { id: 'close', text: "Ask the registrar to close the forty's names properly", hint: 'The roll closes a name with a date and a reason.', flag: 'closed-names' },
              { id: 'leave', text: 'Leave them on the roll', hint: 'A name on the roll is a name on the roll.', flag: 'left-names' },
            ],
          },
          check: {
            title: 'The turnout',
            narrative:
              "Turnout in the Rows was half what it was in the Villas. The result is in; the next isn't. The branch wants a canvass that explains the republic to a street that voted for a council once.",
            approaches: [
              { id: 'speak', text: "Speak in the Rows on why the republic's vote is theirs", stats: ['cha', 'int'] },
              { id: 'sum', text: 'Draw the republic as a sum on the back of a poster', stats: ['int'] },
              { id: 'legwork', text: "Legwork. Walk the Rows with the sum until it's in every window", stats: ['best'] },
            ],
            cta: 'Explain the republic',
            difficulty: 24,
            energy: 25,
          },
          result: {
            success: {
              headline: 'The sum in the window',
              body: 'The sum is in forty windows by dark and three people ask when the next one is. The branch counts it as a canvass; you count it as forty.',
            },
            partial: {
              headline: 'Twenty windows',
              body: 'Twenty windows and a long argument at the standpipe about whether the capital counts. It does. Half the street believes you.',
            },
            failure: {
              headline: 'Rain',
              body: "Rain, and the posters run. The sum is in your pocket. The Rows will vote next term or they won't; you'll be there.",
            },
          },
          rewards: {
            success: { xp: 600, fxp: 160, iron: 400 },
            partial: { xp: 300, fxp: 80, iron: 200 },
            failure: { xp: 90, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.polling-card',
          art: 'scene.parliament',
        },
      },
      {
        n: 11,
        title: 'Twenty-five marks',
        requires: { onList: true },
        story: {
          letterFrom: "From the clerk's receipt",
          choose: {
            title: 'Twenty-five marks',
            narrative:
              "Twenty-five Political Capital and your name on the party's list for Parliament. The clerk's receipt asks what you stand for, in one line, for the list's printed sheet. The forty are a long line.",
            choices: [
              { id: 'forty', text: 'Write the forty names on the back of the receipt', hint: 'The list will know what the seat is for.', flag: 'told-list' },
              { id: 'own', text: 'Write your own name, and nothing else', hint: "It's your name on the receipt.", flag: 'own-name' },
            ],
          },
          check: {
            title: 'The place on the list',
            narrative:
              "The list goes by backers and you're third. Third is a seat only if the party takes three. One more backer puts you second.",
            approaches: [
              { id: 'chair', text: "Ask the Chair for the party's backing, in the Officers' room", stats: ['cha', 'int'] },
              { id: 'swap', text: 'Show the second-placed name the arithmetic and ask them to swap', stats: ['int'] },
              { id: 'legwork', text: "Legwork. Find one member in every branch who'll back a name from the Rows", stats: ['best'] },
            ],
            cta: 'Move up the list',
            difficulty: 24,
            energy: 25,
          },
          result: {
            success: {
              headline: 'Second',
              body: 'Second on the list by the close of names. The Chair says the Rows have never had a second. You say they had forty who never had a vote.',
            },
            partial: {
              headline: 'Third, with a promise',
              body: "Third, and the Chair's word that the party will push for three seats. A word is a word. The receipt is stamped.",
            },
            failure: {
              headline: 'Third',
              body: "Third. The arithmetic doesn't move and neither does the second name. The receipt is stamped anyway, and filed with the rest.",
            },
          },
          rewards: {
            success: { xp: 600, fxp: 160, iron: 400 },
            partial: { xp: 300, fxp: 80, iron: 200 },
            failure: { xp: 90, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.list-receipt',
          art: 'faction-house',
        },
      },
      {
        n: 12,
        title: 'The names read out',
        requires: { deputyTerm: true },
        story: {
          letterFrom: 'From the roll of the chamber',
          choose: {
            title: 'The names read out',
            narrative:
              'The roll of the chamber, and a clerk with a pen. "Name as it is to be entered." The unit\'s list is in your coat. The clerk is waiting.',
            choices: [
              { id: 'forty', text: 'Your name, and ask for the forty to be read after it', hint: 'Forty names on the record, once.', flag: 'forty-read' },
              { id: 'own', text: 'Your name', hint: 'The forty are in the list. Yours is on the roll.', flag: 'one-name' },
            ],
          },
          check: {
            title: 'The maiden speech',
            narrative:
              "A deputy's first words in the chamber, and the memorials bill is on the order paper: every stone in the republic, every name a town buried, lodged or paid. Sixty seats, three parties and a gallery with the Herald in it.",
            approaches: [
              { id: 'read', text: 'Read the forty names, standing, to the chamber', stats: ['cha', 'int'] },
              { id: 'question', text: 'Write them into a question on the memorials bill', stats: ['int'] },
              { id: 'legwork', text: 'Legwork. Read them first in every branch, so the chamber has heard them before you stand', stats: ['best'] },
            ],
            cta: 'Stand in the chamber',
            difficulty: 26,
            energy: 30,
          },
          result: {
            success: {
              headline: 'On the record',
              body: "The chamber hears the forty and the record has them, every one, with the town's name beside each. The Herald prints the list. The clerk hands you the black ribbon the chamber wears for names read out, and you wear it.",
            },
            partial: {
              headline: 'In the question',
              body: 'The question is on the order paper with the forty names in it, which the clerk says is the record too. The ribbon is yours.',
            },
            failure: {
              headline: 'Next speaker',
              body: "Your name is called and the chamber is loud and the list stays in your coat. The ribbon is yours anyway. You'll stand again; there's a term.",
            },
          },
          rewards: {
            success: { xp: 1_000, fxp: 300, iron: 1_000 },
            partial: { xp: 500, fxp: 150, iron: 500 },
            failure: { xp: 150, fxp: 0, iron: 0 },
          },
          keepsake: 'acc.his-rosette',
          art: 'scene.parliament',
          completes: true,
        },
      },
    ],
  },
  {
    id: 'clear-his-name',
    title: 'Who Sold the Homes',
    chaptersPlanned: 12,
    chapters: [
      {
        n: 1,
        title: 'The requisition order',
        story: {
          letterFrom: LETTER_FROM,
          choose: {
            title: 'The requisition order',
            narrative:
              "The order, read again in daylight: the flat's address, a date in the autumn, the word vacant typed where your family's name should be, and a signature you can read.",
            choices: [
              {
                id: 'lamp',
                text: 'Hold the order up to the lamp',
                hint: 'See what the typewriter struck out.',
                flag: 'read-name',
              },
              {
                id: 'branch',
                text: 'Take it to {secretary} as it is',
                hint: 'The branch has long memories.',
                flag: 'told-branch',
              },
            ],
          },
          check: {
            title: "The housing office's register",
            narrative:
              'Every requisition in {city} went through one register, and the register names who got each flat and what they paid. The housing office keeps it; the caretakers of the blocks remember it. Pick your door.',
            approaches: [
              { id: 'report', text: "Find your flat's entry in the housing office's register", stats: ['int'] },
              {
                id: 'market',
                text: "Ask the block's tenants who moved in, and who let them",
                stats: ['cha', 'int'],
              },
              {
                id: 'legwork',
                text: 'Legwork. Walk the block at the shift change and find who holds the keys at night.',
                stats: ['best'],
              },
            ],
            cta: 'Start asking',
            difficulty: 8,
            energy: 10,
          },
          result: {
            success: {
              headline: 'A name comes back',
              body: "The register has your flat under a new name, and the hand that entered it is Brandauer: the block's night caretaker now, drawing a second wage from a senator's office. You write the name down twice, in case.",
            },
            partial: {
              headline: 'A name in pencil',
              body: "The register's page is torn at your flat, but someone has written a name in the margin in pencil: Brandauer, caretaker. Nobody in the block will say the name out loud. That tells you something too.",
            },
            failure: {
              headline: 'Out on loan',
              body: "The register is out on loan to a ministry, and the tenants go quiet when you say the flat's number. You leave your name with the clerk, which may have been a mistake.",
            },
          },
          rewards: CHAPTER_1_REWARDS,
          keepsake: 'keep.prison-letter',
          art: 'home-hq',
        },
      },
      // Slice 8 (design §8, §16.2): Level 6, seven days on; difficulty 14, 15 Energy; the chapter
      // lands the player's first entry by hand, a political line on Brandauer (`extraNames`).
      {
        n: 2,
        title: 'The night caretaker',
        requires: { level: 6 },
        story: {
          letterFrom: "From the register's margin",
          choose: {
            title: 'The night caretaker',
            narrative:
              "The order's signature is a man who is rising, but the register's margin named the one who held the keys, in pencil: Brandauer, nights. The block still has a night caretaker. The lobby board lists them, readable from the street.",
            choices: [
              { id: 'board', text: 'Read the board and go in', hint: 'Twenty years of caretakers.', flag: 'read-board' },
              { id: 'clerk', text: "Ask the housing office's clerk who Brandauer is", hint: 'A name for a name.', flag: 'asked-clerk' },
            ],
          },
          check: {
            title: 'Nights',
            narrative:
              "Brandauer kept the block's night book in the autumn, who came with keys and who paid for them, and the night book is in the lodge, under the new one. The day porter is the kind who can be talked to, or walked past.",
            approaches: [
              { id: 'porter', text: 'Talk the porter into an hour with the book', stats: ['cha', 'int'] },
              // The quiet way: Heat +6, whatever happens.
              { id: 'rounds', text: 'Read the rounds off the board and go in when the lodge is empty', stats: ['agi'], heat: 6 },
              { id: 'legwork', text: "Legwork. Take the block's night shift for a week and read the book on the break", stats: ['best'] },
            ],
            cta: 'Open the night book',
            difficulty: 14,
            energy: 15,
          },
          result: {
            success: {
              headline: 'The night book',
              body: "The autumn's page: your flat's keys signed over by Brandauer to a clerk from the capital, against a receipt with a senator's office on it. The page goes in your pocket. Brandauer still does nights, and does well.",
            },
            partial: {
              headline: 'A page torn out',
              body: "The autumn's page is torn out, which is a kind of evidence. Brandauer's name is on the pages either side. The porter says the book's been like that since the winter.",
            },
            failure: {
              headline: 'The new book',
              body: "The old book is gone to the housing office's archive in the capital. The board says Brandauer, nights, since the autumn. That's the name; the proof is in Irongate.",
            },
          },
          rewards: {
            success: { xp: 300, fxp: 80, iron: 150 },
            partial: { xp: 150, fxp: 40, iron: 75 },
            failure: { xp: 50, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.foremans-name',
          art: 'scene.street',
          dossier: { subjectId: 'npc.brandauer', category: 'political' },
        },
      },
      // The teaser: the archive in the capital (written with the next slice that touches it, §25).
      { n: 3, title: 'The archive', requires: { caseFile: true } },
    ],
  },
  {
    id: 'settle-his-debts',
    title: 'The Ration Ledger',
    chaptersPlanned: 12,
    chapters: [
      {
        n: 1,
        title: 'The ration page',
        story: {
          letterFrom: LETTER_FROM,
          choose: {
            title: 'The ration page',
            narrative:
              "The page, flat on the table: a year of rations drawn in your family's name, every month after they were gone, and a Clearwater stamp in the corner, small, as if that made it less.",
            choices: [
              {
                id: 'ask',
                text: 'Ask the branch who in Clearwater stamps paper like this',
                hint: 'A name is worth more than a month.',
                flag: 'asked-name',
              },
              {
                id: 'silent',
                text: 'Say nothing to anyone, and put it back in the kitbag',
                hint: 'Let them come to you, if they come.',
                flag: 'said-nothing',
              },
            ],
          },
          check: {
            title: 'The man in the good coat',
            narrative:
              "He finds you on the third evening, on the stairs, with a copy of the page and a good coat. The Clearwater people know which train you took. He has a price for your silence. You have a minute, and it's a question of how you use it.",
            approaches: [
              { id: 'date', text: 'Look him in the eye and name a date', stats: ['cha', 'str'] },
              { id: 'read', text: 'Read the page properly before you answer', stats: ['int'] },
              {
                id: 'legwork',
                text: 'Legwork. Walk the riverside road first and see whose house he goes back to.',
                stats: ['best'],
              },
            ],
            cta: 'Answer him',
            difficulty: 8,
            energy: 10,
          },
          result: {
            success: {
              headline: 'A month, and a name',
              body: "The stamp in the corner is a house on the Clearwater riverside. He shrugs: a month to bring the page back, then they'll want something instead of silence. A month is a long time in politics. You write the house down.",
            },
            partial: {
              headline: 'A month, no name',
              body: "You get a month, not a name. He takes the stairs two at a time, whistling, and leaves his copy of the page on the banister. You'll see him again; you'd both rather it was later.",
            },
            failure: {
              headline: 'A fortnight',
              body: "He gives you a fortnight and no name, and looks round the room as if pricing it. The stairwell is very quiet after he's gone. You put the page back in the kitbag, under everything else.",
            },
          },
          rewards: CHAPTER_1_REWARDS,
          keepsake: 'keep.marker',
          art: 'home-hq',
        },
      },
      // Slice 5 (docs/design/slice-5-risk.md §13): Level 6, seven days on. The quiet way adds Heat
      // on any outcome: for most players the first Heat they see, in a story that explains it.
      {
        n: 2,
        title: 'The riverside house',
        requires: { level: 6 },
        story: {
          letterFrom: "From the page's other side",
          choose: {
            title: 'The riverside house',
            narrative:
              "The man in the good coat is at the door this time, with a figure on a card and no hurry. The page has an address on its other side you never noticed: a house on the river road, in a clerk's hand, and three words. What they want.",
            choices: [
              {
                id: 'friday',
                text: "Tell him you'll have it by Friday",
                hint: "A week bought with a lie. He'll be back on Friday, and so will you, with whatever's in that house.",
                flag: 'promised-friday',
              },
              {
                id: 'shut',
                text: 'Shut the door on him',
                hint: 'He takes it well, which is worse. The street has seen him now.',
                flag: 'shut-the-door',
              },
            ],
          },
          check: {
            title: 'The riverside house',
            narrative:
              "A boarded house on the river road, a clerk's brass plate still by the bell. The yard gate is loose, the housekeeper next door has a key and a memory, and the whole street has seen the man in the good coat go by twice.",
            approaches: [
              // "The quiet way is the police's business if anyone saw you": Heat +6, whatever happens.
              { id: 'yard', text: 'In by the yard, quietly', stats: ['agi'], heat: 6 },
              { id: 'key', text: 'Ask the housekeeper for the key', stats: ['cha', 'int'] },
              { id: 'neighbours', text: 'The neighbours first, then the door', stats: ['best'] },
            ],
            cta: 'Open the house',
            difficulty: 14,
            energy: 15,
          },
          result: {
            success: {
              headline: "A page of the ring's ledger",
              body: 'Under the back-room floor, a biscuit tin: a ledger with every page torn out but one. On it, in a clerk\'s hand, the names the ring drew rations in, yours among them, and what each fetched. You put the tin back and the page in your coat.',
            },
            partial: {
              headline: 'A tin, and a page torn in half',
              body: 'The tin is where the page said, and empty but for half a page: the sums, no names. Somebody has been here first, or the ring tore it itself. Half a page is half an argument. You take it.',
            },
            failure: {
              headline: 'A boarded house is a boarded house',
              body: "The back room has been stripped to the boards and the boards to the joists. Whatever was here went before you came. You stand in the dust with the ration page until the housekeeper's light goes on next door. You take the page home.",
            },
          },
          rewards: {
            success: { xp: 300, fxp: 80, iron: 150 },
            partial: { xp: 150, fxp: 40, iron: 75 },
            failure: { xp: 50, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.ledger-page',
          art: 'home-hq',
        },
      },
      // Slice 8 (design §8, §16.2): Rank 3, seven days on; difficulty 16, 15 Energy; choice B pays
      // 100 Iron (`iron`); the Agility way carries Heat +6 as chapter 2 did.
      {
        n: 3,
        title: 'The collector',
        requires: { rank: 3 },
        story: {
          letterFrom: 'From under the door',
          choose: {
            title: 'The collector',
            narrative:
              "A card under the door: a name, a Clearwater address, and Friday underlined twice. The ring's page says what your silence is worth to them: four hundred, or the page back. The branch says the collector drinks at the Anchor on Thursdays.",
            choices: [
              { id: 'meet', text: 'Meet him at the Anchor', hint: 'A public house is a public place.', flag: 'met-him' },
              { id: 'pay', text: 'Pay a hundred on account and send the rest of the week away', hint: 'A hundred buys a week.', flag: 'paid-hundred', iron: 100 },
            ],
          },
          check: {
            title: 'Thursday',
            narrative:
              "He's a small man with a big ledger and the branch's own barman keeps his glass full. He wants four hundred, or the page, or a favour. The favour is a parcel to Clearwater, no questions.",
            approaches: [
              { id: 'price', text: 'Talk the price down to two hundred and a signature', stats: ['cha', 'int'] },
              { id: 'lift', text: "Lift the ring's page with your family's name while he's at the bar", stats: ['agi'], heat: 6 },
              { id: 'legwork', text: "Legwork. Find three people he's squeezed and bring them to the next table", stats: ['best'] },
            ],
            cta: 'Sit down with him',
            difficulty: 16,
            energy: 15,
          },
          result: {
            success: {
              headline: 'Two hundred and a signature',
              body: 'Two hundred, a signature, and his card torn in half on the table. The barman pours one on the house. The parcel is not mentioned again.',
            },
            partial: {
              headline: 'A month',
              body: "A month's grace and his card kept, which is a month. He says the ring is patient with people who pay. You say you'll pay.",
            },
            failure: {
              headline: 'The parcel',
              body: 'He keeps the ledger, the price and his glass. The parcel goes to Clearwater Friday, he says, with or without you. His card is on the table when he leaves.',
            },
          },
          rewards: {
            success: { xp: 350, fxp: 90, iron: 200 },
            partial: { xp: 175, fxp: 45, iron: 100 },
            failure: { xp: 60, fxp: 0, iron: 0 },
          },
          keepsake: 'keep.collectors-card',
          art: 'scene.street',
        },
      },
      // The teaser: the parcel (written with the next slice that touches it, §25).
      { n: 4, title: 'The parcel', requires: { level: 16 } },
    ],
  },
];
