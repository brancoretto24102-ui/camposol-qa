import {createElement as h,useEffect,useState,type ChangeEvent,type FormEvent} from 'react';
import type {Backend} from '../backend.ts';
import type {Member,Profile,Project} from '../domain.ts';
import {
  canReview,caseReady,newReview,reviewLabels,type CaseStep,type Functionality,type MethodologyVersion,
  type QAActor,type QACase,type QACommand,type QAContent,type QADocument,type QARevision,type Review,
} from '../qa-domain.ts';
import {Alert,Button,Empty,PageTitle,dateTime} from '../ui.ts';
import {message,value} from '../forms.ts';
import {moveItem,QAField,ReviewBadge,ReviewInfo} from './qa-common.ts';
import {MatrixPreview} from './qa-matrix.ts';
import {CartillaAIAssistant} from './ai-workspace.ts';
import type {AITask} from '../ai-domain.ts';

type Run=(command:QACommand)=>Promise<QADocument>;
type Dirty=(dirty:boolean)=>void;
function useDirty(dirty:boolean,onDirty:Dirty){
  useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
  useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
}
function ReviewActions({review,actor,scope,caseId,run,busy,dirty}:{review:Review;actor:QAActor;scope:'context'|'selection'|'case';caseId?:string;run:Run;busy:boolean;dirty:boolean}){
  const [observation,setObservation]=useState(''),[error,setError]=useState('');
  const submit=async(action:string)=>{setError('');try{await run({action,scope,...(caseId?{case_id:caseId}:{}),observation});setObservation('');}catch(e){setError(message(e));}};
  const allowed=canReview(actor,review);
  return h('section',{className:'qa-review-box','aria-label':'Estado y aprobación'},h(ReviewInfo,{review}),
    dirty&&h('p',{className:'small muted'},'Guarda los cambios antes de enviar o aprobar esta versión.'),h(Alert,{message:error}),
    actor.can_edit&&review.status!=='aprobado'&&review.status!=='en_revision'&&h(Button,{variant:'secondary',disabled:busy||dirty,onClick:()=>void submit('submit')},'Enviar a revisión'),
    review.status==='en_revision'&&allowed&&h('div',null,h(QAField,{label:'Observaciones de revisión',value:observation,onChange:setObservation,rows:2,maxLength:4000,hint:'Para solicitar una corrección, explica qué debe cambiar.'}),
      h('div',{className:'qa-row-actions'},h(Button,{disabled:busy||dirty,onClick:()=>void submit('approve')},'Aprobar esta versión'),h(Button,{variant:'secondary',disabled:busy||dirty,onClick:()=>void submit('correct')},'Solicitar corrección'))),
    review.status==='en_revision'&&!allowed&&h('p',{className:'small muted'},'La revisión corresponde a un revisor asignado o al administrador. La autoaprobación requiere autorización.'));
}

