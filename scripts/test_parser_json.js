
const fs = require('fs');

const content = `================================================================================
SET A
================================================================================

[Computer Science]

#1. Which keyword prevents inheritance?

A. private
B. protected
C. static
D. final

✅ Answer: D

#2. Which data structure is used in compiler parsing?

A. Queue
B. Stack
C. Heap
D. Graph

✅ Answer: B

#3. Which concept hides implementation details?

A. Inheritance
B. Polymorphism
C. Encapsulation
D. Abstraction

✅ Answer: D

#4. Which problem is NP-Complete?

A. Binary Search
B. Merge Sort
C. Travelling Salesman
D. BFS

✅ Answer: C

#5. Which index is best for range queries?

A. Hash Index
B. Bitmap Index
C. B-Tree Index
D. Dense Index

✅ Answer: C

#6. A relation in 3NF but not BCNF means:

A. Partial dependency exists
B. Transitive dependency exists
C. Overlapping candidate keys exist
D. Multi-valued dependency exists

✅ Answer: C

#7. Which protocol resolves IP to MAC?

A. DNS
B. RARP
C. ARP
D. DHCP

✅ Answer: C

#8. Which scheduling is preemptive?

A. FCFS
B. SJF
C. Round Robin
D. Priority (non-preemptive)

✅ Answer: C

#9. Which metric measures code complexity?

A. LOC
B. Cyclomatic Complexity
C. Function points
D. Coupling

✅ Answer: B

#10. Which register holds next instruction address?

A. IR
B. MAR
C. PC
D. MDR

✅ Answer: C

[Logical Reasoning]

#11. Choose the missing letter:

A, C, F, J, O, ?

A. T
B. U
C. V
D. W

✅ Answer: A (+2, +3, +4, +5)

#12. Which number does NOT belong?

2, 3, 5, 11, 17, 19

A. 3
B. 5
C. 11
D. 17

✅ Answer: C (11 breaks prime gap pattern)

#13. Find the odd pair:

A. Eye – See
B. Ear – Hear
C. Nose – Smell
D. Hand – Touch

✅ Answer: D (hand not sense organ)

#14. Pointing to a man, Rahul said, “He is the son of my father’s only daughter.”

The man is Rahul’s:
A. Son
B. Brother
C. Nephew
D. Cousin

✅ Answer: A

#15. Statement:

“Government banned plastic bags.”
Assumption:
A. Plastic harms environment
B. Alternatives are available
C. Public supports decision
D. All plastics are harmful

✅ Answer: A

🔹 MISCELLANEOUS LOGIC

#16. Find the odd word:

A. Chair
B. Table
C. Bed
D. Door

✅ Answer: D (others are furniture)

#17. If 3 + 5 = 28, 4 + 6 = 44, then 5 + 7 = ?

A. 60
B. 66
C. 72
D. 84

✅ Answer: B (a² + b²)

#18. Facing east, Ravi turns left, then right, then left again.

Which direction is he facing now?

A. North
B. South
C. East
D. West

✅ Answer: A

[Grammar]

#19. Choose the grammatically correct sentence:

A. He is senior than me.
B. He is senior to me.
C. He is senior from me.
D. He is senior over me.

✅ Answer: B

#20. Choose the correct option:

The teacher asked the students ___ the assignment on time.
A. complete
B. to complete
C. completed
D. completing

✅ Answer: B

#21. Choose the correct sentence:

A. One of my friends are going abroad.
B. One of my friends is going abroad.
C. One of my friend is going abroad.
D. One of my friends were going abroad.

✅ Answer: B

#22. Choose the correct option:

If she ___ harder, she would have passed the exam.
A. studies
B. studied
C. had studied
D. would study

✅ Answer: C

#23. Identify the correct sentence:

A. He prefers coffee than tea.
B. He prefers coffee over tea.
C. He prefers coffee to tea.
D. He prefers coffee from tea.

✅ Answer: C

[Java programming output based]

#24. Output?
public class Test {
    public static void main(String[] args) {
        String s1 = "Java";
        String s2 = "Java";
        System.out.println(s1 == s2);
    }
}


A. true
B. false
C. Error
D. Runtime error

✅ Ans: A

#25. Output?
public class Test {
    public static void main(String[] args) {
        System.out.println(null + "Java");
    }
}


A. nullJava
B. Java
C. Runtime error
D. Compilation error

✅ Ans: D

#26. Output?
public class Test {
    static int x = 10;
    public static void main(String[] args) {
        System.out.println(x++);
    }
}


A. 10
B. 11
C. 9
D. Error

✅ Ans: A

#27. Output?
public class Test {
    public static void main(String[] args) {
        System.out.println('A' + 1);
    }
}


A. A1
B. B
C. 66
D. Error

✅ Ans: C

#28. Output?
public class Test {
    public static void main(String[] args) {
        System.out.println(1 + 2 + "3" + 4 + 5);
    }
}


A. 3345
B. 12345
C. 334
D. Error

✅ Ans: A

#29. Output?
public class Test {
    public static void main(String[] args) {
        try {
            int x = 10 / 0;
        } catch (ArithmeticException e) {
            System.out.print("A ");
        } finally {
            System.out.print("B ");
        }
    }
}


A. A
B. B
C. A B
D. Error

✅ Ans: C

#30. Output?
public class Test {
    public static void main(String[] args) {
        System.out.println(10 + 20 + "" + 30);
    }
}


A. 102030
B. 3030
C. 30
D. Error

✅ Ans: B

[Python programming output based]

Q31 Output?
a = 5
b = 10
c = a + b
a = 20
print(c)
print(a)
A. 15, 20
B. 30, 20
C. 15, 5
D. Error

Answer: A

Q32 Output?
x = "Hi"
y = x * 3
print(y)
print(len(y))
A. HiHiHi, 6
B. HiHiHi, 2
C. Error
D. Hi3, 3

Answer: A

Q33 Output?
a = [1, 2, 3]
b = a
a.append(4)
print(b)
print(a is b)
A. [1,2,3], False
B. [1,2,3,4], True
C. [4], False
D. Error

Answer: B

Q34 Output?
x = 10
def f():
    x = 20
    return x

print(f())
print(x)
A. 20, 20
B. 10, 10
C. 20, 10
D. Error

Answer: C

Q35 Output?
def func(a, b=[]):
    b.append(a)
    return b

print(func(1))
print(func(2))
print(func(3))
A. [1] [2] [3]
B. [1] [1,2] [1,2,3]
C. Error
D. [1,2,3] [] []

Answer: B

Q36 (Easy)
print(bool(0))
print(bool("0"))
A. False False
B. True True
C. False True
D. True False

Answer: C

Q37 
a = 3
a += 2
a *= 2
print(a)
A. 10
B. 12
C. 8
D. Error

Answer: A
`;

