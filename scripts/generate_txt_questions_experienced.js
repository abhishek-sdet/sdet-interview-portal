import fs from 'fs';

// Utility to shuffle array
const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

const generateCS = () => {
    let text = '[Section: Computer Science]\n\n';
    const topics = [
        { q: "In System Design, what is the primary function of a Load Balancer in a highly available architecture?", ans: "To distribute incoming network traffic across multiple backend servers to prevent overload", opts: ["To encrypt database connections", "To compile source code files", "To serve static files to browsers"] },
        { q: "What is the time complexity of searching for a value in a balanced Binary Search Tree (BST) of size N?", ans: "O(log N)", opts: ["O(N)", "O(1)", "O(N log N)"] },
        { q: "According to the CAP Theorem, which two properties can a distributed system guarantee simultaneously in the presence of a network partition?", ans: "Either Consistency and Partition Tolerance, or Availability and Partition Tolerance", opts: ["Only Consistency and Availability", "Only CPU speed and Memory throughput", "None of the CAP properties can exist together"] },
        { q: "Which OOP concept represents the ability of different objects to respond to the same method invocation in their own unique way?", ans: "Polymorphism", opts: ["Inheritance", "Abstraction", "Encapsulation"] },
        { q: "What is the primary purpose of a reverse proxy server in modern web architectures?", ans: "To forward client requests to backend servers and handle SSL termination/caching", opts: ["To store user passwords securely", "To run automated test suites", "To translate domain names to IP addresses"] },
        { q: "What is the time complexity of the quicksort algorithm in the worst-case scenario?", ans: "O(N^2)", opts: ["O(N log N)", "O(N)", "O(log N)"] },
        { q: "Which architectural pattern involves breaking down a large monolithic system into independent, single-purpose services communicating via APIs?", ans: "Microservices Architecture", opts: ["Layered Architecture", "Event-Driven Architecture", "Serverless Architecture"] },
        { q: "What does the term 'Thrashing' refer to in Operating Systems memory management?", ans: "A state where the system spends more time swapping pages in and out of disk than executing processes", opts: ["A hardware failure in the RAM module", "When a process consumes 100% CPU capacity", "A technique to clear cache values"] },
        { q: "What is the main advantage of a document-based data store over a traditional relational storage system?", ans: "It allows for flexible, schema-less data storage and horizontal scalability", opts: ["It guarantees strict ACID compliance under all conditions", "It uses structured queries as its primary interface", "It requires less physical storage space"] },
        { q: "What is the role of a garbage collector in a programming language's runtime environment?", ans: "To automatically identify and reclaim memory occupied by objects that are no longer reachable", opts: ["To format and indent source code files", "To optimize database execution plans", "To package application code into containers"] }
    ];

    for (let i = 0; i < 100; i++) {
        const template = topics[i % topics.length];
        const q = `${template.q} (Variant ${i+1})`;
        
        const opts = [template.ans, ...template.opts];
        const shuffled = shuffle(opts);
        const correctIdx = shuffled.indexOf(template.ans);
        
        text += `${i + 1}. ${q}\n`;
        text += `A) ${shuffled[0]}\nB) ${shuffled[1]}\nC) ${shuffled[2]}\nD) ${shuffled[3]}\n`;
        text += `Answer: ${String.fromCharCode(65 + correctIdx)}\n\n`;
    }
    return text;
};