function ContextEditor({doc,actor,run,busy,onDirty}:{doc:QADocument;actor:QAActor;run:Run;busy:boolean;onDirty:Dirty}){
  const initial=doc.content.context;
  const [summary,setSummary]=useState(initial.summary),[functioning,setFunctioning]=useState(initial.functioning),[sourceNotes,setSourceNotes]=useState(initial.source_notes),[functions,setFunctions]=useState<Functionality[]>(structuredClone(initial.functionalities)),[error,setError]=useState('');
  const context={summary,functioning,source_notes:sourceNotes,functionalities:functions};
  const dirty=JSON.stringify(context)!==JSON.stringify({summary:initial.summary,functioning:initial.functioning,source_notes:initial.source_notes,functionalities:initial.functionalities});useDirty(dirty,onDirty);
  const edit=(index:number,field:keyof Functionality,v:string)=>setFunctions(functions.map((f,i)=>i===index?{...f,[field]:v}:f));
  return h('div',{className:'qa-context-grid'},h('section',{className:'panel form-panel'},h('h2',null,'Información y funcionamiento de la cartilla'),h('p',{className:'muted'},'Describe las operaciones reales y las reglas que deben comprobarse.'),h(Alert,{message:error}),
    h('form',{onSubmit:async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();setError('');try{await run({action:'save_context',context});}catch(err){setError(message(err));}}},
      h(QAField,{label:'Descripción general',value:summary,onChange:setSummary,rows:4,maxLength:10000,readOnly:!actor.can_edit}),
      h(QAField,{label:'Funcionamiento y reglas',value:functioning,onChange:setFunctioning,rows:6,maxLength:20000,readOnly:!actor.can_edit}),
      h(QAField,{label:'Documentos y reglas de referencia',value:sourceNotes,onChange:setSourceNotes,rows:3,maxLength:10000,readOnly:!actor.can_edit,hint:'Indica nombre, versión y sección de las fuentes que respaldan la cartilla.'}),
      h('div',{className:'panel-title'},h('h3',null,'Funcionalidades identificadas'),actor.can_edit&&h(Button,{variant:'secondary',disabled:busy,onClick:()=>setFunctions([...functions,{id:crypto.randomUUID(),name:'',description:'',source:''}])},'Agregar funcionalidad')),
      !functions.length&&h('p',{className:'muted'},'Registra las funcionalidades que vas a comprobar.'),
      ...functions.map((f,i)=>h('fieldset',{className:'qa-function',key:f.id},h('legend',null,`Funcionalidad ${i+1}`),
        h(QAField,{label:'Nombre de la funcionalidad',value:f.name,onChange:v=>edit(i,'name',v),required:true,maxLength:160,readOnly:!actor.can_edit}),
        h(QAField,{label:'Operación o regla',value:f.description,onChange:v=>edit(i,'description',v),rows:2,maxLength:4000,readOnly:!actor.can_edit}),
        h(QAField,{label:'Origen de la información',value:f.source,onChange:v=>edit(i,'source',v),maxLength:2000,readOnly:!actor.can_edit}),
        actor.can_edit&&h('div',{className:'qa-row-actions'},h(Button,{variant:'ghost',disabled:busy||i===0,onClick:()=>setFunctions(moveItem(functions,i,-1))},'Subir'),h(Button,{variant:'ghost',disabled:busy||i===functions.length-1,onClick:()=>setFunctions(moveItem(functions,i,1))},'Bajar'),h(Button,{variant:'ghost',disabled:busy,onClick:()=>setFunctions(functions.filter((_,j)=>j!==i))},'Retirar funcionalidad')))),
      actor.can_edit&&h('div',{className:'form-actions'},h(Button,{type:'submit',disabled:busy},busy?'Guardando…':'Guardar contexto en borrador')))),
    h('aside',{className:'qa-aside'},h('section',{className:'panel form-panel'},h('h2',null,'Revisión del contexto'),h('p',null,'Se necesita una descripción, el funcionamiento y al menos una funcionalidad para enviar el contexto a revisión.'),h(ReviewActions,{review:initial.review,actor,scope:'context',run,busy,dirty}))));
}

