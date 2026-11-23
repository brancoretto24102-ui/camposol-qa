import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
let vite;
try { vite = join(dirname(require.resolve('vite/package.json')), 'bin','vite.js'); } catch { console.error('Faltan dependencias. Ejecuta npm install y vuelve a iniciar. Las pruebas del backend funcionan con node --test sin instalarlas.'); process.exit(1); }
const children = [spawn(process.execPath, ['--watch','server/index.mjs'], {stdio:'inherit'}), spawn(process.execPath,[vite], {stdio:'inherit'})];
for (const child of children) child.on('exit', code=>{ for(const other of children) if(other!==child) other.kill(); process.exitCode=code??1; });
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{ for(const child of children) child.kill(); });
