import { spawn } from 'node:child_process';
import { buildLab } from './build-lab.mjs';
import { watch } from 'node:fs';
let pending;
const watcher = watch(new URL('../labs/custom-character/', import.meta.url), () => {
  clearTimeout(pending); pending = setTimeout(() => buildLab().catch(console.error), 100);
});
const astro = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'dev', ...process.argv.slice(2)], { stdio: 'inherit' });
astro.on('exit', code => { watcher.close(); process.exit(code ?? 0); });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { watcher.close(); astro.kill(signal); });
