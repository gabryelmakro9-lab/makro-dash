import { readFileSync } from 'fs';
import { PDFParse, VerbosityLevel } from 'pdf-parse';

const buf = readFileSync('./LaudoManilha.pdf');
PDFParse({ data: buf, verbosity: VerbosityLevel.ERRORS }).then(d => {
  console.log('Pages:', d.numpages);
  console.log('---TEXT START---');
  console.log(d.text);
  console.log('---TEXT END---');
}).catch(e => console.log('Error:', e.message, e.stack));
