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
            total_questions,
            question_set
        `);

    if (error) {
        console.error('Error fetching interviews:', error);
        return;
    }

    console.log(`Total interviews: ${interviews.length}`);
    interviews.forEach((i, idx) => {
        console.log(`${idx + 1}. ID: ${i.id} | Status: ${i.status} | Criteria: ${i.criteria?.name} | Questions: ${i.total_questions} | Set: ${i.question_set}`);
    });
}

run();