const generateLogic = () => {
    let text = '[Section: Logical Reasoning]\n\n';
    
    for (let i = 0; i < 100; i++) {
        const type = i % 10;
        let q = '', correctAns = '', opts = [];

        if (type === 0) {
            const v = (i % 5) + 3;
            q = `Evaluate the boolean condition: (A AND B) OR (NOT A AND C) where A = true, B = false, and C = true (Variant ${i+1})?`;
            correctAns = `false`;
            opts = [correctAns, `true`, `null`, `Error`];
        } else if (type === 1) {
            const limit = (i % 4) + 5;
            let sum = 0;
            for (let k = 1; k <= limit; k++) {
                if (k % 3 === 0) sum += k;
            }
            q = `Determine the final value of the accumulator variable 'sum' after dry running this loop logic:\n\`\`\`\nsum = 0\nfor k from 1 to ${limit} inclusive:\n    if k % 3 == 0:\n        sum = sum + k\n\`\`\` (Variant ${i+1})`;
            correctAns = `${sum}`;
            opts = [correctAns, `${sum + 3}`, `${sum - 3}`, `0`];
        } else if (type === 2) {
            const count = (i % 3) + 3;
            q = `A recursive function is defined as f(n) = f(n-1) + 2 with base case f(0) = 1. What is the returned value of f(${count}) (Variant ${i+1})?`;
            correctAns = `${1 + count * 2}`;
            opts = [correctAns, `${count * 2}`, `${1 + (count - 1) * 2}`, `${1 + count * 3}`];
        } else if (type === 3) {
            const val = (i % 10) + 5;
            q = `Trace the value of variable 'y' after executing the following branching logic:\n\`\`\`\ny = ${val}\nif y % 2 == 0:\n    y = y / 2\nelse:\n    y = y * 3 + 1\nif y > 10:\n    y = y - 5\n\`\`\` (Variant ${i+1})`;
            let y = val;
            if (y % 2 === 0) y = y / 2;
            else y = y * 3 + 1;
            if (y > 10) y = y - 5;
            correctAns = `${y}`;
            opts = [correctAns, `${y + 2}`, `${y - 2}`, `${y * 2}`];
        } else if (type === 4) {
            q = `In logical deductions, if the statement "Every compiled module passes security checks" is assumed to be true, which of the following statements must also be logically true (Variant ${i+1})?`;
            correctAns = `If a module fails security checks, then it was not compiled`;
            opts = [correctAns, `If a module passes security checks, then it was compiled`, `If a module was not compiled, then it fails security checks`, `No compiled modules pass security checks`];
        } else if (type === 5) {
            const maxVal = (i % 5) + 5;
            q = `If a loop runs while 'x < ${maxVal}', starting with 'x = 0', and increments 'x' by 3 in each iteration, how many times will the loop execute (Variant ${i+1})?`;
            correctAns = `${Math.ceil(maxVal / 3)}`;
            opts = [correctAns, `${maxVal}`, `${Math.floor(maxVal / 3)}`, `${Math.ceil(maxVal / 3) + 1}`];
        } else if (type === 6) {
            const initial = (i % 4) + 2;
            q = `Find the final value of 'status' after evaluating the nested conditional logic:\n\`\`\`\nval = ${initial}\nif val % 2 == 0:\n    status = "Even-High" if val > 3 else "Even-Low"\nelse:\n    status = "Odd-High" if val > 2 else "Odd-Low"\n\`\`\` (Variant ${i+1})`;
            let status = '';
            if (initial % 2 === 0) {
                status = initial > 3 ? "Even-High" : "Even-Low";
            } else {
                status = initial > 2 ? "Odd-High" : "Odd-Low";
            }
            correctAns = status;
            opts = [correctAns, status === 'Even-High' ? 'Even-Low' : 'Even-High', status === 'Odd-High' ? 'Odd-Low' : 'Odd-High', 'Unknown'];
        } else if (type === 7) {
            q = `Which boolean logic expression is equivalent to: NOT (A AND B) according to De Morgan's Laws (Variant ${i+1})?`;
            correctAns = `(NOT A) OR (NOT B)`;
            opts = [correctAns, `(NOT A) AND (NOT B)`, `NOT A AND NOT B`, `A OR B`];
        } else if (type === 8) {
            const lim = (i % 3) + 3;
            q = `What is the value of 'count' after executing this while loop logic:\n\`\`\`\ncount = 0\nn = ${lim * 4}\nwhile n > 1:\n    count = count + 1\n    n = n / 2\n\`\`\` (Variant ${i+1})`;
            let count = 0, n = lim * 4;
            while (n > 1) {
                count++;
                n = n / 2;
            }
            correctAns = `${count}`;
            opts = [correctAns, `${count + 1}`, `${count - 1}`, `0`];
        } else if (type === 9) {
            q = `In logical bitwise shifts, if the integer value 8 (binary 1000) is shifted to the right by 2 positions (8 >> 2), what is the resulting integer value (Variant ${i+1})?`;
            correctAns = `2`;
            opts = [correctAns, `4`, `16`, `32`];
        }

        const shuffled = shuffle([...new Set(opts)]);
        while(shuffled.length < 4) shuffled.push(`RandomOpt${Math.random()}`);
        const finalOpts = shuffled.slice(0, 4);
        if (!finalOpts.includes(correctAns)) finalOpts[0] = correctAns;
        
        const finalShuffled = shuffle(finalOpts);
        const correctIdx = finalShuffled.indexOf(correctAns);
        
        text += `${i + 1}. ${q}\n`;
        text += `A) ${finalShuffled[0]}\nB) ${finalShuffled[1]}\nC) ${finalShuffled[2]}\nD) ${finalShuffled[3]}\n`;
        text += `Answer: ${String.fromCharCode(65 + correctIdx)}\n\n`;
    }
    return text;
};

