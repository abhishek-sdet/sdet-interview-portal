import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const { data: criteria, error: err1 } = await supabase
        .from('criteria')
        .select('id, name');

    if (err1) {
        console.error('Error fetching criteria:', err1);
        return;
    }

    const { data: questions, error: err2 } = await supabase
        .from('questions')
        .select('id, criteria_id, section, subsection, is_active');

    if (err2) {
        console.error('Error fetching questions:', err2);
        return;
    }

    console.log(`Loaded ${criteria.length} criteria and ${questions.length} total questions.`);

    criteria.forEach(c => {
        const cQs = questions.filter(q => q.criteria_id === c.id && q.is_active);
        console.log(`\n===================================`);
        console.log(`Criteria: ${c.name} (ID: ${c.id})`);
        console.log(`Active questions: ${cQs.length}`);
        
        const subCounts = {};
        cQs.forEach(q => {
            const sub = q.subsection || 'empty/null';
            subCounts[sub] = (subCounts[sub] || 0) + 1;
        });
        console.log('Subsections:', subCounts);
    });
}

run();
