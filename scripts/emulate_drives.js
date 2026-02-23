const url = "https://glkxyflalplqixfefexf.supabase.co/rest/v1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3h5ZmxhbHBscWl4ZmVmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQyMDgsImV4cCI6MjA4NjEzMDIwOH0.Ul-wp51Mx3SwV-FwxRm3mZrisoGfUTb_HmGgm25Eajc";

const headers = {
    "apikey": key,
    "Authorization": `Bearer ${key}`
};

async function emulate() {
    // 1. Fetch drives
    const drivesRes = await fetch(`${url}/scheduled_interviews?select=id,description&order=scheduled_date.desc`, { headers });
    const drivesData = await drivesRes.json();

    // 2. Fetch interviews mapped to drives
    const driveIds = drivesData.map(d => d.id).join(',');
    const intRes = await fetch(`${url}/interviews?scheduled_interview_id=in.(${driveIds})&select=id,scheduled_interview_id,status,score,total_questions,criteria_id,criteria(name,passing_percentage)`, { headers });
    const interviewsData = await intRes.json();

    const drivesWithStats = drivesData.map(drive => {
        const driveInterviews = interviewsData.filter(i => i.scheduled_interview_id === drive.id);
        const fresherInterviews = driveInterviews.filter(i => i.criteria && i.criteria.name && i.criteria.name.toLowerCase().includes('fresher'));

        return {
            name: drive.description,
            id: drive.id,
            total_attempted: driveInterviews.length,
            fresher_count: fresherInterviews.length,
            statusArray: driveInterviews.map(i => i.status)
        };
    });

    console.log(JSON.stringify(drivesWithStats, null, 2));
}
emulate();