function SelectionEditor({doc,actor,method,run,busy,onDirty}:{doc:QADocument;actor:QAActor;method:MethodologyVersion;run:Run;busy:boolean;onDirty:Dirty}){
  const [cases,setCases]=useState<QACase[]>(structuredClone(doc.content.cases)),[error,setError]=useState('');
  const proposal=(c:QACase)=>({id:c.id,functionality_id:c.functionality_id,included:c.included,name:c.name,justification:c.justification,priority:c.priority});
  const dirty=JSON.stringify(cases.map(proposal))!==JSON.stringify(doc.content.cases.map(proposal));useDirty(dirty,onDirty);
  const edit=(index:number,patch:Partial<QACase>)=>setCases(cases.map((c,i)=>i===index?{...c,...patch}:c));
  return h('div',null,h('section',{className:'panel form-panel'},h('div',{className:'panel-title'},h('div',null,h('h2',null,'Selecciona los casos que necesitas'),h('p',{className:'muted'},'Relaciona cada caso con una funcionalidad documentada y explica su propósito.')),
    actor.can_edit&&h(Button,{variant:'secondary',disabled:busy||doc.content.context.functionalities.length===0,onClick:()=>setCases([...cases,{id:crypto.randomUUID(),functionality_id:doc.content.context.functionalities[0].id,included:true,name:'',justification:'',priority:method.config.priorities[0],requirement:'',description:'',comment:'',steps:[],review:newReview(actor)}])},'Agregar propuesta')),
    h('p',{className:'small muted'},method.config.case_guidance),h(Alert,{message:error}),
    h('form',{onSubmit:async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();setError('');try{await run({action:'save_selection',cases:cases.map(proposal)});}catch(err){setError(message(err));}}},
      ...cases.map((c,i)=>h('fieldset',{key:c.id,className:`qa-proposal ${c.included?'':'excluded'}`},h('legend',null,`Propuesta ${i+1}`),
        h('label',{className:'checkbox'},h('input',{type:'checkbox',checked:c.included,disabled:!actor.can_edit||busy,onChange:(e:ChangeEvent<HTMLInputElement>)=>edit(i,{included:e.target.checked})}),' Incluir este caso'),
        h(QAField,{label:'Nombre CP',value:c.name,onChange:v=>edit(i,{name:v}),maxLength:200,required:true,readOnly:!actor.can_edit}),
        h('div',{className:'form-grid'},h('label',{className:'field'},h('span',null,'Funcionalidad *'),h('select',{value:c.functionality_id,disabled:!actor.can_edit,onChange:(e:ChangeEvent<HTMLSelectElement>)=>edit(i,{functionality_id:e.target.value})},...doc.content.context.functionalities.map(f=>h('option',{value:f.id,key:f.id},f.name)))),
          h('label',{className:'field'},h('span',null,'Prioridad *'),h('select',{value:c.priority,disabled:!actor.can_edit,onChange:(e:ChangeEvent<HTMLSelectElement>)=>edit(i,{priority:e.target.value})},...method.config.priorities.map(p=>h('option',{value:p,key:p},p))))),
        h(QAField,{label:'Justificación breve',value:c.justification,onChange:v=>edit(i,{justification:v}),rows:2,required:true,maxLength:4000,readOnly:!actor.can_edit}),
        actor.can_edit&&h('div',{className:'qa-row-actions'},h(Button,{variant:'ghost',disabled:busy||i===0,onClick:()=>setCases(moveItem(cases,i,-1))},'Subir propuesta'),h(Button,{variant:'ghost',disabled:busy||i===cases.length-1,onClick:()=>setCases(moveItem(cases,i,1))},'Bajar propuesta'),h(Button,{variant:'ghost',disabled:busy,onClick:()=>setCases(cases.filter((_,j)=>j!==i))},'Retirar propuesta')))),
      !cases.length&&h(Empty,{title:'Aún no hay propuestas',text:doc.content.context.functionalities.length?'Agrega los casos respaldados por las funcionalidades.':'Registra primero las funcionalidades en el contexto.'}),
      actor.can_edit&&h('div',{className:'form-actions'},h('span',{className:'muted'},`${cases.filter(c=>c.included).length} casos incluidos`),h(Button,{type:'submit',disabled:busy},busy?'Guardando…':'Guardar selección en borrador')))),
    h('section',{className:'panel form-panel'},h('h2',null,'Aprobación del conjunto de casos'),doc.content.context.review.status!=='aprobado'&&h('p',{className:'notice info'},'El contexto debe estar aprobado antes de revisar la selección.'),h(ReviewActions,{review:doc.content.selection,actor,scope:'selection',run,busy,dirty})));
}

