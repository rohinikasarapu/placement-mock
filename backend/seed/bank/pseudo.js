'use strict';
// Original campus-placement "Pseudo Code" questions (language-neutral snippets).

const DIFF = { E: 'Easy', M: 'Medium', H: 'Hard' };
const mk = (topic, d, text, options, answer) => ({ text, options, answer, difficulty: DIFF[d], topic });

const T = {};

T.apt1 = [
  mk('Loops', 'E',
    'What is the output of the following pseudo-code? (div is integer division)\n\nSet n = 4729\nSet s = 0\nWhile n > 0\n    s = s + (n mod 10)\n    n = n div 10\nEnd While\nPrint s',
    ['20', '22', '24', '4729'], 1),
  mk('Nested Loops', 'M',
    'What is the output of the following pseudo-code?\n\nSet c = 0\nFor i = 1 to 4\n    For j = 1 to i\n        c = c + j\n    End For\nEnd For\nPrint c',
    ['10', '16', '20', '30'], 2),
  mk('Arrays', 'M',
    'Array A is 0-indexed: A = [3, 8, 2, 9, 5]. What is the output?\n\nSet m = A[0]\nSet p = 0\nFor i = 1 to 4\n    If A[i] > m Then\n        m = A[i]\n        p = i\n    End If\nEnd For\nPrint m + p',
    ['9', '11', '12', '13'], 2),
  mk('Conditionals and Loops', 'H',
    'Assume integer division. What is the output of the following pseudo-code?\n\nSet x = 6\nSet steps = 0\nSet odd = 0\nWhile x != 1\n    If x mod 2 == 0 Then\n        x = x div 2\n    Else\n        x = 3 * x + 1\n        odd = odd + 1\n    End If\n    steps = steps + 1\nEnd While\nPrint steps * 10 + odd',
    ['62', '82', '80', '92'], 1),
  mk('Arrays', 'H',
    'Array A is 0-indexed: A = [3, 4, 1, 5, 2]. What is printed (elements separated by spaces)?\n\nFor p = 1 to 2\n    For i = 0 to 3\n        If A[i] > A[i + 1] Then\n            Swap A[i] and A[i + 1]\n        End If\n    End For\nEnd For\nPrint A[0], A[1], A[2], A[3], A[4]',
    ['1 2 3 4 5', '1 3 2 4 5', '3 1 2 4 5', '1 3 4 2 5'], 1)
];

T.apt2 = [
  mk('Output Prediction', 'E',
    'What is the output? (Integer division and remainder)\n\nSet a = 17\nSet b = 5\nPrint (a div b), (a mod b)',
    ['3 2', '2 3', '3 5', '3.4 2'], 0),
  mk('Recursion', 'M',
    'What does Print g(4) display?\n\nFunction g(n)\n    If n == 0 Then\n        Return 2\n    End If\n    Return g(n - 1) * 2 - 1\nEnd Function',
    ['9', '15', '17', '31'], 2),
  mk('Loops', 'M',
    'How many times does the loop body execute, and what is printed?\n\nSet i = 1\nSet count = 0\nWhile i < 100\n    i = i * 3\n    count = count + 1\nEnd While\nPrint count',
    ['4', '5', '6', '33'], 1),
  mk('Nested Loops', 'H',
    'What is the output of the following pseudo-code?\n\nSet c = 0\nFor i = 1 to 5\n    For j = 1 to 5\n        If (i + j) mod 3 == 0 And i < j Then\n            c = c + 1\n        End If\n    End For\nEnd For\nPrint c',
    ['3', '4', '5', '8'], 1),
  mk('Simple Logic', 'H',
    'Assume integer division. What is the output?\n\nSet n = 1234\nSet orig = n\nSet r = 0\nWhile n > 0\n    r = r * 10 + (n mod 10)\n    n = n div 10\nEnd While\nPrint r - orig',
    ['3087', '3333', '2222', '4321'], 0)
];

