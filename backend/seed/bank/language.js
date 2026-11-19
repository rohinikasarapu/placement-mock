'use strict';
// Original verbal, grammar and written-response content for the language section of the mock tests.

const DIFF = { E: 'Easy', M: 'Medium', H: 'Hard' };
const mk = (topic, d, text, options, answer) => ({ text, options, answer, difficulty: DIFF[d], topic });
const RC = (passage, items) =>
  items.map(([q, o, a, d]) =>
    mk('Reading Comprehension', d, 'Passage:\n' + passage + '\n\nQuestion: ' + q, o, a)
  );
const S = (d, t, o, a) => mk('Sentence Completion', d, 'Fill in the blank: ' + t, o, a);
const Y = (d, w, o, a) => mk('Synonyms', d, 'Choose the word that is closest in meaning to the word: ' + w, o, a);
const N = (d, w, o, a) => mk('Antonyms', d, 'Choose the word that is opposite in meaning to the word: ' + w, o, a);
const A = (d, s, o, a) =>
  mk(
    'Sentence Arrangement',
    d,
    'Arrange the following sentences in a logical order to form a meaningful paragraph:\nP. ' +
      s[0] + '\nQ. ' + s[1] + '\nR. ' + s[2] + '\nS. ' + s[3],
    o,
    a
  );
const V = (d, topic, t, o, a) => mk(topic, d, t, o, a);
const G = (d, topic, t, o, a) => mk(topic, d, t, o, a);
const W = (d, topic, text) => ({ text, difficulty: DIFF[d], topic });

const T = {};