const generateMisc = () => {
    let text = '[Section: Miscellaneous]\n\n';
    
    for (let i = 0; i < 100; i++) {
        const type = i % 10;
        let q = '', correctAns = '', opts = [];

        if (type === 0) {
            q = `Which Regular Expression (Regex) pattern matches any string containing a word of exactly 4 alphanumeric characters (Variant ${i+1})?`;
            correctAns = `\\b[a-zA-Z0-9]{4}\\b`;
            opts = [correctAns, `[a-zA-Z0-9]{4}`, `\\b\\w*\\b`, `\\d{4}`];
        } else if (type === 1) {
            q = `Which creational design pattern provides an interface for creating families of related or dependent objects without specifying their concrete classes (Variant ${i+1})?`;
            correctAns = `Abstract Factory Pattern`;
            opts = [correctAns, `Singleton Pattern`, `Builder Pattern`, `Prototype Pattern`];
        } else if (type === 2) {
            q = `Which structured format is generally preferred for transmitting asynchronous data payloads over HTTP endpoints due to its native support and lightweight syntax in browsers (Variant ${i+1})?`;
            correctAns = `JSON`;
            opts = [correctAns, `XML`, `CSV`, `YAML`];
        } else if (type === 3) {
            q = `Which Regex pattern matches any string that ends exactly with one or more special exclamation marks (Variant ${i+1})?`;
            correctAns = `!+$`;
            opts = [correctAns, `^!+`, `.*!`, `[!]`];
        } else if (type === 4) {
            q = `Which design pattern separates the construction of a complex object from its representation, allowing the same construction process to create different representations (Variant ${i+1})?`;
            correctAns = `Builder Pattern`;
            opts = [correctAns, `Factory Pattern`, `Adapter Pattern`, `Facade Pattern`];
        } else if (type === 5) {
            q = `What is the primary role of data serialization in programming (Variant ${i+1})?`;
            correctAns = `To convert in-memory object states into a format that can be stored or transmitted and reconstructed later`;
            opts = [correctAns, `To compile high-level source code into platform-specific machine bytecodes`, `To clean up dereferenced object memory blocks from the program heap`, `To secure configuration keys using hashing algorithms`];
        } else if (type === 6) {
            q = `Which behavioral design pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable at runtime (Variant ${i+1})?`;
            correctAns = `Strategy Pattern`;
            opts = [correctAns, `Observer Pattern`, `State Pattern`, `Template Method Pattern`];
        } else if (type === 7) {
            q = `Which Regex pattern matches a string that contains a valid IP address pattern format (e.g. 192.168.1.1) (Variant ${i+1})?`;
            correctAns = `\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}`;
            opts = [correctAns, `\\d+\\.\\d+`, `\\w{3}\\.\\w{3}`, `[0-9]\\.[0-9]`];
        } else if (type === 8) {
            q = `Which structural design pattern is used to attach additional responsibilities to an object dynamically without modifying its class definition (Variant ${i+1})?`;
            correctAns = `Decorator Pattern`;
            opts = [correctAns, `Adapter Pattern`, `Proxy Pattern`, `Bridge Pattern`];
        } else if (type === 9) {
            q = `Which type of testing verifies the structural flow and inner workings of a software component by directly examining its code implementation details (Variant ${i+1})?`;
            correctAns = `White-Box Testing`;
            opts = [correctAns, `Black-Box Testing`, `Grey-Box Testing`, `Acceptance Testing`];
        }

        const shuffled = shuffle([...new Set(opts)]);
        while(shuffled.length < 4) shuffled.push(`RandomOpt${Math.random()}`);
        const finalOpts = shuffled.slice(0, 4);
        if (!finalOpts.includes(correctAns)) finalOpts[0] = correctAns;
        
        const finalShuffled = shuffle(finalOpts);
        const correctIdx = finalShuffled.indexOf(correctAns);
        
        text += `${i + 1}. ${q}\n`;
        text += `A) ${finalShuffled[0]}\nB) ${finalShuffled[1]}\nC) ${finalShuffled[2]}\nD) ${finalShuffled[3]}\n`;
        text += `Answer: ${String.fromCharCode(65 + correctIdx)}\n\n`;
    }
    return text;
};

