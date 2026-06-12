import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const criteriaId = '45449849-d853-4de8-968b-ce8ac7a7e0d9'; // Experienced

    let query = supabase
        .from('questions')
        .select('*')
        .eq('criteria_id', criteriaId)
        .eq('is_active', true);

    const { data, error } = await query.order('created_at');
    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    console.log(`Fetched ${data.length} questions`);

    // Deduplicate
    let uniqueData = Array.from(
        new Map(data.map(q => [(q.question_text || '').trim().toLowerCase(), q])).values()
    );
    console.log(`Unique questions: ${uniqueData.length}`);

    // Map subsection
    uniqueData = uniqueData.map(q => {
        let mappedSub = q.subsection ? q.subsection.toLowerCase() : 'testing';
        if (mappedSub.includes('agile')) mappedSub = 'agile';
        else if (mappedSub.includes('api')) mappedSub = 'api';
        else if (mappedSub.includes('logical')) mappedSub = 'logical';
        else if (mappedSub.includes('grammar') || mappedSub.includes('communication')) mappedSub = 'grammar';
        else if (mappedSub.includes('cs') || mappedSub.includes('computer')) mappedSub = 'cs_basics';
        else if (mappedSub.includes('javascript') || mappedSub.includes('js')) mappedSub = 'javascript';
        else if (mappedSub.includes('java')) mappedSub = 'java';
        else if (mappedSub.includes('python')) mappedSub = 'python';
        else if (mappedSub.includes('database') || mappedSub.includes('sql')) mappedSub = 'database';
        else mappedSub = 'testing';
        return { ...q, subsection: mappedSub };
    });

    const generalQs = uniqueData.filter(q => {
        const isJS = q.subsection === 'javascript';
        const isGeneral = q.section === 'general' || !q.section || isJS;
        return isGeneral;
    });

    const electiveQs = uniqueData.filter(q => {
        const isJS = q.subsection === 'javascript';
        const isElective = q.section === 'elective' && !isJS;
        return isElective;
    });

    console.log(`General: ${generalQs.length}, Elective: ${electiveQs.length}`);

    const subs = {};
    generalQs.forEach(q => {
        subs[q.subsection] = (subs[q.subsection] || 0) + 1;
    });
    console.log('General questions by subsection:');
    console.log(subs);
}

run();