const parseSimpleQuestions = (text) => {
    const questions = [];

    // Normalize text
    const cleanText = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/\u00A0/g, ' ');

    const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l);

    let currentSection = 'general';
    let currentSubsection = null;

    let currentQuestion = null;

    // REGEX FROM UploadQuestions.jsx (LATEST VERSION)
    const sectionRegex = /^\[(.+)\]$|^(Section|Part|🔹)\s+[\w\d\s]|^[A-Z\s]+LOGIC/i;

    // Question: #1. or Q1. or 1.
    // IMPROVED: Split into two to avoid matching code like "1 + 2" as "1."
    const questionPrefixRegex = /^(?:#|Q)\s*(\d+)[\.)\s]?\s*(.+)?/i;
    const questionNoPrefixRegex = /^(\d+)[\.)]\s*(.+)?/i;

    // Option: A. or A)
    const optionRegex = /^([A-D])[\.)\)]\s*(.+)/i;

    // Answer: ✅ Answer: A or Answer: A or Ans: A
    const answerRegex = /^(?:✅\s*)?(?:Answer|Ans|Correct)\s*[:\-]\s*([A-D])/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. Check for Section Headers
        if (sectionRegex.test(line) || line.includes('MISCELLANEOUS')) {
            const rawName = line.replace(/[\[\]🔹]/g, '').trim().toLowerCase();

            // Exclude if it looks like a question or option
            if (/^Answer|^Question|^\d/.test(rawName)) continue;

            if (rawName.includes('java')) {
                currentSection = 'elective';
                currentSubsection = 'java';
            } else if (rawName.includes('python')) {
                currentSection = 'elective';
                currentSubsection = 'python';
            } else if (rawName.includes('computer science')) {
                currentSection = 'Computer Science';
                currentSubsection = null;
            } else if (rawName.includes('logical reasoning')) {
                currentSection = 'Logical Reasoning';
                currentSubsection = null;
            } else if (rawName.includes('miscellaneous')) {
                currentSection = 'Miscellaneous Logic';
                currentSubsection = null;
            } else if (rawName.includes('grammar')) {
                currentSection = 'Grammar';
                currentSubsection = null;
            }

            if (rawName.includes('java') || rawName.includes('python') ||
                rawName.includes('computer') || rawName.includes('logical') ||
                rawName.includes('miscellaneous') || rawName.includes('grammar')) {
                continue;
            }
        }

        // 2. Check for Answer Key
        const ansMatch = line.match(answerRegex);
        if (ansMatch && currentQuestion) {
            currentQuestion.correct_option = ansMatch[1].toUpperCase();
            continue;
        }

        // 3. Check for Options
        const optMatch = line.match(optionRegex);
        if (optMatch && currentQuestion) {
            const letter = optMatch[1].toUpperCase();
            const text = optMatch[2];
            const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            if (map[letter] !== undefined) {
                currentQuestion.options[map[letter]] = text.replace(/\*/g, '').trim();
                if (text.includes('*')) currentQuestion.correct_option = letter;
            }
            continue;
        }

        // 4. Check for New Question Start
        let qMatch = line.match(questionPrefixRegex) || line.match(questionNoPrefixRegex);

        if (qMatch) {
            // Save previous
            if (currentQuestion && currentQuestion.options.some(o => o)) {
                while (currentQuestion.options.length < 4) currentQuestion.options.push('');
                questions.push(currentQuestion);
            }

            currentQuestion = {
                section: currentSection,
                subsection: currentSubsection,
                question_text: qMatch[2] || '',
                options: [],
                correct_option: 'A',
                is_active: true
            };
            continue;
        }

        // 5. Append text
        if (currentQuestion) {
            if (currentQuestion.options.length === 0 && !currentQuestion.options[0]) {
                if (currentQuestion.question_text) {
                    currentQuestion.question_text += '\n' + line;
                } else {
                    currentQuestion.question_text = line;
                }
            }
        }
    }

    if (currentQuestion && currentQuestion.options.some(o => o)) {
        while (currentQuestion.options.length < 4) currentQuestion.options.push('');
        questions.push(currentQuestion);
    }

    return questions;
};

try {
    const results = parseSimpleQuestions(content);
    fs.writeFileSync('parser_result.json', JSON.stringify(results, null, 2));
} catch (e) {
    fs.writeFileSync('parser_result.json', JSON.stringify({ error: e.message, stack: e.stack }));
}