const generateGrammar = () => {
    let text = '[Section: Grammar]\n\n';
    const topics = [
        { q: "Choose the correct sentence regarding subject-verb agreement:", ans: "Neither the manager nor the employees were aware of the decision.", opts: ["Neither the manager nor the employees was aware of the decision.", "Neither the manager or the employees was aware.", "Neither the manager nor the employees are aware of the decision."] },
        { q: "Identify the figure of speech in: 'The wind whispered through the dark forest.'", ans: "Personification", opts: ["Simile", "Metaphor", "Hyperbole"] },
        { q: "Which of the following sentences uses the subjunctive mood correctly?", ans: "I suggest that he study for the exam.", opts: ["I suggest that he studies for the exam.", "I suggest that he studying for the exam.", "I suggest that he studied for the exam."] },
        { q: "Choose the exact meaning of the idiom: 'To beat around the bush'", ans: "To avoid talking about the main topic", opts: ["To physically attack someone secretly", "To search for something thoroughly", "To waste time in a forest"] },
        { q: "Identify the grammatical error: 'Hardly had I reached the station than the train left.'", ans: "Replace 'than' with 'when'", opts: ["Replace 'had' with 'have'", "Replace 'reached' with 'reaching'", "No error"] },
        { q: "What is a 'gerund'?", ans: "A verb form ending in -ing that functions as a noun", opts: ["A verb form that functions as an adjective", "A prepositional phrase", "An infinitive verb"] },
        { q: "Choose the appropriate word: The new evidence ___ his claim of innocence.", ans: "Corroborates", opts: ["Contradicts", "Eradicates", "Delegates"] },
        { q: "Select the correct active voice equivalent: 'The letter was written by her.'", ans: "She wrote the letter.", opts: ["She was writing the letter.", "She writes the letter.", "She had written the letter."] },
        { q: "What does 'Eschew' mean?", ans: "To deliberately avoid using; abstain from", opts: ["To chew thoroughly", "To embrace warmly", "To discover accidentally"] },
        { q: "Which sentence uses the past perfect continuous tense?", ans: "They had been playing tennis for an hour before it rained.", opts: ["They were playing tennis when it rained.", "They had played tennis before it rained.", "They have been playing tennis for an hour."] }
    ];

    for (let i = 0; i < 100; i++) {
        const template = topics[i % topics.length];
        const q = `${template.q} (Variant ${i+1})`;
        
        const opts = [template.ans, ...template.opts];
        const shuffled = shuffle(opts);
        const correctIdx = shuffled.indexOf(template.ans);
        
        text += `${i + 1}. ${q}\n`;
        text += `A) ${shuffled[0]}\nB) ${shuffled[1]}\nC) ${shuffled[2]}\nD) ${shuffled[3]}\n`;
        text += `Answer: ${String.fromCharCode(65 + correctIdx)}\n\n`;
    }
    return text;
};

