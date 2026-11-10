import { readFile, writeFile, watch } from 'node:fs/promises';
const base = new URL('../labs/custom-character/', import.meta.url);
const modules = ['original-player.js', 'player-art.js', 'model.js', 'game.js', 'scene.js', 'editor.js', 'ui.js'];
export async function buildLab() {
  const template = await readFile(new URL('template.html', base), 'utf8');
  const css = await readFile(new URL('style.css', base), 'utf8');
  const scripts = await Promise.all(modules.map(async name => '// ' + name + '\n' + await readFile(new URL(name, base), 'utf8')));
  const html = template.replace('/* LAB_STYLES */', () => css).replace('/* LAB_SCRIPTS */', () => "'use strict';\n" + scripts.join('\n'));
  await writeFile(new URL('../public/labs/custom-character.html', import.meta.url), html);
  console.log('Built self-contained Custom Character lab.');
}
await buildLab();
if (process.argv.includes('--watch')) {
  for await (const event of watch(base)) {
    if (event.filename && !event.filename.endsWith('.md')) { try { await buildLab(); } catch (error) { console.error(error.message); } }
  }
}
