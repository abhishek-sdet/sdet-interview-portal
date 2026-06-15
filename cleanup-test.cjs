const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Testing delete with small batch...');
    
    const { data: candidates } = await supabase
        .from('candidates')
        .select('id')
        .like('full_name', 'Load Test User%')
        .limit(5);
        
    if (!candidates || candidates.length === 0) {
        console.log('No test candidates found.');
        return;
    }
    
    console.log(`Found ${candidates.length} candidates. Deleting ID: ${candidates[0].id}`);
    
    const { data, error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidates[0].id)
        .select();
        
    console.log('Delete result:', { data, error });
}
run();
