'use strict';
// Original quantitative aptitude questions (technical ability) for the placement mock tests.

const DIFF = { E: 'Easy', M: 'Medium', H: 'Hard' };
const mk = (topic, d, text, options, answer) => ({ text, options, answer, difficulty: DIFF[d], topic });

const B = {};

B.apt1 = [
  mk("Percentages", 'E', "A number increased by 25% becomes 150. What is the number?", ["125", "120", "112.5", "187.5"], 1),
  mk("Profit and Loss", 'E', "A shopkeeper buys an article for ₹800, marks it 25% above cost and allows a 10% discount. What is his profit percentage?", ["15%", "10%", "25%", "12.5%"], 3),
  mk("Simple and Compound Interest", 'E', "What is the simple interest on ₹6,400 at 7.5% per annum for 4 years?", ["₹1,920", "₹1,800", "₹480", "₹2,400"], 0),
  mk("Time and Work", 'M', "A can complete a job in 12 days and B in 18 days. They work together for 4 days, then A leaves and B finishes the rest alone. In how many days in all is the job completed?", ["8", "10", "12", "14"], 2),
  mk("Speed, Time and Distance", 'M', "Two trains of lengths 120 m and 180 m run on parallel tracks in opposite directions at 54 km/h and 36 km/h. How many seconds do they take to cross each other completely?", ["20", "15", "12", "10"], 2),
  mk("Ratio, Proportion and Averages", 'M', "The average of 6 numbers is 42. If two of the numbers, whose average is 30, are removed, what is the average of the remaining four numbers?", ["48", "36", "45", "54"], 0),
  mk("Probability", 'M', "A bag holds 5 red, 4 blue and 3 green balls. Two balls are drawn at random without replacement. What is the probability that both have the same colour?", ["25/72", "1/3", "5/22", "19/66"], 3),
  mk("Permutations and Combinations", 'M', "A committee of 4 is to be chosen from 6 men and 5 women so that it contains at least 2 women. In how many ways can this be done?", ["330", "215", "185", "225"], 1),
  mk("Number Systems", 'H', "How many integers from 1 to 200 are divisible by 3 or by 5 but not by 15?", ["80", "93", "106", "66"], 0),
  mk("Mixtures and Ages", 'H', "A 60-litre mixture of milk and water has milk and water in the ratio 3 : 2. How many litres of the mixture must be drawn off and replaced with pure water so that the ratio becomes 1 : 1?", ["12", "8", "10", "6"], 2)
];

B.apt2 = [
  mk("Percentages", 'E', "In a recruitment test 30% of the candidates failed, and 360 candidates failed. How many candidates appeared?", ["1,080", "840", "1,200", "1,100"], 2),
  mk("Profit and Loss", 'E', "An item sold at a loss of 20% fetched ₹1,520. What was its cost price?", ["₹1,900", "₹1,824", "₹1,672", "₹1,800"], 0),
  mk("Simple and Compound Interest", 'E', "Find the compound interest on ₹8,000 at 5% per annum for 2 years, compounded annually.", ["₹800", "₹840", "₹8,820", "₹820"], 3),
  mk("Time and Work", 'M', "8 men can finish a job in 18 days. After 6 days, 4 more men join them. How many more days are needed to finish the job?", ["12", "8", "9", "6"], 1),
  mk("Speed, Time and Distance", 'M', "A boat covers 24 km downstream in 2 hours and the same 24 km upstream in 3 hours. What is the speed of the stream in km/h?", ["4", "10", "5", "2"], 3),
  mk("Ratio, Proportion and Averages", 'M', "₹3,900 is divided among A, B and C in the ratio 1/2 : 1/3 : 1/4. How much does B receive?", ["₹1,300", "₹1,200", "₹1,500", "₹1,170"], 1),
  mk("Probability", 'M', "Two fair dice are thrown together. What is the probability that the sum of the numbers is 9 or more?", ["5/18", "1/4", "1/6", "7/36"], 0),
  mk("Permutations and Combinations", 'M', "How many 4-digit even numbers can be formed using the digits 1 to 7 if no digit is repeated?", ["840", "420", "360", "480"], 2),
  mk("Number Systems", 'H', "What is the largest number that divides 1011 and 2309 leaving remainders 3 and 5 respectively?", ["72", "144", "48", "36"], 1),
  mk("Mixtures and Ages", 'H', "Two varieties of tea costing ₹60 per kg and ₹75 per kg are mixed in the ratio 3 : 2. At what price per kg must the mixture be sold to earn a 20% profit?", ["₹78.00", "₹75.60", "₹81.00", "₹79.20"], 3)
];

