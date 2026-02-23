const url = "https://glkxyflalplqixfefexf.supabase.co/rest/v1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3h5ZmxhbHBscWl4ZmVmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQyMDgsImV4cCI6MjA4NjEzMDIwOH0.Ul-wp51Mx3SwV-FwxRm3mZrisoGfUTb_HmGgm25Eajc";

const headers = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
};

async function checkDetails() {
    try {
        const intRes = await fetch(`${url}/interviews?id=eq.7a318489-873e-4a4c-ba1e-fca320d8c29b&select=id,status,score,total_questions,criteria_id,scheduled_interview_id,criteria(name)`, { headers });
        const interviews = await intRes.json();
        console.log(JSON.stringify(interviews, null, 2));
    } catch (e) {
        console.error(e);
    }
}
checkDetails();
