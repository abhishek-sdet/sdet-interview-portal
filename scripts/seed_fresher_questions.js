import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

// We need exactly 100 questions per category. 
// We will generate them using procedural variations.
const generateCS = () => {
    const questions = [];
    const topics = [
        { topic: 'OS', base: 'Which component is responsible for ', concepts: ['memory management?', 'process scheduling?', 'file mapping?', 'I/O operations?'] },
        { topic: 'Networking', base: 'Which OSI layer handles ', concepts: ['encryption?', 'routing?', 'error detection?', 'session management?'] },
        { topic: 'Algorithms', base: 'What is the time complexity of ', concepts: ['binary search?', 'merge sort?', 'quick sort worst-case?', 'BFS on adjacency matrix?'] },
        { topic: 'Data Structures', base: 'Which data structure uses ', concepts: ['LIFO?', 'FIFO?', 'hierarchical linking?', 'key-value mapping?'] }
    ];

    for (let i = 0; i < 100; i++) {
        const t = topics[i % topics.length];
        const concept = t.concepts[Math.floor(i / topics.length) % t.concepts.length];
        
        let q = `${t.base}${concept} (Variation ${i})`;
        let opts = ['Layer/Component A', 'Layer/Component B', 'Layer/Component C', 'Layer/Component D'];
        
        if (t.topic === 'Algorithms') {
            opts = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)'].sort(() => 0.5 - Math.random()).slice(0, 4);
        } else if (t.topic === 'Data Structures') {
            opts = ['Stack', 'Queue', 'Tree', 'Graph', 'Hash Table'].sort(() => 0.5 - Math.random()).slice(0, 4);
        }

        const correct = opts[0]; // Just force A to be correct for dummy seeding, or shuffle.
        // Shuffle opts and find new index
        const shuffled = [...opts].sort(() => 0.5 - Math.random());
        const correctIdx = shuffled.indexOf(correct);
        
        questions.push({
            question_text: q,
            options: shuffled,
            correct_option: String.fromCharCode(65 + correctIdx),
            correct_answer: correct
        });
    }
    return questions;
};

const generateLogic = () => {
    const questions = [];
    for (let i = 0; i < 100; i++) {
        const diff = (i % 5) + 2;
        const start = (i * 3) % 20;
        const seq = [start, start + diff, start + diff*2, start + diff*3];
        
        const q = `Find the next number in the sequence: ${seq.join(', ')}, ? (Q${i})`;
        const correctAns = start + diff * 4;
        
        const opts = [
            String(correctAns),
            String(correctAns + 1),
            String(correctAns - 2),
            String(correctAns + diff)
        ];
        
        const shuffled = [...opts].sort(() => 0.5 - Math.random());
        const correctIdx = shuffled.indexOf(String(correctAns));
        
        questions.push({
            question_text: q,
            options: shuffled,
            correct_option: String.fromCharCode(65 + correctIdx),
            correct_answer: String(correctAns)
        });
    }
    return questions;
};

const generateMisc = () => {
    const questions = [];
    for (let i = 0; i < 100; i++) {
        const q = `Miscellaneous abstract reasoning question number ${i + 1}. Which of the following does not belong?`;
        const opts = [`Option Alpha ${i}`, `Option Beta ${i}`, `Option Gamma ${i}`, `Option Delta ${i}`];
        
        questions.push({
            question_text: q,
            options: opts,
            correct_option: 'A',
            correct_answer: opts[0]
        });
    }
    return questions;
};

const generateGrammar = () => {
    const questions = [];
    for (let i = 0; i < 100; i++) {
        const q = `Identify the correct preposition for scenario ${i + 1}: He is accustomed ___ hard work.`;
        const opts = ['to', 'with', 'by', 'for'];
        
        questions.push({
            question_text: q,
            options: opts,
            correct_option: 'A',
            correct_answer: opts[0]
        });
    }
    return questions;
};

const generateJava = () => {
    const questions = [];
    for (let i = 0; i < 100; i++) {
        const val1 = i % 10;
        const val2 = (i % 5) + 1;
        const q = `What is the output of the following Java code?\n\n\`\`\`java\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(${val1} + ${val2} + "Java");\n    }\n}\n\`\`\``;
        const correctAns = `${val1 + val2}Java`;
        const opts = [
            correctAns,
            `${val1}${val2}Java`,
            `Java${val1 + val2}`,
            `Error`
        ];
        
        const shuffled = [...opts].sort(() => 0.5 - Math.random());
        const correctIdx = shuffled.indexOf(correctAns);
        
        questions.push({
            question_text: q,
            options: shuffled,
            correct_option: String.fromCharCode(65 + correctIdx),
            correct_answer: correctAns
        });
    }
    return questions;
};