T.tech1 = [
  mk('Functions', 'E',
    'What is the output?\n\nFunction f(x)\n    Return x * x + 1\nEnd Function\n\nPrint f(f(2))',
    ['10', '17', '26', '37'], 2),
  mk('Arrays', 'M',
    'Array A is 0-indexed: A = [2, 4, 6, 8, 10]. What is the output?\n\nSet s = 0\nFor i = 0 to 4 step 2\n    s = s + A[i]\nEnd For\nPrint s - A[3]',
    ['10', '12', '18', '20'], 0),
  mk('Loops', 'M',
    'What is printed by the following pseudo-code?\n\nSet a = 84\nSet b = 36\nSet count = 0\nWhile b != 0\n    Set t = b\n    b = a mod b\n    a = t\n    count = count + 1\nEnd While\nPrint a, count',
    ['12 2', '12 3', '36 2', '6 3'], 0),
  mk('Recursion', 'H',
    'Assume integer division. What does Print h(10) display?\n\nFunction h(n)\n    If n == 0 Then\n        Return 0\n    End If\n    If n mod 2 == 1 Then\n        Return n + h(n - 1)\n    End If\n    Return h(n div 2) + 1\nEnd Function',
    ['6', '8', '9', '11'], 2),
  mk('Nested Loops', 'H',
    'What is the output of the following pseudo-code?\n\nSet count = 0\nFor n = 10 to 30\n    Set isP = 1\n    For d = 2 to n - 1\n        If n mod d == 0 Then\n            isP = 0\n        End If\n    End For\n    If isP == 1 Then\n        count = count + 1\n    End If\nEnd For\nPrint count',
    ['5', '6', '7', '8'], 1)
];

T.tech2 = [
  mk('Loops', 'E',
    'What is the output?\n\nSet s = 0\nFor i = 1 to 10 step 3\n    s = s + i\nEnd For\nPrint s',
    ['18', '22', '25', '55'], 1),
  mk('Arrays', 'M',
    'Array A is 0-indexed: A = [1, 2, 3, 4, 5]. What is printed?\n\nFor k = 1 to 2\n    Set t = A[0]\n    For i = 0 to 3\n        A[i] = A[i + 1]\n    End For\n    A[4] = t\nEnd For\nPrint A[0], A[4]',
    ['2 1', '3 2', '3 1', '4 3'], 1),
  mk('Simple Logic', 'M',
    'Here "bit + s" places the digit bit to the left of the text s (string concatenation). What is printed?\n\nSet n = 13\nSet s = ""\nWhile n > 0\n    s = (n mod 2) + s\n    n = n div 2\nEnd While\nPrint s',
    ['1011', '1101', '1110', '0111'], 1),
  mk('Recursion', 'H',
    'What does Print F(7) display?\n\nFunction F(n)\n    If n < 3 Then\n        Return n\n    End If\n    Return F(n - 1) + F(n - 3)\nEnd Function',
    ['7', '10', '12', '15'], 1),
  mk('Nested Loops', 'H',
    'What is the output of the following pseudo-code? (Break exits only the inner loop)\n\nSet c = 0\nFor i = 1 to 5\n    For j = 1 to 5\n        If j > i Then\n            Break\n        End If\n        If (i + j) mod 2 == 0 Then\n            c = c + i * j\n        End If\n    End For\nEnd For\nPrint c',
    ['55', '70', '86', '95'], 2)
];

T.company1 = [
  mk('Output Prediction', 'E',
    'Assume integer division. What is the output?\n\nSet x = 5\nSet y = 2\nSet z = x mod y\nx = x div y\nPrint x + z * y',
    ['3', '4', '5', '7'], 1),
  mk('Arrays', 'M',
    'Array A is 0-indexed: A = [4, 2, 4, 1, 2, 4, 4]. The array cnt has 5 elements (indexes 0 to 4), all initially 0. What is the output?\n\nFor i = 0 to 6\n    cnt[A[i]] = cnt[A[i]] + 1\nEnd For\nPrint cnt[4] * cnt[2] + cnt[1]',
    ['7', '8', '9', '10'], 2),
  mk('Functions', 'M',
    'Assume integer division. What is the output?\n\nFunction mystery(n)\n    Set r = 0\n    While n > 0\n        If n mod 2 == 1 Then\n            r = r + 1\n        End If\n        n = n div 2\n    End While\n    Return r\nEnd Function\n\nPrint mystery(45) + mystery(8)',
    ['4', '5', '6', '7'], 1),
  mk('Recursion', 'H',
    'What is printed (values separated by spaces)?\n\nFunction P(n)\n    If n <= 0 Then\n        Return\n    End If\n    Print n\n    P(n - 2)\n    Print n\nEnd Function\n\nP(5)',
    ['5 3 1', '5 3 1 1 3 5', '1 3 5 5 3 1', '5 3 1 -1 1 3 5'], 1),
  mk('Arrays', 'H',
    'Array A is 0-indexed with A[0] = 1 and A[1] = 1. What is the output?\n\nFor i = 2 to 7\n    A[i] = A[i - 1] + A[i - 2] + (i mod 2)\nEnd For\nPrint A[7]',
    ['17', '24', '29', '30'], 2)
];

module.exports = T;
