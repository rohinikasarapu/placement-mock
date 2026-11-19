'use strict';
// Original campus-placement numerical puzzle questions (number puzzles, patterns, logical calculations, missing numbers).

const DIFF = { E: 'Easy', M: 'Medium', H: 'Hard' };
const mk = (topic, d, text, options, answer) => ({ text, options, answer, difficulty: DIFF[d], topic });

const NP = 'Number Puzzles';
const MP = 'Mathematical Patterns';
const LC = 'Logical Calculations';
const MN = 'Missing Number';

module.exports = {
  apt1: [
    mk(NP, 'E',
      'A two-digit number has digit sum 11. The number is 27 more than the number formed by reversing its digits. Find the number.',
      ['83', '74', '65', '92'], 1),
    mk(MN, 'M',
      'Find the missing number in the grid.\nRow 1: 3  4  25\nRow 2: 5  12  169\nRow 3: 8  15  ?',
      ['225', '247', '289', '323'], 2),
    mk(LC, 'M',
      'If + means ×, × means −, − means ÷ and ÷ means +, find the value of:\n12 ÷ 6 + 3 × 5 − 5',
      ['29', '25', '31', '37'], 0),
    mk(MN, 'H',
      'Each circle has four outer numbers (Top, Right, Bottom, Left) and a centre number that follows the same rule in every circle. Find the missing Left number in Circle 3.\nCircle 1: Top 3, Right 4, Bottom 5, Left 6, Centre 39\nCircle 2: Top 2, Right 7, Bottom 8, Left 9, Centre 79\nCircle 3: Top 5, Right 6, Bottom 7, Left ?, Centre 71',
      ['3', '4', '5', '6'], 3)
  ],
  apt2: [
    mk(MN, 'E',
      'Every row and every column of this grid adds up to the same total. Find the missing number.\nRow 1: 6  1  8\nRow 2: 7  5  3\nRow 3: 2  9  ?',
      ['4', '6', '3', '5'], 0),
    mk(LC, 'M',
      'In a meeting, every person shook hands exactly once with every other person, and there were 55 handshakes in all. Then 2 more people arrive and each of them shakes hands once with everyone present (including each other). How many new handshakes take place?',
      ['22', '23', '24', '26'], 1),
    mk(NP, 'M',
      'A and B are different non-zero digits. The two-digit numbers AB and BA add up to 121, A × B = 28, and AB is greater than BA. Find A − B.',
      ['4', '5', '2', '3'], 3),
    mk(LC, 'H',
      'Ravi is twice as old as Sita was when Ravi was as old as Sita is now. The sum of their present ages is 63 years. Find Ravi\'s present age (in years).',
      ['27', '45', '36', '32'], 2)
  ],
  tech1: [
    mk(NP, 'E',
      'I think of a number, double it, add 12 and divide the result by 4. The answer is 9. What is my number?',
      ['10', '14', '12', '16'], 2),
    mk(MP, 'M',
      'Study the triangle of odd numbers.\nRow 1: 1\nRow 2: 3  5\nRow 3: 7  9  11\nRow 4: 13  15  17  19\nFollowing the same pattern, what is the sum of all the numbers in Row 6?',
      ['196', '216', '225', '256'], 1),
    mk(LC, 'M',
      'On a balance, 1 cube and 1 cone together weigh the same as 7 balls. Also, 1 cube weighs the same as 2 cones and 1 ball. How many balls weigh the same as 1 cone?',
      ['2', '3', '4', '5'], 0),
    mk(NP, 'H',
      'In the multiplication AB × AB = CAB, each letter stands for a different digit and AB is a two-digit number (CAB is three digits). Find A + B + C.',
      ['12', '14', '15', '13'], 3)
  ],
  tech2: [
    mk(MN, 'E',
      'Find the missing number.\nRow 1: 5  7  12\nRow 2: 8  9  17\nRow 3: 6  ?  15',
      ['8', '9', '10', '7'], 1),
    mk(MP, 'M',
      'If 2 @ 3 = 13, 3 @ 4 = 25 and 4 @ 5 = 41, then 5 @ 6 = ?',
      ['55', '59', '61', '65'], 2),
    mk(LC, 'M',
      'A purse holds 12 coins of ₹1, ₹2 and ₹5 with a total value of ₹39. The number of ₹1 coins equals the number of ₹2 coins. How many ₹5 coins are there?',
      ['6', '4', '5', '7'], 0),
    mk(LC, 'H',
      'Mr. and Mrs. Rao attend a party with three other couples (8 people in all). Everyone shook hands with some of the others, but nobody shook hands with themselves, with their own spouse, or with the same person twice. Mr. Rao asked each of the other seven people how many hands they had shaken and got seven different answers. How many hands did Mrs. Rao shake?',
      ['2', '4', '3', '5'], 2)
  ],
  company1: [
    mk(LC, 'E',
      'A father is 3 times as old as his son. After 12 years he will be twice as old as his son. Find the son\'s present age (in years).',
      ['10', '14', '8', '12'], 3),
    mk(MN, 'M',
      'Each triangle has three corner numbers and a centre number that follows the same rule. Find the missing centre number.\nTriangle 1: corners 2, 3, 4, centre 29\nTriangle 2: corners 1, 5, 6, centre 62\nTriangle 3: corners 3, 4, 7, centre ?',
      ['64', '70', '74', '84'], 2),
    mk(NP, 'M',
      'Exactly one three-digit number is equal to 21 times the sum of its digits. Find the number.',
      ['357', '378', '399', '336'], 1),
    mk(LC, 'H',
      'There are 12 coins that look identical. One of them is odd and is either heavier or lighter than the rest, which all weigh the same. Using only a two-pan balance with no weights, what is the minimum number of weighings that is guaranteed to identify the odd coin and also tell whether it is heavier or lighter?',
      ['3', '4', '5', '2'], 0)
  ]
};