const generateJava = () => {
    let text = '[Section: Java]\n\n';
    
    for (let i = 0; i < 100; i++) {
        const type = i % 10;
        let q = '', correctAns = '', opts = [];

        if (type === 0) {
            q = `What is the expected behavior of the following Java snippet?\n\`\`\`java\nList<Integer> list = new ArrayList<>(Arrays.asList(1, 2, 3));\nfor (Integer n : list) {\n    if (n == 2) list.remove(n);\n}\n\`\`\` (Variant ${i+1})`;
            correctAns = `ConcurrentModificationException is thrown at runtime`;
            opts = [correctAns, `List becomes [1, 3] successfully`, `List remains [1, 2, 3] without changes`, `Compilation Error`];
        } else if (type === 1) {
            q = `Which phase of Generational Garbage Collection in Java is responsible for identifying active heap objects and reclaiming memory space (Variant ${i+1})?`;
            correctAns = `Mark and Sweep Phase`;
            opts = [correctAns, `Mark and Compact Phase`, `Reference Counting Phase`, `Copying Phase`];
        } else if (type === 2) {
            const val = (i % 5) + 2;
            q = `What is the output of the following Java Stream snippet?\n\`\`\`java\nint sum = IntStream.range(1, 5).map(n -> n * ${val}).filter(n -> n % 2 == 0).sum();\nSystem.out.println(sum);\n\`\`\` (Variant ${i+1})`;
            const sum = [1, 2, 3, 4].map(n => n * val).filter(n => n % 2 === 0).reduce((a,b)=>a+b, 0);
            correctAns = `${sum}`;
            opts = [correctAns, `${sum + val}`, `${sum - val}`, `0`];
        } else if (type === 3) {
            q = `What is the primary purpose of the 'volatile' keyword when applied to a variable in Java concurrent programming (Variant ${i+1})?`;
            correctAns = `To guarantee thread visibility of changes made to the variable across CPUs`;
            opts = [correctAns, `To prevent a variable from being serialized`, `To declare a constant read-only variable`, `To lock the object instance automatically`];
        } else if (type === 4) {
            q = `What is the output of the following Java integer comparison code?\n\`\`\`java\nInteger a = 100, b = 100;\nInteger c = 1000, d = 1000;\nSystem.out.println((a == b) + " " + (c == d));\n\`\`\` (Variant ${i+1})`;
            correctAns = `true false`;
            opts = [correctAns, `true true`, `false false`, `false true`];
        } else if (type === 5) {
            q = `Which class instantiation pattern is typically implemented by the Java 'java.lang.Runtime.getRuntime()' method (Variant ${i+1})?`;
            correctAns = `Singleton Design Pattern`;
            opts = [correctAns, `Factory Design Pattern`, `Builder Design Pattern`, `Prototype Design Pattern`];
        } else if (type === 6) {
            q = `What is the primary difference between a HashMap and a Hashtable in Java collections framework (Variant ${i+1})?`;
            correctAns = `HashMap is non-synchronized and allows null values, while Hashtable is synchronized and does not allow nulls`;
            opts = [correctAns, `Hashtable is faster than HashMap`, `HashMap extends Dictionary class, while Hashtable implements Map`, `There is no functional difference between them`];
        } else if (type === 7) {
            q = `What happens if a Java thread invokes wait() on an object without first acquiring that object's intrinsic monitor lock (Variant ${i+1})?`;
            correctAns = `IllegalMonitorStateException is thrown at runtime`;
            opts = [correctAns, `The thread enters WAITING state indefinitely`, `InterruptedException is thrown`, `A deadlock occurs immediately`];
        } else if (type === 8) {
            q = `Which Java classloader is responsible for loading the core Java API library classes located in rt.jar (Variant ${i+1})?`;
            correctAns = `Bootstrap ClassLoader`;
            opts = [correctAns, `Extension ClassLoader`, `Application ClassLoader`, `System ClassLoader`];
        } else if (type === 9) {
            q = `Which of the following interfaces does java.util.Hashtable implement that java.util.HashMap does not in Java (Variant ${i+1})?`;
            correctAns = `Dictionary class inheritance (Hashtable extends Dictionary)`;
            opts = [correctAns, `Map`, `Cloneable`, `Serializable`];
        }

        const shuffled = shuffle([...new Set(opts)]);
        while(shuffled.length < 4) shuffled.push(`RandomOpt${Math.random()}`);
        const finalOpts = shuffled.slice(0, 4);
        if (!finalOpts.includes(correctAns)) finalOpts[0] = correctAns;
        
        const finalShuffled = shuffle(finalOpts);
        const correctIdx = finalShuffled.indexOf(correctAns);
        
        text += `${i + 1}. ${q}\n`;
        text += `A) ${finalShuffled[0]}\nB) ${finalShuffled[1]}\nC) ${finalShuffled[2]}\nD) ${finalShuffled[3]}\n`;
        text += `Answer: ${String.fromCharCode(65 + correctIdx)}\n\n`;
    }
    return text;
};

