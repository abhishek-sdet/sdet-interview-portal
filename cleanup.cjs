const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Deleting ALL load test users and their interviews...');
    
    let deletedCount = 0;
    while (true) {
        // Find interviews for load test users
        const { data: interviews } = await supabase
            .from('interviews')
            .select('id, candidate_id, candidates!inner(id, full_name)')
            .like('candidates.full_name', 'Load Test User%')
            .limit(1000);
            
        if (!interviews || interviews.length === 0) {
            console.log('No more load test interviews found.');
            break;
        }
        
        console.log(`Found batch of ${interviews.length} interviews. Deleting...`);
        
        const interviewIds = interviews.map(i => i.id);
        const candidateIds = [...new Set(interviews.map(i => i.candidate_id))];
        
        // Batch delete interviews
        for (let i = 0; i < interviewIds.length; i += 200) {
            const chunk = interviewIds.slice(i, i + 200);
            const { error: iErr } = await supabase.from('interviews').delete().in('id', chunk);
            if (iErr) console.error('Error deleting interviews chunk:', iErr);
        }
        
        // Batch delete candidates
        for (let i = 0; i < candidateIds.length; i += 200) {
            const chunk = candidateIds.slice(i, i + 200);
            const { error: cErr } = await supabase.from('candidates').delete().in('id', chunk);
            if (cErr) console.error('Error deleting candidates chunk:', cErr);
        }
        
        deletedCount += interviews.length;
    }
    
    console.log(`Successfully completely removed ${deletedCount} load test records!`);
}
run();
