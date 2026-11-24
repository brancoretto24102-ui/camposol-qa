import type { Profile } from './domain.ts';

export type ReviewStatus = 'pendiente' | 'borrador' | 'en_revision' | 'aprobado' | 'requiere_correccion';
export const reviewLabels: Record<ReviewStatus, string> = {
  pendiente: 'Pendiente', borrador: 'Borrador', en_revision: 'En revisión',
  aprobado: 'Aprobado', requiere_correccion: 'Requiere corrección',
};
export const matrixColumns = [
  {key:'requirement',label:'Nombre Requisito',range:'A'}, {key:'item',label:'ITEM',range:'B'},
  {key:'name',label:'Nombre CP',range:'C'}, {key:'description',label:'Descripción Caso de Prueba',range:'D'},
  {key:'priority',label:'Prioridad',range:'E'}, {key:'step',label:'Paso',range:'F'},
  {key:'step_description',label:'Descripción Paso',range:'G'}, {key:'arguments',label:'Argumentos',range:'H'},
  {key:'expected_result',label:'Resultado Esperado',range:'I'}, {key:'reference',label:'REFERENCIA',range:'J'},
  {key:'comment',label:'Comentario',range:'K:M'},
] as const;
export interface MethodologyConfig {
  columns: {key:string;label:string;range:string}[];
  priorities: string[];
  required_case_fields: string[];
  required_step_fields: string[];
  analysis_guidance: string;
  case_guidance: string;
}
export interface MethodologyInput {
  application_id:string; methodology_key:string; name:string; version_label:string;
  source_reference:string; config:MethodologyConfig;
}
export interface MethodologyVersion extends MethodologyInput {
  id:string; status:'borrador'|'aprobado'; revision:number;
  created_by:string|null; approved_by:string|null; approved_at:string|null;
}
export const digiProyConfig: MethodologyConfig = {
  columns:matrixColumns.map(c=>({...c})), priorities:['Alta','Media'],
  required_case_fields:['requirement','description'], required_step_fields:['description','expected_result'],
  analysis_guidance:'Identifica únicamente operaciones y reglas respaldadas por la información de la cartilla. Registra su origen.',
  case_guidance:'Redacta instrucciones claras. Usa valores concretos cuando exista un cálculo documentado. No añadas escenarios no solicitados.',
};
export const digiProySource = 'DigiProy_Casos_Prueba_CO_Muestreo_Calidad_Fruta_Campo_E819.xlsx';
export const digiProyTemplateHash = '3ddced0c1ab15828a32fca8a78bbb29e5b1445da53bc989a022273ea83113c83';
export interface Review {
  status:ReviewStatus; version:number; updated_by:string; updated_name:string;
  approved_by:string|null; approved_name:string|null; approved_at:string|null; observation:string;
}
export interface Functionality {id:string;name:string;description:string;source:string}
export interface CaseStep {id:string;description:string;arguments:string;expected_result:string}
export interface QACase {
  id:string;functionality_id:string;included:boolean;name:string;justification:string;priority:string;
  requirement:string;description:string;comment:string;steps:CaseStep[];review:Review;
}
export interface QAContent {
  context:{summary:string;functioning:string;source_notes:string;functionalities:Functionality[];review:Review};
  selection:Review; cases:QACase[];
}
export interface QADocument {
  project_id:string;methodology_version_id:string;version:number;content:QAContent;
  created_at:string;updated_at:string;
}
export interface QARevision {
  project_id:string;version:number;action:string;actor_id:string;actor_name:string;created_at:string;
  snapshot?:QADocument;
}
export interface QAProgress {
  project_id:string;total_cases:number;approved_cases:number;context_status:ReviewStatus;
  selection_status:ReviewStatus;updated_at:string;
}
export interface QAActor extends Profile {can_edit:boolean;can_review:boolean}
export interface QACommand {action:string;[key:string]:unknown}
export class QAError extends Error {
  status:number;
  constructor(status:number,message:string){super(message);this.name='QAError';this.status=status;}
}
export function requireQA(condition:unknown,message:string,status=422):asserts condition {
  if(!condition)throw new QAError(status,message);
}
export function object(value:unknown):Record<string,unknown>{
  requireQA(!!value&&typeof value==='object'&&!Array.isArray(value),'La solicitud debe contener un objeto.');
  return value as Record<string,unknown>;
}
export function text(value:unknown,max=4000,required=false):string {
  requireQA(typeof value==='string'&&value.length<=max&&(!required||!!value.trim()),'Revisa los textos obligatorios y su longitud.');
  return value.trim();
}
export function identifier(value:unknown):string {
  requireQA(typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),'El identificador no es válido.');return value;
}
export function list(value:unknown):unknown[]{requireQA(Array.isArray(value),'La lista no tiene el formato esperado.');return value;}
function unique(ids:string[]){requireQA(new Set(ids).size===ids.length,'Hay identificadores repetidos.');}
function canonical(value:unknown):unknown {
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));
  return value;
}
function same(a:unknown,b:unknown){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
export function validateMethodology(value:unknown):MethodologyInput {
  const v=object(value),c=object(v.config),cols=list(c.columns).map(x=>{
    const item=object(x);return {key:text(item.key,40,true),label:text(item.label,100,true),range:text(item.range,8,true)};
  });
  requireQA(cols.length===matrixColumns.length&&cols.every((x,i)=>x.key===matrixColumns[i].key&&x.range===matrixColumns[i].range),'Conserva la estructura de las columnas de la matriz.');
  if(v.application_id==='digiproy')requireQA(cols.every((x,i)=>x.label===matrixColumns[i].label),'Los encabezados oficiales de DigiProy no se pueden renombrar.');
  const priorities=list(c.priorities).map(x=>text(x,40,true));
  requireQA(priorities.length>0&&priorities.length<=20&&new Set(priorities).size===priorities.length,'Define prioridades distintas.');
  const required_case_fields=list(c.required_case_fields).map(x=>text(x,40,true));
  const required_step_fields=list(c.required_step_fields).map(x=>text(x,40,true));
  requireQA(required_case_fields.every(x=>['requirement','description','comment'].includes(x))&&required_step_fields.every(x=>['description','arguments','expected_result'].includes(x)),'Los campos requeridos no son válidos.');
  const input={application_id:text(v.application_id,60,true),methodology_key:text(v.methodology_key,60,true),name:text(v.name,160,true),version_label:text(v.version_label,30,true),source_reference:text(v.source_reference,3000,true),config:{columns:cols,priorities,required_case_fields,required_step_fields,analysis_guidance:text(c.analysis_guidance,4000,true),case_guidance:text(c.case_guidance,4000,true)}};
  requireQA(/^[a-z][a-z0-9_-]{1,59}$/.test(input.methodology_key),'Usa un código de metodología en minúsculas, sin espacios.');
  return input;
}
export function newReview(actor:Pick<Profile,'id'|'full_name'>):Review {
  return {status:'pendiente',version:1,updated_by:actor.id,updated_name:actor.full_name,approved_by:null,approved_name:null,approved_at:null,observation:''};
}
function changedReview(review:Review,actor:QAActor):Review {
  return {...newReview(actor),status:review.status==='aprobado'?'requiere_correccion':'borrador',version:review.version+1};
}
export function newContent(description:string,actor:Pick<Profile,'id'|'full_name'>):QAContent {
  return {context:{summary:description,functioning:'',source_notes:'',functionalities:[],review:newReview(actor)},selection:newReview(actor),cases:[]};
}
export function canReview(actor:QAActor,review:Review):boolean {
  return actor.active&&(actor.role==='administrador'||(actor.role==='revisor'&&actor.can_review&&review.updated_by!==actor.id)||
    (actor.role==='editor'&&actor.can_edit&&actor.can_self_approve&&review.updated_by===actor.id));
}
export function invalidateContent(content:QAContent,actor:QAActor):QAContent {
  const next=structuredClone(content);next.context.review=changedReview(next.context.review,actor);
  next.selection=changedReview(next.selection,actor);
  next.cases=next.cases.map(c=>({...c,review:changedReview(c.review,actor)}));return next;
}
export function caseReady(c:QACase,config:MethodologyConfig):string|null {
  if(!c.name.trim()||!c.priority)return 'Completa el nombre y la prioridad del caso.';
  for(const key of config.required_case_fields)if(!String(c[key as keyof QACase]??'').trim())return `Completa ${config.columns.find(x=>x.key===key)?.label??key}.`;
  if(!c.steps.length)return 'Agrega al menos un paso al caso.';
  for(let i=0;i<c.steps.length;i++)for(const key of config.required_step_fields)if(!c.steps[i][key as keyof CaseStep].trim())return `Completa el paso ${i+1}: ${key==='expected_result'?'Resultado Esperado':key==='arguments'?'Argumentos':'Descripción Paso'}.`;
  return null;
}
export function applyQACommand(current:QAContent,command:QACommand,config:MethodologyConfig,actor:QAActor,now:string):QAContent {
  requireQA(actor.active,'Tu cuenta no tiene acceso activo.',403);
  requireQA(new TextEncoder().encode(JSON.stringify(command)).length<=2_000_000,'La solicitud excede 2 MB. Divide el contenido antes de guardar.',413);
  const q=object(command),next=structuredClone(current),action=text(q.action,40,true);
  const edits=['save_context','save_selection','save_case'];
  if(edits.includes(action)||action==='submit')requireQA(actor.can_edit,'No tienes permiso para editar esta cartilla.',403);
  if(action==='save_context'){
    const draft=object(q.context),functionalities=list(draft.functionalities).map(x=>{
      const f=object(x);return {id:identifier(f.id),name:text(f.name,160,true),description:text(f.description,4000),source:text(f.source,2000)};
    });unique(functionalities.map(f=>f.id));
    requireQA(next.cases.every(c=>functionalities.some(f=>f.id===c.functionality_id)),'Retira primero los casos vinculados a la funcionalidad que deseas eliminar.');
    const fields={summary:text(draft.summary,10000),functioning:text(draft.functioning,20000),source_notes:text(draft.source_notes,10000),functionalities};
    const oldFields={summary:current.context.summary,functioning:current.context.functioning,source_notes:current.context.source_notes,functionalities:current.context.functionalities};
    if(!same(fields,oldFields)){
      const invalidated=invalidateContent(next,actor);invalidated.context={...fields,review:invalidated.context.review};return invalidated;
    }
    if(next.context.review.status==='pendiente')next.context.review={...next.context.review,status:'borrador'};
  }else if(action==='save_selection'){
    const cases=list(q.cases).map(x=>{
      const v=object(x),id=identifier(v.id),functionality_id=identifier(v.functionality_id);
      requireQA(next.context.functionalities.some(f=>f.id===functionality_id),'Selecciona una funcionalidad de esta cartilla.');
      requireQA(typeof v.included==='boolean','Indica qué casos se incluyen.');
      const fields={id,functionality_id,included:v.included,name:text(v.name,200,true),justification:text(v.justification,4000,true),priority:text(v.priority,40,true)};
      requireQA(config.priorities.includes(fields.priority),'Selecciona una prioridad de la metodología.');
      const old=next.cases.find(c=>c.id===id);
      if(!old)return {...fields,requirement:'',description:'',comment:'',steps:[],review:newReview(actor)};
      const changed=Object.entries(fields).some(([k,val])=>old[k as keyof QACase]!==val);
      return {...old,...fields,review:changed?changedReview(old.review,actor):old.review};
    });unique(cases.map(c=>c.id));
    const summary=(values:QACase[])=>values.map(({id,functionality_id,included,name,justification,priority})=>({id,functionality_id,included,name,justification,priority}));
    if(!same(summary(next.cases),summary(cases))){next.cases=cases;next.selection=changedReview(next.selection,actor);}
    else if(next.selection.status==='pendiente')next.selection={...next.selection,status:'borrador'};
  }else if(action==='save_case'){
    requireQA(next.context.review.status==='aprobado'&&next.selection.status==='aprobado','Aprueba primero el contexto y la selección de casos.');
    const id=identifier(q.case_id),index=next.cases.findIndex(c=>c.id===id&&c.included);requireQA(index>=0,'El caso no está seleccionado.');
    const v=object(q.case),steps=list(v.steps).map(x=>{const s=object(x);return {id:identifier(s.id),description:text(s.description,6000),arguments:text(s.arguments,6000),expected_result:text(s.expected_result,6000)};});unique(steps.map(s=>s.id));
    const fields={requirement:text(v.requirement,4000),description:text(v.description,10000),comment:text(v.comment,6000),steps},old=next.cases[index];
    const previous={requirement:old.requirement,description:old.description,comment:old.comment,steps:old.steps};
    next.cases[index]={...old,...fields,review:!same(fields,previous)?changedReview(old.review,actor):old.review.status==='pendiente'?{...old.review,status:'borrador'}:old.review};
  }else if(['submit','approve','correct'].includes(action)){
    const scope=text(q.scope,20,true);let review:Review;
    const c=scope==='case'?next.cases.find(c=>c.id===identifier(q.case_id)&&c.included):undefined;
    requireQA(['context','selection','case'].includes(scope)&&(scope!=='case'||c),'El elemento de revisión no está disponible.');
    if(scope==='context')review=next.context.review;else if(scope==='selection')review=next.selection;else review=c!.review;
    requireQA(action==='submit'||canReview(actor,review),'Tu rol no permite aprobar esta versión.',403);
    if(action==='correct'){
      requireQA(review.status==='en_revision','El elemento debe estar en revisión.');
      review.status='requiere_correccion';review.observation=text(q.observation,4000,true);review.approved_by=null;review.approved_name=null;review.approved_at=null;
    }else{
      if(scope==='context')requireQA(!!next.context.summary&&!!next.context.functioning&&next.context.functionalities.length>0,'Completa la descripción, el funcionamiento y al menos una funcionalidad.');
      if(scope!=='context')requireQA(next.context.review.status==='aprobado','El contexto requiere aprobación.');
      if(scope==='selection')requireQA(next.cases.some(c=>c.included),'Selecciona al menos un caso.');
      if(scope==='case'){requireQA(next.selection.status==='aprobado','La selección de casos requiere aprobación.');const invalid=caseReady(c!,config);requireQA(!invalid,invalid??'');}
      if(action==='submit'){requireQA(review.status!=='aprobado','Este contenido ya está aprobado.');review.status='en_revision';review.observation='';}
      else {requireQA(review.status==='en_revision','Envía el contenido a revisión antes de aprobar.');review.status='aprobado';review.approved_by=actor.id;review.approved_name=actor.full_name;review.approved_at=now;review.observation=text(q.observation??'',4000);}
    }
  }else throw new QAError(422,'La acción documental no es válida.');
  return next;
}
export function documentProgress(doc:QADocument):QAProgress {
  const included=doc.content.cases.filter(c=>c.included);
  return {project_id:doc.project_id,total_cases:included.length,approved_cases:included.filter(c=>c.review.status==='aprobado').length,context_status:doc.content.context.review.status,selection_status:doc.content.selection.status,updated_at:doc.updated_at};
}
export function matrixRows(content:QAContent){
  return content.cases.filter(c=>c.included).map((c,i)=>({id:c.id,requirement:c.requirement,item:`CP${String(i+1).padStart(2,'0')}`,name:c.name,description:c.description,priority:c.priority,
    step:c.steps.map((_,j)=>String(j+1)).join('\n'),step_description:c.steps.map((s,j)=>`${j+1}. ${s.description}`).join('\n'),
    arguments:c.steps.map((s,j)=>`${j+1}. ${s.arguments}`).join('\n'),expected_result:c.steps.map((s,j)=>`${j+1}. ${s.expected_result}`).join('\n'),
    reference:`Referencia ${String(i+1).padStart(2,'0')}`,comment:c.comment,status:c.review.status}));
}
