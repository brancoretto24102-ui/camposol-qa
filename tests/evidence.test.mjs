import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {createApp} from '../server/index.mjs';
import {captureInfo,sha256,verifyCapture,referenceRows,evidenceIsCurrent} from '../src/evidence-domain.ts';
import {buildQAXlsx,exportEvidence} from '../src/xlsx-export.ts';
import {fixture,png,info} from './helpers/evidence-fixture.mjs';
async function exported(f,items){
  const bytes=await buildQAXlsx({project:f.project,document:f.doc,methodology:f.method,evidence:{revision:1,items},images:new Map(items.map(e=>[e.id,png]))});
  const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);return {book,bytes};
}
test('referencias consecutivas por paso, aunque varios registros pertenezcan al mismo caso',async t=>{
  const f=await fixture(t),rows=referenceRows(f.doc.content);
  assert.deepEqual(rows.map(r=>[r.item,r.step,r.reference,r.excel_row]),[['CP01','1','Referencia 01',3],['CP01','2','Referencia 02',4],['CP02','1','Referencia 03',5]]);
  assert.equal(rows[0].case_id,rows[1].case_id);assert.notEqual(rows[0].step_id,rows[1].step_id);
});
test('PNG: cabecera, dimensiones, tamaño, hash y rechazo de SVG encubierto',async()=>{
  assert.deepEqual(captureInfo(png),{mime_type:'image/png',extension:'png',width:1,height:1,byte_size:png.length});
  assert.equal(await sha256(png),info().sha256);await verifyCapture(png,info());
  assert.throws(()=>captureInfo(new TextEncoder().encode('<svg onload="alert(1)"/>')));
  assert.throws(()=>captureInfo(new Uint8Array(5*1024*1024+1)),e=>e.status===413);
  const huge=new Uint8Array(png);new DataView(huge.buffer).setUint32(16,20001);assert.throws(()=>captureInfo(huge));
  await assert.rejects(verifyCapture(png,{...info(),sha256:'0'.repeat(64)}));
});
test('JPEG: dimensiones SOF y rechazo de imagen truncada',()=>{
  const jpeg=Uint8Array.from([255,216,255,192,0,11,8,0,2,0,3,1,1,17,0,255,217]);
  assert.deepEqual(captureInfo(jpeg),{mime_type:'image/jpeg',extension:'jpg',width:3,height:2,byte_size:jpeg.length});
  assert.throws(()=>captureInfo(jpeg.slice(0,-1)));
});
test('la carga exige editor efectivo, versión actual y un paso del mismo caso',async t=>{
  const f=await fixture(t),step=f.doc.content.cases[0].steps[0];
  for(const actor of [f.lector,f.revisor,f.other])await assert.rejects(f.evidence.attach(actor,f.project.id,f.doc.version,f.ids[0],step.id,info(),png));
  await assert.rejects(f.evidence.attach(f.editor,f.project.id,f.doc.version,f.ids[1],step.id,info(),png));
  await assert.rejects(f.evidence.attach(f.editor,f.project.id,f.doc.version,f.ids[0],randomUUID(),info(),png));
  await assert.rejects(f.evidence.attach(f.editor,f.project.id,f.doc.version-1,f.ids[0],step.id,info(),png));
  assert.equal(f.evidence.manifest(f.editor,f.project.id).revision,0);
});
test('bytes privados y retiro trazable sin borrar el archivo ni cambiar aprobación documental',async t=>{
  const f=await fixture(t),version=f.doc.version,e=await f.attach();
  assert.equal(f.evidence.manifest(f.lector,f.project.id).items.length,1);assert.deepEqual(f.evidence.bytes(f.lector,e.id),png);
  assert.throws(()=>f.evidence.bytes(f.other,e.id));assert.equal(f.store.qa.get(f.editor,f.project.id).version,version);
  assert.throws(()=>f.evidence.retire(f.lector,e.id,version));f.evidence.retire(f.editor,e.id,version);
  assert.deepEqual(f.evidence.manifest(f.editor,f.project.id),{revision:2,items:[]});assert.deepEqual(f.evidence.bytes(f.editor,e.id),png);
  f.evidence.retire(f.editor,e.id,version);assert.equal(f.evidence.manifest(f.editor,f.project.id).revision,2);
});
test('un archivo o una cuenta inactiva no permite adjuntar capturas',async t=>{
  const f=await fixture(t);f.store.updateProject(f.editor,f.project.id,{...f.project,status:'archivado',version:f.project.version});await assert.rejects(f.attach(),e=>e.status===409);
  f.store.updateProject(f.editor,f.project.id,{...f.project,status:'borrador',version:f.project.version+1});f.store.updateUser(f.admin,f.editor.id,{role:'editor',active:false,can_self_approve:false});await assert.rejects(f.attach());
});
test('límite de cinco capturas y verificación del contenido antes de almacenar',async t=>{
  const f=await fixture(t);await assert.rejects(f.evidence.attach(f.editor,f.project.id,f.doc.version,f.ids[0],f.doc.content.cases[0].steps[0].id,{...info(),mime_type:'image/jpeg'},png));
  for(let i=0;i<5;i++)await f.attach();await assert.rejects(f.attach());assert.equal(f.evidence.manifest(f.editor,f.project.id).items.length,5);
});
test('reordenar conserva capturas; modificar el paso bloquea evidencia de la versión anterior',async t=>{
  const f=await fixture(t),e=await f.attach(),c=f.doc.content.cases[0];
  f.apply(f.editor,{action:'save_case',case_id:c.id,case:{...c,steps:[...c.steps].reverse()}});
  assert.equal(evidenceIsCurrent(e,f.doc),true);assert.equal(referenceRows(f.doc.content).find(r=>r.step_id===e.step_id).reference,'Referencia 02');
  f.apply(f.editor,{action:'save_case',case_id:c.id,case:{...c,steps:c.steps.map(s=>s.id===e.step_id?{...s,expected_result:'Nuevo resultado'}:s)}});
  assert.equal(evidenceIsCurrent(e,f.doc),false);assert.throws(()=>exportEvidence(f.doc,{revision:1,items:[e]}),/versión anterior/);
});
test('Excel incrusta cada imagen en su referencia y conserva relaciones de ida y vuelta para TODAS las filas',async t=>{
  const f=await fixture(t),a=await f.attach(),b=await f.attach(),{book,bytes}=await exported(f,[a,b]),zip=await JSZip.loadAsync(bytes);
  assert.deepEqual(book.worksheets.map(s=>s.name),['Hoja de Control','Casos de Prueba','Referencia 01','Referencia 02','Referencia 03']);
  assert.equal(book.getWorksheet('Referencia 01').getImages().length,2);
  assert.deepEqual(new Uint8Array(book.getImage(0).buffer),png);
  assert.equal(book.getWorksheet('Referencia 02').getImages().length,0);
  for(let i=0;i<3;i++){
    const name='Referencia '+String(i+1).padStart(2,'0'),cell='J'+(i+3),ws=book.getWorksheet(name);
    const main=await zip.file('xl/worksheets/sheet2.xml').async('string'),ref=await zip.file('xl/worksheets/sheet'+(i+3)+'.xml').async('string');
    assert.ok(main.includes('<hyperlink ref="'+cell+'" location="\''+name+'\'!B4"/>'));
    assert.ok(ref.includes('<hyperlink ref="B2" location="\'Casos de Prueba\'!'+cell+'"/>'));assert.equal(ws.getCell('B2').text,'Regresar');
  }
  for(const [name,file] of Object.entries(zip.files))if(name.endsWith('.rels'))assert.ok(!(await file.async('string')).includes('TargetMode="External"'));
  for(const [name,file] of Object.entries(zip.files))if(/^xl\/drawings\/drawing\d+\.xml$/.test(name))assert.ok(!/<xdr:oneCellAnchor[^>]*editAs=/.test(await file.async('string')));
});
test('el texto que empieza con igual no se convierte en fórmula o vínculo externo',async t=>{
  const f=await fixture(t),c=f.doc.content.cases[0],value='=HYPERLINK("https://example.test","x") <b>& texto';
  f.apply(f.editor,{action:'save_case',case_id:c.id,case:{...c,description:value}});
  const {book}=await exported(f,[]);assert.equal(book.getWorksheet('Casos de Prueba').getCell('D3').value,value);
  assert.notEqual(book.getWorksheet('Casos de Prueba').getCell('D3').type,ExcelJS.ValueType.Formula);
});
test('no produce un Excel incompleto si falta una imagen, su hash cambió o una carga sigue pendiente',async t=>{
  const f=await fixture(t),e=await f.attach(),base={project:f.project,document:f.doc,methodology:f.method,evidence:{revision:1,items:[e]},images:new Map()};
  await assert.rejects(buildQAXlsx(base),/Falta una captura/);await assert.rejects(buildQAXlsx({...base,images:new Map([[e.id,new Uint8Array(png.length)]])}));
  assert.throws(()=>exportEvidence(f.doc,{revision:1,items:[{...e,state:'pending'}]}),/pendientes/);
  await assert.rejects(buildQAXlsx({...base,evidence:{revision:1,items:[{...e,project_id:randomUUID()}]},images:new Map([[e.id,png]])}),/no pertenece/);
});
test('un caso sin pasos tiene referencia pendiente, sin capturas inventadas',async t=>{
  const f=await fixture(t),c=f.doc.content.cases[0];f.apply(f.editor,{action:'save_case',case_id:c.id,case:{...c,steps:[]}});
  const {book}=await exported(f,[]);assert.equal(referenceRows(f.doc.content).length,2);
  assert.equal(book.getWorksheet('Referencia 01').getImages().length,0);assert.match(book.getWorksheet('Referencia 01').getCell('B4').text,/sin registrar/);
});
test('HTTP local: autenticación, CSRF, carga y recuperación de la imagen',async t=>{
  const f=await fixture(t),app=createApp({store:f.store});await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>app.close(resolve)));
  const base='http://127.0.0.1:'+app.address().port,session=f.store.issueSession(f.editor),headers={Origin:'http://127.0.0.1:5173','Content-Type':'application/json',Cookie:'qa_session='+session.token,'X-CSRF-Token':session.csrf};
  const path=base+'/api/qa/projects/'+f.project.id+'/evidence',body=JSON.stringify({version:f.doc.version,case_id:f.ids[0],step_id:f.doc.content.cases[0].steps[0].id,input:info(),base64:Buffer.from(png).toString('base64')});
  assert.equal((await fetch(path,{method:'POST',headers:{Origin:headers.Origin,'Content-Type':'application/json'},body})).status,401);
  assert.equal((await fetch(path,{method:'POST',headers:{...headers,'X-CSRF-Token':'wrong'},body})).status,403);
  const response=await fetch(path,{method:'POST',headers,body});assert.equal(response.status,201,await response.clone().text());const e=await response.json();
  const get=await fetch(base+'/api/qa/evidence/'+e.id+'/bytes',{headers:{Cookie:headers.Cookie}});assert.equal(get.status,200);assert.equal((await get.json()).base64,Buffer.from(png).toString('base64'));
});