const generatePython = () => {
    let text = '[Section: Python]\n\n';
    
    for (let i = 0; i < 100; i++) {
        const type = i % 10;
        let q = '', correctAns = '', opts = [];

        if (type === 0) {
            q = `What is the primary function of the Global Interpreter Lock (GIL) in standard CPython implementation (Variant ${i+1})?`;
            correctAns = `It limits bytecode execution to a single native thread at a time per process`;
            opts = [correctAns, `It encrypts local variables to prevent memory sniffing`, `It automatically manages references to free memory`, `It allows multi-core CPU parallel thread execution`];
        } else if (type === 1) {
            q = `Which standard library module decorator is used to preserve the original function name and docstring when writing a Python decorator (Variant ${i+1})?`;
            correctAns = `functools.wraps`;
            opts = [correctAns, `sys.settrace`, `itertools.chain`, `abc.abstractmethod`];
        } else if (type === 2) {
            q = `What is the output of the following Python default argument evaluation code?\n\`\`\`python\ndef foo(a, lst=[]):\n    lst.append(a)\n    return lst\nprint(foo(1))\nprint(foo(2))\n\`\`\` (Variant ${i+1})`;
            correctAns = `[1] [1, 2] (printed as subsequent evaluations of the same list)`;
            opts = [correctAns, `[1] [2]`, `[1] []`, `Error`];
        } else if (type === 3) {
            q = `What is the difference between copy.copy() and copy.deepcopy() operations in Python (Variant ${i+1})?`;
            correctAns = `copy() creates a shallow copy sharing nested references; deepcopy() copies recursively creating independent nested objects`;
            opts = [correctAns, `copy() is faster and behaves identically to deepcopy()`, `copy() is for lists only, deepcopy() is for custom classes`, `There is no structural difference`];
        } else if (type === 4) {
            q = `What does the 'yield' keyword do inside a Python function block (Variant ${i+1})?`;
            correctAns = `It suspends function execution, returning a generator iterator and retaining local state`;
            opts = [correctAns, `It exits the current loop block completely`, `It converts a synchronous block into an asynchronous coroutine`, `It declares a static class variable`];
        } else if (type === 5) {
            q = `Which standard module interface should you import to trigger a completely forced garbage collection sweep in Python (Variant ${i+1})?`;
            correctAns = `import gc; gc.collect()`;
            opts = [correctAns, `import sys; sys.cleanup()`, `del globals()`, `You cannot force garbage collection in Python`];
        } else if (type === 6) {
            q = `What is the output of the following Python shared list reference snippet?\n\`\`\`python\nx = [1, 2, 3]\ny = x\ny += [4]\nprint(x)\n\`\`\` (Variant ${i+1})`;
            correctAns = `[1, 2, 3, 4]`;
            opts = [correctAns, `[1, 2, 3]`, `None`, `Error`];
        } else if (type === 7) {
            q = `What is a metaclass in Python programming (Variant ${i+1})?`;
            correctAns = `A class that defines the rules and behavior of another class (a class of a class)`;
            opts = [correctAns, `A base class containing only static methods`, `The absolute base class for integers`, `A module-level namespace wrapper`];
        } else if (type === 8) {
            q = `What is the main benefit of utilizing the '__slots__' attribute inside a Python class definition (Variant ${i+1})?`;
            correctAns = `It prevents dynamic attribute dictionary creation, saving significant memory for large numbers of instances`;
            opts = [correctAns, `It enables compiler optimization for multi-core processors`, `It automatically serializes class methods`, `It hides all class attributes from subclass inheritance`];
        } else if (type === 9) {
            q = `In Python, what is the primary role of the event loop in asynchronous programming (Variant ${i+1})?`;
            correctAns = `To monitor and coordinate the execution of asynchronous coroutines and tasks`;
            opts = [correctAns, `To distribute execution loads across multiple CPU threads`, `To parse and execute database transaction SQL scripts`, `To catch syntax exceptions in parallel processes`];
        }

        const shuffled = shuffle([...new Set(opts)]);
        while(shuffled.length < 4) shuffled.push(`RandomOpt${Math.random()}`);
        const finalOpts = shuffled.slice(0, 4);
        if (!finalOpts.includes(correctAns)) finalOpts[0] = correctAns;
        
        const finalShuffled = shuffle(finalOpts);
        const correctIdx = finalShuffled.indexOf(correctAns);
        
        text += `${i + 1}. ${q}\n`;
        text += `A) ${finalShuffled[0]}\nB) ${finalShuffled[1]}\nC) ${finalShuffled[2]}\nD) ${finalShuffled[3]}\n`;
        text += `Answer: ${String.fromCharCode(65 + correctIdx)}\n\n`;
    }
    return text;
};

