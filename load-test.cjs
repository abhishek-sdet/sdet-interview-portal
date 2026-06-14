const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables
const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function runLoadTest(numUsers) {
    console.log(`\n🚀 Starting Load Test for ${numUsers} concurrent users...`);

    // 1. Get Active Drive
    const { data: drives } = await supabase.from('scheduled_interviews').select('*').eq('is_active', true);
    if (!drives || drives.length === 0) {
        console.error("❌ No active drive found! Please create and activate a drive from the Admin Panel first.");
        return;
    }
    const drive = drives[0];
    console.log(`📌 Target Drive: ${drive.description} (ID: ${drive.id})`);

    // 2. Get a Criteria (Assuming Fresher)
    const { data: criteria } = await supabase.from('criteria').select('*').limit(1);
    if (!criteria || criteria.length === 0) {
        console.error("❌ No criteria found! Please ensure criteria exist.");
        return;
    }
    const criterion = criteria[0];
    console.log(`📌 Target Criteria: ${criterion.name}\n`);

    const promises = [];
    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;

    console.log(`⏳ Firing ${numUsers * 2} database queries concurrently...`);

    // Launch all simulated users at the exact same time
    for (let i = 0; i < numUsers; i++) {
        promises.push((async () => {
            try {
                const userStr = `loadtest_${Date.now()}_${i}`;
                
                // STEP 1: Simulate user submitting the registration form
                const { data: candidate, error: cErr } = await supabase.from('candidates').insert({
                    full_name: `Load Test User ${i}`,
                    email: `${userStr}@example.com`,
                    phone: `999000${String(i).padStart(4, '0')}`
                }).select().single();

                if (cErr) throw cErr;

                // STEP 2: Simulate user finishing the exam and submitting results
                const { error: iErr } = await supabase.from('interviews').insert({
                    candidate_id: candidate.id,
                    criteria_id: criterion.id,
                    scheduled_interview_id: drive.id,
                    status: 'completed',
                    score: Math.floor(Math.random() * 100), // Random score
                    total_questions: 10,
                    started_at: new Date().toISOString(),
                    completed_at: new Date().toISOString()
                });

                if (iErr) throw iErr;

                successCount++;
            } catch (err) {
                failCount++;
                console.error(`User ${i} Failed:`, err.message);
            }
        })());
    }

    // Wait for all concurrent operations to finish
    await Promise.all(promises);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Load Test Completed in ${duration} seconds!`);
    console.log(`📊 SUCCESS: ${successCount} candidates successfully completed the exam.`);
    if (failCount > 0) {
        console.log(`❌ FAILED: ${failCount} candidates hit an error (bottleneck).`);
    } else {
        console.log(`🎉 0 Errors! The database handled the load perfectly.`);
    }
    console.log(`\nYou can now go to your Admin Dashboard, select "${drive.description}", and you will see all ${successCount} candidates!`);
    console.log(`(Remember to use the "Reset" button to clear this dummy data later.)\n`);
}

// Get the number of users from the command line argument (default to 100)
const args = process.argv.slice(2);
const num = parseInt(args[0]) || 100;

runLoadTest(num);
