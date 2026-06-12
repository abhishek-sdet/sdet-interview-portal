import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

// Helper to simulate selectQuestions
const selectQuestions = (arr, count) => arr.slice(0, count);

// Helper to simulate selectElectiveMix
const isCodingQuestion = (q) => {
    const text = (q.question_text || '').toLowerCase();
    if (text.includes('```')) return true;
    if (text.includes('public class') || text.includes('system.out.print') || text.includes('public static void main')) return true;
    if (text.includes('def ') || text.includes('print(')) return true;
    if (text.includes('select ') && text.includes(' from ')) return true;
    if (text.includes('output of') || text.includes('following code')) return true;
    if (text.includes(';') && text.includes('{') && text.includes('}')) return true;
    return false;
};

const selectElectiveMix = (availableQs, count) => {
    const codingQs = availableQs.filter(isCodingQuestion);
    const theoryQs = availableQs.filter(q => !isCodingQuestion(q));

    const codingCount = Math.round(count * 0.6);
    const theoryCount = count - codingCount;

    let selectedCoding = codingQs.slice(0, codingCount);
    let selectedTheory = theoryQs.slice(0, theoryCount);

    if (selectedCoding.length < codingCount) {
        const remainingTheoryNeeded = count - selectedCoding.length;
        selectedTheory = theoryQs.slice(0, remainingTheoryNeeded);
    } else if (selectedTheory.length < theoryCount) {
        const remainingCodingNeeded = count - selectedTheory.length;
        selectedCoding = codingQs.slice(0, remainingCodingNeeded);
    }

    return [...selectedCoding, ...selectedTheory];
};

