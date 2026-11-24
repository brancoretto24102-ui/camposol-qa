import {createElement as h,useEffect,useState,type ChangeEvent} from 'react';
import type {Backend} from '../backend.ts';
import type {Project} from '../domain.ts';
import type {MethodologyVersion,QADocument} from '../qa-domain.ts';
import {referenceRows,captureInfo,sha256,verifyCapture,evidenceIsCurrent,EVIDENCE_MAX_BYTES,EVIDENCE_PER_STEP,type Evidence,type EvidenceState} from '../evidence-domain.ts';
import {buildQAXlsx,exportEvidence} from '../xlsx-export.ts';
import {Alert,Button} from '../ui.ts';
import {QAField} from './qa-common.ts';
import {message} from '../forms.ts';

function CapturePreview({backend,evidence}:{backend:Backend;evidence:Evidence}){
  const [url,setUrl]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  return h('div',null,h(Alert,{message:error}),url?h('a',{href:url,download:evidence.filename,className:'qa-capture-image',title:'Descargar la captura original'},h('img',{src:url,alt:evidence.caption||evidence.filename,loading:'lazy'})):
    h(Button,{variant:'secondary',disabled:loading,onClick:async()=>{setLoading(true);setError('');try{const bytes=await backend.evidenceBytes(evidence);await verifyCapture(bytes,evidence);setUrl(URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer],{type:evidence.mime_type})));}catch(e){setError(message(e));}finally{setLoading(false);}}},loading?'Cargando captura…':'Ver captura'));
}
export function CaseEvidence({backend,doc,caseId,canEdit,dirty,busy,onBusy}:{backend:Backend;doc:QADocument;caseId:string;canEdit:boolean;dirty:boolean;busy:boolean;onBusy:(busy:boolean)=>void}){
  const c=doc.content.cases.find(c=>c.id===caseId)!;
  const [state,setState]=useState<EvidenceState>({revision:0,items:[]}),[stepId,setStepId]=useState(c.steps[0]?.id??''),[caption,setCaption]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true);
  async function refresh(){setState(await backend.evidenceManifest(doc.project_id));}
  useEffect(()=>{let active=true;void backend.evidenceManifest(doc.project_id).then(s=>{if(active)setState(s);}).catch(e=>{if(active)setError(message(e));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[backend,doc.project_id,doc.version]);
  async function operate(operation:()=>Promise<void>){
    if(busy)return;onBusy(true);setError('');setNotice('');
    try{await operation();}catch(e){setError(message(e));}finally{try{await refresh();}catch(e){setError(previous=>previous||message(e));}onBusy(false);}
  }
  async function upload(files:File[]){
    await operate(async()=>{
      const selected=c.steps.find(s=>s.id===stepId);if(!selected)throw new Error('Selecciona un paso guardado.');
      if(files.some(f=>f.size===0||f.size>EVIDENCE_MAX_BYTES))throw new Error('Cada captura debe tener como máximo 5 MB.');
      if(files.length+state.items.filter(e=>e.case_id===c.id&&e.step_id===selected.id).length>EVIDENCE_PER_STEP)throw new Error('Cada paso admite cinco capturas. Retira alguna o selecciona menos archivos.');
      let count=0;
      for(const file of files){
        const bytes=new Uint8Array(await file.arrayBuffer()),info=captureInfo(bytes);
        const decoded=await createImageBitmap(new Blob([new Uint8Array(bytes).buffer],{type:info.mime_type}));decoded.close();
        await backend.attachEvidence(doc.project_id,doc.version,c.id,selected.id,{...info,filename:file.name,caption,sha256:await sha256(bytes)},bytes);count++;
        setNotice(count+' captura'+(count===1?' guardada.':'s guardadas.'));
      }setCaption('');
    });
  }
  const mine=state.items.filter(e=>e.case_id===c.id),rows=referenceRows(doc.content);
  return h('section',{className:'panel form-panel qa-evidence','aria-label':'Capturas de los pasos del caso'},h('h2',null,'Capturas y referencias del caso'),
    h('p',{className:'muted'},'Adjunta las capturas obtenidas durante la prueba. Cada paso tendrá su propia hoja de referencia en el Excel, con sus capturas y un botón Regresar.'),
    h(Alert,{message:error}),h(Alert,{message:notice,success:true}),loading&&h('p',{role:'status'},'Cargando capturas…'),
    canEdit&&dirty&&h('p',{className:'notice info'},'Guarda los cambios del caso antes de adjuntar o retirar capturas.'),
    canEdit&&c.steps.length>0&&h('div',{className:'qa-capture-upload'},
      h('label',{className:'field'},h('span',null,'Paso de la captura'),h('select',{value:stepId,disabled:busy||dirty||loading,onChange:(e:ChangeEvent<HTMLSelectElement>)=>setStepId(e.target.value)},...c.steps.map((s,i)=>h('option',{key:s.id,value:s.id},'Paso '+(i+1)+' · '+(s.description||'Sin descripción'))))),
      h(QAField,{label:'Descripción de las capturas (opcional)',value:caption,onChange:setCaption,rows:2,maxLength:2000,readOnly:busy||dirty}),
      h('label',{className:'field'},h('span',null,'Adjuntar capturas a este paso'),h('input',{type:'file',accept:'image/png,image/jpeg',multiple:true,disabled:busy||dirty||loading,onChange:(e:ChangeEvent<HTMLInputElement>)=>{const files=Array.from(e.target.files??[]);e.target.value='';if(files.length)void upload(files);}}),h('small',null,'PNG o JPG · hasta 5 MB por captura · cinco capturas por paso · la carga comienza al seleccionar los archivos.'))),
    !c.steps.length&&h('p',null,'Guarda al menos un paso para adjuntar sus capturas.'),
    ...c.steps.map((step,i)=>{
      const captures=mine.filter(e=>e.step_id===step.id),ref=rows.find(r=>r.case_id===c.id&&r.step_id===step.id);
      return h('section',{className:'qa-evidence-step',key:step.id},h('div',{className:'panel-title'},h('h3',null,'Paso '+(i+1)),h('span',{className:'tag'},ref?.reference)),h('p',{className:'small muted'},step.description),
        !loading&&!captures.length&&h('p',{className:'small muted'},'Sin capturas adjuntas. La hoja de referencia indicará que está pendiente.'),
        h('div',{className:'qa-capture-grid'},...captures.map(e=>h('article',{key:e.id,className:'qa-capture'},h('strong',null,e.filename),e.caption&&h('p',null,e.caption),
          h('p',{className:'small muted'},e.state==='pending'?'Carga pendiente de confirmar':evidenceIsCurrent(e,doc)?'Captura del paso guardado':'Captura de una versión anterior del paso. Retírala y adjunta una actual antes de exportar.'),
          e.state==='active'&&h(CapturePreview,{backend,evidence:e}),
          canEdit&&h('div',{className:'qa-row-actions'},e.state==='pending'&&h(Button,{variant:'secondary',disabled:busy||dirty,onClick:()=>void operate(async()=>{await backend.finishEvidence(e.id,doc.version);setNotice('Captura confirmada.');})},'Confirmar carga'),h(Button,{variant:'ghost',disabled:busy||dirty,onClick:()=>void operate(async()=>{await backend.retireEvidence(e.id,doc.version);setNotice('Captura retirada de la exportación.');})},'Retirar captura'))))));
    }),
    mine.some(e=>!c.steps.some(s=>s.id===e.step_id))&&h('details',null,h('summary',null,'Capturas de pasos retirados'),...mine.filter(e=>!c.steps.some(s=>s.id===e.step_id)).map(e=>h('div',{key:e.id,className:'qa-capture'},h('strong',null,e.filename),h('p',null,'Su paso ya no forma parte del caso y esta captura no se exporta.'),canEdit&&h(Button,{variant:'ghost',disabled:busy||dirty,onClick:()=>void operate(async()=>{await backend.retireEvidence(e.id,doc.version);})},'Retirar captura')))));
}
export function ExcelDownload({backend,project,doc,methodology,disabled,onBusy}:{backend:Backend;project:Project;doc:QADocument;methodology:MethodologyVersion;disabled:boolean;onBusy:(busy:boolean)=>void}){
  const [error,setError]=useState(''),[status,setStatus]=useState('');
  async function download(){
    if(disabled)return;onBusy(true);setError('');setStatus('Preparando las referencias…');
    try{
      const latest=await backend.qaDocument(project.id);if(!latest||latest.version!==doc.version)throw new Error('La cartilla cambió. Recarga la cartilla antes de descargar.');
      const state=await backend.evidenceManifest(project.id),selected=exportEvidence(latest,state),images=new Map<string,Uint8Array>();
      for(let i=0;i<selected.length;i++){setStatus('Incorporando captura '+(i+1)+' de '+selected.length+'…');images.set(selected[i].id,await backend.evidenceBytes(selected[i]));}
      const bytes=await buildQAXlsx({project,document:latest,methodology,evidence:state,images});
      const [current,finalState]=await Promise.all([backend.qaDocument(project.id),backend.evidenceManifest(project.id)]);
      if(current?.version!==doc.version||state.revision!==finalState.revision)throw new Error('La cartilla o sus capturas cambiaron durante la preparación. Vuelve a descargar para incluir la versión actual.');
      const url=URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),a=document.createElement('a');
      a.href=url;a.download=(project.code.replace(/[^a-zA-Z0-9_-]/g,'_')||'Camposol-QA')+'-Casos-v'+doc.version+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
      setStatus('Excel preparado con '+referenceRows(doc.content).length+' referencias y '+selected.length+' capturas.');
    }catch(e){setStatus('');setError(message(e));}finally{onBusy(false);}
  }
  return h('section',{className:'qa-excel-download'},h('div',{className:'panel-title'},h('div',null,h('h2',null,'Excel con capturas'),h('p',{className:'muted'},'Una hoja de referencia por paso. La celda J abre esa hoja y Regresar vuelve a la misma celda.')),h(Button,{disabled,onClick:()=>void download()},'Descargar Excel')),status&&h('p',{role:'status'},status),h(Alert,{message:error}));
}

