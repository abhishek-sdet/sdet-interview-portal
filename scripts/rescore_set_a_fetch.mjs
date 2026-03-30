// Rescore Set A interviews using raw fetch
// Run with: node scripts/rescore_set_a_fetch.mjs

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = resolve(__dirname, '../.env');
const env = {};
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const t = line.trim();
    const i = t.indexOf('=');
    if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
});

const BASE = env.VITE_SUPABASE_URL + '/rest/v1';
const KEY  = env.VITE_SUPABASE_ANON_KEY;

const headers = {
    'apikey': KEY,
    'Authorization': `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
};

async function get(table, params = '') {
    const url = `${BASE}/${table}?${params}`;
    const res = await fetch(url, { headers: { ...headers, 'Prefer': 'return=representation' } });
    if (!res.ok) throw new Error(`GET ${table} failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function patch(table, id, body) {
    const url = `${BASE}/${table}?id=eq.${id}`;
    const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`PATCH ${table}/${id} failed: ${res.status} ${await res.text()}`);
}

async function main() {
    console.log('\n========== RESCORE SET A INTERVIEWS (ROBUST) ==========\n');
    console.log('Supabase URL:', env.VITE_SUPABASE_URL);

    // 1. Fetch all completed interviews
    // We check question_set column directly
    const interviews = await get('interviews', 'status=eq.completed&select=id,score,total_questions,passed,metadata,criteria_id,question_set');
    console.log(`Total completed interviews fetched: ${interviews.length}`);

    // Filter for Set A
    const setA = interviews.filter(i => 
        i.question_set === 'Set A' || 
        i.metadata?.set === 'Set A' || 
        i.metadata?.question_set === 'Set A'
    );
    console.log(`\nSet A interviews identified: ${setA.length}`);

    if (setA.length === 0) {
        console.log('\nCould not find any Set A interviews. Displaying metadata/question_set of first 5:');
        interviews.slice(0, 5).forEach(i => 
            console.log(`  [${i.id}] question_set="${i.question_set}" metadata=${JSON.stringify(i.metadata)}`)
        );
        return;
    }

    // 2. Fetch all questions with their category and correct answer
    const questions = await get('questions', 'select=id,correct_answer,category');
    const correctMap = Object.fromEntries(questions.map(q => [q.id, q.correct_answer]));
    console.log(`Correct answer map loaded for ${questions.length} questions.`);

    // 3. Re-score each Set A interview
    for (const interview of setA) {
        // Fetch passing percentage for this interview's criteria
        const [crit] = await get('criteria', `id=eq.${interview.criteria_id}&select=passing_percentage`);
        const passingPct = crit?.passing_percentage ?? 70;

        const answers = await get('answers', `interview_id=eq.${interview.id}&select=id,question_id,selected_answer,is_correct`);

        if (!answers.length) {
            console.log(`\n[${interview.id}] No answers found, skipping.`);
            continue;
        }

        const total = answers.length;
        let newScore = 0;
        let updatesCount = 0;

        for (const ans of answers) {
            const correct = correctMap[ans.question_id];
            if (correct === undefined) continue;
            
            const nowCorrect = ans.selected_answer === correct;
            if (nowCorrect) newScore++;

            if (nowCorrect !== ans.is_correct) {
                await patch('answers', ans.id, { is_correct: nowCorrect });
                updatesCount++;
            }
        }

        const percentage = total > 0 ? (newScore / total) * 100 : 0;
        const passed = percentage >= passingPct;

        console.log(`\nInterview ID: ${interview.id}`);
        console.log(`  Old Score: ${interview.score}/${interview.total_questions} (Passed: ${interview.passed})`);
        console.log(`  New Score: ${newScore}/${total} (${percentage.toFixed(1)}%) (Passed: ${passed})`);
        console.log(`  Answers updated: ${updatesCount}`);

        await patch('interviews', interview.id, {
            score: newScore,
            total_questions: total,
            passed
        });
        console.log(`  ✅ Record updated in DB.`);
    }

    console.log('\n' + '='.repeat(55));
    console.log('RESCORE COMPLETE');
    console.log('='.repeat(55) + '\n');
}

main().catch(err => { console.error('❌ Fatal Error:', err.message); process.exit(1); });