function CaseEditor({doc,actor,method,caseId,onNavigate,run,busy,onDirty}:{doc:QADocument;actor:QAActor;method:MethodologyVersion;caseId:string;onNavigate:(id:string)=>void;run:Run;busy:boolean;onDirty:Dirty}){
  const c=doc.content.cases.find(c=>c.id===caseId)!;
  const [requirement,setRequirement]=useState(c.requirement),[description,setDescription]=useState(c.description),[comment,setComment]=useState(c.comment),[steps,setSteps]=useState<CaseStep[]>(structuredClone(c.steps)),[error,setError]=useState(''),[pending,setPending]=useState('');
  const body={requirement,description,comment,steps},dirty=JSON.stringify(body)!==JSON.stringify({requirement:c.requirement,description:c.description,comment:c.comment,steps:c.steps});useDirty(dirty,onDirty);
  const included=doc.content.cases.filter(c=>c.included),index=included.findIndex(x=>x.id===c.id);
  const save=async(target?:string)=>{setError('');try{await run({action:'save_case',case_id:c.id,case:body});if(target)onNavigate(target);}catch(err){setError(message(err));}};
  const navigate=(id:string)=>{if(id===c.id)return;if(actor.can_edit&&(dirty||c.review.status==='pendiente'))setPending(id);else onNavigate(id);};
  const edit=(index:number,field:keyof CaseStep,v:string)=>setSteps(steps.map((s,i)=>i===index?{...s,[field]:v}:s));
  const preview:QAContent={...doc.content,cases:doc.content.cases.map(x=>x.id===c.id?{...x,...body}:x)};
  const invalid=caseReady({...c,...body},method.config);
  return h('div',{className:'qa-case-layout'},h('aside',{className:'panel qa-case-list','aria-label':'Casos de la cartilla'},h('h2',null,'Casos de prueba'),
    ...included.map((item,i)=>h('button',{key:item.id,type:'button',className:`qa-case-link ${item.id===c.id?'active':''}`,'aria-current':item.id===c.id?'step':undefined,disabled:busy,onClick:()=>navigate(item.id)},
      h('span',{className:'qa-case-number'},`CP${String(i+1).padStart(2,'0')}`),h('strong',null,item.name),h(ReviewBadge,{status:item.review.status})))),
    h('div',{className:'qa-case-content'},h('section',{className:'panel form-panel'},h('div',{className:'panel-title'},h('div',null,h('span',{className:'eyebrow'},`CP${String(index+1).padStart(2,'0')} · ${index+1} de ${included.length}`),h('h2',null,c.name)),h(ReviewBadge,{status:c.review.status})),h(Alert,{message:error}),
      pending&&h('div',{className:'notice info',role:'status'},h('p',null,'Guarda expresamente este caso como borrador antes de continuar. Los cambios aún no están guardados.'),h('div',{className:'qa-row-actions'},h(Button,{disabled:busy,onClick:()=>void save(pending)},'Guardar borrador y continuar'),h(Button,{variant:'secondary',disabled:busy,onClick:()=>setPending('')},'Seguir editando este caso'))),
      h('form',{onSubmit:(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();void save();}},
        h(QAField,{label:'Nombre Requisito',value:requirement,onChange:setRequirement,rows:2,maxLength:4000,readOnly:!actor.can_edit}),
        h('div',{className:'form-grid'},h(QAField,{label:'Nombre CP',value:c.name,onChange:()=>{},readOnly:true,maxLength:200,hint:'El nombre y la prioridad se modifican desde la selección de casos.'}),h(QAField,{label:'Prioridad',value:c.priority,onChange:()=>{},readOnly:true})),
        h(QAField,{label:'Descripción Caso de Prueba',value:description,onChange:setDescription,rows:4,maxLength:10000,readOnly:!actor.can_edit}),
        h('div',{className:'panel-title'},h('h3',null,'Pasos del caso'),actor.can_edit&&h(Button,{variant:'secondary',disabled:busy,onClick:()=>setSteps([...steps,{id:crypto.randomUUID(),description:'',arguments:'',expected_result:''}])},'Agregar paso')),
        ...steps.map((s,i)=>h('fieldset',{key:s.id,className:'qa-step'},h('legend',null,`Paso ${i+1}`),
          h(QAField,{label:'Descripción Paso',value:s.description,onChange:v=>edit(i,'description',v),rows:3,maxLength:6000,readOnly:!actor.can_edit}),
          h(QAField,{label:'Argumentos',value:s.arguments,onChange:v=>edit(i,'arguments',v),rows:2,maxLength:6000,readOnly:!actor.can_edit}),
          h(QAField,{label:'Resultado Esperado',value:s.expected_result,onChange:v=>edit(i,'expected_result',v),rows:3,maxLength:6000,readOnly:!actor.can_edit}),
          actor.can_edit&&h('div',{className:'qa-row-actions'},h(Button,{variant:'ghost',disabled:busy||i===0,onClick:()=>setSteps(moveItem(steps,i,-1))},'Subir paso'),h(Button,{variant:'ghost',disabled:busy||i===steps.length-1,onClick:()=>setSteps(moveItem(steps,i,1))},'Bajar paso'),h(Button,{variant:'ghost',disabled:busy,onClick:()=>setSteps(steps.filter((_,j)=>j!==i))},'Retirar paso')))),
        !steps.length&&h('p',{className:'muted'},'Agrega los pasos que realizará la persona encargada de la prueba.'),
        h(QAField,{label:'Comentario',value:comment,onChange:setComment,rows:3,maxLength:6000,readOnly:!actor.can_edit}),
        actor.can_edit&&h('div',{className:'form-actions'},h('span',{className:'small muted'},dirty?'Cambios sin guardar':'Contenido guardado'),h(Button,{type:'submit',disabled:busy},busy?'Guardando…':'Guardar caso en borrador'))),
      invalid&&h('p',{className:'small muted'},`Para revisión: ${invalid}`),h(ReviewActions,{review:c.review,actor,scope:'case',caseId:c.id,run,busy,dirty}),
      h('div',{className:'qa-case-navigation'},h(Button,{variant:'secondary',disabled:busy||index===0,onClick:()=>navigate(included[index-1].id)},'Caso anterior'),h(Button,{variant:'secondary',disabled:busy||index===included.length-1,onClick:()=>navigate(included[index+1].id)},'Caso siguiente'))),
      h('section',{className:'panel form-panel'},h('h2',null,dirty?'Vista previa del borrador':'Vista previa de la fila'),h(MatrixPreview,{content:preview,config:method.config,caseId:c.id}))));
}

