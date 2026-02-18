import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Load Environment Variables manually
const envPath = path.resolve(process.cwd(), '.env');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.log('.env file not found, trying defaults or failing.');
}

const getEnv = (key) => {
    const match = envContent.match(new RegExp(`${key}=["']?(.*?)["']?$`));
    return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- DB Verification Start ---');

    // 2. Find "Experienced" Critera
    const { data: criteria, error: cErr } = await supabase
        .from('criteria')
        .select('id, name')
        .ilike('name', '%experienced%')
        .single();

    if (cErr) { console.error('Criteria Fetch Error:', cErr); return; }
    console.log(`Criteria: ${criteria.name} (ID: ${criteria.id})`);

    // 3. Find unique categories (Set names) for this criteria
    const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('category, subsection, question_text')
        .eq('criteria_id', criteria.id);

    if (qErr) { console.error('Questions Query Error:', qErr); return; }

    // Group by category
    const sets = {};
    questions.forEach(q => {
        const cat = q.category || 'Uncategorized';
        if (!sets[cat]) sets[cat] = { count: 0, subsections: {} };
        sets[cat].count++;
        sets[cat].subsections[q.subsection] = (sets[cat].subsections[q.subsection] || 0) + 1;
    });

    console.log('Sets Found:', Object.keys(sets));

    // 4. Check "Set A" Specifically for subsection mapping
    const targetSet = Object.keys(sets).find(k => k.toLowerCase().includes('set a'));
    if (targetSet) {
        console.log(`\nAnalyzing ${targetSet}:`);
        console.log(sets[targetSet]);

        // Check if we have 'computer_science' subsection (this is the correct one for Software Testing)
        if (sets[targetSet].subsections['computer_science']) {
            console.log('✅ SUCCESS: Found questions mapped to computer_science (Software Testing)');
        } else {
            console.log('❌ FAILURE: No questions mapped to computer_science. Parsing/Upload might be old.');
        }

        // Check for specific text to be sure
        const testingQ = questions.find(q => q.category === targetSet && (q.question_text.toLowerCase().includes('testing') || q.question_text.toLowerCase().includes('defect')));
        if (testingQ) {
            console.log(`Sample Q: "${testingQ.question_text.substring(0, 40)}..." -> Subsection: ${testingQ.subsection}`);
        }
    } else {
        console.log('⚠ Set A not found.');
    }
}

check();
