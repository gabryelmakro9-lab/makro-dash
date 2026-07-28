import fs from 'fs';
const content = fs.readFileSync('./node_modules/jspdf/dist/jspdf.es.min.js', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);
lines.forEach((line, i) => {
  console.log(`Line ${i+1}: length=${line.length}`);
  if (line.length > 1000) {
    console.log(`  First 100: ${line.substring(0, 100)}`);
    console.log(`  Last 100: ${line.substring(line.length - 100)}`);
    // Check for unusual patterns
    if (line.includes('">')) console.log('  Contains ">');
    if (line.includes("'>")) console.log("  Contains '>");
  }
});
