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
        console.error('Error:', error);
        return;
    }

    console.log(`Experienced questions sample by subsection:`);
    const seen = new Set();
    questions.forEach(q => {
        if (!seen.has(q.subsection)) {
            seen.add(q.subsection);
            console.log(`- Subsection: "${q.subsection}" (Sample: "${q.question_text.substring(0, 50)}")`);
        }
    });
}

run();
