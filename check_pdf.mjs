import fs from 'fs';

const content = fs.readFileSync('./js/pdf.js', 'utf8');
const lines = content.split('\n');
const logoLine = lines[6];

console.log('LOGO_BASE64 line length:', logoLine.length);

const start = logoLine.indexOf('"');
const end = logoLine.lastIndexOf('"');
if (start !== -1 && end !== -1 && start < end) {
  const base64str = logoLine.substring(start + 1, end);
  console.log('Base64 string length:', base64str.length);
  console.log('First 20 chars:', base64str.substring(0, 20));
  console.log('Last 20 chars:', base64str.substring(base64str.length - 20));
  
  // Check for non-Base64 characters
  const problems = [];
  for (let i = 0; i < base64str.length; i++) {
    if (!/[A-Za-z0-9+/=]/.test(base64str[i])) {
      problems.push({pos: i, char: base64str[i], code: base64str.charCodeAt(i)});
    }
  }
  
  if (problems.length > 0) {
    console.log('Problems found:', problems.length);
    problems.slice(0, 5).forEach(p => {
      console.log('  Position', p.pos, 'char:', JSON.stringify(p.char), 'code:', p.code);
      console.log('  Context:', JSON.stringify(base64str.substring(Math.max(0, p.pos - 20), Math.min(base64str.length, p.pos + 20))));
    });
  } else {
    console.log('No problems found in base64 string');
  }
}
