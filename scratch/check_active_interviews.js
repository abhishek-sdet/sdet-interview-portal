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
            candidate_id,
            status,
            score,
            total_questions,
            percentage,
            started_at,
            question_set,
            criteria:criteria_id ( id, name )
        `)
        .order('started_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching interviews:', error);
        return;
    }

    console.log('--- RECENT INTERVIEWS ---');
    interviews.forEach(i => {
        console.log(`ID: ${i.id}`);
        console.log(`Status: ${i.status}`);
        console.log(`Score: ${i.score}/${i.total_questions} (${i.percentage}%)`);
        console.log(`Started At: ${i.started_at}`);
        console.log(`Criteria: ${i.criteria ? i.criteria.name : 'Unknown'} (${i.criteria?.id})`);
        console.log(`Question Set: ${i.question_set}`);
        console.log('--------------------');
    });
}

run();
