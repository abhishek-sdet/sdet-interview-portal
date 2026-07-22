import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !key) {
    throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env before running this script.');
}

const url = `${supabaseUrl}/rest/v1`;

const headers = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
};

async function fixLinkage() {
    try {
        // 1. Get drives
        const driveRes = await fetch(`${url}/scheduled_interviews?select=id,description&order=created_at.desc`, { headers });
        const drives = await driveRes.json();
        console.log("Drives:", drives.map(d => d.description));

        const testDrive = drives.find(d => d.description && d.description.toLowerCase().includes("test"));
        if (!testDrive) {
            console.log("No test drive found.");
            return;
        }
        console.log("Found Test Drive ID:", testDrive.id);

        // 2. Get the test user candidate ID
        const candRes = await fetch(`${url}/candidates?email=eq.test@example.com&select=id`, { headers });
        const candidates = await candRes.json();
        if (!candidates.length) {
            console.log("Candidate test@example.com not found.");
            return;
        }
        const candidateId = candidates[0].id;
        console.log("Found candidate ID:", candidateId);

        // 3. Get the interview for this candidate
        const intRes = await fetch(`${url}/interviews?candidate_id=eq.${candidateId}&select=id,scheduled_interview_id`, { headers });
        const interviews = await intRes.json();
        if (!interviews.length) {
            console.log("No interview found for test candidate.");
            return;
        }
        const interview = interviews[0];
        console.log("Found interview:", interview.id, "Current drive:", interview.scheduled_interview_id);

        if (interview.scheduled_interview_id !== testDrive.id) {
            console.log("Updating interview with active drive ID...");
            const updateRes = await fetch(`${url}/interviews?id=eq.${interview.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ scheduled_interview_id: testDrive.id })
            });
            const updated = await updateRes.json();
            console.log("Update result:", updated);
        } else {
            console.log("Interview is already linked to the test drive.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

fixLinkage();
