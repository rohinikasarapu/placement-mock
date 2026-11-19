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

module.exports = {
  tech2: [
    Q(NS, 'E', 'Find the next number in the series: 4, 9, 19, 39, 79, ?', '159', ['158', '149', '169'], 0),
    Q(NS, 'M', 'Find the next number in the series: 5, 6, 8, 11, 15, 20, ?', '26', ['25', '27', '28'], 1),
    Q(CD, 'E', 'In a certain code, every letter is replaced by the letter four places ahead of it in the alphabet. How is the word SORT written in that code?', 'WSVX', ['WSUX', 'VRUW', 'XTWY'], 2),
    Q(CD, 'M', 'In a certain code language, "red blue sky" is written as "pa ku ro", "sky green" is written as "ro mi" and "green blue tea" is written as "mi ku da". What is the code for "blue"?', 'ku', ['pa', 'ro', 'mi'], 3),
    Q(BR, 'E', 'Kavya is the daughter of Mohan. Mohan is the brother of Sunil. Sunil\'s wife is Rekha. How is Rekha related to Kavya?', 'Aunt', ['Mother', 'Cousin', 'Grandmother'], 1),
    Q(DS, 'E', 'Sameer is facing west. He turns left and then turns left again. In which direction is he facing now?', 'East', ['North', 'South', 'West'], 2),
    Q(SA, 'M', 'Five friends Tara, Uday, Veena, Wasim and Yash sit in a row facing north. Tara sits at the extreme right end. Yash sits second from the left. Uday sits immediately to the left of Tara. Wasim does not sit at either end. Who sits in the middle?', 'Wasim', ['Veena', 'Yash', 'Uday'], 0),
    Q(SA, 'H', 'Seven friends P, Q, R, S, T, U and V sit around a circular table facing the centre. R sits immediately clockwise of P (the next seat to P when moving clockwise). T sits second clockwise from R, with exactly one person between them. Q is not a neighbour of P but is a neighbour of T. V sits immediately clockwise of S. U is a neighbour of S. Who sits immediately anticlockwise of P?', 'V', ['S', 'U', 'Q'], 3),
    Q(SY, 'M', 'Statements: All engines are machines. Some machines are toys.\nConclusions: I. Some engines are toys. II. Some toys are machines.', 'Only II follows', ['Only I follows', 'Both I and II follow', 'Neither I nor II follows'], 1),
    Q(SY, 'H', 'Statements: Some pilots are doctors. All doctors are artists. No artist is a swimmer.\nConclusions: I. Some pilots are not swimmers. II. No doctor is a swimmer. III. All pilots are artists. IV. Some swimmers are pilots.', 'I and II only', ['II and III only', 'I, II and III only', 'I and IV only'], 2),
    Q(RK, 'M', 'In a row of 40 students, Arun is 12th from the left end and Bala is 9th from the right end. How many students stand between Arun and Bala?', '19', ['18', '20', '21'], 3),
    Q(OO, 'E', 'Find the odd one out: Mercury, Venus, Moon, Mars', 'Moon', ['Mercury', 'Venus', 'Mars'], 0),
    Q(AN, 'M', '7 : 344 :: 5 : ?', '126', ['124', '125', '130'], 2),
    Q(CC, 'M', 'If 1 January 2028 falls on a Saturday, what day of the week will 4 July 2028 be? (2028 is a leap year.)', 'Tuesday', ['Monday', 'Wednesday', 'Sunday'], 3),
    Q(CC, 'H', 'At what time between 6 o\'clock and 7 o\'clock will the hour hand and the minute hand of a clock first be at right angles to each other after 6:00?', '16 4/11 minutes past 6', ['15 minutes past 6', '49 1/11 minutes past 6', '16 minutes past 6'], 0)
  ],

  company1: [
    Q(NS, 'E', 'Find the next number in the series: 3, 4, 6, 9, 13, ?', '18', ['17', '19', '20'], 1),
    Q(CD, 'E', 'In a certain code, every letter is replaced by the letter that comes just after it in the alphabet, so SCORE is written as TDPSF. How is the word CODE written in that code?', 'DPEF', ['BNCD', 'DPFE', 'EQFG'], 0),
    Q(SY, 'E', 'Statements: No pencil is a ruler. All rulers are metal.\nConclusions: I. No pencil is metal. II. Some metal things are not pencils.', 'Only II follows', ['Only I follows', 'Both I and II follow', 'Neither I nor II follows'], 3),
    Q(OO, 'E', 'Find the odd one out: 17, 23, 29, 33, 41', '33', ['17', '29', '41'], 2),
    Q(AN, 'E', 'Pen : Write :: Knife : ?', 'Cut', ['Sharp', 'Steel', 'Kitchen'], 1),
    Q(NS, 'M', 'Find the next number in the series: 4, 6, 12, 30, 90, ?', '315', ['270', '360', '300'], 3),
    Q(CD, 'M', 'In a certain code, the letters in odd positions of a word are replaced by the next letter in the alphabet and the letters in even positions are replaced by the previous letter. How is the word PLANET written in that code?', 'QKBMFS', ['QMBMFS', 'QKBOFS', 'OKZMDS'], 0),
    Q(BR, 'M', 'P is the brother of Q. Q is the mother of R. R is the sister of S. T is the father of S. How is P related to T?', 'Brother-in-law', ['Uncle', 'Brother', 'Father-in-law'], 2),
    Q(DS, 'M', 'A courier starts from a depot, drives 12 km towards the east, then 9 km towards the south, then 4 km towards the west and finally 15 km towards the north. How far and in which direction is he from the depot now?', '10 km north-east', ['10 km north-west', '14 km north-east', '8 km north-east'], 1),
    Q(SA, 'M', 'Six colleagues Kunal, Lata, Manoj, Nisha, Omar and Pooja sit in a row facing north. Nisha sits third from the left. Kunal sits immediately to the right of Nisha. Omar sits at an extreme end, and Lata sits immediately to the left of Omar. Pooja sits somewhere to the left of Manoj. Who sits second from the left?', 'Manoj', ['Pooja', 'Nisha', 'Kunal'], 3),
    Q(RK, 'M', 'Six people are compared by age. Deepa is older than Esha but younger than Farah. Gina is older than Farah but younger than Ishan. Hari is younger than Esha. Who is the third youngest?', 'Deepa', ['Esha', 'Farah', 'Gina'], 2),
    Q(CC, 'M', 'The 3rd of March in a certain non-leap year falls on a Tuesday. On which day of the week does 25 December of the same year fall?', 'Friday', ['Thursday', 'Saturday', 'Wednesday'], 0),
    Q(NS, 'H', 'Find the next number in the series: 2, 12, 36, 80, 150, ?', '252', ['240', '256', '210'], 1),
    Q(SA, 'H', 'Seven people A, B, C, D, E, F and G sit in a row facing north. D sits fifth from the left. A sits two places to the left of D, with exactly one person between them. B is a neighbour of A. C sits somewhere to the left of A. G sits somewhere to the right of D. F and G are not neighbours. E sits at neither end and is not a neighbour of B. Who sits immediately to the right of D?', 'E', ['F', 'G', 'B'], 2),
    Q(CC, 'H', 'A watch gains 3 minutes every hour. It is set right at 5:00 a.m. on Monday. When the watch shows 12 noon on Tuesday, what is the correct time?', '10:31 3/7 a.m. on Tuesday', ['10:30 a.m. on Tuesday', '10:28 4/7 a.m. on Tuesday', '11:00 a.m. on Tuesday'], 3)
  ]
};
