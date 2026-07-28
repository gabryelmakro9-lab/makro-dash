import fs from 'fs';

let content = fs.readFileSync('./js/pdf.js', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('LOGO_BASE64'));
console.log('LOGO_BASE64 line:', idx);
const line = lines[idx];
console.log('Line length:', line.length);

// Find the problematic end
// The line should end with "; but it ends with ">
const lastChars = line.slice(-10);
console.log('Last 10 chars:', JSON.stringify(lastChars));
console.log('Char codes:', [...lastChars].map(c => c.charCodeAt(0)).join(' '));

// Fix: replace "> at the end of the base64 string with just "
// Find the last quote position
const lastQuote = line.lastIndexOf('"');
console.log('Last double quote at position:', lastQuote);
console.log('Character at lastQuote:', JSON.stringify(line[lastQuote]));

// The fix: the line currently has "...P8B">;\r
// It should have "...P8B";\r
// So we need to remove the '>'
if (line.includes('">;')) {
  const fixed = line.replace('">;', '";');
  lines[idx] = fixed;
  content = lines.join('\n');
  fs.writeFileSync('./js/pdf.js', content, 'utf8');
  console.log('Fixed: replaced ">; with ";');
  
  // Verify
  const verify = fs.readFileSync('./js/pdf.js', 'utf8');
  const vLine = verify.split('\n')[idx];
  console.log('Last 10 chars after fix:', JSON.stringify(vLine.slice(-10)));
} else {
  console.log('Pattern ">; not found. Looking for alternatives...');
  // Try more specific search
  const match = line.match(/P8B["][>][;]/);
  if (match) {
    console.log('Found match:', JSON.stringify(match[0]));
  }
}
