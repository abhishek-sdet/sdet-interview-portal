import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const fresherId = 'b9838035-9d3b-43cb-a598-3a120e1fc39e';

    const { data: fresherJs, error } = await supabase
        .from('questions')
        .select('id, section, subsection, is_active, question_text, category')
        .eq('criteria_id', fresherId)
        .eq('subsection', 'javascript')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Fresher JS Questions samples:`);
    fresherJs?.forEach((q, i) => {
        console.log(`${i+1}. [Section: ${q.section}] [Subsection: ${q.subsection}] [Category: ${q.category}] ${q.question_text.substring(0, 60)}...`);
    });
}

run();