const generatePython = () => {
    const questions = [];
    for (let i = 0; i < 100; i++) {
        const idx = i % 5;
        const q = `What is the output of the following Python code (Variant ${i})?\n\n\`\`\`python\nmy_list = [10, 20, 30, 40, 50]\nprint(my_list[${idx}:])\n\`\`\``;
        const arr = [10, 20, 30, 40, 50];
        const correctAns = `[${arr.slice(idx).join(', ')}]`;
        
        const opts = [
            correctAns,
            `[${arr.slice(0, idx).join(', ')}]`,
            `Error`,
            `None`
        ];
        
        const shuffled = [...opts].sort(() => 0.5 - Math.random());
        const correctIdx = shuffled.indexOf(correctAns);
        
        questions.push({
            question_text: q,
            options: shuffled,
            correct_option: String.fromCharCode(65 + correctIdx),
            correct_answer: correctAns
        });
    }
    return questions;
};

const generateDB = () => {
    const questions = [];
    for (let i = 0; i < 100; i++) {
        const limit = (i % 10) + 1;
        const q = `Write a SQL query to fetch the top ${limit} highest salaries from the Employee table. (Variant ${i})`;
        const correctAns = `SELECT salary FROM Employee ORDER BY salary DESC LIMIT ${limit}`;
        
        const opts = [
            correctAns,
            `SELECT salary FROM Employee LIMIT ${limit} ORDER BY salary DESC`,
            `SELECT TOP ${limit} FROM Employee WHERE salary = MAX(salary)`,
            `SELECT salary FROM Employee MAX ${limit}`
        ];
        
        const shuffled = [...opts].sort(() => 0.5 - Math.random());
        const correctIdx = shuffled.indexOf(correctAns);
        
        questions.push({
            question_text: q,
            options: shuffled,
            correct_option: String.fromCharCode(65 + correctIdx),
            correct_answer: correctAns
        });
    }
    return questions;
};

async function seed() {
    console.log('Seeding 700 Fresher Questions...');

    // 1. Get or create Fresher Criteria
    let { data: criteriaData } = await supabase
        .from('criteria')
        .select('*')
        .ilike('name', 'Fresher')
        .single();

    let criteriaId;

    if (!criteriaData) {
        console.log('Fresher criteria not found, creating it...');
        const { data: newCriteria, error } = await supabase
            .from('criteria')
            .insert({ name: 'Fresher', description: 'Generated Fresher Questions' })
            .select()
            .single();
        
        if (error) {
            console.error('Error creating criteria:', error);
            return;
        }
        criteriaId = newCriteria.id;
    } else {
        criteriaId = criteriaData.id;
    }

    console.log(`Using Criteria ID: ${criteriaId}`);

    const batches = [
        { name: 'Computer Science', section: 'general', subsection: 'computer_science', generator: generateCS },
        { name: 'Logical Reasoning', section: 'general', subsection: 'logical_reasoning', generator: generateLogic },
        { name: 'Miscellaneous', section: 'general', subsection: 'miscellaneous', generator: generateMisc },
        { name: 'Grammar', section: 'general', subsection: 'grammar', generator: generateGrammar },
        { name: 'Java', section: 'elective', subsection: 'java', generator: generateJava },
        { name: 'Python', section: 'elective', subsection: 'python', generator: generatePython },
        { name: 'Database', section: 'elective', subsection: 'database', generator: generateDB }
    ];

    let totalInserted = 0;

    for (const batch of batches) {
        console.log(`\nGenerating ${batch.name} questions...`);
        const qList = batch.generator();
        
        const records = qList.map(q => ({
            criteria_id: criteriaId,
            category: 'Fresher', // As used in UI groups sometimes
            section: batch.section,
            subsection: batch.subsection,
            difficulty: 'medium',
            is_active: true,
            question_text: q.question_text,
            options: q.options,
            option_a: q.options[0] || '',
            option_b: q.options[1] || '',
            option_c: q.options[2] || '',
            option_d: q.options[3] || '',
            correct_option: q.correct_option,
            correct_answer: q.correct_answer
        }));

        // Insert in batches of 50
        for (let i = 0; i < records.length; i += 50) {
            const chunk = records.slice(i, i + 50);
            const { error } = await supabase.from('questions').insert(chunk);
            if (error) {
                console.error(`Error inserting chunk for ${batch.name}:`, error);
            } else {
                totalInserted += chunk.length;
                console.log(`  Inserted ${chunk.length} questions...`);
            }
        }
    }

    console.log(`\n✅ Seeding Complete! Total inserted: ${totalInserted}`);
}

seed();