async function run() {
    const criteriaId = '45449849-d853-4de8-968b-ce8ac7a7e0d9'; // Experienced
    const selectedSubject = 'java';

    // 1. Fetch criteria
    const { data: criteriaMetaData, error: criteriaMetaError } = await supabase
        .from('criteria')
        .select('metadata')
        .eq('id', criteriaId)
        .maybeSingle();

    const moduleCounts = criteriaMetaData?.metadata?.module_counts || {
        testing: 10,
        api: 4,
        logical: 3,
        agile: 2,
        cs_basics: 2,
        grammar: 2,
        javascript: 2,
        elective: 7
    };

    console.log('Fetched module_counts:', moduleCounts);

    const expectedGeneralTotal = moduleCounts.testing + moduleCounts.api + moduleCounts.logical + moduleCounts.agile + moduleCounts.cs_basics + moduleCounts.grammar + (moduleCounts.javascript || 0);
    console.log('expectedGeneralTotal:', expectedGeneralTotal);

    // 2. Fetch all active questions for criteria
    const { data, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .eq('criteria_id', criteriaId)
        .eq('is_active', true)
        .order('created_at');

    if (fetchError) {
        console.error('Fetch error:', fetchError);
        return;
    }

    console.log('Total questions fetched from DB:', data.length);

    // Deduplicate
    let uniqueData = Array.from(
        new Map(data.map(q => [(q.question_text || '').trim().toLowerCase(), q])).values()
    );
    console.log('After deduplication:', uniqueData.length);

    // Flexible mapping
    uniqueData = uniqueData.map(q => {
        let mappedSub = q.subsection ? q.subsection.toLowerCase() : 'testing';
        if (mappedSub.includes('agile')) mappedSub = 'agile';
        else if (mappedSub.includes('api')) mappedSub = 'api';
        else if (mappedSub.includes('logical')) mappedSub = 'logical';
        else if (mappedSub.includes('grammar') || mappedSub.includes('communication')) mappedSub = 'grammar';
        else if (mappedSub.includes('cs') || mappedSub.includes('computer')) mappedSub = 'cs_basics';
        else if (mappedSub.includes('javascript') || mappedSub.includes('js')) mappedSub = 'javascript';
        else if (mappedSub.includes('java')) mappedSub = 'java';
        else if (mappedSub.includes('python')) mappedSub = 'python';
        else if (mappedSub.includes('database') || mappedSub.includes('sql')) mappedSub = 'database';
        else mappedSub = 'testing';
        return { ...q, subsection: mappedSub };
    });

    // Categorize
    let generalQs = uniqueData.filter(q => {
        const isJS = q.subsection === 'javascript';
        const isGeneral = q.section === 'general' || !q.section || isJS;
        return isGeneral;
    });

    let electiveQs = uniqueData.filter(q => {
        const isJS = q.subsection === 'javascript';
        const isElective = q.section === 'elective' && !isJS;
        return isElective;
    });

    console.log('generalQs count:', generalQs.length);
    console.log('electiveQs count:', electiveQs.length);

    const selectedElectiveQs = electiveQs.filter(q => q.subsection === selectedSubject);
    console.log('selectedElectiveQs count:', selectedElectiveQs.length);

    let testingQs = selectQuestions(generalQs.filter(q => q.subsection === 'testing'), moduleCounts.testing);
    let apiQs = selectQuestions(generalQs.filter(q => q.subsection === 'api'), moduleCounts.api);
    let logicalQs = selectQuestions(generalQs.filter(q => q.subsection === 'logical'), moduleCounts.logical);
    let agileQs = selectQuestions(generalQs.filter(q => q.subsection === 'agile'), moduleCounts.agile);
    let csBasicsQs = selectQuestions(generalQs.filter(q => q.subsection === 'cs_basics'), moduleCounts.cs_basics);
    let grammarQs = selectQuestions(generalQs.filter(q => q.subsection === 'grammar'), moduleCounts.grammar);
    let javascriptQs = selectQuestions(generalQs.filter(q => q.subsection === 'javascript'), moduleCounts.javascript || 0);

    console.log('testingQs count selected:', testingQs.length);
    console.log('apiQs count selected:', apiQs.length);
    console.log('logicalQs count selected:', logicalQs.length);
    console.log('agileQs count selected:', agileQs.length);
    console.log('csBasicsQs count selected:', csBasicsQs.length);
    console.log('grammarQs count selected:', grammarQs.length);
    console.log('javascriptQs count selected:', javascriptQs.length);

    let currentTotal = testingQs.length + apiQs.length + logicalQs.length + agileQs.length + csBasicsQs.length + grammarQs.length + javascriptQs.length;
    console.log('currentTotal before padding:', currentTotal);

    if (currentTotal < expectedGeneralTotal) {
        const missing = expectedGeneralTotal - currentTotal;
        console.log(`Padded with ${missing} testing questions`);
        const testingAvailable = generalQs.filter(q => q.subsection === 'testing' && !testingQs.includes(q));
        const pad = selectQuestions(testingAvailable, missing);
        testingQs = [...testingQs, ...pad];
        
        currentTotal = testingQs.length + apiQs.length + logicalQs.length + agileQs.length + csBasicsQs.length + grammarQs.length + javascriptQs.length;
        console.log('currentTotal after padding 1:', currentTotal);
        if (currentTotal < expectedGeneralTotal) {
            const missingMore = expectedGeneralTotal - currentTotal;
            console.log(`Padded with ${missingMore} logical questions`);
            const logicalAvailable = generalQs.filter(q => q.subsection === 'logical' && !logicalQs.includes(q));
            const padMore = selectQuestions(logicalAvailable, missingMore);
            logicalQs = [...logicalQs, ...padMore];
        }
    }

    const orderedGeneralQs = [
        ...testingQs,
        ...apiQs,
        ...logicalQs,
        ...agileQs,
        ...csBasicsQs,
        ...grammarQs,
        ...javascriptQs
    ];

    console.log('Final orderedGeneralQs count:', orderedGeneralQs.length);

    const electiveRef = selectElectiveMix(selectedElectiveQs, moduleCounts.elective);
    console.log('Selected electiveRef count:', electiveRef.length);

    const finalQuestions = [...orderedGeneralQs, ...electiveRef];
    console.log('Final questions length:', finalQuestions.length);
}

run();
