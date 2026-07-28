import fs from 'fs';

const buf = fs.readFileSync('./js/pdf.js');
const content = buf.toString('utf8');
const lines = content.split('\n');
const logoLine = lines[6];

// Check the last 100 bytes of the line
console.log('Line length:', logoLine.length);
const lastPart = logoLine.substring(logoLine.length - 50);
console.log('Last 50 chars:', JSON.stringify(lastPart));
console.log('Char codes:', [...lastPart].map(c => c.charCodeAt(0)).join(' '));

// Also check raw buffer at that position
const lineStart = content.indexOf(logoLine);
const rawEnd = buf.slice(lineStart + logoLine.length - 50, lineStart + logoLine.length + 5);
console.log('Raw bytes around end:', Array.from(rawEnd).join(' '));

// Check for null bytes
for (let i = 0; i < buf.length; i++) {
  if (buf[i] === 0) {
    console.log('NULL byte at position', i);
    console.log('Context:', buf.toString('utf8', Math.max(0, i - 20), Math.min(buf.length, i + 20)));
  }
}
