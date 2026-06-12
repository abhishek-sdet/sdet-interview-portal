import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const { data: interviews, error } = await supabase
        .from('interviews')
        .select(`
            id,
            status,
            criteria_id,
            criteria(name),
            score,
            total_questions
        `)
        .eq('status', 'in_progress');

    if (error) {
        console.error('Error fetching interviews:', error);
        return;
    }

    console.log('In Progress Interviews:');
    interviews.forEach(i => {
        console.log(`- ID: ${i.id}`);
        console.log(`  Criteria: ${i.criteria?.name} (${i.criteria_id})`);
        console.log(`  Questions: ${i.total_questions}`);
        console.log('---');
    });
}

run();