const generateDB = () => {
    let text = '[Section: Database]\n\n';
    const topics = [
        { q: "What is the primary difference between a B-Tree index and a Hash index?", ans: "B-Tree supports range queries and sorting, whereas Hash index only supports equality lookups", opts: ["Hash is universally slower", "B-Tree cannot be used on Primary Keys", "There is no difference"] },
        { q: "What does the Boyce-Codd Normal Form (BCNF) strictly require?", ans: "Every determinant in the relation must be a candidate key", opts: ["No multi-valued attributes", "No transitive dependencies", "All attributes must be strings"] },
        { q: "In a relational database, what is a 'Phantom Read' anomaly?", ans: "A transaction reads newly committed rows inserted by another transaction during its execution", opts: ["Reading uncommitted data", "Reading deleted data from cache", "Overwriting data simultaneously"] },
        { q: "Which SQL operation is essentially the inverse of a Cartesian Product (Cross Join)?", ans: "There is no direct inverse, but relational division represents the opposite logic", opts: ["INNER JOIN", "UNION ALL", "INTERSECT"] },
        { q: "What is the purpose of the Two-Phase Commit (2PC) protocol in distributed databases?", ans: "To ensure atomic transaction commit across multiple nodes", opts: ["To speed up simple queries", "To replicate data to secondary disks", "To prevent SQL injection"] },
        { q: "Which transaction isolation level provides the highest degree of isolation?", ans: "SERIALIZABLE", opts: ["REPEATABLE READ", "READ COMMITTED", "READ UNCOMMITTED"] },
        { q: "What is an execution plan in SQL?", ans: "A roadmap generated by the query optimizer on how to execute the query", opts: ["A script that creates tables", "A backup scheduling tool", "A user access control list"] },
        { q: "How do you optimize a query that frequently filters on two columns together?", ans: "Create a Composite Index on both columns", opts: ["Create a trigger", "Use a FULL OUTER JOIN", "Convert the table to NoSQL"] },
        { q: "What is Database Sharding?", ans: "Partitioning a large database into smaller, faster, more easily managed parts across servers", opts: ["Encrypting data at rest", "Merging multiple tables into one", "Compressing database logs"] },
        { q: "Which of the following describes a Materialized View?", ans: "A database object that contains the results of a query and physically stores the data", opts: ["A virtual table computed on the fly", "A synonym for a table", "A temporary table deleted on session end"] }
    ];

    for (let i = 0; i < 100; i++) {
        const template = topics[i % topics.length];
        const q = `${template.q} (Variant ${i+1})`;
        
        const opts = [template.ans, ...template.opts];
        const shuffled = shuffle(opts);
        const correctIdx = shuffled.indexOf(template.ans);
        
        text += `${i + 1}. ${q}\n`;
        text += `A) ${shuffled[0]}\nB) ${shuffled[1]}\nC) ${shuffled[2]}\nD) ${shuffled[3]}\n`;
        text += `Answer: ${String.fromCharCode(65 + correctIdx)}\n\n`;
    }
    return text;
};

function generateFile() {
    console.log('Generating 700 Experienced Questions to txt file...');
    let output = '';
    
    output += generateCS();
    output += generateLogic();
    output += generateMisc();
    output += generateGrammar();
    output += generateJava();
    output += generatePython();
    output += generateDB();

    fs.writeFileSync('Experienced_700_Questions.txt', output);
    console.log('✅ Generated Experienced_700_Questions.txt successfully!');
}

generateFile();
