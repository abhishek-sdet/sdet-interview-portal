import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const expId = '45449849-d853-4de8-968b-ce8ac7a7e0d9'; // Experienced

    const { data: questions, error } = await supabase
        .from('questions')
        .select('id, section, subsection, category, question_text')
        .eq('criteria_id', expId)
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    console.log(`Total active questions for Experienced: ${questions.length}`);

    // Group by subsection and print stats
    const subs = {};
    questions.forEach(q => {
        subs[q.subsection] = (subs[q.subsection] || 0) + 1;
    });
    console.log('Subsections:', subs);

    // Group by category
    const cats = {};
    questions.forEach(q => {
        cats[q.category] = (cats[q.category] || 0) + 1;
    });
    console.log('Categories:', cats);
}

run();
