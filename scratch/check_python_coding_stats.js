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
        .select('id, criteria_id, subsection, question_text')
        .eq('is_active', true)
        .in('subsection', ['java', 'python']);

    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    const { data: criteria } = await supabase
        .from('criteria')
        .select('id, name');

    const critMap = {};
    criteria.forEach(c => critMap[c.id] = c.name);

    const stats = {};
    questions.forEach(q => {
        const cName = critMap[q.criteria_id] || q.criteria_id;
        const sub = q.subsection;
        const key = `${cName} - ${sub}`;

        if (!stats[key]) {
            stats[key] = { coding: 0, theory: 0, total: 0 };
        }

        if (isCodingQuestion(q)) {
            stats[key].coding++;
        } else {
            stats[key].theory++;
        }
        stats[key].total++;
    });

    console.table(stats);
}

run();
