
const fs = require('fs');

const lines = [
    "✅ Answer: C",
    "✅ Ans: A",
    "Answer: B",
    "-> Answer: D",
    "blah ✅ Ans: A" // Should NOT match if anchored to start with ^
];

const regex = /^(?:[✅\->\s]*)(?:Correct|Answer|Ans|Ans\.)[\s:]+([A-Da-d])/i;

let output = "";
lines.forEach(line => {
    const match = line.match(regex);
    output += `Line: "${line}"\nMatch: ${match ? JSON.stringify(match) : "NO MATCH"}\n\n`;
});

try {
    fs.writeFileSync('debug_output.txt', output);
    console.log("Wrote to debug_output.txt");
} catch (e) {
    console.error("Error writing file:", e);
}