B.tech1 = [
  mk("Percentages", 'E', "The price of an article is first increased by 20% and then the new price is decreased by 20%. What is the net change in the price?", ["4% decrease", "No change", "4% increase", "2% decrease"], 0),
  mk("Profit and Loss", 'E', "The cost price of 12 articles equals the selling price of 10 articles. What is the profit percentage?", ["12%", "16.67%", "20%", "10%"], 2),
  mk("Number Systems", 'E', "What is the smallest positive number that is exactly divisible by 12, 18 and 30?", ["90", "180", "360", "540"], 1),
  mk("Simple and Compound Interest", 'M', "A sum of money at simple interest amounts to ₹1,260 in 3 years and ₹1,320 in 5 years. What is the sum?", ["₹1,200", "₹1,100", "₹1,290", "₹1,170"], 3),
  mk("Time and Work", 'M', "Pipe A can fill a tank in 20 minutes and pipe B in 30 minutes, while an outlet C can empty the full tank in 60 minutes. If all three are opened together, how many minutes will the empty tank take to fill?", ["15", "12", "20", "10"], 0),
  mk("Ratio, Proportion and Averages", 'M', "A class has 36 boys with an average weight of 55 kg and 24 girls with an average weight of 45 kg. What is the average weight of the whole class in kg?", ["50", "52", "48", "51"], 3),
  mk("Probability", 'M', "A committee of 3 is chosen at random from 5 men and 4 women. What is the probability that all three are men?", ["5/21", "1/6", "5/42", "1/12"], 2),
  mk("Permutations and Combinations", 'M', "In how many ways can the letters of the word DESIGN be arranged so that the two vowels are NOT together?", ["240", "480", "360", "720"], 1),
  mk("Speed, Time and Distance", 'H', "A train passes a stationary man in 8 seconds and crosses a 120 m long platform in 14 seconds. What is the speed of the train in km/h?", ["54", "80", "90", "72"], 3),
  mk("Mixtures and Ages", 'H', "A vessel contains 80 litres of pure milk. 8 litres are removed and replaced with water; this operation is carried out two more times in the same way (three times in all). How many litres of milk are left in the vessel?", ["58.32", "64.8", "56", "72"], 0)
];

B.tech2 = [
  mk("Percentages", 'E', "What percentage of 360 is 81?", ["20%", "25%", "24%", "22.5%"], 3),
  mk("Profit and Loss", 'E', "An item has a marked price of ₹1,500 and is sold at a discount of 12%. What is the selling price?", ["₹1,380", "₹1,320", "₹1,350", "₹1,288"], 1),
  mk("Simple and Compound Interest", 'E', "What is the difference between the compound interest (compounded annually) and the simple interest on ₹5,000 at 6% per annum for 2 years?", ["₹18", "₹36", "₹180", "₹30"], 0),
  mk("Time and Work", 'M', "A and B together can complete a task in 6 days, and A alone can complete it in 10 days. In how many days can B alone complete it?", ["12", "16", "15", "30"], 2),
  mk("Speed, Time and Distance", 'M', "A man rows at 6 km/h in still water and the river flows at 2 km/h. He rows to a place and back in a total of 3 hours. How far is the place, in km?", ["12", "8", "9", "6"], 1),
  mk("Ratio, Proportion and Averages", 'M', "The average of four consecutive even numbers is 25. What is the largest of these numbers?", ["28", "26", "30", "32"], 0),
  mk("Probability", 'M', "A number is picked at random from 1 to 30. What is the probability that it is a prime number or a multiple of 5?", ["11/30", "1/3", "2/5", "1/2"], 3),
  mk("Permutations and Combinations", 'M', "A team of 5 is to be selected from 7 batsmen and 5 bowlers so that it has exactly 3 bowlers. In how many ways can this be done?", ["792", "350", "210", "420"], 2),
  mk("Number Systems", 'H', "What is the remainder when 1! + 2! + 3! + ... + 10! is divided by 12?", ["3", "0", "9", "6"], 2),
  mk("Mixtures and Ages", 'H', "The present ages of two friends are in the ratio 5 : 3. After 6 years the ratio will be 7 : 5. What is the sum of their present ages in years?", ["36", "24", "30", "18"], 1)
];

B.company1 = [
  mk("Percentages", 'E', "An employee's monthly salary rises from ₹36,000 to ₹41,400. What is the percentage increase?", ["14%", "15%", "16%", "12.5%"], 1),
  mk("Profit and Loss", 'E', "A phone bought for ₹12,000 is sold at a loss of 15%. What is its selling price?", ["₹10,800", "₹13,800", "₹10,200", "₹10,000"], 2),
  mk("Simple and Compound Interest", 'E', "At what rate of simple interest per annum will ₹2,500 amount to ₹2,800 in 2 years?", ["5%", "12%", "4%", "6%"], 3),
  mk("Time and Work", 'M', "A and B together finish a job in 12 days, B and C together in 15 days, and C and A together in 20 days. In how many days will all three working together finish the job?", ["10", "9", "11", "8"], 0),
  mk("Speed, Time and Distance", 'M', "A car covers the first half of a journey at 40 km/h and the second half at 60 km/h. What is its average speed for the whole journey in km/h?", ["50", "52", "48", "45"], 2),
  mk("Ratio, Proportion and Averages", 'M', "The average age of 5 members of a team is 28 years. When a new member joins, the average becomes 27 years. What is the age of the new member?", ["26", "24", "27", "22"], 3),
  mk("Probability", 'M', "Two cards are drawn without replacement from ten cards numbered 1 to 10. What is the probability that the sum of the two numbers is even?", ["4/9", "1/2", "5/9", "2/5"], 0),
  mk("Permutations and Combinations", 'M', "Five friends sit in a row. In how many arrangements do two particular friends, Asha and Bala, sit next to each other?", ["24", "48", "120", "72"], 1),
  mk("Number Systems", 'H', "How many integers strictly between 100 and 500 are divisible by 7 but not by 5?", ["45", "57", "46", "56"], 0),
  mk("Mixtures and Ages", 'H', "Vessel A holds 10 litres of milk and water in the ratio 3 : 2 and vessel B holds 15 litres in the ratio 4 : 1. If both are mixed, what is the ratio of milk to water in the mixture?", ["17 : 8", "3 : 1", "7 : 3", "18 : 7"], 3)
];

module.exports = B;
