import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const email = 'test@test.com';
    let log = `DETAILED DIAGNOSTIC FOR: ${email}\n`;
    log += `Time: ${new Date().toISOString()}\n\n`;

    // 1. Check all candidates with this email
    const { data: candidates, error: cError } = await supabase
        .from('candidates')
        .select('*')
        .eq('email', email);

    if (cError) {
        log += `ERROR FETCHING CANDIDATE: ${JSON.stringify(cError)}\n`;
    } else {
        log += `CANDIDATES FOUND: ${candidates.length}\n`;
        log += JSON.stringify(candidates, null, 2) + '\n\n';

        for (const candidate of candidates) {
            log += `--- INTERVIEWS FOR CANDIDATE ${candidate.id} ---\n`;
            // 2. Fetch all interviews without any filters
            const { data: interviews, error: iError } = await supabase
                .from('interviews')
                .select('*')
                .eq('candidate_id', candidate.id);

            if (iError) {
                log += `ERROR FETCHING INTERVIEWS: ${JSON.stringify(iError)}\n`;
            } else {
                log += `INTERVIEWS FOUND: ${interviews.length}\n`;
                for (const interview of interviews) {
                    log += `Interview ID: ${interview.id}\n`;
                    log += `Status: ${interview.status}\n`;
                    log += `Scheduled Interview ID: ${interview.scheduled_interview_id} (Type: ${typeof interview.scheduled_interview_id})\n`;
                    
                    if (interview.scheduled_interview_id) {
                        // 3. Check if the drive still exists
                        const { data: drive, error: dError } = await supabase
                            .from('scheduled_interviews')
                            .select('*')
                            .eq('id', interview.scheduled_interview_id)
                            .maybeSingle();
                        
                        if (dError) {
                            log += `  ERROR FETCHING DRIVE: ${JSON.stringify(dError)}\n`;
                        } else if (!drive) {
                            log += `  DRIVE STATUS: DELETED (Dangling Reference!)\n`;
                        } else {
                            log += `  DRIVE STATUS: EXISTS (${drive.description})\n`;
                            log += `  DRIVE ACTIVE: ${drive.is_active}\n`;
                        }
                    }
                    log += '---\n';
                }
            }
            log += '\n';
        }
    }

    // 4. Check active drives today (as LandingPage does)
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    log += `--- ACTIVE DRIVES TODAY (${today}) ---\n`;
    const { data: activeDrives, error: adError } = await supabase
        .from('scheduled_interviews')
        .select('*')
        .eq('is_active', true)
        .eq('scheduled_date', today);
    
    if (adError) {
        log += `ERROR FETCHING ACTIVE DRIVES: ${JSON.stringify(adError)}\n`;
    } else {
        log += `ACTIVE DRIVES: ${activeDrives.length}\n`;
        log += JSON.stringify(activeDrives, null, 2) + '\n';
    }

    fs.writeFileSync('detailed_login_diagnostic.txt', log);
    console.log('Diagnostic report written to detailed_login_diagnostic.txt');
}

run().catch(err => {
    fs.appendFileSync('detailed_login_diagnostic.txt', '\nFATAL ERROR:\n' + err.stack);
});
