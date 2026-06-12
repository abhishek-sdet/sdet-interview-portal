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
        .select('id, section, subsection')
        .eq('criteria_id', expId)
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    console.log(`Total active Experienced questions: ${questions.length}`);
    const sections = {};
    const sectionSubsections = {};
    
    questions.forEach(q => {
        const sec = q.section || 'null/empty';
        sections[sec] = (sections[sec] || 0) + 1;
        
        const sub = q.subsection || 'null/empty';
        const key = `${sec} -> ${sub}`;
        sectionSubsections[key] = (sectionSubsections[key] || 0) + 1;
    });

    console.log('Sections:', sections);
    console.log('Section -> Subsection mapping:', sectionSubsections);
}

run();
