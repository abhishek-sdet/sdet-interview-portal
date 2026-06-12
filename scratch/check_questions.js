import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const isCodingQuestion = (q) => {
    const text = (q.question_text || '').toLowerCase();
    if (text.includes('```')) return true;
    if (text.includes('public class') || text.includes('system.out.print') || text.includes('public static void main')) return true;
    if (text.includes('def ') || text.includes('print(')) return true;
    if (text.includes('select ') && text.includes(' from ')) return true;
    if (text.includes('output of') || text.includes('following code')) return true;
    if (text.includes(';') && text.includes('{') && text.includes('}')) return true;
    return false;
};

async function run() {
    const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('is_active', true);
    
    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    console.log(`Total active questions: ${questions.length}`);

    // Group by subsection and print stats of coding vs theory
    const subGroups = {};
    questions.forEach(q => {
        const sub = q.subsection || 'none';
        if (!subGroups[sub]) {
            subGroups[sub] = { coding: 0, theory: 0, total: 0 };
        }
        if (isCodingQuestion(q)) {
            subGroups[sub].coding++;
        } else {
            subGroups[sub].theory++;
        }
        subGroups[sub].total++;
    });

    console.log('\nSubsection stats:');
    console.table(subGroups);
}

run();
