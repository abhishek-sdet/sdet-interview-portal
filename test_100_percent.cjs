const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test100Percent() {
    console.log("Starting 100% score test...");
    
    // 0. Auth as a random user to get authenticated role
    const testEmail = `test${Date.now()}@example.com`;
    const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: testEmail,
        password: 'password123'
    });
    
    if (authErr) {
        console.error("Auth error:", authErr);
        // Sometimes signup requires email confirmation, let's just sign in if possible or use a known user?
        // Let's try to proceed anyway, maybe it works if auto-confirm is on.
    }
    
    // 1. Get criteria
    const { data: criteria, error: critErr } = await supabase
        .from('criteria')
        .select('*')
        .eq('name', 'Functional Assessment')
        .single();
        
    if (critErr || !criteria) {
        console.error("Criteria error:", critErr);
        return;
    }
    console.log("Found Criteria:", criteria.name);

    // 2. Get all questions
    const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('criteria_id', criteria.id)
        .eq('is_active', true);
        
    if (qErr) {
        console.error("Questions error:", qErr);
        return;
    }
    console.log(`Found ${questions.length} questions.`);

    // 3. Create candidate
    const { data: candidate, error: candErr } = await supabase
        .from('candidates')
        .insert([{ full_name: 'Test 100 Percent', email: 'test100@example.com', phone: '1234567890' }])
        .select()
        .single();
        
    if (candErr) {
        console.error("Candidate error:", candErr);
        return;
    }
    console.log("Created Candidate:", candidate.id);

    // 4. Create interview
    const { data: interview, error: intErr } = await supabase
        .from('interviews')
        .insert([{ candidate_id: candidate.id, criteria_id: criteria.id, status: 'in_progress' }])
        .select()
        .single();
        
    if (intErr) {
        console.error("Interview error:", intErr);
        return;
    }
    console.log("Created Interview:", interview.id);

    // 5. Prepare answers (100% correct)
    const answers = questions.map(q => ({
        question_id: q.id,
        selected_answer: q.correct_answer
    }));

    // 6. Submit quiz
    const { data: result, error: submitErr } = await supabase.rpc('submit_and_grade_quiz', {
        p_interview_id: interview.id,
        p_answers: answers,
        p_device_id: 'test-device-id',
        p_question_set: 'Set',
        p_auto_submitted: false,
        p_auto_submit_reason: null
    });

    if (submitErr) {
        console.error("Submit error:", submitErr);
        return;
    }
    
    console.log("=== SUBMISSION RESULT ===");
    console.log(result);
}

test100Percent();
