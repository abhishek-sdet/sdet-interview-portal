import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('subsection', 'python')
        .eq('is_active', true);
    
    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    questions.forEach((q, idx) => {
        console.log(`[Python Q ${idx + 1}] ID: ${q.id}`);
        console.log(`Text: ${q.question_text}`);
        console.log('---');
    });
}

run();
