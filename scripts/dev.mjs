import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
let vite;
try { vite = join(dirname(require.resolve('vite/package.json')), 'bin','vite.js'); } catch { console.error('Faltan dependencias. Ejecuta npm install y vuelve a iniciar. Las pruebas del backend funcionan con node --test sin instalarlas.'); process.exit(1); }
const args=process.argv.slice(2),portArg=args.indexOf('--port');
const devPort=portArg>=0?args[portArg+1]:'5173';
if(!/^\d{1,5}$/.test(devPort)||Number(devPort)<1||Number(devPort)>65535)throw new Error('El puerto de desarrollo no es válido.');
const children = [spawn(process.execPath, ['--watch','server/index.mjs'], {stdio:'inherit',env:{...process.env,QA_DEV_PORT:devPort}}), spawn(process.execPath,[vite,...args], {stdio:'inherit'})];
for (const child of children) child.on('exit', code=>{ for(const other of children) if(other!==child) other.kill(); process.exitCode=code??1; });
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{ for(const child of children) child.kill(); });
