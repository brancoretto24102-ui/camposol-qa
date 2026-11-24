import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {createApp} from '../server/index.mjs';
import {aiProviders,aiTasks,buildAIPrompt,parseAIResponse,aiProposalCommand,validateAIGenerate,validateAIPreferences,AI_OUTPUT_TOKENS} from '../src/ai-domain.ts';
import {callAIProvider} from '../supabase/functions/_shared/ai-providers.ts';
import {createAIHandler} from '../supabase/functions/_shared/ai-handler.ts';
import {QAError} from '../src/qa-domain.ts';

const secret=()=>randomBytes(24).toString('base64url'),quote='La persona ingresa un dato y lo guarda.';
async function fixture(t){
  const store=new Store();t.after(()=>store.close());const admin=(await store.bootstrap({full_name:'Admin de prueba',email:'admin-ai@example.test',password:secret()})).user;
  const editor=await store.createUser(admin,{full_name:'Editora de prueba',email:'editor-ai@example.test',password:secret(),role:'editor'}),reader=await store.createUser(admin,{full_name:'Lector de prueba',email:'reader-ai@example.test',password:secret(),role:'lector'}),other=await store.createUser(admin,{full_name:'Otra editora',email:'other-ai@example.test',password:secret(),role:'editor'});
  const project=store.createProject(editor,{application_id:'digiproy',code:'F3-FICTICIO',name:'Prueba ficticia de IA',objective:'Comprobar el guardado descrito',description:quote,status:'borrador'});store.setMember(admin,project.id,{user_id:reader.id,role:'lector'});
  const method=store.qa.methodologies(editor)[0],fid=randomUUID(),cid=randomUUID();let d=store.qa.command(editor,project.id,0,{action:'init',methodology_version_id:method.id});
  const apply=(actor,command)=>{d=store.qa.command(actor,project.id,d.version,command);return d;};
  const context=()=>({project,document:structuredClone(d),methodology:method});
  const prepare=()=>{apply(editor,{action:'save_context',context:{summary:'Formulario ficticio de registro',functioning:quote,source_notes:'Regla técnica ficticia',functionalities:[{id:fid,name:'Guardar dato',description:quote,source:'Especificación ficticia'}]}});apply(editor,{action:'submit',scope:'context'});apply(admin,{action:'approve',scope:'context'});apply(editor,{action:'save_selection',cases:[{id:cid,functionality_id:fid,name:'Guardar un dato',priority:'Alta',justification:quote,included:true}]});apply(editor,{action:'submit',scope:'selection'});apply(admin,{action:'approve',scope:'selection'});};
  const caseProposal=()=>({kind:'case',questions:[],case:{requirement:'Guardar el dato',description:'Comprobar el guardado documentado.',comment:'',steps:[{description:'Ingresar y guardar el dato de prueba.',arguments:'Dato: ejemplo.',expected_result:'El dato queda guardado.',source_quote:quote}]}});
  const request=(provider='openai')=>({project_id:project.id,version:d.version,task:'generate_case',case_id:cid,provider,model:'modelo-de-prueba',prompt:'Devuelve una propuesta JSON basada en requisitos ficticios.',api_key:secret(),consent:true});
  return {store,admin,editor,reader,other,project,method,fid,cid,apply,context,prepare,caseProposal,request,get doc(){return d;}};
}
test('las preferencias son personales, opcionales y no admiten credenciales ni identidades ajenas',async t=>{
  const f=await fixture(t);assert.equal(f.store.ai.preferences(f.editor).provider,'none');
  const p=f.store.ai.savePreferences(f.editor,{provider:'claude',mode:'manual',model:'',version:0});assert.equal(p.version,1);assert.equal(f.store.ai.preferences(f.other).provider,'none');
  assert.throws(()=>f.store.ai.savePreferences(f.editor,{...p,api_key:secret()}));assert.throws(()=>f.store.ai.savePreferences(f.editor,{...p,user_id:f.other.id}));
  assert.equal(f.store.db.prepare('SELECT * FROM ai_provider_preferences WHERE user_id=?').get(f.editor.id).provider,'claude');
});
test('preferencias versionadas, Copilot manual y modelo API explícito',async t=>{
  const f=await fixture(t),p=f.store.ai.savePreferences(f.editor,{provider:'openai',mode:'api',model:'modelo-propio',version:0});
  assert.throws(()=>f.store.ai.savePreferences(f.editor,{...p,version:0}),e=>e.status===409);
  assert.throws(()=>validateAIPreferences({provider:'copilot',mode:'api',model:'modelo',version:0}));
  assert.throws(()=>validateAIPreferences({provider:'openai',mode:'api',model:'',version:0}));
  assert.throws(()=>validateAIPreferences({provider:'otro',mode:'manual',model:'',version:0}));
  assert.equal(Object.keys(aiProviders).length,5);
});
test('prompt contextual: metodología fijada, instrucciones de no inventar y ausencia de identidad de acceso',async t=>{
  const f=await fixture(t),before=f.context();assert.throws(()=>buildAIPrompt(before,{task:'selection'}));
  const analysis=buildAIPrompt(before,{task:'analysis'});assert.match(analysis,/source_quote/);assert.match(analysis,/No inventes requisitos/);assert.doesNotMatch(analysis,/editor-ai@example/);
  f.prepare();const prompt=buildAIPrompt(f.context(),{task:'generate_case',case_id:f.cid});assert.match(prompt,/DigiProy 1\.0/);assert.match(prompt,/La persona ingresa un dato/);assert.doesNotMatch(prompt,/approved_by|password_hash|api_key/);
});
test('valida JSON y bloque Markdown completo; no interpreta texto libre, código ni arrays',async t=>{
  const f=await fixture(t);f.prepare();const p=f.caseProposal(),target={task:'generate_case',case_id:f.cid};
  assert.deepEqual(parseAIResponse('```json\n'+JSON.stringify(p)+'\n```',f.context(),target),p);
  for(const raw of ['[]','{"kind":','texto\n'+JSON.stringify(p),'(()=>{throw 1})()'])assert.throws(()=>parseAIResponse(raw,f.context(),target));
});
test('rechaza estados de aprobación, fechas o campos adicionales enviados por la IA',async t=>{
  const f=await fixture(t);f.prepare();for(const mutate of [p=>p.approved_by=f.admin.id,p=>p.case.review={status:'aprobado'},p=>p.case.steps[0].id=randomUUID()]){const p=f.caseProposal();mutate(p);assert.throws(()=>parseAIResponse(JSON.stringify(p),f.context(),{task:'generate_case',case_id:f.cid}));}
});
test('las citas deben existir y las funcionalidades y prioridades deben pertenecer a la cartilla',async t=>{
  const f=await fixture(t);f.prepare();const p={kind:'selection',questions:[],cases:[{functionality_id:f.fid,name:'Consultar guardado',justification:quote,priority:'Media',source_quote:quote}]};
  assert.equal(parseAIResponse(JSON.stringify(p),f.context(),{task:'selection'}).cases.length,1);
  for(const patch of [{functionality_id:randomUUID()},{priority:'Crítica'},{source_quote:'Regla inexistente e inventada'}])assert.throws(()=>parseAIResponse(JSON.stringify({...p,cases:[{...p.cases[0],...patch}]}),f.context(),{task:'selection'}));
});
test('una respuesta con preguntas no fabrica contenido ni se puede aplicar vacía',async t=>{
  const f=await fixture(t);const p={kind:'analysis',summary:'',functioning:'',functionalities:[],questions:['¿Qué operación realiza la cartilla?']};
  assert.equal(parseAIResponse(JSON.stringify(p),f.context(),{task:'analysis'}).questions.length,1);
  assert.throws(()=>aiProposalCommand(p,f.context(),{task:'analysis'},randomUUID));assert.equal(f.doc.version,1);
});
test('aplicar análisis conserva funcionalidades vinculadas e invalida aprobaciones sin borrar historial',async t=>{
  const f=await fixture(t);f.prepare();const p={kind:'analysis',questions:[],summary:'Descripción revisada',functioning:quote,functionalities:[{name:'Guardar dato',description:quote,source_quote:quote},{name:'Ingresar dato',description:'Ingresar el dato documentado.',source_quote:quote}]};
  const cmd=aiProposalCommand(p,f.context(),{task:'analysis'},randomUUID);f.apply(f.editor,cmd);
  assert.equal(f.doc.content.context.functionalities[0].id,f.fid);assert.equal(f.doc.content.context.functionalities.length,2);assert.equal(f.doc.content.cases[0].id,f.cid);
  assert.notEqual(f.doc.content.context.review.status,'aprobado');assert.equal(f.store.qa.history(f.editor,f.project.id).length,f.doc.version);
});
test('las propuestas de selección agregan casos sin sobrescribir los anteriores ni aceptar duplicados',async t=>{
  const f=await fixture(t);f.prepare();const p={kind:'selection',questions:[],cases:[{functionality_id:f.fid,name:'Consultar el dato guardado',justification:quote,priority:'Media',source_quote:quote}]};
  const cmd=aiProposalCommand(p,f.context(),{task:'selection'},randomUUID);f.apply(f.editor,cmd);
  assert.equal(f.doc.content.cases[0].id,f.cid);assert.equal(f.doc.content.cases.length,2);assert.equal(f.doc.content.cases[1].review.status,'pendiente');
  assert.throws(()=>aiProposalCommand(p,f.context(),{task:'selection'},randomUUID));
});
test('la IA no aprueba: un caso aplicado queda en borrador y editar el aprobado exige revisión nueva',async t=>{
  const f=await fixture(t);f.prepare();const target={task:'generate_case',case_id:f.cid};f.apply(f.editor,aiProposalCommand(f.caseProposal(),f.context(),target,randomUUID));
  assert.equal(f.doc.content.cases[0].review.status,'borrador');f.apply(f.editor,{action:'submit',scope:'case',case_id:f.cid});f.apply(f.admin,{action:'approve',scope:'case',case_id:f.cid});const approved=f.doc.version;
  const p=f.caseProposal();p.case.description='Descripción corregida.';f.apply(f.editor,aiProposalCommand(p,f.context(),target,randomUUID));assert.equal(f.doc.content.cases[0].review.status,'requiere_correccion');assert.equal(f.store.qa.revision(f.editor,f.project.id,approved).content.cases[0].review.status,'aprobado');
});
test('cobertura es un informe fundamentado y no un comando de aprobación o edición',async t=>{
  const f=await fixture(t);f.prepare();const p={kind:'coverage',questions:[],gaps:[{functionality_id:f.fid,detail:'Revisar si el guardado cuenta con los datos suficientes.',source_quote:quote}]};
  assert.equal(parseAIResponse(JSON.stringify(p),f.context(),{task:'coverage'}).gaps.length,1);assert.throws(()=>aiProposalCommand(p,f.context(),{task:'coverage'},randomUUID));
});
test('revisar argumentos o resultados no permite cambiar los demás campos ni el orden',async t=>{
  const f=await fixture(t);f.prepare();const target={task:'generate_case',case_id:f.cid};f.apply(f.editor,aiProposalCommand(f.caseProposal(),f.context(),target,randomUUID));
  const p=f.caseProposal();p.case.steps[0].arguments='Dato ficticio corregido';assert.ok(parseAIResponse(JSON.stringify(p),f.context(),{task:'arguments',case_id:f.cid}));p.case.description='Cambio no solicitado';assert.throws(()=>parseAIResponse(JSON.stringify(p),f.context(),{task:'arguments',case_id:f.cid}));
  const q=f.caseProposal();q.case.steps[0].expected_result='El dato documentado queda guardado.';assert.ok(parseAIResponse(JSON.stringify(q),f.context(),{task:'results',case_id:f.cid}));
});
test('rechaza respuestas sobredimensionadas y tipos incorrectos sin guardarlas',async t=>{
  const f=await fixture(t);f.prepare();assert.throws(()=>parseAIResponse(' '.repeat(140001),f.context(),{task:'selection'}));const p=f.caseProposal();p.case.steps[0].arguments=10;assert.throws(()=>parseAIResponse(JSON.stringify(p),f.context(),{task:'generate_case',case_id:f.cid}));
});
test('una llamada requiere consentimiento, clave temporal y un proveedor API disponible',async t=>{
  const f=await fixture(t);f.prepare();for(const patch of [{consent:false},{provider:'copilot'},{api_key:'abc\r\nInvalid: header'},{prompt:''},{version:0},{user_id:f.admin.id}])assert.throws(()=>validateAIGenerate({...f.request(),...patch}));
});
test('el servidor rechaza otro proyecto, un lector, cuenta inactiva o versión antigua antes de llamar al proveedor',async t=>{
  const f=await fixture(t);f.prepare();let calls=0;const fetcher=async()=>{calls++;throw new Error('No debe llamarse');};
  await assert.rejects(f.store.ai.generate(f.other,f.request(),fetcher));await assert.rejects(f.store.ai.generate(f.reader,f.request(),fetcher));await assert.rejects(f.store.ai.generate(f.editor,{...f.request(),version:1},fetcher));
  f.store.updateUser(f.admin,f.editor.id,{...f.editor,active:false});await assert.rejects(f.store.ai.generate(f.editor,f.request(),fetcher));assert.equal(calls,0);
});
test('las cuotas por cuenta son persistentes y no almacenan prompt ni credencial',async t=>{
  const f=await fixture(t);for(let i=0;i<4;i++)f.store.ai.reserve(f.editor);assert.throws(()=>f.store.ai.reserve(f.editor),e=>e.status===429);f.store.ai.reserve(f.other);
  f.store.db.prepare('UPDATE ai_api_usage SET minute_start=?,minute_count=0,day_count=20 WHERE user_id=?').run(Date.now()-61000,f.editor.id);assert.throws(()=>f.store.ai.reserve(f.editor),e=>e.status===429);
  const row=f.store.db.prepare('SELECT * FROM ai_api_usage WHERE user_id=?').get(f.editor.id);assert.deepEqual(Object.keys(row).sort(),['user_id','minute_start','minute_count','day_start','day_count'].sort());
});
for(const provider of ['openai','gemini','claude'])test(`adaptador oficial ${provider}: endpoint fijo, prompt exacto, tokens acotados y credencial efímera`,async t=>{
  const f=await fixture(t);f.prepare();const input=f.request(provider),key=input.api_key,text=JSON.stringify(f.caseProposal());let calls=0;
  const result=await callAIProvider(input,async(url,init)=>{calls++;const body=JSON.parse(init.body);assert.equal(init.redirect,'error');assert.ok(init.signal);assert.equal(body.model,'modelo-de-prueba');assert.equal(url.includes(key),false);assert.equal(init.headers.Authorization??init.headers['x-goog-api-key'],provider==='gemini'?key:`Bearer ${key}`);
    if(provider==='openai'){assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(body.input,input.prompt);assert.equal(body.store,false);assert.equal(body.max_output_tokens,AI_OUTPUT_TOKENS);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text}]}],usage:{input_tokens:11,output_tokens:20}});}
    if(provider==='gemini'){assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/interactions');assert.equal(init.headers['Api-Revision'],'2026-05-20');assert.equal(body.input,input.prompt);assert.equal(body.store,false);assert.equal(body.generation_config.max_output_tokens,AI_OUTPUT_TOKENS);return Response.json({status:'completed',steps:[{type:'thought',signature:'hidden'},{type:'model_output',content:[{type:'text',text}]}],usage:{total_input_tokens:11,total_output_tokens:20}});}
    assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(init.headers['anthropic-version'],'2026-10-21');assert.equal(body.messages[0].content,input.prompt);assert.equal(body.max_tokens,AI_OUTPUT_TOKENS);return Response.json({stop_reason:'end_turn',content:[{type:'text',text}],usage:{input_tokens:11,output_tokens:20}});
  });assert.equal(calls,1);assert.equal(result.text,text);assert.equal(result.input_tokens,11);assert.equal(input.api_key,'');assert.equal(JSON.stringify(result).includes(key),false);
});
test('errores del proveedor no reflejan cuerpos o secretos ni disparan reintentos',async t=>{
  const f=await fixture(t);f.prepare();for(const status of [401,403,429,500]){let calls=0;const input=f.request(),key=input.api_key;await assert.rejects(callAIProvider(input,async()=>{calls++;return new Response(key,{status});}),e=>!e.message.includes(key));assert.equal(calls,1);assert.equal(input.api_key,'');}
  const input=f.request(),key=input.api_key;await assert.rejects(callAIProvider(input,async()=>{throw new Error(key);}),e=>!e.message.includes(key));assert.equal(input.api_key,'');
});
test('rechaza truncamiento, rechazo, JSON inválido y respuestas excesivas del proveedor',async t=>{
  const f=await fixture(t);f.prepare();for(const response of [Response.json({status:'incomplete',output:[]}),Response.json({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'No'}]}]}),new Response('invalid-json'),new Response('x'.repeat(1_000_001))])await assert.rejects(callAIProvider(f.request(),async()=>response));
});
test('una respuesta API inválida permanece corregible y nunca modifica por sí misma el documento',async t=>{
  const f=await fixture(t);f.prepare();const version=f.doc.version,input=f.request();const result=await f.store.ai.generate(f.editor,input,async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"kind":"case"}'}]}]}));
  assert.ok(result.validation_error);assert.equal(result.text,'{"kind":"case"}');assert.equal(f.store.qa.get(f.editor,f.project.id).version,version);assert.equal('api_key' in input,false);
});
test('el intermediario aplica CORS, método y autenticación antes de leer o enviar datos',async t=>{
  const f=await fixture(t);f.prepare();let calls=0,auth=0;const handler=createAIHandler({authenticate:async()=>{auth++;return {};},load:async()=>f.context(),reserve:async()=>{},call:async()=>{calls++;throw new Error();}});
  const req=(headers={},method='POST',body=JSON.stringify(f.request()))=>new Request('https://example.test/qa-ai',{method,headers:{Origin:'https://brancoretto24102-ui.github.io',Authorization:'Bearer fake.jwt.test','Content-Type':'application/json',...headers},...(method==='POST'?{body}:{})});
  assert.equal((await handler(req({Origin:'https://ajeno.example.test'}))).status,403);assert.equal((await handler(req({},'GET'))).status,405);assert.equal((await handler(req({Authorization:''}))).status,401);assert.equal(auth,0);
  assert.equal((await handler(req({},'OPTIONS'))).status,204);assert.equal((await handler(req({'Content-Type':'text/plain'}))).status,415);assert.equal((await handler(req({},'POST',' '.repeat(280001)))).status,413);assert.equal(calls,0);
});
test('el intermediario no llama a IA si fallan permisos o cuota, y borra las claves de errores',async t=>{
  const f=await fixture(t);f.prepare();let calls=0;const req=()=>new Request('https://example.test/qa-ai',{method:'POST',headers:{Origin:'https://brancoretto24102-ui.github.io',Authorization:'Bearer fake.jwt.test','Content-Type':'application/json'},body:JSON.stringify(f.request())});
  for(const stage of ['load','reserve']){const handler=createAIHandler({authenticate:async()=>({}),load:async()=>{if(stage==='load')throw new QAError(403,'Sin acceso');return f.context();},reserve:async()=>{if(stage==='reserve')throw new QAError(429,'Sin cuota');},call:async()=>{calls++;throw new Error();}});const r=await handler(req());assert.equal(r.status,stage==='load'?403:429);}
  assert.equal(calls,0);
});
test('intermediario exitoso devuelve propuesta sin secretos y con cabeceras privadas',async t=>{
  const f=await fixture(t);f.prepare();let held;const handler=createAIHandler({authenticate:async token=>{assert.equal(token,'fake.jwt.test');return {};},load:async()=>f.context(),reserve:async()=>{},call:async input=>{held=input;return {text:JSON.stringify(f.caseProposal()),provider:input.provider,model:input.model,input_tokens:1,output_tokens:2};}});
  const r=await handler(new Request('https://example.test/qa-ai',{method:'POST',headers:{Origin:'https://brancoretto24102-ui.github.io',Authorization:'Bearer fake.jwt.test','Content-Type':'application/json'},body:JSON.stringify(f.request())}));
  assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://brancoretto24102-ui.github.io');assert.equal((await r.json()).validation_error,undefined);assert.equal(held.api_key,'');
});
test('endpoints locales de IA conservan sesión, CSRF y aislamiento de preferencias',async t=>{
  const f=await fixture(t),server=createApp({store:f.store});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}`,session=f.store.issueSession(f.store.db.prepare('SELECT * FROM users WHERE id=?').get(f.editor.id));
  assert.equal((await fetch(base+'/api/ai/preferences')).status,401);
  const headers={Cookie:`qa_session=${session.token}`,Origin:'http://127.0.0.1:5173','Content-Type':'application/json'};
  assert.equal((await fetch(base+'/api/ai/preferences',{method:'PUT',headers,body:JSON.stringify({provider:'gemini',mode:'manual',model:'',version:0})})).status,403);
  const saved=await fetch(base+'/api/ai/preferences',{method:'PUT',headers:{...headers,'X-CSRF-Token':session.csrf},body:JSON.stringify({provider:'gemini',mode:'manual',model:'',version:0})});assert.equal(saved.status,200);assert.equal((await saved.json()).provider,'gemini');assert.equal(f.store.ai.preferences(f.other).provider,'none');
});
