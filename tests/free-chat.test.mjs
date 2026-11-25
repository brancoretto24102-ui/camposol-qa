import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Store} from '../server/store.mjs';
import {createApp} from '../server/index.mjs';
import {aiProposalCommand} from '../src/ai-domain.ts';
import {buildChatSource,validateChatInput,parseChatResult,chatHistoryWindow,chatHistoryForTurns,chatInstructions,chatResponseFormat,CHAT_REPAIR_MESSAGE,CHAT_SOURCE_LIMIT,CHAT_TOTAL_LIMIT,CHAT_OUTPUT_TOKENS,FREE_CHAT_MODEL} from '../src/ai-chat-domain.ts';
import {callFreeChat,freeChatStatus} from '../supabase/functions/_shared/ai-free-chat.ts';
import {createAIHandler} from '../supabase/functions/_shared/ai-handler.ts';
import {FreeChatAvailability} from '../src/features/free-chat-status.ts';
import {QAError} from '../src/qa-domain.ts';

const secret=()=>randomBytes(24).toString('base64url'),quote='La persona ingresa un dato y lo guarda.';
async function fixture(t){
  const store=new Store();t.after(()=>store.close());const admin=(await store.bootstrap({full_name:'Admin ficticio',email:'admin-chat@example.test',password:secret()})).user;
  const editor=await store.createUser(admin,{full_name:'Editor ficticio',email:'editor-chat@example.test',password:secret(),role:'editor'}),reader=await store.createUser(admin,{full_name:'Lector ficticio',email:'reader-chat@example.test',password:secret(),role:'lector'}),other=await store.createUser(admin,{full_name:'Otra cuenta',email:'other-chat@example.test',password:secret(),role:'editor'});
  const project=store.createProject(editor,{application_id:'digiproy',code:'CHAT-FICTICIO',name:'Cartilla ficticia de chat',objective:'Comprobar el guardado de un dato',description:quote,status:'borrador'});store.setMember(admin,project.id,{user_id:reader.id,role:'lector'});
  const method=store.qa.methodologies(editor)[0],fid=randomUUID(),cid=randomUUID();let doc=store.qa.command(editor,project.id,0,{action:'init',methodology_version_id:method.id});
  const apply=(actor,command)=>{doc=store.qa.command(actor,project.id,doc.version,command);return doc;};
  apply(editor,{action:'save_context',context:{summary:'Formulario ficticio',functioning:quote,source_notes:'Fuente ficticia para pruebas',functionalities:[{id:fid,name:'Guardar un dato',description:quote,source:'Fuente ficticia'}]}});
  const context=()=>({project,document:structuredClone(doc),methodology:method});
  const input=()=>({project_id:project.id,version:doc.version,task:'analysis',prompt:buildChatSource(context(),{task:'analysis'}),message:'Revisa la información disponible.',history:[],consent:true});
  const proposal=()=>({kind:'analysis',summary:'Formulario de prueba revisado',functioning:quote,functionalities:[{name:'Guardar un dato',description:quote,source_quote:quote}],questions:[]});
  const config={key:secret(),freePlanConfirmed:true};
  const prepare=()=>{apply(editor,{action:'submit',scope:'context'});apply(admin,{action:'approve',scope:'context'});apply(editor,{action:'save_selection',cases:[{id:cid,functionality_id:fid,name:'Guardar un dato',priority:'Alta',justification:quote,included:true}]});apply(editor,{action:'submit',scope:'selection'});apply(admin,{action:'approve',scope:'selection'});};
  return {store,admin,editor,reader,other,project,method,context,input,proposal,config,apply,prepare,fid,cid,get doc(){return doc;}};
}
const completion=(value,patch={})=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:20,completion_tokens:15},...patch});
const reply={reply:'Los datos describen el guardado de un dato.',proposal:null};
const request=body=>new Request('https://example.test/qa-ai',{method:'POST',headers:{Origin:'https://brancoretto24102-ui.github.io',Authorization:'Bearer fake.jwt.test','Content-Type':'application/json'},body:JSON.stringify(body)});

