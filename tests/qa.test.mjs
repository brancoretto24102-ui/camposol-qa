import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {createApp} from '../server/index.mjs';
import {matrixRows,caseReady} from '../src/qa-domain.ts';

const password=()=>randomBytes(24).toString('base64url');
const projectInput={application_id:'digiproy',code:'FICTICIO-FASE2',name:'Cartilla técnica ficticia',objective:'Comprobar la elaboración manual',description:'Ejemplo técnico sin datos empresariales',status:'borrador'};
async function fixture(t){
  const store=new Store();t.after(()=>store.close());
  const admin=(await store.bootstrap({full_name:'Admin ficticio',email:'qa-admin@example.test',password:password()})).user;
  const people={};for(const role of ['editor','revisor','lector'])people[role]=await store.createUser(admin,{full_name:`Cuenta ${role}`,email:`qa-${role}@example.test`,password:password(),role});
  const other=await store.createUser(admin,{full_name:'Otra editora',email:'qa-other@example.test',password:password(),role:'editor'});
  const project=store.createProject(people.editor,projectInput);
  for(const role of ['revisor','lector'])store.setMember(admin,project.id,{user_id:people[role].id,role});
  const method=store.qa.methodologies(people.editor)[0];
  let doc=store.qa.command(people.editor,project.id,0,{action:'init',methodology_version_id:method.id});
  const apply=(actor,cmd)=>{doc=store.qa.command(actor,project.id,doc.version,cmd);return doc;};
  const functionality={id:randomUUID(),name:'Guardar registro ficticio',description:'Guardar únicamente los datos ingresados',source:'Regla de prueba aportada por la persona usuaria'};
  function context(){apply(people.editor,{action:'save_context',context:{summary:'Formulario ficticio',functioning:'La persona ingresa un dato y lo guarda.',source_notes:'Especificación técnica ficticia',functionalities:[functionality]}});}
  function approveContext(){context();apply(people.editor,{action:'submit',scope:'context'});apply(people.revisor,{action:'approve',scope:'context'});}
  const proposal={id:randomUUID(),functionality_id:functionality.id,included:true,name:'Validar guardado ficticio',justification:'Corresponde a la operación documentada',priority:'Alta'};
  function select(){approveContext();apply(people.editor,{action:'save_selection',cases:[proposal]});apply(people.editor,{action:'submit',scope:'selection'});apply(people.revisor,{action:'approve',scope:'selection'});}
  const body={requirement:'Guardar dato ficticio',description:'Comprobar el guardado descrito.',comment:'',steps:[{id:randomUUID(),description:'Ingresar el dato de prueba.',arguments:'Dato: ejemplo.',expected_result:'El dato se presenta en el formulario.'},{id:randomUUID(),description:'Guardar el formulario.',arguments:'',expected_result:'El registro queda disponible para consulta.'}]};
  function saveCase(){select();apply(people.editor,{action:'save_case',case_id:proposal.id,case:body});}
  function approveCase(){saveCase();apply(people.editor,{action:'submit',scope:'case',case_id:proposal.id});apply(people.revisor,{action:'approve',scope:'case',case_id:proposal.id});}
  return {store,admin,...people,other,project,method,apply,context,approveContext,select,saveCase,approveCase,functionality,proposal,body,get doc(){return doc;}};
}
test('Fase 2 completa: contexto, selección, pasos, aprobación y una fila por caso',async t=>{
  const f=await fixture(t);f.approveCase();
  assert.equal(f.doc.content.cases[0].review.status,'aprobado');
  assert.equal(f.doc.content.cases[0].review.approved_by,f.revisor.id);
  assert.ok(f.doc.content.cases[0].review.approved_at);
  const rows=matrixRows(f.doc.content);assert.equal(rows.length,1);assert.equal(rows[0].item,'CP01');
  assert.equal(rows[0].step,'1\n2');assert.match(rows[0].expected_result,/^1\. .*\n2\. /);
  assert.equal(rows[0].reference,'Referencia 01');
  assert.equal(f.store.qa.progress(f.editor)[0].approved_cases,1);
});
test('conocer identificadores no permite leer, editar ni consultar versiones ajenas',async t=>{
  const f=await fixture(t);
  for(const op of [()=>f.store.qa.get(f.other,f.project.id),()=>f.store.qa.command(f.other,f.project.id,1,{action:'submit',scope:'context'}),()=>f.store.qa.history(f.other,f.project.id),()=>f.store.qa.revision(f.other,f.project.id,1)])assert.throws(op,e=>e.status===404);
});
test('un lector asignado como editor y un revisor asignado como lector no amplían su autoridad',async t=>{
  const f=await fixture(t);f.context();f.apply(f.editor,{action:'submit',scope:'context'});
  f.store.setMember(f.admin,f.project.id,{user_id:f.lector.id,role:'editor'});
  assert.throws(()=>f.apply(f.lector,{action:'save_context',context:{}}),e=>e.status===403);
  f.store.setMember(f.admin,f.project.id,{user_id:f.revisor.id,role:'lector'});
  assert.throws(()=>f.apply(f.revisor,{action:'approve',scope:'context'}),e=>e.status===403);
  assert.equal(f.store.qa.get(f.lector,f.project.id).version,f.doc.version);
});
test('la autoaprobación requiere permiso vigente y autoría de la versión',async t=>{
  const f=await fixture(t);f.context();f.apply(f.editor,{action:'submit',scope:'context'});
  assert.throws(()=>f.apply(f.editor,{action:'approve',scope:'context'}),e=>e.status===403);
  f.store.updateUser(f.admin,f.editor.id,{role:'editor',active:true,can_self_approve:true});
  f.apply(f.editor,{action:'approve',scope:'context'});
  assert.equal(f.doc.content.context.review.approved_by,f.editor.id);
  f.store.setMember(f.admin,f.project.id,{user_id:f.other.id,role:'editor'});
  f.apply(f.other,{action:'save_context',context:{...f.doc.content.context,summary:'Texto actualizado por otra persona'}});
  f.apply(f.other,{action:'submit',scope:'context'});
  assert.throws(()=>f.apply(f.editor,{action:'approve',scope:'context'}),e=>e.status===403);
});
test('modificar un paso aprobado exige revisión nueva y conserva la versión aprobada',async t=>{
  const f=await fixture(t);f.approveCase();const version=f.doc.version,caseVersion=f.doc.content.cases[0].review.version;
  f.apply(f.editor,{action:'save_case',case_id:f.proposal.id,case:{...f.body,steps:[...f.body.steps].reverse()}});
  assert.equal(f.doc.content.cases[0].review.status,'requiere_correccion');
  assert.equal(f.doc.content.cases[0].review.version,caseVersion+1);
  assert.equal(f.doc.content.cases[0].review.approved_by,null);
  const previous=f.store.qa.revision(f.editor,f.project.id,version);
  assert.equal(previous.content.cases[0].review.status,'aprobado');
  assert.equal(previous.content.cases[0].steps[0].id,f.body.steps[0].id);
});
test('cambiar el contexto o la ficha del proyecto invalida aprobaciones dependientes',async t=>{
  const f=await fixture(t);f.approveCase();
  f.apply(f.editor,{action:'save_context',context:{...f.doc.content.context,functioning:'Funcionamiento corregido de la misma operación.'}});
  assert.notEqual(f.doc.content.context.review.status,'aprobado');assert.notEqual(f.doc.content.selection.status,'aprobado');assert.notEqual(f.doc.content.cases[0].review.status,'aprobado');
  const before=f.doc.version;
  f.store.updateProject(f.editor,f.project.id,{...projectInput,objective:'Objetivo ficticio corregido',version:f.project.version});
  const after=f.store.qa.get(f.editor,f.project.id);assert.equal(after.version,before+1);
  assert.equal(f.store.qa.history(f.editor,f.project.id)[0].action,'project_context_changed');
});
test('no se aprueban etapas vacías ni casos con pasos incompletos',async t=>{
  const f=await fixture(t);
  assert.throws(()=>f.apply(f.editor,{action:'submit',scope:'context'}),e=>e.status===422);
  f.select();f.apply(f.editor,{action:'save_case',case_id:f.proposal.id,case:{...f.body,steps:[{...f.body.steps[0],expected_result:''}]}});
  assert.ok(caseReady(f.doc.content.cases[0],f.method.config));
  assert.throws(()=>f.apply(f.editor,{action:'submit',scope:'case',case_id:f.proposal.id}),e=>e.status===422);
  assert.throws(()=>f.apply(f.revisor,{action:'correct',scope:'context',observation:''}),e=>e.status===422);
});
test('excluir y reordenar propuestas conserva datos y renumera solamente los casos incluidos',async t=>{
  const f=await fixture(t);f.approveContext();
  const second={...f.proposal,id:randomUUID(),name:'Segundo caso ficticio'},excluded={...f.proposal,id:randomUUID(),name:'Propuesta excluida',included:false};
  f.apply(f.editor,{action:'save_selection',cases:[f.proposal,excluded,second]});
  f.apply(f.editor,{action:'save_selection',cases:[second,excluded,f.proposal]});
  const rows=matrixRows(f.doc.content);assert.deepEqual(rows.map(r=>r.item),['CP01','CP02']);assert.equal(rows[0].name,second.name);
  assert.throws(()=>f.apply(f.editor,{action:'save_context',context:{...f.doc.content.context,functionalities:[]}}),e=>e.status===422);
});
test('dos editores no sobrescriben una versión documental desactualizada',async t=>{
  const f=await fixture(t);f.store.setMember(f.admin,f.project.id,{user_id:f.other.id,role:'editor'});
  const version=f.doc.version;f.context();
  assert.throws(()=>f.store.qa.command(f.other,f.project.id,version,{action:'save_context',context:{summary:'Antiguo',functioning:'',source_notes:'',functionalities:[]}}),e=>e.status===409);
  assert.equal(f.store.qa.get(f.editor,f.project.id).content.context.summary,'Formulario ficticio');
});
test('las versiones de metodología aprobadas no se modifican y los proyectos conservan su versión vinculada',async t=>{
  const f=await fixture(t);
  assert.throws(()=>f.store.qa.saveMethodology(f.admin,f.method,f.method.id,f.method.revision),e=>e.status===409);
  const draft=f.store.qa.saveMethodology(f.admin,{...f.method,version_label:'1.1'});assert.equal(draft.status,'borrador');
  assert.ok(!f.store.qa.methodologies(f.lector).some(m=>m.id===draft.id));
  const approved=f.store.qa.approveMethodology(f.admin,draft.id,draft.revision);assert.equal(approved.status,'aprobado');
  assert.equal(f.store.qa.get(f.editor,f.project.id).methodology_version_id,f.method.id);
  assert.throws(()=>f.store.qa.saveMethodology(f.editor,{...f.method,version_label:'2.0'}),e=>e.status===403);
});
test('aplicaciones con versiones, desactivación y vínculo inmutable con una cartilla',async t=>{
  const f=await fixture(t),a=f.store.qa.saveApplication(f.admin,{id:'app-ejemplo',name:'Aplicación ficticia',active:true,version:0});
  assert.equal(a.version,1);assert.throws(()=>f.store.qa.saveApplication(f.editor,{...a,version:1}),e=>e.status===403);
  assert.throws(()=>f.store.updateProject(f.editor,f.project.id,{...projectInput,application_id:a.id,version:1}),e=>e.status===422);
  const existing=f.store.applications(f.admin).find(x=>x.id==='digiproy');f.store.qa.saveApplication(f.admin,{...existing,active:false});
  assert.throws(()=>f.store.createProject(f.editor,projectInput),e=>e.status===422);
  assert.equal(f.store.updateProject(f.editor,f.project.id,{...projectInput,name:'Nombre ficticio corregido',version:1}).name,'Nombre ficticio corregido');
});
test('el historial documental se pagina sin eliminar versiones anteriores',async t=>{
  const f=await fixture(t);for(let i=0;i<24;i++)f.apply(f.editor,{action:'save_context',context:{summary:`Versión ficticia ${i}`,functioning:'',source_notes:'',functionalities:[]}});
  const first=f.store.qa.history(f.editor,f.project.id),second=f.store.qa.history(f.editor,f.project.id,20);
  assert.equal(first.length,20);assert.equal(second.length,5);assert.equal(new Set([...first,...second].map(v=>v.version)).size,25);
  assert.equal(second.at(-1).version,1);assert.equal(second.at(-1).actor_id,f.editor.id);
});
test('metadatos de aprobación enviados por el cliente se ignoran y las solicitudes inválidas no corrompen datos',async t=>{
  const f=await fixture(t);f.select();
  f.apply(f.editor,{action:'save_case',case_id:f.proposal.id,case:{...f.body,review:{status:'aprobado',approved_by:f.editor.id}}});
  assert.notEqual(f.doc.content.cases[0].review.status,'aprobado');
  const version=f.doc.version;
  for(const command of [{action:'save_case',case_id:f.proposal.id,case:{...f.body,steps:[null]}},{action:'arbitrary_action'},{action:'save_context',context:{summary:'x'.repeat(2_000_001)}}])assert.throws(()=>f.apply(f.editor,command),e=>[413,422].includes(e.status));
  assert.equal(f.store.qa.get(f.editor,f.project.id).version,version);
});
test('los endpoints de cartilla aplican sesión, CSRF y validación de versión',async t=>{
  const f=await fixture(t),app=createApp({store:f.store});await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>app.close(r)));
  const base=`http://127.0.0.1:${app.address().port}`,route=`/api/qa/projects/${f.project.id}`;
  assert.equal((await fetch(base+route)).status,401);
  const session=f.store.issueSession(f.editor),headers={Cookie:`qa_session=${session.token}`,Origin:'http://127.0.0.1:5173','Content-Type':'application/json'};
  const payload={version:f.doc.version,command:{action:'submit',scope:'context'}};
  assert.equal((await fetch(base+route,{method:'POST',headers,body:JSON.stringify(payload)})).status,403);
  const response=await fetch(base+route,{method:'POST',headers:{...headers,'X-CSRF-Token':session.csrf},body:JSON.stringify(payload)});
  assert.equal(response.status,422);assert.ok((await response.json()).error);
});
