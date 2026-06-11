const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/admin/ManageQuestions.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace state defaults
content = content.replace(/subsection: 'computer_science'/g, "subsection: 'testing'");

// Replace sections array for download
content = content.replace(
    /\{ id: 'computer_science', name: 'Computer Science' \},\s*\{ id: 'logical_reasoning', name: 'Logical Reasoning' \},\s*\{ id: 'miscellaneous', name: 'Miscellaneous' \},\s*\{ id: 'grammar', name: 'Grammar' \},/g,
    `{ id: 'testing', name: 'Testing' },
                { id: 'api', name: 'API' },
                { id: 'logical', name: 'Logical Reasoning' },
                { id: 'agile', name: 'Agile' },
                { id: 'cs_basics', name: 'CS Basics' },
                { id: 'grammar', name: 'Grammar' },`
);

// Replace section initialization
content = content.replace(
    /computer_science: \[\],\s*logical_reasoning: \[\],\s*miscellaneous: \[\],\s*grammar: \[\]/g,
    `testing: [],
                        api: [],
                        logical: [],
                        agile: [],
                        cs_basics: [],
                        grammar: []`
);

// Replace mapping logic
content = content.replace(
    /\} else if \(subsection === 'computer_science'\) \{\s*acc\[key\]\.sections\.computer_science\.push\(q\);\s*\} else if \(subsection === 'logical_reasoning'\) \{\s*acc\[key\]\.sections\.logical_reasoning\.push\(q\);\s*\} else if \(subsection === 'miscellaneous'\) \{\s*acc\[key\]\.sections\.miscellaneous\.push\(q\);\s*\} else if \(subsection === 'grammar'\) \{\s*acc\[key\]\.sections\.grammar\.push\(q\);\s*\} else \{\s*acc\[key\]\.sections\.computer_science\.push\(q\);\s*\}/g,
    `} else if (subsection === 'testing') {
                acc[key].sections.testing.push(q);
            } else if (subsection === 'api') {
                acc[key].sections.api.push(q);
            } else if (subsection === 'logical') {
                acc[key].sections.logical.push(q);
            } else if (subsection === 'agile') {
                acc[key].sections.agile.push(q);
            } else if (subsection === 'cs_basics') {
                acc[key].sections.cs_basics.push(q);
            } else if (subsection === 'grammar') {
                acc[key].sections.grammar.push(q);
            } else {
                acc[key].sections.testing.push(q);
            }`
);

// Replace option dropdowns
content = content.replace(
    /<option value="computer_science" className="bg-\[#0b101b\]">Computer Science(?: \/ Software Testing)?<\/option>\s*<option value="logical_reasoning" className="bg-\[#0b101b\]">Logical Reasoning<\/option>\s*<option value="miscellaneous" className="bg-\[#0b101b\]">Miscellaneous<\/option>\s*<option value="grammar" className="bg-\[#0b101b\]">Grammar(?: \/ English)?<\/option>/g,
    `<option value="testing" className="bg-[#0b101b]">Testing</option>
                                            <option value="api" className="bg-[#0b101b]">API</option>
                                            <option value="logical" className="bg-[#0b101b]">Logical Reasoning</option>
                                            <option value="agile" className="bg-[#0b101b]">Agile</option>
                                            <option value="cs_basics" className="bg-[#0b101b]">CS Basics</option>
                                            <option value="grammar" className="bg-[#0b101b]">Grammar</option>`
);

// Replace total length logic
content = content.replace(
    /set\.sections\.computer_science\.length \+\s*set\.sections\.logical_reasoning\.length \+\s*set\.sections\.miscellaneous\.length \+\s*set\.sections\.grammar\.length/g,
    `set.sections.testing.length +
                                set.sections.api.length +
                                set.sections.logical.length +
                                set.sections.agile.length +
                                set.sections.cs_basics.length +
                                set.sections.grammar.length`
);

// Replace the render questions grid
content = content.replace(
    /\{ id: 'computer_science', label: 'Computer Science', shortLabel: 'CS', count: set\.sections\.computer_science\.length, questions: set\.sections\.computer_science, icon: <Code size=\{14\} \/>, color: 'blue' \},\s*\{ id: 'logical_reasoning', label: 'Logical Reasoning', shortLabel: 'LR', count: set\.sections\.logical_reasoning\.length, questions: set\.sections\.logical_reasoning, icon: <Cpu size=\{14\} \/>, color: 'purple' \},\s*\{ id: 'miscellaneous', label: 'Miscellaneous', shortLabel: 'Misc', count: set\.sections\.miscellaneous\.length, questions: set\.sections\.miscellaneous, icon: <Box size=\{14\} \/>, color: 'emerald' \},\s*\{ id: 'grammar', label: 'Grammar', shortLabel: 'Grammar', count: set\.sections\.grammar\.length, questions: set\.sections\.grammar, icon: <PenTool size=\{14\} \/>, color: 'rose' \},/g,
    `{ id: 'testing', label: 'Testing', shortLabel: 'Test', count: set.sections.testing.length, questions: set.sections.testing, icon: <Code size={14} />, color: 'blue' },
                                { id: 'api', label: 'API', shortLabel: 'API', count: set.sections.api.length, questions: set.sections.api, icon: <Cpu size={14} />, color: 'purple' },
                                { id: 'logical', label: 'Logical', shortLabel: 'Log', count: set.sections.logical.length, questions: set.sections.logical, icon: <Box size={14} />, color: 'emerald' },
                                { id: 'agile', label: 'Agile', shortLabel: 'Agl', count: set.sections.agile.length, questions: set.sections.agile, icon: <PenTool size={14} />, color: 'rose' },
                                { id: 'cs_basics', label: 'CS Basics', shortLabel: 'CS', count: set.sections.cs_basics.length, questions: set.sections.cs_basics, icon: <Code size={14} />, color: 'blue' },
                                { id: 'grammar', label: 'Grammar', shortLabel: 'Gram', count: set.sections.grammar.length, questions: set.sections.grammar, icon: <PenTool size={14} />, color: 'rose' },`
);


fs.writeFileSync(filePath, content);
console.log('ManageQuestions updated');
