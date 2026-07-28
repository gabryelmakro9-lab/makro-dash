import * as esbuild from 'esbuild';

try {
  const result = await esbuild.build({
    entryPoints: ['./js/pdf.js'],
    bundle: true,
    format: 'esm',
    write: false,
    banner: { js: '' },
    footer: { js: '' },
  });
  console.log('esbuild OK, size:', result.outputFiles[0].text.length);
} catch(e) {
  console.log('esbuild error:', e.message);
  if (e.errors) {
    for (const err of e.errors) {
      console.log('Error detail:', JSON.stringify(err));
      if (err.location) {
        console.log('Location:', JSON.stringify(err.location));
        // Read the file at the error location
        const fs = await import('fs');
        const lineContent = fs.readFileSync(err.location.file, 'utf8').split('\n')[err.location.line - 1];
        if (lineContent) {
          const start = Math.max(0, err.location.column - 100);
          const end = Math.min(lineContent.length, err.location.column + 50);
          console.log('Context:', lineContent.substring(start, end));
          console.log('Hex context:', Buffer.from(lineContent.substring(start, end), 'utf8').toString('hex'));
        }
      }
    }
  }
}
