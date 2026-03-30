// ============================================================
// Rescore Set A Interviews (ESM version)
// Re-evaluates answers for Set A interviews using the latest
// correct_answer values, then updates score/passed in DB.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ───────────────────────────────────────────────
const envPath = resolve(__dirname, '../.env');
const env = {};
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    const idx = trimmed.indexOf('=');
    if (idx > 0) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function rescoreSetA() {
    console.log('\n========== RESCORE SET A INTERVIEWS ==========\n');

    // ── 1. Load all completed interviews ────────────────────
    const { data: allInterviews, error: intErr } = await supabase
        .from('interviews')
        .select('id, score, total_questions, passed, metadata, criteria_id')
        .eq('status', 'completed');

    if (intErr) { console.error('Error fetching interviews:', intErr); process.exit(1); }

    console.log(`Total completed interviews: ${allInterviews.length}`);

    // Debug: show all unique metadata.set / metadata.question_set values
    const setValues = [...new Set(allInterviews.map(i => i.metadata?.set || i.metadata?.question_set || '(none)'))];
    console.log('Metadata "set" values found:', setValues);

    const setAInterviews = allInterviews.filter(i =>
        i.metadata?.set === 'Set A' || i.metadata?.question_set === 'Set A'
    );

    console.log(`\nSet A interviews found: ${setAInterviews.length}`);

    if (setAInterviews.length === 0) {
        console.log('\nNo Set A interviews. Sample metadata from first 5 records:');
        allInterviews.slice(0, 5).forEach(i =>
            console.log(`  ID: ${i.id} → metadata: ${JSON.stringify(i.metadata)}`)
        );
        process.exit(0);
    }

    // ── 2. Load current correct answers ─────────────────────
    const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('id, correct_answer');

    if (qErr) { console.error('Error fetching questions:', qErr); process.exit(1); }

    const correctMap = {};
    questions.forEach(q => { correctMap[q.id] = q.correct_answer; });
    console.log(`Loaded correct answers for ${questions.length} questions.\n`);

    // ── 3. Get passing threshold from criteria ───────────────
    const criteriaId = setAInterviews[0].criteria_id;
    const { data: crit } = await supabase
        .from('criteria')
        .select('passing_percentage, name')
        .eq('id', criteriaId)
        .maybeSingle();

    const passingPct = crit?.passing_percentage ?? 70;
    console.log(`Criteria: "${crit?.name}" | Passing threshold: ${passingPct}%\n`);
    console.log('─'.repeat(50));

    // ── 4. Re-score each interview ───────────────────────────
    for (const interview of setAInterviews) {
        const { data: answers, error: aErr } = await supabase
            .from('answers')
            .select('id, question_id, selected_answer, is_correct')
            .eq('interview_id', interview.id);

        if (aErr) {
            console.error(`  ⚠️  Error fetching answers for interview ${interview.id}:`, aErr);
            continue;
        }

        if (!answers || answers.length === 0) {
            console.log(`Interview ${interview.id}: no answers found, skipping.`);
            continue;
        }

        const total = answers.length;
        let newScore = 0;
        const answerUpdates = [];

        answers.forEach(ans => {
            const correctAns = correctMap[ans.question_id];
            if (correctAns === undefined) return; // question deleted
            const isNowCorrect = ans.selected_answer === correctAns;
            if (isNowCorrect) newScore++;
            if (isNowCorrect !== ans.is_correct) {
                answerUpdates.push({ id: ans.id, is_correct: isNowCorrect });
            }
        });

        const newPct  = total > 0 ? (newScore / total) * 100 : 0;
        const newPassed = newPct >= passingPct;

        console.log(`\nInterview: ${interview.id}`);
        console.log(`  OLD → score: ${interview.score}/${interview.total_questions}  passed: ${interview.passed}`);
        console.log(`  NEW → score: ${newScore}/${total} (${newPct.toFixed(1)}%)  passed: ${newPassed}`);
        console.log(`  Answer rows with changed is_correct: ${answerUpdates.length}`);

        // 4a. Update is_correct flags in answers table
        for (const upd of answerUpdates) {
            const { error: updAErr } = await supabase
                .from('answers')
                .update({ is_correct: upd.is_correct })
                .eq('id', upd.id);
            if (updAErr) console.error(`    ⚠️  Failed to update answer ${upd.id}:`, updAErr);
        }

        // 4b. Update score / passed in interviews table
        const { error: updIErr } = await supabase
            .from('interviews')
            .update({ score: newScore, total_questions: total, passed: newPassed })
            .eq('id', interview.id);

        if (updIErr) {
            console.error(`  ❌ Failed to update interview ${interview.id}:`, updIErr);
        } else {
            console.log(`  ✅ Updated successfully.`);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('RESCORE COMPLETE');
    console.log('='.repeat(50) + '\n');
}

rescoreSetA().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
