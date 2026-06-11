const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('questions').select('*').eq('question_text', 'Select the');
  if (error) {
      console.error(error);
      return;
  }
  console.log('Found', data.length, 'truncated questions');
  
  for (let q of data) {
      const { data: updated, error: updError } = await supabase.from('questions')
          .update({ question_text: "Select the correct active voice equivalent: 'The letter was written by her.'" })
          .eq('id', q.id)
          .select();
      if (updError) console.error(updError);
      else console.log('Fixed', q.id);
  }
}
run();
