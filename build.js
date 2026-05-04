const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
    // Compile and bundle all TypeScript starting from the entry point
    const result = await esbuild.build({
        entryPoints: ['src/evbValueGridApp.ts'],
        bundle: true,
        write: false,
        target: 'es2017',
        format: 'iife',
        logLevel: 'warning',
    });

    const js = result.outputFiles[0].text;
    const css = fs.readFileSync('src/styles.css', 'utf-8');
    const htmlTemplate = fs.readFileSync('src/index.html', 'utf-8');

    // Inline CSS and JS into the HTML template
    const finalHtml = htmlTemplate
        .replace('    <link rel="stylesheet" href="styles.css">', `    <style>\n${css}    </style>`)
        .replace('    <script src="app.js"></script>', `    <script>\n${js}    </script>`);

    fs.mkdirSync('dist', { recursive: true });
    const outPath = path.join('dist', 'wieso_wiekalk_evbValueGrid.html');
    fs.writeFileSync(outPath, finalHtml, 'utf-8');

    const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`Built: ${outPath} (${sizeKb} KB)`);
}

build().catch(err => {
    console.error(err);
    process.exit(1);
});
