import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const candidateId = '7dbea77b-a28c-4ab3-9ccd-ab8cd4089fea';

    const { data: interviews, error: err1 } = await supabase
        .from('interviews')
        .select('*')
        .eq('candidate_id', candidateId);

    if (err1) {
        console.error('Error fetching interviews:', err1);
        return;
    }

    console.log(`Candidate has ${interviews.length} interviews:`);
    interviews.forEach(i => {
        console.log(`ID: ${i.id}, Status: ${i.status}, Total Qs: ${i.total_questions}, Started At: ${i.started_at}`);
    });

    const interviewIds = interviews.map(i => i.id);
    const { data: answers, error: err2 } = await supabase
        .from('answers')
        .select('interview_id, question_id')
        .in('interview_id', interviewIds);

    if (err2) {
        console.error('Error fetching answers:', err2);
        return;
    }

    console.log(`Total answers across all candidate interviews: ${answers.length}`);
}

run();