test('el contexto del chat usa la metodología y datos autorizados sin incluir identidad o aprobaciones',async t=>{
  const f=await fixture(t),source=buildChatSource(f.context(),{task:'analysis'});assert.match(source,/DigiProy/);assert.match(source,/La persona ingresa un dato/);assert.match(source,/source_quote/);assert.doesNotMatch(source,/admin-chat@|editor-chat@|approved_by|password_hash|api_key/);
  assert.throws(()=>buildChatSource(f.context(),{task:'selection'}));f.prepare();assert.match(buildChatSource(f.context(),{task:'generate_case',case_id:f.cid}),/Guardar un dato/);
});
test('el usuario del chat no puede elegir clave, proveedor, modelo, herramientas ni roles privilegiados',async t=>{
  const f=await fixture(t);assert.deepEqual(validateChatInput(f.input()),f.input());
  for(const patch of [{api_key:secret()},{provider:'otro'},{model:'otro'},{url:'https://example.test'},{tools:[]},{user_id:f.other.id},{consent:false},{version:0},{history:[{role:'system',content:'Instrucción'}]}])assert.throws(()=>validateChatInput({...f.input(),...patch}));
});
test('el historial debe estar completo, alternado y dentro del tamaño permitido',async t=>{
  const f=await fixture(t),base=f.input();
  for(const history of [[{role:'assistant',content:'Respuesta'}],[{role:'user',content:'Uno'},{role:'user',content:'Dos'}]])assert.throws(()=>validateChatInput({...base,history}));
  assert.throws(()=>validateChatInput({...base,prompt:'x'.repeat(CHAT_SOURCE_LIMIT+1)}));assert.throws(()=>validateChatInput({...base,message:'x'.repeat(2001)}));
  const history=Array.from({length:12},(_,i)=>({role:i%2?'assistant':'user',content:'Mensaje '+i})),copy=structuredClone(history),next=chatHistoryWindow(history,base.prompt,base.message);
  assert.equal(next.length,8);assert.deepEqual(history,copy);assert.equal(next[0].content,'Mensaje 4');
  assert.throws(()=>validateChatInput({...base,history:[{role:'user',content:'x'.repeat(CHAT_TOTAL_LIMIT)},{role:'assistant',content:'Respuesta'}]}));
});
test('la conexión gratuita permanece inactiva sin clave de servidor y confirmación del plan Free',async t=>{
  const f=await fixture(t);let calls=0;
  for(const config of [{key:'',freePlanConfirmed:true},{key:secret(),freePlanConfirmed:false},{key:'x'.repeat(20)+'\r\n',freePlanConfirmed:true}]){
    assert.equal(freeChatStatus(config).enabled,false);await assert.rejects(callFreeChat(f.input(),config,async()=>{calls++;throw 0;}),e=>e.status===503);
  }
  assert.equal(calls,0);assert.deepEqual(freeChatStatus(f.config),{enabled:true,provider:'groq',model:FREE_CHAT_MODEL});
  assert.equal(JSON.stringify(freeChatStatus(f.config)).includes(f.config.key),false);
});
test('Groq usa endpoint y modelo fijos, clave solo en cabecera y conversación sin herramientas',async t=>{
  const f=await fixture(t),input=f.input();input.history=[{role:'user',content:'Pregunta previa'},{role:'assistant',content:JSON.stringify(reply)}];let calls=0;
  const result=await callFreeChat(input,f.config,async(url,init)=>{
    calls++;assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(init.headers.Authorization,`Bearer ${f.config.key}`);assert.equal(init.redirect,'error');assert.ok(init.signal);
    const body=JSON.parse(init.body);assert.equal(body.model,FREE_CHAT_MODEL);assert.equal(body.max_completion_tokens,CHAT_OUTPUT_TOKENS);assert.equal(body.include_reasoning,false);assert.equal(body.reasoning_effort,'low');assert.equal(body.response_format.type,'json_schema');assert.equal(body.response_format.json_schema.strict,true);assert.equal('tools' in body,false);
    assert.equal(JSON.stringify(body).includes(f.config.key),false);assert.equal(body.messages.at(-1).content,input.message);assert.deepEqual(body.messages.slice(2,-1),input.history);return completion(reply);
  });assert.equal(calls,1);assert.equal(result.text,JSON.stringify(reply));assert.equal(result.input_tokens,20);assert.equal(JSON.stringify(result).includes(f.config.key),false);
});
test('los errores de la cuota gratuita no reflejan cuerpos privados ni activan reintentos o proveedores pagos',async t=>{
  const f=await fixture(t);
  for(const status of [401,403,429,500]){let calls=0;await assert.rejects(callFreeChat(f.input(),f.config,async()=>{calls++;return new Response(f.config.key,{status});}),e=>!e.message.includes(f.config.key)&&(status!==429||/cuota gratuita compartida/.test(e.message)));assert.equal(calls,1);}
  let calls=0;await assert.rejects(callFreeChat(f.input(),f.config,async()=>{calls++;throw new Error(f.config.key);}),e=>!e.message.includes(f.config.key));assert.equal(calls,1);
});
test('una respuesta truncada, enorme, sin contenido o con herramientas se rechaza',async t=>{
  const f=await fixture(t);
  for(const response of [new Response('x'.repeat(200_001)),new Response('no-json'),completion(reply,{choices:[{finish_reason:'length',message:{content:JSON.stringify(reply)}}]}),completion(reply,{choices:[{finish_reason:'stop',message:{reasoning:'contenido privado'}}]}),completion(reply,{choices:[{finish_reason:'stop',message:{content:JSON.stringify(reply),tool_calls:[{}]}}]}),completion({reply:f.config.key,proposal:null})])await assert.rejects(callFreeChat(f.input(),f.config,async()=>response));
});
test('el chat admite conversación normal y mantiene las propuestas sin aprobación automática',async t=>{
  const f=await fixture(t),before=f.doc.version;
  const plain=parseChatResult({text:JSON.stringify(reply),input_tokens:1,output_tokens:1},f.context(),{task:'analysis'});assert.equal(plain.reply,reply.reply);assert.equal(plain.proposal,null);
  const result=await f.store.ai.chat(f.editor,f.input(),async()=>completion({reply:'Preparé una propuesta de análisis.',proposal:f.proposal()}),f.config);
  assert.equal(result.proposal.kind,'analysis');assert.equal(f.store.qa.get(f.editor,f.project.id).version,before);
  f.apply(f.editor,aiProposalCommand(result.proposal,f.context(),{task:'analysis'},randomUUID));assert.equal(f.doc.content.context.review.status,'borrador');assert.equal(f.doc.version,before+1);
});
test('una propuesta inventada o con aprobaciones queda rechazada sin perder el mensaje del chat',async t=>{
  const f=await fixture(t);for(const mutate of [p=>p.functionalities[0].source_quote='Regla que no aparece en la fuente',p=>p.approved_by=f.admin.id]){const p=f.proposal();mutate(p);const result=parseChatResult({text:JSON.stringify({reply:'Revisa estos puntos.',proposal:p}),input_tokens:null,output_tokens:null},f.context(),{task:'analysis'});assert.equal(result.proposal,null);assert.ok(result.validation_error);assert.equal(result.reply,'Revisa estos puntos.');}
  for(const value of [[],{reply:'Hola'},{reply:'Hola',proposal:null,api_key:secret()},{reply:'',proposal:null}])assert.throws(()=>parseChatResult({text:JSON.stringify(value),input_tokens:null,output_tokens:null},f.context(),{task:'analysis'}));
});
test('el contrato estricto exige citas y campos completos sin ampliar permisos en ninguna tarea',()=>{
  for(const task of ['analysis','selection','coverage','generate_case','improve_case','shorten_case','arguments','results']){
    const format=chatResponseFormat({task}),schema=format.json_schema.schema;
    assert.deepEqual(schema.required,['reply','proposal']);assert.equal(schema.additionalProperties,false);
    const proposal=schema.properties.proposal.anyOf[0];assert.deepEqual(proposal.properties.kind.enum,[task==='analysis'?'analysis':task==='selection'?'selection':task==='coverage'?'coverage':'case']);
    const item=task==='analysis'?proposal.properties.functionalities.items:task==='selection'?proposal.properties.cases.items:task==='coverage'?proposal.properties.gaps.items:proposal.properties.case.properties.steps.items;
    assert.ok(item.required.includes('source_quote'));assert.equal(item.additionalProperties,false);assert.match(item.properties.source_quote.description,/8 caracteres/);
    assert.deepEqual(schema.properties.proposal.anyOf[1],{type:'null'});assert.equal('approved_by' in proposal.properties,false);
  }
  assert.match(chatInstructions({task:'analysis'}),/contexto.source_notes/);assert.match(chatInstructions({task:'selection'}),/funcionalidad identificada por functionality_id/);
  assert.match(chatInstructions({task:'selection'}),/validation_error/);assert.match(chatInstructions({task:'selection'}),/8 caracteres/);
});
test('una cita ausente, corta o ajena no se completa ni se convierte en una propuesta aplicable',async t=>{
  const f=await fixture(t),before=f.doc.version;
  for(const quoteValue of [undefined,'','corta','Un requisito inventado que no está en la cartilla']){
    const candidate=f.proposal();candidate.functionalities[0].source_quote=quoteValue;
    const result=parseChatResult({text:JSON.stringify({reply:'Preparé la propuesta.',proposal:candidate}),input_tokens:1,output_tokens:1},f.context(),{task:'analysis'});
    assert.equal(result.proposal,null);assert.ok(result.validation_error);assert.equal(result.reply,'Preparé la propuesta.');
  }
  assert.equal(f.doc.version,before);
});
test('la corrección de una selección conserva el rechazo en el historial y solo se guarda con una acción explícita',async t=>{
  const f=await fixture(t);f.prepare();const before=f.doc.version;
  const input={...f.input(),task:'selection',prompt:buildChatSource(f.context(),{task:'selection'}),message:'Prepara una propuesta para la tarea seleccionada.'};
  const candidate={kind:'selection',cases:[{functionality_id:f.fid,name:'Registrar el dato',justification:quote,priority:'Alta',source_quote:'guardar'}],questions:[]};
  let calls=0;
  const rejected=await f.store.ai.chat(f.editor,input,async()=>{calls++;return completion({reply:'Se presenta la propuesta de selección.',proposal:candidate});},f.config);
  assert.equal(calls,1);assert.equal(rejected.proposal,null);assert.ok(rejected.validation_error);assert.equal(f.doc.version,before);
  const turns=[{role:'user',content:input.message},{role:'assistant',content:rejected.reply,proposal:rejected.proposal,validation_error:rejected.validation_error}];
  const history=chatHistoryForTurns(turns),feedback=JSON.parse(history[1].content);
  assert.equal(feedback.validation_error,rejected.validation_error);assert.equal(feedback.proposal,null);assert.equal('cases' in feedback,false);
  const corrected=await f.store.ai.chat(f.editor,{...input,message:CHAT_REPAIR_MESSAGE,history},async(_url,init)=>{
    calls++;const messages=JSON.parse(init.body).messages;
    assert.equal(JSON.parse(messages.at(-2).content).validation_error,rejected.validation_error);
    return completion({reply:'Corregí las citas de la propuesta.',proposal:{...candidate,cases:[{...candidate.cases[0],source_quote:quote}]}});
  },f.config);
  assert.equal(calls,2);assert.equal(corrected.validation_error,undefined);assert.equal(corrected.proposal.kind,'selection');assert.equal(f.doc.version,before);
  f.apply(f.editor,aiProposalCommand(corrected.proposal,f.context(),{task:'selection'},randomUUID));
  assert.equal(f.doc.version,before+1);assert.equal(f.doc.content.selection.status,'requiere_correccion');assert.equal(f.doc.content.cases.length,2);
});
test('permisos, cuenta activa y versión se comprueban antes de llamar al chat compartido',async t=>{
  const f=await fixture(t);let calls=0;const fetcher=async()=>{calls++;return completion(reply);};
  for(const user of [f.reader,f.other])await assert.rejects(f.store.ai.chat(user,f.input(),fetcher,f.config));
  await assert.rejects(f.store.ai.chat(f.editor,{...f.input(),version:1},fetcher,f.config));
  f.store.updateUser(f.admin,f.editor.id,{...f.editor,active:false});await assert.rejects(f.store.ai.chat(f.editor,f.input(),fetcher,f.config));assert.equal(calls,0);
});
test('las cuotas existentes también limitan el chat y no guardan mensajes o la clave compartida',async t=>{
  const f=await fixture(t);let calls=0;const fetcher=async()=>{calls++;return completion(reply);};
  await assert.rejects(f.store.ai.chat(f.editor,f.input(),fetcher,{...f.config,freePlanConfirmed:false}));assert.equal(f.store.db.prepare('SELECT count(*) n FROM ai_api_usage').get().n,0);
  for(let i=0;i<4;i++)await f.store.ai.chat(f.editor,f.input(),fetcher,f.config);await assert.rejects(f.store.ai.chat(f.editor,f.input(),fetcher,f.config),e=>e.status===429);assert.equal(calls,4);
  const row=f.store.db.prepare('SELECT * FROM ai_api_usage').get();assert.deepEqual(Object.keys(row).sort(),['user_id','minute_start','minute_count','day_start','day_count'].sort());assert.equal(JSON.stringify(row).includes(f.config.key),false);
});
test('disponibilidad del chat requiere sesión y no consume cuota ni revela secretos',async t=>{
  const f=await fixture(t);let calls=0,reservations=0;
  const handler=createAIHandler({authenticate:async()=>({}),load:async()=>f.context(),reserve:async()=>{reservations++;},call:async()=>{calls++;throw 0;},freeStatus:()=>freeChatStatus(f.config),chat:async()=>{calls++;throw 0;}});
  const res=await handler(request({action:'free_status'}));assert.equal(res.status,200);const body=await res.json();assert.equal(body.enabled,true);assert.equal(JSON.stringify(body).includes(f.config.key),false);assert.equal(reservations,0);assert.equal(calls,0);
  assert.equal((await handler(request({action:'free_status',api_key:secret()}))).status,422);
  const unsigned=new Request('https://example.test/qa-ai',{method:'POST',headers:{Origin:'https://brancoretto24102-ui.github.io','Content-Type':'application/json'},body:JSON.stringify({action:'free_status'})});assert.equal((await handler(unsigned)).status,401);
});
test('el intermediario gratuito valida etapa, configuración y cuota antes del transporte',async t=>{
  const f=await fixture(t);let calls=0,reservations=0;const deps={authenticate:async()=>({}),load:async()=>f.context(),reserve:async()=>{reservations++;},call:async()=>{throw 0;},chat:async()=>{calls++;return {text:JSON.stringify(reply),input_tokens:1,output_tokens:1};}};
  assert.equal((await createAIHandler(deps)(request({...f.input(),action:'chat'}))).status,503);assert.equal(reservations,0);
  const handler=createAIHandler({...deps,freeStatus:()=>freeChatStatus(f.config)});
  assert.equal((await handler(request({...f.input(),action:'chat',task:'selection'}))).status,422);assert.equal(calls,0);assert.equal(reservations,0);
  const quota=createAIHandler({...deps,freeStatus:()=>freeChatStatus(f.config),reserve:async()=>{throw new QAError(429,'Cuota de prueba');}});assert.equal((await quota(request({...f.input(),action:'chat'}))).status,429);assert.equal(calls,0);
  const res=await handler(request({...f.input(),action:'chat'}));assert.equal(res.status,200);assert.equal((await res.json()).reply,reply.reply);assert.equal(calls,1);assert.equal(reservations,1);
});
test('los endpoints locales del chat conservan sesión, CSRF y el estado inactivo por defecto',async t=>{
  const f=await fixture(t),server=createApp({store:f.store});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}`,origin='http://127.0.0.1:5173';
  assert.equal((await fetch(url+'/api/ai/free/status')).status,401);
  const realStatus=f.store.ai.freeStatus.bind(f.store.ai),realChat=f.store.ai.chat.bind(f.store.ai),disabled={key:'',freePlanConfirmed:false};
  f.store.ai.freeStatus=user=>realStatus(user,disabled);f.store.ai.chat=(user,input)=>realChat(user,input,undefined,disabled);
  const userSession=f.store.issueSession(f.editor);
  const headers={Cookie:`qa_session=${userSession.token}`,Origin:origin,'Content-Type':'application/json'};
  const status=await fetch(url+'/api/ai/free/status',{headers});assert.equal(status.status,200);assert.equal((await status.json()).enabled,false);
  assert.equal((await fetch(url+'/api/ai/chat',{method:'POST',headers,body:JSON.stringify(f.input())})).status,403);
  headers['X-CSRF-Token']=userSession.csrf;
  assert.equal((await fetch(url+'/api/ai/chat',{method:'POST',headers,body:JSON.stringify({...f.input(),consent:false})})).status,422);
  assert.equal((await fetch(url+'/api/ai/chat',{method:'POST',headers,body:JSON.stringify(f.input())})).status,503);
  assert.equal(f.store.db.prepare('SELECT count(*) n FROM ai_api_usage').get().n,0);
});
test('la interfaz no presenta el servicio como activo mientras falta la activación',()=>{
  const disabled=renderToStaticMarkup(h(FreeChatAvailability,{status:{enabled:false,provider:'groq',model:FREE_CHAT_MODEL},loading:false,error:'',onReload:()=>{}}));assert.match(disabled,/necesita activación/);assert.doesNotMatch(disabled,/Chat gratuito disponible/);
  const enabled=renderToStaticMarkup(h(FreeChatAvailability,{status:{enabled:true,provider:'groq',model:FREE_CHAT_MODEL},loading:false,error:'',onReload:()=>{}}));assert.match(enabled,/Chat gratuito disponible/);assert.match(enabled,/cuota compartida/);
});
