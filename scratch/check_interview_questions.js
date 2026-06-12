import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const interviewId = '938f4061-49ef-4340-a652-a268dd939aae';

    const { data: answers, error } = await supabase
        .from('answers')
        .select(`
            question_id,
            selected_answer,
            is_correct,
            question:question_id ( id, section, subsection, category, question_text )
        `)
        .eq('interview_id', interviewId);

    if (error) {
        console.error('Error fetching answers:', error);
        return;
    }

    console.log(`Total answers: ${answers.length}`);
    const subCounts = {};
    answers.forEach(a => {
        const q = a.question;
        const sub = q ? q.subsection : 'unknown';
        subCounts[sub] = (subCounts[sub] || 0) + 1;
    });

    console.log('Subsections in this interview:', subCounts);
}

run();
