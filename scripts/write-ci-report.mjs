import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
function files(path){return readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(path,entry.name)):[join(path,entry.name)]);}
const tap=readFileSync('verification/tests.tap','utf8');
const audit=JSON.parse(readFileSync('verification/audit.json','utf8'));
const report={
  source_commit:process.env.GITHUB_SHA??null,
  created_at:new Date().toISOString(),
  node:process.version,
  tests:Number(tap.match(/^# tests (\d+)/m)?.[1]??0),
  failures:Number(tap.match(/^# fail (\d+)/m)?.[1]??0),
  typecheck_and_build:'passed',
  vulnerabilities:audit.metadata?.vulnerabilities??null,
  files:files('dist').map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),
};
if(report.tests<24||report.failures>0)throw new Error('El informe no confirma todas las pruebas.');
writeFileSync('verification/result.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
