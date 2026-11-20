// Prints a compact map of docs/index.html so a run can find code without reading the 4,000-line file.
// Usage: node tests/codemap.js            (section index)
//        node tests/codemap.js <word>     (lines that define or mention <word>, max 25)
const fs = require("fs"), path = require("path");
const lines = fs.readFileSync(path.join(__dirname, "..", "docs", "index.html"), "utf8").split("\n");
const word = process.argv[2];
if (word) {
  let n = 0;
  lines.forEach((l, i) => { if (n < 25 && l.toLowerCase().includes(word.toLowerCase())) { console.log(`${i + 1}: ${l.trim().slice(0, 140)}`); n++; } });
} else {
  console.log(`docs/index.html: ${lines.length} lines. Sections (line: title). Use Read with offset/limit around a line, or: node tests/codemap.js <word>`);
  lines.forEach((l, i) => { const m = l.match(/^\/\* -{3,} (.+?) -{3,} \*\//); if (m) console.log(`${i + 1}: ${m[1]}`); });
  const fns = []; lines.forEach((l, i) => { const m = l.match(/^(?:async )?function (\w+)/); if (m) fns.push(`${m[1]}@${i + 1}`); });
  console.log(`\n${fns.length} functions: ` + fns.join(" "));
}
