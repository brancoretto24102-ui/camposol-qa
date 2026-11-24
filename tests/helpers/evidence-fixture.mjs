import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {Store} from '../../server/store.mjs';
import {captureInfo} from '../../src/evidence-domain.ts';
export const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWQAAAABJRU5ErkJggg==','base64'));
export const info=()=>({...captureInfo(png),filename:'captura ficticia.png',caption:'Prueba ficticia.',sha256:createHash('sha256').update(png).digest('hex')});
export async function fixture(t,databasePath){
  const store=new Store(databasePath);t.after(()=>store.close());
  const password=randomBytes(24).toString('base64url');
  const admin=(await store.bootstrap({full_name:'Admin ficticio',email:'evidence-admin@example.test',password})).user;
  const users={};for(const role of ['editor','lector','revisor'])users[role]=await store.createUser(admin,{full_name:role,email:role+'@example.test',password:randomBytes(24).toString('base64url'),role});
  const other=await store.createUser(admin,{full_name:'Otra persona',email:'otra@example.test',password:randomBytes(24).toString('base64url'),role:'editor'});
  const project=store.createProject(users.editor,{application_id:'digiproy',code:'QA-F4-TEST',name:'Prueba de evidencias',objective:'Prueba ficticia',description:'Sin datos empresariales',status:'borrador'});
  for(const role of ['lector','revisor'])store.setMember(admin,project.id,{user_id:users[role].id,role});
  const method=store.qa.methodologies(admin)[0];let doc=store.qa.command(users.editor,project.id,0,{action:'init',methodology_version_id:method.id});
  const apply=(actor,cmd)=>(doc=store.qa.command(actor,project.id,doc.version,cmd));
  const functionality={id:randomUUID(),name:'Guardar',description:'Guardar dato',source:'Regla ficticia'};
  apply(users.editor,{action:'save_context',context:{summary:'Ejemplo',functioning:'Guardar dato',source_notes:'Regla ficticia',functionalities:[functionality]}});
  apply(users.editor,{action:'submit',scope:'context'});apply(admin,{action:'approve',scope:'context'});
  const ids=[randomUUID(),randomUUID(),randomUUID()];
  apply(users.editor,{action:'save_selection',cases:ids.map((id,i)=>({id,functionality_id:functionality.id,included:i<2,name:'Caso '+(i+1),justification:'Regla ficticia',priority:'Alta'}))});
  apply(users.editor,{action:'submit',scope:'selection'});apply(admin,{action:'approve',scope:'selection'});
  for(let i=0;i<2;i++)apply(users.editor,{action:'save_case',case_id:ids[i],case:{requirement:'Requisito',description:'Descripción & texto <ficticio>',comment:'Comentario',steps:Array.from({length:i?1:2},(_,j)=>({id:randomUUID(),description:'Paso '+(j+1),arguments:'Dato de prueba',expected_result:'Dato guardado'}))}});
  const evidence=store.qa.evidence,attach=()=>evidence.attach(users.editor,project.id,doc.version,ids[0],doc.content.cases[0].steps[0].id,info(),png);
  return {store,admin,login:{email:'evidence-admin@example.test',password},...users,other,project,method,evidence,ids,apply,attach,get doc(){return doc;}};
}