T.apt1 = {
  verbal: [
    ...RC(
      "Many towns in dry regions now depend on rooftop rainwater harvesting to meet part of their water needs. The method is simple: rain falling on a roof is guided through pipes into a storage tank or into a pit that refills the groundwater. Households that adopt it often find that their wells stay full for longer after the monsoon ends. The cost of installation is modest and is usually recovered within a few years through lower water bills. However, experts caution that the system works well only when the first rain is allowed to wash away dust and bird droppings before the water is collected, and when tanks are cleaned regularly. Without such care, the stored water can become unsafe even for washing.",
      [
        ["What is the main idea of the passage?", ["Rainwater is unsafe for any household use.", "Rooftop rainwater harvesting can supplement the water supply of dry regions if it is carefully maintained.", "Wells are always better than storage tanks.", "Monsoon rains are decreasing in most towns."], 1, "E"],
        ["According to the passage, why should the first rain be allowed to run off?", ["To fill the wells more quickly", "To test whether the pipes are working", "To wash away dust and droppings from the roof before collection", "To lower the cost of installation"], 2, "M"],
        ["What does the passage say about the cost of installing the system?", ["It is met entirely by the government.", "It rises after every monsoon.", "It is too high for ordinary households.", "It is usually recovered within a few years through lower water bills."], 3, "M"],
        ["Which of the following can be inferred from the passage?", ["The benefits of rainwater harvesting depend on upkeep as well as installation.", "Stored rainwater is always fit for drinking.", "Pits are more effective than tanks in every region.", "Households stop paying water bills once a system is installed."], 0, "H"],
      ]
    ),
    S("E", "The teacher asked the students to ______ complete silence during the examination.", ["mention", "maintain", "measure", "mislead"], 1),
    S("E", "Rahul is ______ to learn new skills, so his seniors trust him with fresh projects.", ["eager", "eagerly", "eagerness", "eagerer"], 0),
    S("M", "Although the plan looked impressive on paper, it proved ______ when it was put into practice.", ["impressive", "imperative", "impractical", "impartial"], 2),
    S("H", "The auditor's report was so ______ that even the smallest discrepancy in the accounts was recorded.", ["perfunctory", "ambiguous", "flamboyant", "meticulous"], 3),
    Y("E", "RAPID", ["rare", "quick", "weak", "final"], 1),
    Y("M", "MITIGATE", ["aggravate", "abandon", "alleviate", "anticipate"], 2),
    Y("H", "EPHEMERAL", ["short-lived", "eternal", "fragile", "ancient"], 0),
    N("E", "GENEROUS", ["kind", "rich", "polite", "stingy"], 3),
    N("M", "SCARCE", ["rare", "limited", "plentiful", "costly"], 2),
    N("H", "CANDID", ["frank", "evasive", "truthful", "open"], 1),
    A("E", [
      "The librarian then stamped the due date inside the cover.",
      "Meena picked a novel from the shelf and carried it to the counter.",
      "She walked into the college library after her last class.",
      "Finally, she slipped the book into her bag and left.",
    ], ["QRPS", "RQPS", "RPQS", "PQRS"], 1),
    A("M", [
      "As a result, the farmers switched to crops that need less water.",
      "The district received very little rain for three consecutive years.",
      "Groundwater levels in the area fell sharply.",
      "Local officials now encourage this change with training and seed subsidies.",
    ], ["QPRS", "RQPS", "PQRS", "QRPS"], 3),
    A("M", [
      "It was only after the second revision that the report was approved.",
      "The team submitted its first draft on Monday.",
      "The manager returned it with comments on structure and data.",
      "The team corrected these points and resubmitted it on Thursday.",
    ], ["QRSP", "QRPS", "RQSP", "QSRP"], 0),
    V("E", "Idioms", "Choose the correct meaning of the idiom: 'to burn the midnight oil'.", ["to waste electricity", "to work or study late into the night", "to start work very early in the morning", "to avoid hard work"], 1),
    V("M", "One-word Substitution", "Choose the one word that can replace the phrase: a speech delivered without any preparation", ["soliloquy", "oration", "extempore", "monologue"], 2),
    V("H", "Vocabulary in Context", "Choose the option closest in meaning to the word 'effusive' as used in the sentence: The manager's praise for the team was so effusive that several members blushed.", ["reluctant and cold", "warm and unrestrained", "formal and brief", "sarcastic and mocking"], 1),
  ],
  grammar: [
    G("E", "Tenses", "Fill in the blank: By the time we reached the station, the train ______.", ["left", "has left", "had left", "was leaving"], 2),
    G("E", "Articles", "Fill in the blank: She bought ______ umbrella because it was raining heavily.", ["a", "an", "the", "no article"], 1),
    G("M", "Prepositions", "Fill in the blank: The committee will decide ______ the proposal by the end of this week.", ["at", "to", "for", "on"], 3),
    G("M", "Subject-Verb Agreement", "Fill in the blank: Neither the manager nor his assistants ______ present at the meeting yesterday.", ["was", "were", "is", "has been"], 1),
    G("H", "Error Detection", "Identify the part of the sentence that contains an error:\n(A) The number of students (B) who have applied for the scholarship (C) are higher than last year. (D) No error", ["The number of students", "who have applied for the scholarship", "are higher than last year", "No error"], 2),
  ],
  written: [
    W("M", "Professional Email", "You are an intern who has been asked to attend a client meeting on Friday morning, but you have a university examination at the same time. Write a professional email to your reporting manager explaining the situation, proposing an alternative way to contribute, and requesting approval. Include a suitable subject line, an opening and a closing, in 150-200 words."),
  ],
};
T.apt2 = {
  verbal: [
    ...RC(
      "Honeybees communicate the location of food through a movement known as the waggle dance. A forager that has found a rich patch of flowers returns to the hive and moves in a figure-of-eight pattern on the honeycomb. The angle of the straight central run, measured against the vertical, shows the direction of the food relative to the sun, while the length of the run signals the distance. Other bees watch closely and then fly out to the flowers on their own. Scientists once doubted that insects could pass on such precise information, but decades of careful experiments have confirmed it. Today, the dance is studied not only by biologists but also by engineers who design cooperative robots.",
      [
        ["What does the waggle dance communicate?", ["The approach of a predator", "The location of food", "The age of the queen", "The arrival of rain"], 1, "E"],
        ["According to the passage, the length of the straight central run indicates", ["the direction of the food", "the quality of the nectar", "the distance to the food", "the number of bees needed"], 2, "M"],
        ["Which of the following statements is supported by the passage?", ["Bees perform the dance outside the hive, in the open air.", "Scientists always accepted the idea without testing it.", "Engineers were the first to discover the dance.", "Scientists once doubted that insects could pass on such precise information."], 3, "M"],
        ["Why does the writer mention engineers in the last sentence?", ["To show that interest in the dance now extends beyond biology", "To suggest that robots will replace bees", "To criticise biologists for their early doubts", "To explain how honeycombs are built"], 0, "H"],
      ]
    ),
    S("E", "Please ______ your seats, as the film is about to begin.", ["bring", "take", "make", "give"], 1),
    S("E", "The shopkeeper offered a ______ on the shirt because it had a small stain.", ["distance", "discussion", "discount", "discovery"], 2),
    S("M", "Despite repeated warnings, the driver continued to ______ the speed limit.", ["precede", "exceed", "accede", "concede"], 1),
    S("H", "The new policy was ______ by the employees, who felt that it ignored their genuine concerns.", ["lauded", "endorsed", "welcomed", "lambasted"], 3),
    Y("E", "BRAVE", ["courageous", "timid", "careless", "rude"], 0),
    Y("M", "OBSOLETE", ["popular", "advanced", "outdated", "essential"], 2),
    Y("H", "TACITURN", ["hospitable", "anxious", "forgetful", "uncommunicative"], 3),
    N("E", "ANCIENT", ["old", "historic", "traditional", "modern"], 3),
    N("M", "EXPAND", ["enlarge", "stretch", "contract", "widen"], 2),
    N("H", "BENIGN", ["malignant", "kind", "gentle", "harmless"], 0),
    A("E", [
      "The cashier scanned each item and told her the total.",
      "Divya joined the queue at the supermarket with her basket.",
      "She paid by card and collected the receipt.",
      "When her turn came, she placed the basket on the counter.",
    ], ["SQPR", "QSPR", "QPSR", "QSRP"], 1),
    A("M", [
      "Therefore, many companies now allow employees to work from home on certain days.",
      "Long commutes in large cities leave workers tired and stressed.",
      "This fatigue lowers their productivity during office hours.",
      "Working from home also saves fuel and cuts pollution.",
    ], ["QRSP", "RQPS", "QRPS", "PQRS"], 2),
    A("M", [
      "Based on this pattern, he prepared those topics first.",
      "His preparation, therefore, became both focused and efficient.",
      "Ravi studied the previous question papers carefully.",
      "He noticed that certain topics appeared almost every year.",
    ], ["SRPQ", "RSPQ", "RPSQ", "PSRQ"], 1),
    V("E", "Idioms", "Choose the correct meaning of the idiom: 'a piece of cake'.", ["a difficult task", "a small dessert", "an unexpected gift", "something very easy"], 3),
    V("M", "One-word Substitution", "Choose the one word that can replace the phrase: a lover of books", ["bibliophile", "philatelist", "numismatist", "philanthropist"], 0),
    V("H", "Vocabulary in Context", "Choose the option closest in meaning to the word 'equivocal' as used in the sentence: The minister's reply was deliberately equivocal, so the reporters could not tell whether he approved the plan.", ["clear and firm", "hurried", "open to more than one interpretation", "openly hostile"], 2),
  ],
  grammar: [
    G("E", "Articles", "Fill in the blank: ______ Ganga is considered the holiest river in India.", ["A", "An", "The", "No article"], 2),
    G("M", "Subject-Verb Agreement", "Fill in the blank: Neither of the two proposals ______ acceptable to the board.", ["are", "were", "is", "have been"], 2),
    G("E", "Tenses", "Fill in the blank: I ______ in Hyderabad since 2019.", ["have been living", "live", "lived", "am living"], 0),
    G("H", "Error Detection", "Identify the part of the sentence that contains an error:\n(A) Scarcely had he reached (B) the station (C) than the train (D) departed.", ["Scarcely had he reached", "the station", "than the train", "departed"], 2),
    G("M", "Prepositions", "Fill in the blank: The shopkeeper is not responsible ______ any damage reported after the goods have left the shop.", ["of", "for", "to", "with"], 1),
  ],
  written: [
    W("M", "Short Essay", "Write a short essay on 'How Technology Can Make Education More Accessible to Students in Rural Areas'. Discuss at least one benefit, one challenge and one practical suggestion, and end with a brief conclusion. Your essay should be 200-250 words."),
  ],
};
T.tech1 = {
  verbal: [
    ...RC(
      "In the early days of software development, testing was treated as the final step, carried out only after the programmers had finished writing the entire product. Bugs discovered at that stage were costly, because fixing one often meant rewriting large sections of code that other parts depended on. Modern teams therefore test continuously. Small automated checks run every time a developer saves a change, and any failure is reported within minutes. This approach does not remove the need for human testers, who still explore the product in ways a script cannot imagine. What it does is catch simple mistakes early, so that people can spend their time on the problems that truly require judgement.",
      [
        ["According to the passage, in the early days of software development testing was done", ["continuously, by automated scripts", "only at the end, after the product was written", "by the users of the product", "before any code was written"], 1, "E"],
        ["Why were bugs found late in development so costly?", ["The programmers had usually left the team.", "Testers demanded higher fees.", "Repairs often meant rewriting code on which other parts depended.", "Users reported them too slowly."], 2, "M"],
        ["What does the writer say about human testers?", ["They remain necessary because they explore the product in ways scripts cannot.", "They are no longer needed in modern teams.", "They should write all the automated checks.", "They slow down the development process."], 0, "M"],
        ["What is the main purpose of continuous automated testing, according to the passage?", ["To eliminate human testers altogether", "To make programmers save their changes less often", "To reduce the size of the finished product", "To catch simple mistakes early so that people can focus on problems needing judgement"], 3, "H"],
      ]
    ),
    S("E", "The company decided to ______ its office to a larger building.", ["relate", "relocate", "relax", "release"], 1),
    S("E", "He reached late because there was a lot of ______ on the highway.", ["trade", "tradition", "traffic", "training"], 2),
    S("M", "The engineer's proposal was rejected, not because it was flawed, but because it was too ______ for the small budget.", ["modest", "frugal", "economical", "extravagant"], 3),
    S("H", "The tender document was so ______ with conditions that few vendors could realistically meet them.", ["encumbered", "enriched", "endorsed", "entrusted"], 0),
    Y("E", "HUGE", ["tiny", "enormous", "simple", "narrow"], 1),
    Y("M", "AUGMENT", ["reduce", "replace", "conceal", "increase"], 3),
    Y("H", "OBDURATE", ["stubborn", "obedient", "obvious", "obscure"], 0),
    N("E", "DIFFICULT", ["hard", "tough", "easy", "complex"], 2),
    N("M", "ACCELERATE", ["hasten", "speed up", "slow down", "begin"], 2),
    N("H", "VERBOSE", ["concise", "wordy", "lengthy", "talkative"], 0),
    A("E", [
      "He opened the editor and wrote the first few lines of code.",
      "Aman decided to build a small calculator program.",
      "The program ran successfully and showed the correct sum.",
      "He then pressed the run button to test it.",
    ], ["PQSR", "QPRS", "QSPR", "QPSR"], 3),
    A("M", [
      "For this reason, the company added a second server in another city.",
      "A single power failure once brought the entire website down for six hours.",
      "Customers who could not log in complained loudly on social media.",
      "Now, if one server fails, the other takes over automatically.",
    ], ["RQPS", "QRPS", "QPRS", "QRSP"], 1),
    A("M", [
      "Such errors often stay hidden until a report produces absurd figures.",
      "This is why regular audits of stored data are essential.",
      "A single data-entry mistake can quietly corrupt thousands of records.",
      "By then, much of the damage has already spread to other systems.",
    ], ["PRSQ", "RSPQ", "RPSQ", "RPQS"], 2),
    V("E", "Idioms", "Choose the correct meaning of the idiom: 'to hit the nail on the head'.", ["to injure oneself while working", "to make a very loud noise", "to describe or do exactly the right thing", "to repair a problem using tools"], 2),
    V("M", "One-word Substitution", "Choose the one word that can replace the phrase: a being who knows everything", ["omnipotent", "omniscient", "omnivorous", "omnipresent"], 1),
    V("H", "Vocabulary in Context", "Choose the option closest in meaning to the word 'scathing' as used in the sentence: The auditor's report was scathing, listing every lapse in the department's records.", ["mildly amusing", "quietly approving", "hurriedly written", "severely critical"], 3),
  ],
  grammar: [
    G("E", "Prepositions", "Fill in the blank: He was born ______ 12 March 2004.", ["in", "at", "on", "by"], 2),
    G("M", "Error Detection", "Identify the part of the sentence that contains an error:\n(A) Every one of the candidates (B) were asked (C) to submit a copy of the resume. (D) No error", ["Every one of the candidates", "were asked", "to submit a copy of the resume", "No error"], 1),
    G("E", "Tenses", "Fill in the blank: While I ______ for the bus, I saw my old classmate across the road.", ["waited", "have waited", "wait", "was waiting"], 3),
    G("H", "Subject-Verb Agreement", "Fill in the blank: The committee, along with its chairman, ______ expected to announce the results tomorrow.", ["are", "have been", "were", "is"], 3),
    G("M", "Articles", "Fill in the blank: She handed me ______ one-rupee coin as change.", ["an", "a", "the", "no article"], 1),
  ],
  written: [
    W("M", "Workplace Communication", "Your team lead has asked you to send a short message to the whole team about a change in the project deadline caused by a delay at the client's end. Write the message so that it is clear, polite and motivating, and so that it tells everyone exactly what they must do next. Your message should be 100-150 words."),
  ],
};
T.tech2 = {
  verbal: [
    ...RC(
      "A password that is easy to remember is usually easy to guess. Many users choose their birth year, a pet's name, or the word 'password' followed by a digit, and attackers know this. Security experts therefore suggest using a long phrase made of unrelated words, which is both harder to crack and easier to recall than a short string of symbols. They also recommend a different password for each account, because a leak from one website can otherwise give criminals the key to many others. Since memorising dozens of phrases is unrealistic, a password manager can store them securely behind a single strong master phrase. Whatever method is used, a second step, such as a code sent to a phone, adds a final layer of protection.",
      [
        ["Which kind of password do security experts recommend?", ["A short string of symbols", "A birth year", "A long phrase of unrelated words", "The name of a pet"], 2, "E"],
        ["Why should every account have its own password?", ["A leak from one website could otherwise expose many other accounts.", "Websites do not allow the same password twice.", "Long phrases stop working after a few weeks.", "Password managers cannot store repeated passwords."], 0, "M"],
        ["According to the passage, why is a password manager useful?", ["It removes the need for any password.", "It sends a code to the user's phone.", "It makes short passwords impossible to crack.", "It stores many passwords securely behind one strong master phrase."], 3, "M"],
        ["What does the last sentence of the passage imply?", ["Passwords are no longer necessary.", "Even a strong password is made safer by an additional verification step.", "Phones are always more secure than password managers.", "Codes should replace master phrases completely."], 1, "H"],
      ]
    ),
    S("E", "The firefighters rescued the family from the burning house at great ______ to themselves.", ["rise", "rush", "risk", "ring"], 2),
    S("E", "She is very ______; she never forgets to submit her assignments on time.", ["responsive", "responsible", "reasonable", "resentful"], 1),
    S("M", "The manager ______ the junior staff to take the initiative instead of waiting for instructions.", ["encouraged", "enforced", "endured", "enclosed"], 0),
    S("H", "Her ______ remarks during the debate offended several members, although she claimed she meant no harm.", ["tactful", "tactical", "thoughtful", "tactless"], 3),
    Y("E", "BEGIN", ["finish", "commence", "continue", "delay"], 1),
    Y("M", "VERIFY", ["deny", "copy", "confirm", "forget"], 2),
    Y("H", "INSIPID", ["dull", "spicy", "lively", "fragrant"], 0),
    N("E", "VICTORY", ["success", "defeat", "triumph", "win"], 1),
    N("M", "TRANSPARENT", ["clear", "visible", "opaque", "thin"], 2),
    N("H", "ZENITH", ["nadir", "summit", "peak", "crest"], 0),
    A("E", [
      "Sana then filled the kettle with water and switched it on.",
      "She woke up early and went to the kitchen.",
      "When the water boiled, she poured it over the tea leaves.",
      "Soon the whole house smelled of fresh tea.",
    ], ["PQRS", "QRPS", "QPRS", "QPSR"], 2),
    A("M", [
      "A few months later, the project was completed two weeks ahead of schedule.",
      "The new manager began by dividing the work into small weekly targets.",
      "Progress was reviewed every Friday and delays were discussed openly.",
      "Because of these reviews, the team soon became more disciplined about priorities.",
    ], ["QSRP", "QRSP", "RQSP", "QRPS"], 1),
    A("M", [
      "Its first product was a simple tool for managing office schedules.",
      "The firm began in 1998 as a two-person team working from a rented garage.",
      "Today it employs more than ten thousand people across fifteen countries.",
      "Over the years, steady attention to customer service helped it grow.",
    ], ["QPRS", "PQSR", "QSPR", "QPSR"], 3),
    V("E", "Idioms", "Choose the correct meaning of the idiom: 'once in a blue moon'.", ["every month", "at midnight", "very rarely", "during a festival"], 2),
    V("M", "One-word Substitution", "Choose the one word that can replace the phrase: a place where old records and documents are stored", ["aquarium", "archive", "auditorium", "armoury"], 1),
    V("H", "Vocabulary in Context", "Choose the option closest in meaning to the word 'specious' as used in the sentence: The speaker's argument was specious, and the panel soon found its flaw.", ["genuinely well founded", "lengthy and tedious", "emotionally moving", "plausible on the surface but actually flawed"], 3),
  ],
  grammar: [
    G("E", "Subject-Verb Agreement", "Fill in the blank: Each of the participants ______ a certificate at the end of the workshop.", ["receive", "receives", "are receiving", "have received"], 1),
    G("E", "Articles", "Fill in the blank: He plays ______ violin beautifully.", ["the", "a", "an", "no article"], 0),
    G("M", "Error Detection", "Identify the part of the sentence that contains an error:\n(A) She said me (B) that she would (C) join the course next month. (D) No error", ["She said me", "that she would", "join the course next month", "No error"], 0),
    G("M", "Prepositions", "Fill in the blank: The annual conference will be held ______ the first week of December.", ["at", "in", "on", "by"], 1),
    G("H", "Tenses", "Fill in the blank: If I ______ the answer, I would have told you yesterday.", ["know", "knew", "had known", "would know"], 2),
  ],
  written: [
    W("M", "Problem Solving", "Your college computer lab has only 30 working systems for 90 students, and practical sessions are often disrupted. Describe the problem, analyse two possible causes, and propose a step-by-step solution that could realistically be carried out within one semester. Your answer should be 200-250 words."),
  ],
};
T.company1 = {
  verbal: [
    ...RC(
      "Most employees spend a surprising amount of time in meetings, yet many leave them unsure about what was decided. Studies of office routines show that the main cause is not the length of the meeting but the lack of a clear purpose. When no one has defined the question to be answered, discussion wanders and the loudest voices dominate. Organisations that circulate a short agenda in advance, and that end every meeting by recording who will do what by which date, report far fewer repeated discussions. Such habits cost almost nothing. They do, however, demand discipline from the person leading the meeting, who must be willing to stop a conversation that, though interesting, does not serve the stated purpose.",
      [
        ["According to the passage, what is the main cause of unproductive meetings?", ["Their excessive length", "Too many participants", "The absence of a clear purpose", "A shortage of meeting rooms"], 2, "E"],
        ["What do organisations that report fewer repeated discussions do?", ["They ban meetings longer than an hour.", "They circulate an agenda beforehand and record who will do what by which date.", "They invite only senior staff.", "They hold meetings late in the evening."], 1, "M"],
        ["What does the passage say is demanded of the person leading a meeting?", ["Willingness to stop an interesting conversation that does not serve the purpose", "The ability to speak louder than others", "Skill in preparing long written reports", "Readiness to cancel meetings at short notice"], 0, "M"],
        ["Which of the following can be inferred from the passage?", ["Meetings should never last more than an hour.", "Agendas are unnecessary for short meetings.", "The most forceful speakers are usually the best decision-makers.", "A meeting that ends without recorded responsibilities is likely to be followed by repeated discussion."], 3, "H"],
      ]
    ),
    S("E", "The employees were asked to ______ to the safety rules at all times.", ["adopt", "adjust", "adhere", "admire"], 2),
    S("E", "The meeting was ______ till Monday because the director was travelling.", ["promoted", "postponed", "prevented", "preserved"], 1),
    S("M", "The sales team surpassed its target, so the manager ______ them in front of the whole company.", ["commanded", "commented", "commenced", "commended"], 3),
    S("H", "Because the merger was announced without warning, employees were left ______ about the future of their jobs.", ["apprised", "apprehensive", "apprehended", "appreciative"], 1),
    Y("E", "ASSIST", ["help", "hinder", "ignore", "avoid"], 0),
    Y("M", "DILIGENT", ["lazy", "careless", "clever", "hardworking"], 3),
    Y("H", "TENACIOUS", ["timid", "greedy", "persistent", "talkative"], 2),
    N("E", "EARLY", ["soon", "late", "fast", "quick"], 1),
    N("M", "PRAISE", ["admire", "applaud", "criticise", "thank"], 2),
    N("H", "TRANQUIL", ["turbulent", "calm", "peaceful", "still"], 0),
    A("E", [
      "At ten o'clock, the staff gathered in the conference hall.",
      "She thanked the staff for their effort and closed the meeting.",
      "The manager entered and began by welcoming everyone.",
      "She then explained the new leave policy in detail.",
    ], ["RPSQ", "PSRQ", "PRSQ", "PRQS"], 2),
    A("M", [
      "The customer, however, remained unhappy about the inconvenience.",
      "The support executive apologised and offered to replace the faulty product.",
      "A customer called the helpline to report that her order had arrived damaged.",
      "She therefore asked to speak to a senior manager.",
    ], ["QRPS", "RQSP", "RQPS", "RPQS"], 2),
    A("M", [
      "Therefore, the company now conducts a short orientation for every new recruit.",
      "New employees often feel lost during their first week at work.",
      "They do not know whom to approach or which rules to follow.",
      "These sessions answer such questions before confusion can grow.",
    ], ["QPRS", "QRSP", "QRPS", "RQPS"], 2),
    V("E", "Idioms", "Choose the correct meaning of the idiom: 'to break the ice'.", ["to melt frozen water", "to begin a conversation in a tense or unfamiliar setting", "to cancel a meeting", "to speak rudely to someone"], 1),
    V("M", "One-word Substitution", "Choose the one word that can replace the phrase: a fixed regular payment made to a person after retirement", ["premium", "pledge", "pension", "pardon"], 2),
    V("H", "Vocabulary in Context", "Choose the option closest in meaning to the word 'replete' as used in the sentence: The chief executive's speech was replete with technical jargon, and most listeners left confused.", ["free from", "careful about", "deprived of", "full of"], 3),
  ],
  grammar: [
    G("E", "Articles", "Fill in the blank: My sister works in ______ multinational company in Bengaluru.", ["an", "a", "the", "no article"], 1),
    G("M", "Tenses", "Fill in the blank: By this time next year, she ______ in the firm for five years.", ["will work", "has worked", "will have worked", "would work"], 2),
    G("M", "Error Detection", "Identify the part of the sentence that contains an error:\n(A) I prefer coffee (B) than tea (C) in the morning. (D) No error", ["I prefer coffee", "than tea", "in the morning", "No error"], 1),
    G("H", "Prepositions", "Fill in the blank: The committee has been entrusted ______ the task of selecting the new vendor.", ["to", "for", "with", "on"], 2),
    G("E", "Subject-Verb Agreement", "Fill in the blank: Two years ______ a long time to wait for a promotion.", ["are", "is", "were", "have been"], 1),
  ],
  written: [
    W("M", "Self Introduction", "You are attending the HR round of a campus placement drive for a leading technology company. Write the self-introduction you would present to the interviewer, covering your academic background, one project or achievement, your key strengths, and why you wish to join the company. Your answer should be 150-200 words."),
  ],
};

const KEYS = ['apt1', 'apt2', 'tech1', 'tech2', 'company1'];
const verbal = {};
const grammar = {};
const written = {};
for (const k of KEYS) {
  verbal[k] = T[k].verbal;
  grammar[k] = T[k].grammar;
  written[k] = T[k].written;
}

module.exports = { verbal, grammar, written };
