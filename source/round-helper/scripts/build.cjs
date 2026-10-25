const fs = require('node:fs');
const path = require('node:path');
const babel = require(process.env.ROUND_HELPER_BABEL || '@babel/standalone');
const root = path.resolve(__dirname, '..');
const jsx = fs.readFileSync(path.join(root, 'src/app.jsx'), 'utf8');
const { code } = babel.transform(jsx, { presets: ['react'], comments: false });
for (const file of ['index.html', 'app.css', 'transport.js']) fs.copyFileSync(path.join(root, 'src', file), path.join(root, 'dist', file));
fs.writeFileSync(path.join(root, 'dist/app.js'), code + '\n');
console.log('Round Helper built: three themes and local production scripts.');
