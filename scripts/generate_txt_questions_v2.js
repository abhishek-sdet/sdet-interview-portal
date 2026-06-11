import fs from 'fs';

// Utility to shuffle array
const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

const generateCS = () => {
    let text = '[Section: Computer Science]\n\n';
    
    for (let i = 0; i < 100; i++) {
        const type = i % 10;
        let q = '', correctAns = '', opts = [];

        if (type === 0) {
            q = `Which Object-Oriented Programming (OOP) concept is achieved by using private fields with public getter and setter methods to control access (Variant ${i+1})?`;
            correctAns = `Encapsulation`;
            opts = [correctAns, `Inheritance`, `Polymorphism`, `Abstraction`];
        } else if (type === 1) {
            q = `What is the worst-case time complexity of searching for an element in an unsorted array of size N (Variant ${i+1})?`;
            correctAns = `O(N)`;
            opts = [correctAns, `O(1)`, `O(log N)`, `O(N log N)`];
        } else if (type === 2) {
            q = `Which data structure operates on a First-In-First-Out (FIFO) principle, making it suitable for managing test execution queues (Variant ${i+1})?`;
            correctAns = `Queue`;
            opts = [correctAns, `Stack`, `Tree`, `Graph`];
        } else if (type === 3) {
            q = `In memory management, where are dynamically allocated objects and class instances stored (Variant ${i+1})?`;
            correctAns = `Heap Memory`;
            opts = [correctAns, `Stack Memory`, `Static Register`, `Program Counter`];
        } else if (type === 4) {
            q = `Which type of polymorphism is resolved at compile-time through method overloading (Variant ${i+1})?`;
            correctAns = `Compile-time Polymorphism`;
            opts = [correctAns, `Runtime Polymorphism`, `Dynamic Binding`, `Late Binding`];
        } else if (type === 5) {
            q = `What is the primary difference between a Stack and a Queue data structure (Variant ${i+1})?`;
            correctAns = `Stack is LIFO (Last-In-First-Out), while Queue is FIFO (First-In-First-Out)`;
            opts = [correctAns, `Stack is FIFO, while Queue is LIFO`, `Stack only stores integers, while Queue stores any object`, `Stack is stored in heap, while Queue is stored in stack`];
        } else if (type === 6) {
            q = `Which OOP principle allows a subclass to inherit attributes and behaviors from a parent class (Variant ${i+1})?`;
            correctAns = `Inheritance`;
            opts = [correctAns, `Polymorphism`, `Encapsulation`, `Abstraction`];
        } else if (type === 7) {
            q = `What is the time complexity of retrieving a value from a well-distributed Hash Map or Hash Table by its key in the average case (Variant ${i+1})?`;
            correctAns = `O(1)`;
            opts = [correctAns, `O(N)`, `O(log N)`, `O(N^2)`];
        } else if (type === 8) {
            q = `Which data structure uses nodes where each node contains a data field and a reference (link) to the next node in the sequence (Variant ${i+1})?`;
            correctAns = `Singly Linked List`;
            opts = [correctAns, `Array`, `Binary Tree`, `Stack`];
        } else if (type === 9) {
            q = `Which OOP concept focuses on hiding internal implementation details and showing only the essential features to the user (Variant ${i+1})?`;
            correctAns = `Abstraction`;
            opts = [correctAns, `Encapsulation`, `Inheritance`, `Instantiation`];
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

const generateLogic = () => {
    let text = '[Section: Logical Reasoning]\n\n';
    
    for (let i = 0; i < 100; i++) {
        const type = i % 10;
        let q = '', correctAns = '', opts = [];

        if (type === 0) {
            const val1 = i % 2 === 0 ? 'true' : 'false';
            const val2 = i % 3 === 0 ? 'true' : 'false';
            const expected = (val1 === 'true' && !val2) || (val1 === 'true' && val2 === 'true') ? 'true' : 'false';
            q = `What is the evaluated boolean result of the expression: (A AND (NOT B)) OR (A AND B) where A is ${val1} and B is ${val2} (Variant ${i+1})?`;
            correctAns = val1; // Simplifies logically to just A
            opts = [correctAns, val1 === 'true' ? 'false' : 'true', `null`, `Error`];
        } else if (type === 1) {
            const limit = (i % 4) + 3;
            let sum = 0;
            for (let k = 1; k < limit; k++) {
                if (k % 2 === 0) sum += k;
            }
            q = `Evaluate the final value of 'sum' after running this loop logic:\n\`\`\`\nsum = 0\nfor k from 1 to ${limit-1} inclusive:\n    if k is even:\n        sum = sum + k\n\`\`\` (Variant ${i+1})`;
            correctAns = `${sum}`;
            opts = [correctAns, `${sum + 2}`, `${sum - 2}`, `0`];
        } else if (type === 2) {
            const count = (i % 5) + 2;
            q = `A function calls itself recursively ${count} times. If the base case returns 1 and each recursive step multiplies the result by 2, what is the final returned value (Variant ${i+1})?`;
            correctAns = `${Math.pow(2, count)}`;
            opts = [correctAns, `${count * 2}`, `${Math.pow(2, count - 1)}`, `${Math.pow(2, count) + 1}`];
        } else if (type === 3) {
            const val = (i % 8) + 2;
            q = `Trace the value of 'x' after executing the following branching logic:\n\`\`\`\nx = ${val}\nif x > 5:\n    x = x * 2\nelse:\n    x = x + 5\nif x % 2 == 0:\n    x = x / 2\n\`\`\` (Variant ${i+1})`;
            let x = val;
            if (x > 5) x = x * 2;
            else x = x + 5;
            if (x % 2 === 0) x = x / 2;
            correctAns = `${x}`;
            opts = [correctAns, `${x + 1}`, `${x * 2}`, `${x - 1}`];
        } else if (type === 4) {
            q = `In programming logic, if the statement "If the test fails, then the output file is closed" is true, which of the following contrapositive statements must also be logically true (Variant ${i+1})?`;
            correctAns = `If the output file is not closed, then the test did not fail`;
            opts = [correctAns, `If the test passes, the output file is open`, `If the output file is closed, the test failed`, `If the output file is closed, the test passed`];
        } else if (type === 5) {
            const maxVal = (i % 5) + 3;
            q = `If a loop runs while 'i < ${maxVal}', starting with 'i = 0', and increments 'i' by 2 in each iteration, how many times will the loop body execute (Variant ${i+1})?`;
            correctAns = `${Math.ceil(maxVal / 2)}`;
            opts = [correctAns, `${maxVal}`, `${Math.floor(maxVal / 2)}`, `${Math.ceil(maxVal / 2) + 1}`];
        } else if (type === 6) {
            const initial = (i % 4) + 1;
            q = `Find the final value of 'res' after evaluating the nested conditional statement:\n\`\`\`\nval = ${initial}\nif val > 2:\n    res = "High" if val > 3 else "Medium"\nelse:\n    res = "Low" if val > 0 else "Zero"\n\`\`\` (Variant ${i+1})`;
            let res = '';
            if (initial > 2) {
                res = initial > 3 ? "High" : "Medium";
            } else {
                res = initial > 0 ? "Low" : "Zero";
            }
            correctAns = res;
            opts = [correctAns, res === 'High' ? 'Medium' : 'High', res === 'Low' ? 'Zero' : 'Low', 'Unknown'];
        } else if (type === 7) {
            q = `Which boolean logic expression is equivalent to: NOT (A OR B) according to De Morgan's Laws (Variant ${i+1})?`;
            correctAns = `(NOT A) AND (NOT B)`;
            opts = [correctAns, `(NOT A) OR (NOT B)`, `NOT A OR NOT B`, `A AND B`];
        } else if (type === 8) {
            const lim = (i % 3) + 2;
            q = `What is the output value of 'c' after tracing this while loop logic:\n\`\`\`\nc = 0\nx = 1\nwhile x < ${lim * 3}:\n    c = c + 1\n    x = x * 3\n\`\`\` (Variant ${i+1})`;
            let c = 0, x = 1;
            while (x < lim * 3) {
                c++;
                x *= 3;
            }
            correctAns = `${c}`;
            opts = [correctAns, `${c + 1}`, `${c - 1}`, `0`];
        } else if (type === 9) {
            q = `In binary logical operations, what is the output of the bitwise XOR operation (A ^ B) when both A and B have the same binary value of 1 (Variant ${i+1})?`;
            correctAns = `0`;
            opts = [correctAns, `1`, `2`, `Error`];
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
            q = `Which Regular Expression (Regex) pattern correctly matches any sequence of one or more digits (Variant ${i+1})?`;
            correctAns = `\\d+`;
            opts = [correctAns, `\\d*`, `\\D+`, `[0-9]`];
        } else if (type === 1) {
            q = `Which OOP design pattern is used to restrict the instantiation of a class to one single "instance" object across the entire application lifetime (Variant ${i+1})?`;
            correctAns = `Singleton Pattern`;
            opts = [correctAns, `Factory Pattern`, `Builder Pattern`, `Observer Pattern`];
        } else if (type === 2) {
            q = `When parsing structured file data, what is the primary difference between parsing a CSV file versus a JSON file (Variant ${i+1})?`;
            correctAns = `CSV is flat and tabular, whereas JSON supports nested hierarchical data structures`;
            opts = [correctAns, `CSV is binary, whereas JSON is text-based`, `CSV is faster to write but cannot be read by programs`, `JSON only supports integer values`];
        } else if (type === 3) {
            q = `Which Regex pattern matches a string that starts exactly with the letters "test" (Variant ${i+1})?`;
            correctAns = `^test`;
            opts = [correctAns, `test$`, `.*test`, `[test]`];
        } else if (type === 4) {
            q = `Which programming concept describes loading an entire file's content into memory at once versus processing it line-by-line (streaming) (Variant ${i+1})?`;
            correctAns = `Buffered reading vs Stream processing`;
            opts = [correctAns, `Recursion vs Iteration`, `Serialization vs Deserialization`, `Compilation vs Interpretation`];
        } else if (type === 5) {
            q = `What is the main purpose of object serialization in programming (Variant ${i+1})?`;
            correctAns = `To convert an object's state into a byte stream for storage or transmission`;
            opts = [correctAns, `To speed up loops in execution`, `To secure memory from leaks`, `To format string outputs`];
        } else if (type === 6) {
            q = `Which design pattern defines a one-to-many dependency between objects so that when one object changes state, all its dependents are notified automatically (Variant ${i+1})?`;
            correctAns = `Observer Pattern`;
            opts = [correctAns, `Factory Pattern`, `Singleton Pattern`, `Decorator Pattern`];
        } else if (type === 7) {
            q = `Which Regex pattern matches any email address ending strictly with ".org" (Variant ${i+1})?`;
            correctAns = `.*\\.org$`;
            opts = [correctAns, `^.*\\.org`, `.*org$`, `[a-z]\\.org`];
        } else if (type === 8) {
            q = `What is the main advantage of using a Factory Design Pattern in your codebase (Variant ${i+1})?`;
            correctAns = `It decouples object creation logic from the client class using the object`;
            opts = [correctAns, `It automatically optimizes loop iterations`, `It eliminates the need for database storage`, `It makes code compile faster`];
        } else if (type === 9) {
            q = `What is the primary role of an assertion statement in unit testing scripts (Variant ${i+1})?`;
            correctAns = `To compare the actual output of a code execution with the expected output and fail the test if they differ`;
            opts = [correctAns, `To write log messages to the console`, `To initialize variables before a function starts`, `To loop through arrays of test data`];
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
    
    for (let i = 0; i < 100; i++) {
        const type = i % 10;
        let q = '', correctAns = '', opts = [];

        if (type === 0) {
            q = `Which sentence represents the most professional way to write a defect summary (Variant ${i+1})?`;
            correctAns = `The Login button remains disabled after the user enters a valid email and password.`;
            opts = [correctAns, `Login button is not working for me when I try it.`, `Button disabled in login page always and forever.`, `Login button does not click and it is very annoying.`];
        } else if (type === 1) {
            q = `Choose the grammatically correct sentence for a test report (Variant ${i+1}):`;
            correctAns = `The test execution was completed successfully, and all reports were saved.`;
            opts = [correctAns, `The test execution completed successful, and all reports was saved.`, `The test execution were completed successfully, and all reports was saved.`, `The test execution was completed successfully, and all report was saved.`];
        } else if (type === 2) {
            q = `Which of the following sentences uses the active voice to describe test actions clearly (Variant ${i+1})?`;
            correctAns = `The QA team verified the bug fix in the staging environment.`;
            opts = [correctAns, `The bug fix was verified in the staging environment by the QA team.`, `Staging environment had verification of the bug fix by the QA team.`, `Verification of the bug fix was done by the QA team.`];
        } else if (type === 3) {
            q = `How should you professionally write to a developer about a bug that you cannot reproduce on your system anymore (Variant ${i+1})?`;
            correctAns = `I am unable to reproduce this issue on my end. Could we schedule a quick call to check it together?`;
            opts = [correctAns, `This bug is gone. You must have fixed it without telling me.`, `The bug is not reproducing so it is closed.`, `Why did you close this bug if I can't reproduce it?`];
        } else if (type === 4) {
            q = `Choose the sentence that correctly follows subject-verb agreement (Variant ${i+1}):`;
            correctAns = `Every test case in the regression suite has been executed.`;
            opts = [correctAns, `Every test case in the regression suite have been executed.`, `Every test case in the regression suite are executed.`, `Every test cases in the regression suite has been executed.`];
        } else if (type === 5) {
            q = `Choose the correct preposition to complete the sentence: "The error occurs ___ line 42 of the log file" (Variant ${i+1}).`;
            correctAns = `at`;
            opts = [correctAns, `in`, `on`, `with`];
        } else if (type === 6) {
            q = `Choose the correct sentence to convey the status of a blocked ticket professionally (Variant ${i+1}):`;
            correctAns = `Testing is currently blocked due to a database outage.`;
            opts = [correctAns, `Testing is currently blocked because database is down and we can do nothing.`, `Testing is blocked and it is because the database is broken.`, `Testing block database down.`];
        } else if (type === 7) {
            q = `Identify the correct spelling of the word representing a defect's level of impact (Variant ${i+1}):`;
            correctAns = `Severity`;
            opts = [correctAns, `Severety`, `Severty`, `Siverity`];
        } else if (type === 8) {
            q = `Which sentence is phrased most professionally for a bug report update (Variant ${i+1})?`;
            correctAns = `The issue persists after clearing the browser cache.`;
            opts = [correctAns, `The issue is still happening even though I cleared my cache.`, `Bug is still there after cache clear.`, `Still failing, cleared cache.`];
        } else if (type === 9) {
            q = `Choose the sentence that uses clear pronoun reference to avoid ambiguity (Variant ${i+1})?`;
            correctAns = `After the server restarted, the developer verified that the error was gone.`;
            opts = [correctAns, `After the server restarted, they checked it and it was fine.`, `The developer restarted it and checked that it was resolved.`, `It restarted and they verified the error was resolved.`];
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

const generateJava = () => {
    let text = '[Section: Java]\n\n';
    
    for (let i = 0; i < 100; i++) {
        const type = i % 10;
        let q = '', correctAns = '', opts = [];

        if (type === 0) {
            q = `What is the primary difference between a class and an interface in Java (Variant ${i+1})?`;
            correctAns = `An interface cannot store instance state or instance fields, whereas a class can`;
            opts = [correctAns, `An interface supports multiple inheritance, but a class supports none`, `A class can only have static methods, but an interface can have instance methods`, `There is no difference between them`];
        } else if (type === 1) {
            const v1 = (i % 5) + 2, v2 = (i % 4) + 3;
            q = `What is the output of the following Java code?\n\`\`\`java\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Java" + ${v1} + ${v2});\n  }\n}\n\`\`\``;
            correctAns = `Java${v1}${v2}`;
            opts = [correctAns, `Java${v1 + v2}`, `${v1 + v2}Java`, `Error`];
        } else if (type === 2) {
            q = `Which Java Collection interface should you use if you need to store unique elements and do not require maintaining any specific order (Variant ${i+1})?`;
            correctAns = `Set`;
            opts = [correctAns, `List`, `Map`, `Queue`];
        } else if (type === 3) {
            const size = (i % 3) + 3;
            const index = size;
            q = `What is the output of the following Java code?\n\`\`\`java\nint[] arr = new int[${size}];\nSystem.out.println(arr[${index}]);\n\`\`\``;
            correctAns = `ArrayIndexOutOfBoundsException`;
            opts = [correctAns, `0`, `null`, `Compilation Error`];
        } else if (type === 4) {
            q = `Which OOP keyword in Java is used by a subclass to call a constructor or invoke a method of its direct parent class (Variant ${i+1})?`;
            correctAns = `super`;
            opts = [correctAns, `this`, `parent`, `extends`];
        } else if (type === 5) {
            q = `What is the output of the following Java code?\n\`\`\`java\nString s = null;\ntry {\n    System.out.println(s.length());\n} catch (NullPointerException e) {\n    System.out.println("NullPointer");\n}\n\`\`\``;
            correctAns = `NullPointer`;
            opts = [correctAns, `0`, `null`, `Compilation Error`];
        } else if (type === 6) {
            q = `What is the default isolation/accessibility level of members in a Java class if no explicit access modifier is provided (Variant ${i+1})?`;
            correctAns = `package-private (default access)`;
            opts = [correctAns, `public`, `private`, `protected`];
        } else if (type === 7) {
            const str = "Programming";
            const start = i % 3;
            const end = start + 4;
            q = `What is the output of the following Java code?\n\`\`\`java\nString s = "${str}";\nSystem.out.println(s.substring(${start}, ${end}));\n\`\`\``;
            correctAns = str.substring(start, end);
            opts = [correctAns, str.substring(start, end + 1), str.substring(start + 1, end), `Error`];
        } else if (type === 8) {
            q = `In Java, how does the 'finally' block behave in a try-catch-finally structure (Variant ${i+1})?`;
            correctAns = `It is always executed regardless of whether an exception is thrown or caught`;
            opts = [correctAns, `It executes only if an exception is thrown`, `It executes only if no exception is thrown`, `It is skipped if a catch block contains a return statement`];
        } else if (type === 9) {
            const val = (i % 3) + 1;
            let output = '';
            if (val === 1) output = 'OneTwoDefault';
            else if (val === 2) output = 'TwoDefault';
            else output = 'Default';
            q = `What is the output of the following Java code?\n\`\`\`java\nint x = ${val};\nswitch(x) {\n  case 1: System.out.print("One");\n  case 2: System.out.print("Two");\n  default: System.out.print("Default");\n}\n\`\`\``;
            correctAns = output;
            opts = [correctAns, output.replace('Default', ''), `One`, `Two`];
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
            q = `What does it mean that Python lists are mutable while Python tuples are immutable (Variant ${i+1})?`;
            correctAns = `A list's elements can be modified in-place, but a tuple's elements cannot be changed after creation`;
            opts = [correctAns, `A tuple can store any data type, but a list only stores integers`, `Lists are faster to search than tuples`, `Tuples can dynamically grow in size, but lists have a fixed size`];
        } else if (type === 1) {
            const def = (i % 10) + 5;
            q = `What is the output of the following Python code?\n\`\`\`python\nd = {'a': 1, 'b': 2}\nprint(d.get('c', ${def}))\n\`\`\``;
            correctAns = `${def}`;
            opts = [correctAns, `None`, `KeyError`, `1`];
        } else if (type === 2) {
            q = `In a Python class definition, what is the primary purpose of the special '__init__' method (Variant ${i+1})?`;
            correctAns = `It acts as the class constructor to initialize the object's attributes upon instantiation`;
            opts = [correctAns, `It registers the class with the system garbage collector`, `It executes the file as a standalone script`, `It converts the class instance into a string`];
        } else if (type === 3) {
            const mul = (i % 4) + 2, val = (i % 5) + 3;
            q = `What is the output of the following Python code?\n\`\`\`python\nf = lambda x: x * ${mul}\nprint(f(${val}))\n\`\`\``;
            correctAns = `${mul * val}`;
            opts = [correctAns, `${mul + val}`, `${val}`, `Error`];
        } else if (type === 4) {
            q = `Which block keyword in Python exception handling is used to specify code that must execute whether or not an exception occurred (Variant ${i+1})?`;
            correctAns = `finally`;
            opts = [correctAns, `except`, `else`, `catch`];
        } else if (type === 5) {
            const a = i % 5, b = (i % 5) + 1, c = (i % 5) + 2;
            q = `What is the output of the following Python code?\n\`\`\`python\ns1 = {${a}, ${b}}\ns2 = {${b}, ${c}}\nprint(s1 | s2)\n\`\`\``;
            const set = [...new Set([a, b, c])].sort((x,y)=>x-y);
            correctAns = `{${set.join(', ')}}`;
            opts = [correctAns, `{${a}, ${b}, ${c}, ${b}}`, `{${b}}`, `Error`];
        } else if (type === 6) {
            q = `What is a decorator in Python programming (Variant ${i+1})?`;
            correctAns = `A function that takes another function as an argument and extends its behavior without modifying it explicitly`;
            opts = [correctAns, `A syntax element used to style printed console messages`, `A class variable that prevents other classes from inheriting it`, `A tool used to format code structure for PEP 8 styling`];
        } else if (type === 7) {
            q = `What is the output of the following Python code?\n\`\`\`python\na, b, *c = [1, 2, 3, 4, 5]\nprint(c)\n\`\`\``;
            correctAns = `[3, 4, 5]`;
            opts = [correctAns, `3`, `[4, 5]`, `Error`];
        } else if (type === 8) {
            q = `In Python, what is the primary role of the 'yield' keyword inside a function definition (Variant ${i+1})?`;
            correctAns = `It turns the function into a generator, suspending execution and returning a value to the caller while retaining state`;
            opts = [correctAns, `It exits the program immediately and outputs a debug trace`, `It forces the interpreter to release global locks for multithreading`, `It deletes local variables from memory`];
        } else if (type === 9) {
            const val = (i % 9) + 1;
            q = `What is the output of the following Python code?\n\`\`\`python\ntry:\n    val = int('${val}.5')\nexcept ValueError:\n    print("ValueErr")\n\`\`\``;
            correctAns = `ValueErr`;
            opts = [correctAns, `${val}`, `${val+1}`, `TypeError`];
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
    
    for (let i = 0; i < 100; i++) {
        const type = i % 10;
        let q = '', correctAns = '', opts = [];

        if (type === 0) {
            q = `Which SQL JOIN returns all rows from Table A, and the matched rows from Table B, filling unmatched columns with NULL (Variant ${i+1})?`;
            correctAns = `LEFT JOIN`;
            opts = [correctAns, `INNER JOIN`, `RIGHT JOIN`, `FULL JOIN`];
        } else if (type === 1) {
            q = `You are writing a query to count how many records exist for each status in a table. Which SQL clause is required (Variant ${i+1})?`;
            correctAns = `GROUP BY`;
            opts = [correctAns, `ORDER BY`, `HAVING`, `WHERE`];
        } else if (type === 2) {
            q = `What is the key difference between DELETE and TRUNCATE SQL commands (Variant ${i+1})?`;
            correctAns = `DELETE can be rolled back and can have a WHERE clause; TRUNCATE cannot have a WHERE clause`;
            opts = [correctAns, `TRUNCATE deletes the table structure; DELETE does not`, `DELETE is a DDL command; TRUNCATE is a DML command`, `There is no difference`];
        } else if (type === 3) {
            q = `What is the primary benefit of creating an index on a database column that is frequently queried (Variant ${i+1})?`;
            correctAns = `It speeds up data retrieval speed during select operations`;
            opts = [correctAns, `It speeds up insert and update operations`, `It automatically validates data constraints`, `It reduces database storage size`];
        } else if (type === 4) {
            q = `Which SQL query correctly finds the maximum value in the 'salary' column of the 'employees' table (Variant ${i+1})?`;
            correctAns = `SELECT MAX(salary) FROM employees;`;
            opts = [correctAns, `SELECT LIMIT(salary) FROM employees;`, `SELECT TOP(salary) FROM employees;`, `SELECT UPPER(salary) FROM employees;`];
        } else if (type === 5) {
            q = `What database constraint guarantees that a column does not accept any duplicate values and cannot be NULL (Variant ${i+1})?`;
            correctAns = `PRIMARY KEY`;
            opts = [correctAns, `FOREIGN KEY`, `UNIQUE`, `NOT NULL`];
        } else if (type === 6) {
            q = `Which SQL command is used to undo all database modifications made since the start of the current transaction (Variant ${i+1})?`;
            correctAns = `ROLLBACK`;
            opts = [correctAns, `COMMIT`, `RESET`, `UNDO`];
        } else if (type === 7) {
            q = `Which SQL operator is used to search for a specific character pattern in a column, such as finding emails ending in '@gmail.com' (Variant ${i+1})?`;
            correctAns = `LIKE`;
            opts = [correctAns, `IN`, `BETWEEN`, `EXISTS`];
        } else if (type === 8) {
            q = `What is the main purpose of a Foreign Key constraint in database design (Variant ${i+1})?`;
            correctAns = `To enforce referential integrity between two tables`;
            opts = [correctAns, `To ensure that each row is unique`, `To speed up sorting operations`, `To encrypt sensitive columns`];
        } else if (type === 9) {
            q = `Which SQL function should be used to find the average value of records stored in a table column (Variant ${i+1})?`;
            correctAns = `AVG`;
            opts = [correctAns, `MEAN`, `COUNT`, `SUM`];
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

function generateFile() {
    console.log('Generating 700 Pure Programming Java/Python Fresher Questions (0-2 Yrs Experience)...');
    let output = '';
    
    output += generateCS();
    output += generateLogic();
    output += generateMisc();
    output += generateGrammar();
    output += generateJava();
    output += generatePython();
    output += generateDB();

    fs.writeFileSync('Fresher_700_Questions_V2.txt', output);
    console.log('✅ Generated Fresher_700_Questions_V2.txt successfully!');
}

generateFile();
