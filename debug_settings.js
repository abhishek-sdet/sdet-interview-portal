
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://glkxyflalplqixfefexf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3h5ZmxhbHBscWl4ZmVmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQyMDgsImV4cCI6MjA4NjEzMDIwOH0.Ul-wp51Mx3SwV-FwxRm3mZrisoGfUTb_HmGgm25Eajc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
    try {
        console.log('Fetching site_settings...');
        const { data, error } = await supabase
            .from('site_settings')
            .select('*');
        
        if (error) {
            console.error('Supabase Error:', error);
            return;
        }
        
        console.log('Found', data.length, 'rows');
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Runtime Error:', err);
    }
}

checkSettings();