const actionLabels:Record<string,string>={init:'Inicio de cartilla',save_context:'Contexto guardado',save_selection:'Selección actualizada',save_case:'Caso guardado',submit:'Envío a revisión',approve:'Aprobación',correct:'Solicitud de corrección',project_context_changed:'Ficha de cartilla modificada'};
function DocumentHistory({backend,id,method}:{backend:Backend;id:string;method:MethodologyVersion}){
  const [rows,setRows]=useState<QARevision[]>([]),[snapshot,setSnapshot]=useState<QADocument|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[more,setMore]=useState(true);
  async function load(offset=0){setBusy(true);try{const page=await backend.qaHistory(id,offset);setRows(previous=>offset?[...previous,...page]:page);setMore(page.length===20);}catch(e){setError(message(e));}finally{setBusy(false);}}
  useEffect(()=>{void load();},[id]);
  return h('section',{className:'panel form-panel'},h('h2',null,'Historial documental'),h(Alert,{message:error}),
    snapshot?h('div',null,h('div',{className:'panel-title'},h('h3',null,`Versión documental ${snapshot.version} · consulta`),h(Button,{variant:'secondary',onClick:()=>setSnapshot(null)},'Volver al historial')),
      h('p',null,snapshot.content.context.summary),h('p',{className:'muted'},snapshot.content.context.functioning),h(MatrixPreview,{content:snapshot.content,config:method.config})):
      h('div',null,h('div',{className:'table-wrap'},h('table',null,h('thead',null,h('tr',null,...['Versión','Acción','Persona','Fecha',''].map(s=>h('th',{key:s,scope:'col'},s)))),h('tbody',null,...rows.map(row=>h('tr',{key:row.version},h('td',null,row.version),h('td',null,actionLabels[row.action]??row.action),h('td',null,row.actor_name),h('td',null,dateTime(row.created_at)),h('td',null,h(Button,{variant:'ghost',disabled:busy,onClick:async()=>{setBusy(true);setError('');try{setSnapshot(await backend.qaRevision(id,row.version));}catch(e){setError(message(e));}finally{setBusy(false);}}},'Consultar versión'))))))),
        more&&h(Button,{variant:'secondary',disabled:busy,onClick:()=>void load(rows.length)},busy?'Cargando…':'Cargar más versiones')));
}

