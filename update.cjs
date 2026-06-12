const fs = require('fs');
let content = fs.readFileSync('src/pages/interview/QuizInterface.jsx', 'utf8');

content = content.replace(/const databaseQuestionsRef = useRef\(\[\]\);/g, "const databaseQuestionsRef = useRef([]);\n    const javascriptQuestionsRef = useRef([]);");

content = content.replace(/else if \(mappedSub\.includes\('python'\)\) mappedSub = 'python';/g, "else if (mappedSub.includes('python')) mappedSub = 'python';\n                else if (mappedSub.includes('javascript') || mappedSub.includes('js')) mappedSub = 'javascript';");

content = content.replace(/} else if \(selectedSubject === 'database'\) \{\n\s*databaseQuestionsRef\.current = electiveRef;\n\s*}/g, "} else if (selectedSubject === 'database') {\n                    databaseQuestionsRef.current = electiveRef;\n                } else if (selectedSubject === 'javascript') {\n                    javascriptQuestionsRef.current = electiveRef;\n                }");

content = content.replace(/databaseQuestionsRef\.current = selectQuestions\(electiveQs\.filter\(q => q\.subsection === 'database'\), moduleCounts\.elective\);/g, "databaseQuestionsRef.current = selectQuestions(electiveQs.filter(q => q.subsection === 'database'), moduleCounts.elective);\n                javascriptQuestionsRef.current = selectElectiveMix(electiveQs.filter(q => q.subsection === 'javascript'), moduleCounts.elective);");

content = content.replace(/selectedSubject === 'python' \? pythonQuestionsRef\.current :/g, "selectedSubject === 'python' ? pythonQuestionsRef.current :\n                                 selectedSubject === 'javascript' ? javascriptQuestionsRef.current :");

content = content.replace(/if \(placeholders\.length < moduleCounts\.elective && \(databaseQuestionsRef\.current \|\| \[\]\)\.length > placeholders\.length\) \{\n\s*placeholders = databaseQuestionsRef\.current;\n\s*\}/g, "if (placeholders.length < moduleCounts.elective && (databaseQuestionsRef.current || []).length > placeholders.length) {\n                    placeholders = databaseQuestionsRef.current;\n                }\n                if (placeholders.length < moduleCounts.elective && (javascriptQuestionsRef.current || []).length > placeholders.length) {\n                    placeholders = javascriptQuestionsRef.current;\n                }");

content = content.replace(/type === 'Python' \? pythonQuestionsRef\.current : databaseQuestionsRef\.current/g, "type === 'Python' ? pythonQuestionsRef.current : type === 'JavaScript' ? javascriptQuestionsRef.current : databaseQuestionsRef.current");

content = content.replace(/question\.subsection === 'python' \? 'Python' : 'Database'/g, "question.subsection === 'python' ? 'Python' : question.subsection === 'javascript' ? 'JavaScript' : 'Database'");

fs.writeFileSync('src/pages/interview/QuizInterface.jsx', content);
console.log('QuizInterface updated');
