const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://glkxyflalplqixfefexf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3h5ZmxhbHBscWl4ZmVmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQyMDgsImV4cCI6MjA4NjEzMDIwOH0.Ul-wp51Mx3SwV-FwxRm3mZrisoGfUTb_HmGgm25Eajc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSettings() {
  console.log('Fetching settings...');
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('allow_screenshots, proctoring_auto_submit, enforce_full_screen')
      .single();

    if (error) {
      console.error('Error fetching site settings:', error);
      process.exit(1);
    }

    console.log('SETTINGS_RESULT:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Exception:', err);
    process.exit(1);
  }
}

checkSettings();