export function QAWorkspace({backend,profile,id,onChanged}:{backend:Backend;profile:Profile;id:string;onChanged:()=>Promise<void>}){
  const [project,setProject]=useState<Project|null>(null),[doc,setDoc]=useState<QADocument|null>(null),[methods,setMethods]=useState<MethodologyVersion[]>([]),[members,setMembers]=useState<Member[]>([]),[tab,setTab]=useState('context'),[caseId,setCaseId]=useState(''),[error,setError]=useState(''),[success,setSuccess]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[assistantTask,setAssistantTask]=useState<AITask>('analysis');
  async function load(){const [p,d,m,team]=await Promise.all([backend.project(id),backend.qaDocument(id),backend.methodologies(),backend.members(id)]);setProject(p);setDoc(d);setMethods(m);setMembers(team);setDirty(false);}
  useEffect(()=>{void load().catch(e=>setError(message(e))).finally(()=>setLoading(false));},[id]);
  async function run(command:QACommand){setBusy(true);setError('');setSuccess('');try{const next=await backend.qaCommand(id,doc?.version??0,command);setDoc(next);setDirty(false);try{await onChanged();}catch{setError('El contenido quedó guardado. No se pudo actualizar el resumen de proyectos; recarga cuando vuelva la conexión.');}setSuccess(command.action==='approve'?'Versión aprobada.':command.action==='correct'?'Observación registrada.':command.action==='submit'?'Contenido enviado a revisión.':'Cambios guardados.');return next;}catch(e){setError(message(e));throw e;}finally{setBusy(false);}}
  if(loading)return h('p',{role:'status'},'Cargando cartilla…');
  if(!project)return h('div',null,h(Alert,{message:error}),h('a',{href:'#proyectos',className:'text-link'},'Volver a proyectos'));
  const actor:QAActor={...profile,can_edit:project.can_edit&&project.status!=='archivado',can_review:project.status!=='archivado'&&(profile.role==='administrador'||(profile.role==='revisor'&&(project.owner_id===profile.id||members.some(m=>m.user_id===profile.id&&m.role==='revisor'))))};
  const available=methods.filter(m=>m.application_id===project.application_id&&m.status==='aprobado'),method=methods.find(m=>m.id===doc?.methodology_version_id);
  const included=doc?.content.cases.filter(c=>c.included)??[],activeCase=included.some(c=>c.id===caseId)?caseId:included[0]?.id;
  const header=h(PageTitle,{eyebrow:`CARTILLA ${project.code}`,title:project.name,text:project.objective},h('div',{className:'qa-row-actions'},h('a',{href:`#proyecto/${id}`,className:'button secondary'},'Información y equipo'),actor.can_edit&&h(Button,{variant:'secondary',disabled:busy||dirty||!doc,onClick:()=>{setAssistantTask(tab==='selection'?'selection':tab==='cases'?'generate_case':'analysis');setTab('ai');setError('');setSuccess('');}},'Asistente IA')));
  if(!doc)return h('div',null,header,h(Alert,{message:error}),h('section',{className:'panel form-panel narrow'},h('h2',null,'Selecciona la metodología'),
    h('p',null,'La cartilla conservará esta versión para que sus criterios no cambien al publicarse otra.'),actor.can_edit&&available.length?h('form',{onSubmit:(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();void run({action:'init',methodology_version_id:value(new FormData(e.currentTarget),'method')}).catch(()=>{});}},
      h('label',{className:'field'},h('span',null,'Metodología aprobada *'),h('select',{name:'method',required:true,defaultValue:available.length===1?available[0].id:''},h('option',{value:''},'Selecciona una versión'),...available.map(m=>h('option',{key:m.id,value:m.id},`${m.name} ${m.version_label}`)))),h(Button,{type:'submit',disabled:busy},busy?'Preparando…':'Iniciar cartilla')):
      h('p',{className:'muted'},available.length?'Un editor autorizado debe iniciar esta cartilla.':'El administrador debe configurar y aprobar una metodología para esta aplicación.')));
  if(!method)return h('div',null,header,h(Alert,{message:'No fue posible recuperar la metodología vinculada. Recarga la página.'}));
  const completed=included.filter(c=>c.review.status==='aprobado').length;
  return h('div',{className:'qa-workspace'},header,h('div',{className:'qa-summary'},h('span',{className:'tag'},`${method.name} ${method.version_label}`),h('span',null,`Versión documental ${doc.version}`),h('span',null,`${completed} de ${included.length} casos aprobados`),h('span',{className:'qa-manual'},'Elaboración manual')),
    project.status==='archivado'&&h('div',{className:'notice info'},'Este proyecto está archivado y su cartilla se muestra en consulta. Reábrelo desde Información y equipo para modificarla.'),h(Alert,{message:error}),h(Alert,{message:success,success:true}),
    error&&h(Button,{variant:'secondary',disabled:busy,onClick:()=>{if(dirty&&!window.confirm('La recarga reemplazará los textos sin guardar. ¿Deseas continuar?'))return;setLoading(true);void load().then(()=>setError('')).catch(e=>setError(message(e))).finally(()=>setLoading(false));}},'Recargar cartilla'),
    h('div',{className:'qa-tabs',role:'tablist','aria-label':'Elaboración de la cartilla'},...([['context','1. Contexto'],['selection','2. Selección'],['cases','3. Casos y pasos'],['matrix','Matriz'],['history','Historial'],...(actor.can_edit?[['ai','Asistente IA']]:[])].map(([key,label])=>h('button',{type:'button',key,role:'tab','aria-selected':tab===key,disabled:busy||(dirty&&tab!==key),className:tab===key?'active':'',onClick:()=>{setTab(key);setError('');setSuccess('');}},label)))),
    dirty&&h('p',{className:'small qa-unsaved',role:'status'},'Tienes cambios sin guardar. Guarda el borrador para cambiar de sección.'),
    tab==='context'&&h(ContextEditor,{key:doc.version,doc,actor,run,busy,onDirty:setDirty}),
    tab==='selection'&&h(SelectionEditor,{key:doc.version,doc,actor,method,run,busy,onDirty:setDirty}),
    tab==='cases'&&(doc.content.context.review.status!=='aprobado'||doc.content.selection.status!=='aprobado'?h('section',{className:'panel'},h(Empty,{title:'Aprueba primero el contexto y la selección',text:'El editor se habilita con el conjunto de casos revisado.'})):activeCase?h(CaseEditor,{key:`${activeCase}-${doc.version}`,doc,actor,method,caseId:activeCase,onNavigate:setCaseId,run,busy,onDirty:setDirty}):h('section',{className:'panel'},h(Empty,{title:'No hay casos incluidos',text:'Revisa la selección de casos.'}))),
    tab==='matrix'&&h('section',{className:'panel form-panel'},h('h2',null,'Vista previa de la matriz'),h('p',{className:'muted'},'Muestra el contenido guardado. Los estados de aprobación se consultan en cada caso.'),h(MatrixPreview,{content:doc.content,config:method.config})),
    tab==='ai'&&actor.can_edit&&h(CartillaAIAssistant,{key:`${project.id}-${doc.version}`,backend,context:{project,document:doc,methodology:method},initialTask:assistantTask,caseId:activeCase,run}),
    tab==='history'&&h(DocumentHistory,{backend,id,method}));
}
