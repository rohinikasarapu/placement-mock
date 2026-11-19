'use strict';
// Original reasoning-ability questions (placement-style) for the mock tests.
// Q(topic, difficulty, text, correctOption, [three distractors], positionOfCorrect 0-3)

const DIFF = { E: 'Easy', M: 'Medium', H: 'Hard' };
const mk = (topic, d, text, options, answer) => ({ text, options, answer, difficulty: DIFF[d], topic });
const Q = (topic, d, text, correct, wrong, pos) => {
  const options = wrong.slice();
  options.splice(pos, 0, correct);
  return mk(topic, d, text, options, pos);
};

const NS = 'Number Series';
const CD = 'Coding-Decoding';
const BR = 'Blood Relations';
const DS = 'Direction Sense';
const SA = 'Seating Arrangement';
const SY = 'Syllogisms';
const RK = 'Ranking and Ordering';
const OO = 'Odd One Out';
const AN = 'Analogies';
const CC = 'Calendar and Clock';

const FOLLOW = ['Only I follows', 'Only II follows', 'Both I and II follow', 'Neither I nor II follows'];

module.exports = {
  apt1: [
    Q(NS, 'E', 'Find the next number in the series: 3, 7, 15, 31, 63, ?', '127', ['121', '125', '135'], 2),
    Q(NS, 'M', 'Find the next number in the series: 2, 6, 7, 21, 22, 66, ?', '67', ['68', '132', '198'], 0),
    Q(CD, 'E', 'In a certain code language, every letter of a word is replaced by the letter two places before it in the alphabet. How is the word LEARN written in that code?', 'JCYPL', ['KDZOM', 'NGCTP', 'JDYPL'], 3),
    Q(CD, 'M', 'In a certain code, every letter is replaced by its opposite letter in the alphabet (A becomes Z, B becomes Y, C becomes X, and so on). How is the word MIND written in that code?', 'NRMW', ['NRNW', 'MRNW', 'NQMW'], 1),
    Q(BR, 'E', 'P is the mother of Q. Q is the sister of R. R is the father of S. How is P related to S?', 'Grandmother', ['Mother', 'Aunt', 'Great-grandmother'], 0),
    Q(DS, 'M', 'Ravi walks 10 m towards the west, turns right and walks 24 m. How far is he from his starting point and in which direction?', '26 m, north-west', ['24 m, north', '26 m, north-east', '34 m, north-west'], 2),
    Q(SA, 'H', 'Five persons P, Q, R, S and T sit in a row facing north. T sits at one of the extreme ends. R sits immediately to the left of S. P does not sit next to T. Q does not sit at either end. S sits next to T. Who sits in the middle?', 'R', ['Q', 'S', 'P'], 1),
    Q(SA, 'M', 'Six friends A, B, C, D, E and F sit around a circular table facing the centre. A sits opposite D. B sits immediately clockwise of A (the next seat to A when moving clockwise). E is a neighbour of D. C sits opposite F. Who sits opposite B?', 'E', ['C', 'D', 'F'], 3),
    Q(SY, 'E', 'Statements: Some doctors are teachers. All teachers are singers.\nConclusions: I. Some doctors are singers. II. All doctors are singers.', FOLLOW[0], [FOLLOW[1], FOLLOW[2], FOLLOW[3]], 0),
    Q(SY, 'H', 'Statements: Some books are pens. No pen is a cup. All cups are bowls.\nConclusions: I. Some books are not cups. II. Some pens are not cups. III. No book is a cup. IV. Some bowls are pens.', 'I and II only', ['II and III only', 'All four follow', 'I, II and IV only'], 2),
    Q(RK, 'E', 'In a queue, Sita is 15th from the front and 22nd from the back. If Gita stands 5 places behind Sita, what is Gita\'s position from the back?', '17th', ['16th', '18th', '20th'], 1),
    Q(OO, 'M', 'Which of the following numbers is the odd one out?', '144', ['64', '512', '216'], 3),
    Q(AN, 'M', '6 : 35 :: 9 : ?', '80', ['81', '72', '82'], 0),
    Q(CC, 'M', 'What was the day of the week on 26 January 2021?', 'Tuesday', ['Sunday', 'Monday', 'Wednesday'], 2),
    Q(CC, 'H', 'At what time between 4 o\'clock and 5 o\'clock will the hour hand and the minute hand of a clock coincide?', '21 9/11 minutes past 4', ['20 minutes past 4', '22 minutes past 4', '21 3/11 minutes past 4'], 1)
  ],

  apt2: [
    Q(NS, 'E', 'Find the next number in the series: 100, 93, 86, 79, ?', '72', ['71', '73', '69'], 1),
    Q(NS, 'M', 'Find the next number in the series: 3, 8, 6, 11, 9, 14, ?', '12', ['11', '13', '16'], 3),
    Q(CD, 'E', 'In a certain code, CLOUD is written as 3-12-15-21-4. How is BRAIN written in that code?', '2-18-1-9-14', ['2-17-1-9-14', '2-18-1-8-14', '3-18-1-9-14'], 0),
    Q(CD, 'M', 'In a certain code language, ROSE is written as 6821, CHAIR is written as 73456 and PREACH is written as 961473. How is SEARCH written in that code?', '214673', ['214637', '241673', '214576'], 2),
    Q(BR, 'M', 'Pointing to a lady, a man said, "Her mother is the only daughter of my mother." How is the lady related to the man?', 'Niece', ['Daughter', 'Sister', 'Cousin'], 1),
    Q(DS, 'M', 'Facing north, Anil turns 90 degrees clockwise, then 135 degrees anticlockwise, and then 180 degrees clockwise. In which direction is he facing now?', 'South-east', ['South-west', 'North-east', 'South'], 0),
    Q(SA, 'H', 'Six persons A, B, C, D, E and F sit around a circular table facing the centre. B sits opposite E. C sits immediately clockwise of A (the next seat to A when moving clockwise). F is a neighbour of B. D sits immediately clockwise of E. Who sits opposite C?', 'F', ['A', 'B', 'D'], 3),
    Q(SA, 'E', 'Four friends A, B, C and D sit in a row facing north. D sits second from the left. A sits to the left of D. C sits at the right end. Who sits between D and C?', 'B', ['A', 'D', 'C'], 2),
    Q(SY, 'M', 'Statements: All roses are flowers. Some flowers fade quickly.\nConclusions: I. Some roses fade quickly. II. Some flowers are roses.', FOLLOW[1], [FOLLOW[0], FOLLOW[2], FOLLOW[3]], 1),
    Q(SY, 'H', 'Statements: All lamps are bulbs. Some bulbs are fans. No fan is a switch.\nConclusions: I. Some lamps are fans. II. Some fans are bulbs. III. Some bulbs are not switches. IV. No lamp is a switch.', 'II and III only', ['I and III only', 'II, III and IV only', 'I, II and III only'], 0),
    Q(RK, 'E', 'Five students A, B, C, D and E took a test. A scored more than B but less than C. D scored less than B but more than E. Who scored the third highest marks?', 'B', ['A', 'D', 'E'], 2),
    Q(OO, 'E', 'Find the odd one out: Pentagon, Hexagon, Octagon, Cube', 'Cube', ['Pentagon', 'Hexagon', 'Octagon'], 3),
    Q(AN, 'M', 'ACE : FHJ :: BDF : ?', 'GIK', ['HJL', 'GHK', 'CEG'], 1),
    Q(CC, 'H', 'The calendar of the year 2026 will be exactly the same as the calendar of which later year?', '2037', ['2032', '2033', '2038'], 0),
    Q(CC, 'M', 'What is the angle between the hour hand and the minute hand of a clock at 7:20?', '100°', ['80°', '110°', '130°'], 2)
  ],

  tech1: [
    Q(NS, 'E', 'Find the next number in the series: 2, 5, 10, 17, 26, ?', '37', ['36', '38', '35'], 0),
    Q(NS, 'M', 'Find the next letter in the series: B, E, I, N, T, ?', 'A', ['Z', 'B', 'Y'], 2),
    Q(CD, 'E', 'If TABLE is written as ELBAT in a certain code, how is MOUSE written in the same code?', 'ESUOM', ['EUSOM', 'ESUMO', 'SEUOM'], 1),
    Q(CD, 'M', 'In a certain code, + means ×, − means +, × means ÷ and ÷ means −. What is the value of 12 + 3 − 8 × 4 ÷ 5?', '33', ['29', '31', '37'], 3),
    Q(BR, 'M', 'X tells Y, "Your mother is the sister of my father." How is X related to Y?', 'Cousin', ['Brother', 'Uncle', 'Nephew'], 0),
    Q(DS, 'H', 'Starting from point P, Dev walks 20 m towards north, turns right and walks 8 m, turns right again and walks 8 m, and finally turns right and walks 13 m to reach point Q. In which direction and how far is P from Q?', '13 m, south-east', ['13 m, north-west', '12 m, south-east', '21 m, south-east'], 2),
    Q(SA, 'E', 'Five persons A, B, C, D and E sit in a row facing north. C sits in the middle. A sits at the left end. D sits immediately to the left of C. B sits immediately to the right of C. Who sits at the right end?', 'E', ['D', 'A', 'B'], 1),
    Q(SA, 'H', 'Six persons P, Q, R, S, T and U sit in a row facing north. R sits immediately to the right of S. Q sits second to the right of R. P and U sit next to each other. U does not sit at either end. S sits somewhere to the left of U. Who sits third from the left?', 'T', ['R', 'Q', 'S'], 3),
    Q(SY, 'M', 'Statements: No server is a client. Some clients are laptops.\nConclusions: I. Some laptops are not servers. II. Some servers are laptops. III. No laptop is a server.', 'Only I follows', ['Only II follows', 'Only III follows', 'Both II and III follow'], 0),
    Q(SY, 'M', 'Statements: Some routers are switches. Some switches are hubs. All hubs are cables.\nConclusions: I. Some routers are hubs. II. Some switches are cables. III. Some cables are switches. IV. Some routers are cables.', 'II and III only', ['I and IV only', 'II only', 'All four follow'], 2),
    Q(RK, 'M', 'In a class, Pooja\'s rank is 8th from the top. Kiran ranks 5 places below Pooja. If Kiran is 21st from the bottom, how many students are there in the class?', '33', ['32', '34', '35'], 1),
    Q(OO, 'E', 'Find the odd one out: Python, Java, C++, Linux', 'Linux', ['Python', 'Java', 'C++'], 3),
    Q(AN, 'E', 'Keyboard : Input :: Monitor : ?', 'Output', ['Storage', 'Memory', 'Processing'], 0),
    Q(CC, 'M', 'If 9 November 2026 is a Monday, what day of the week is 25 December 2026?', 'Friday', ['Wednesday', 'Thursday', 'Saturday'], 2),
    Q(CC, 'H', 'What is the angle between the hour hand and the minute hand of a clock at 8:25?', '102.5°', ['97.5°', '105°', '107.5°'], 1)
  ]
};
