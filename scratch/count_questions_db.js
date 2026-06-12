import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    // We can run a raw SQL query or aggregate in JS by fetching in pages
    // Since we know the table size is small (around a few thousand), we can fetch all in chunks
    let allQuestions = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('questions')
            .select('criteria_id, section, subsection, is_active')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching questions:', error);
            return;
        }

        allQuestions = [...allQuestions, ...data];
        if (data.length < pageSize) {
            hasMore = false;
        } else {
            page++;
        }
    }

    console.log(`Successfully fetched ${allQuestions.length} total questions from database.`);

    const { data: criteria, error: critErr } = await supabase
        .from('criteria')
        .select('id, name');

    if (critErr) {
        console.error('Error fetching criteria:', critErr);
        return;
    }

    criteria.forEach(c => {
        const cQs = allQuestions.filter(q => q.criteria_id === c.id && q.is_active);
        console.log(`\n===================================`);
        console.log(`Criteria: ${c.name} (ID: ${c.id})`);
        console.log(`Active questions: ${cQs.length}`);
        
        const summary = {};
        cQs.forEach(q => {
            const sec = q.section || 'null/empty';
            const sub = q.subsection || 'null/empty';
            const key = `${sec} -> ${sub}`;
            summary[key] = (summary[key] || 0) + 1;
        });
        console.log(JSON.stringify(summary, null, 2));
    });
}

run();
