import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const functionalId = '2282dea5-6505-4ba2-9b75-ae4124e1f017'; // Functional Assessment

    const { data: questions, error } = await supabase
        .from('questions')
        .select('id, section, subsection, category, question_text')
        .eq('criteria_id', functionalId)
        .eq('is_active', true);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Functional Assessment questions count: ${questions.length}`);
    const subs = {};
    questions.forEach(q => {
        subs[q.subsection] = (subs[q.subsection] || 0) + 1;
    });
    console.log('Subsections:', subs);
}

run();
