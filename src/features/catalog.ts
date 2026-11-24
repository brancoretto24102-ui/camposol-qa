import {createElement as h,useEffect,useState,type FormEvent,type ChangeEvent} from 'react';
import type {Backend} from '../backend.ts';
import type {Application,Profile} from '../domain.ts';
import {matrixColumns,validateMethodology,type MethodologyInput,type MethodologyVersion} from '../qa-domain.ts';
import {Alert,Button,Empty,PageTitle} from '../ui.ts';
import {Field,TextArea,message,value,go} from '../forms.ts';
import {ReviewBadge} from './qa-common.ts';

export function Applications({backend,profile,apps,onChanged}:{backend:Backend;profile:Profile;apps:Application[];onChanged:()=>Promise<void>}){
  const [editing,setEditing]=useState<Application|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  const admin=profile.role==='administrador';
  return h('div',null,h(PageTitle,{eyebrow:'CATÁLOGO',title:'Aplicaciones',text:'Configura las aplicaciones que pueden documentarse.'},admin&&h(Button,{onClick:()=>{setEditing({id:'',name:'',active:true,version:0});setError('');}},'Nueva aplicación')),
    h(Alert,{message:error}),h(Alert,{message:success,success:true}),editing&&h('section',{className:'panel form-panel'},h('h2',null,editing.version?'Editar aplicación':'Nueva aplicación'),
      h('form',{key:editing.id,onSubmit:async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');try{
        await backend.saveApplication({id:value(f,'id'),name:value(f,'name'),active:f.get('active')==='on',version:editing.version});await onChanged();setEditing(null);setSuccess('Aplicación guardada.');
      }catch(err){setError(message(err));}finally{setBusy(false);}}},
      h('div',{className:'form-grid'},h(Field,{label:'Código de la aplicación',name:'id',defaultValue:editing.id,required:true,readOnly:editing.version>0,maxLength:60,hint:'Minúsculas, números, guion o guion bajo. El código no cambia.'}),h(Field,{label:'Nombre',name:'name',defaultValue:editing.name,required:true})),
      h('label',{className:'checkbox'},h('input',{name:'active',type:'checkbox',defaultChecked:editing.active}),' Disponible para proyectos nuevos'),
      h('p',{className:'small muted'},'Desactivar una aplicación conserva sus proyectos y metodologías.'),h('div',{className:'form-actions'},h(Button,{variant:'secondary',disabled:busy,onClick:()=>setEditing(null)},'Cancelar'),h(Button,{type:'submit',disabled:busy},busy?'Guardando…':'Guardar aplicación')))),
    h('section',{className:'panel'},h('div',{className:'table-wrap'},h('table',null,h('thead',null,h('tr',null,...['Aplicación','Código','Estado','Versión',''].map(x=>h('th',{key:x,scope:'col'},x)))),h('tbody',null,...apps.map(a=>h('tr',{key:a.id},
      h('td',null,h('strong',null,a.name)),h('td',null,a.id),h('td',null,a.active?'Activa':'Inactiva'),h('td',null,a.version),h('td',{className:'qa-row-actions'},
        h(Button,{variant:'ghost',onClick:()=>go(`metodologias/${a.id}`)},'Metodologías'),admin&&h(Button,{variant:'secondary',onClick:()=>{setEditing(a);setError('');}},'Editar')))))))));
}

function MethodologyForm({apps,initial,copy,applicationId,onCancel,onSave,busy}:{apps:Application[];applicationId?:string;initial?:MethodologyVersion;copy?:MethodologyVersion;onCancel:()=>void;onSave:(input:MethodologyInput)=>Promise<void>;busy:boolean}){
  const source=initial??copy,[application,setApplication]=useState(source?.application_id??applicationId??apps.find(a=>a.active)?.id??''),[error,setError]=useState('');
  const config=source?.config;
  const requiredCase=config?.required_case_fields??['requirement','description'],requiredStep=config?.required_step_fields??['description','expected_result'];
  return h('section',{className:'panel form-panel'},h('h2',null,initial?'Editar borrador':copy?'Crear otra versión':'Nueva metodología'),
    copy&&h('p',{className:'muted'},`La versión ${copy.version_label} se conserva. Indica una versión distinta.`),h(Alert,{message:error}),
    h('form',{onSubmit:async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const f=new FormData(e.currentTarget);setError('');try{
      const input=validateMethodology({application_id:value(f,'application_id'),methodology_key:value(f,'methodology_key'),name:value(f,'name'),version_label:value(f,'version_label'),source_reference:value(f,'source_reference'),config:{
        columns:matrixColumns.map((c,i)=>({...c,label:value(f,`column_${c.key}`)||config?.columns[i]?.label||c.label})),
        priorities:value(f,'priorities').split('\n').map(s=>s.trim()).filter(Boolean),required_case_fields:f.getAll('case_required'),required_step_fields:f.getAll('step_required'),analysis_guidance:value(f,'analysis_guidance'),case_guidance:value(f,'case_guidance'),
      }});await onSave(input);
    }catch(err){setError(message(err));}}},
      h('div',{className:'form-grid'},h('label',{className:'field'},h('span',null,'Aplicación *'),h('select',{name:'application_id',value:application,onChange:(e:ChangeEvent<HTMLSelectElement>)=>setApplication(e.target.value),disabled:!!initial||!!copy,required:true},...apps.map(a=>h('option',{value:a.id,key:a.id},a.name))),
        (initial||copy)&&h('input',{type:'hidden',name:'application_id',value:application})),
        h(Field,{label:'Código de la metodología',name:'methodology_key',defaultValue:source?.methodology_key,readOnly:!!initial||!!copy,required:true,maxLength:60})),
      h('div',{className:'form-grid'},h(Field,{label:'Nombre de la metodología',name:'name',defaultValue:source?.name,required:true}),h(Field,{label:'Versión',name:'version_label',defaultValue:initial?.version_label??'',required:true,maxLength:30,hint:'Por ejemplo: 1.1. Cada versión aprobada se conserva.'})),
      h(TextArea,{label:'Documentación y formato autorizados de referencia',name:'source_reference',defaultValue:source?.source_reference,required:true,maxLength:3000}),
      h(TextArea,{label:'Criterios para analizar funcionalidades',name:'analysis_guidance',defaultValue:config?.analysis_guidance,required:true,maxLength:4000}),
      h(TextArea,{label:'Criterios de redacción y cobertura de casos',name:'case_guidance',defaultValue:config?.case_guidance,required:true,maxLength:4000}),
      h(TextArea,{label:'Prioridades permitidas, una por línea',name:'priorities',defaultValue:config?.priorities.join('\n'),required:true,maxLength:800}),
      h('div',{className:'form-grid'},h('fieldset',{className:'qa-checks'},h('legend',null,'Campos obligatorios del caso'),...([['requirement','Nombre Requisito'],['description','Descripción Caso de Prueba'],['comment','Comentario']].map(([key,label])=>h('label',{key,className:'checkbox'},h('input',{type:'checkbox',name:'case_required',value:key,defaultChecked:requiredCase.includes(key)}),label)))),
        h('fieldset',{className:'qa-checks'},h('legend',null,'Campos obligatorios de cada paso'),...([['description','Descripción Paso'],['arguments','Argumentos'],['expected_result','Resultado Esperado']].map(([key,label])=>h('label',{key,className:'checkbox'},h('input',{type:'checkbox',name:'step_required',value:key,defaultChecked:requiredStep.includes(key)}),label))))),
      h('details',{className:'qa-details'},h('summary',null,'Encabezados de la matriz'),h('p',{className:'small muted'},'DigiProy conserva los encabezados oficiales. La estructura mantiene A:J y Comentario en K:M.'),h('div',{className:'form-grid'},...matrixColumns.map((c,i)=>h(Field,{key:c.key,label:c.range,name:`column_${c.key}`,defaultValue:config?.columns[i]?.label??c.label,readOnly:application==='digiproy',required:true,maxLength:100})))),
      h('div',{className:'form-actions'},h(Button,{variant:'secondary',disabled:busy,onClick:onCancel},'Cancelar'),h(Button,{type:'submit',disabled:busy},busy?'Guardando…':'Guardar metodología en borrador'))));
}

export function Methodologies({backend,profile,apps,applicationId}:{backend:Backend;profile:Profile;apps:Application[];applicationId?:string}){
  const [versions,setVersions]=useState<MethodologyVersion[]>([]),[form,setForm]=useState<{initial?:MethodologyVersion;copy?:MethodologyVersion}|null>(null),[error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false);
  const admin=profile.role==='administrador';
  async function load(){setVersions(await backend.methodologies());}
  useEffect(()=>{void load().catch(e=>setError(message(e)));},[]);
  const filtered=versions.filter(m=>!applicationId||m.application_id===applicationId);
  return h('div',null,h(PageTitle,{eyebrow:'MOTOR DE METODOLOGÍAS',title:'Metodologías',text:'Cada cartilla conserva la versión con la que comenzó.'},admin&&h(Button,{onClick:()=>{setForm({});setError('');}},'Nueva metodología')),
    h(Alert,{message:error}),h(Alert,{message:success,success:true}),applicationId&&h('p',null,h('a',{href:'#metodologias',className:'text-link'},'Ver todas las aplicaciones')),
    form&&h(MethodologyForm,{key:form.initial?.id??form.copy?.id??'new',apps,applicationId,initial:form.initial,copy:form.copy,busy,onCancel:()=>setForm(null),onSave:async(input:MethodologyInput)=>{setBusy(true);setError('');try{await backend.saveMethodology(input,form.initial);await load();setForm(null);setSuccess('Metodología guardada en borrador. Revisa su definición antes de aprobar.');}finally{setBusy(false);}}}),
    !filtered.length&&!form&&h('section',{className:'panel'},h(Empty,{title:'Sin metodología configurada',text:'El administrador debe incorporar la documentación y el formato autorizado de esta aplicación.'})),
    h('div',{className:'qa-catalog-grid'},...filtered.map(m=>h('section',{key:m.id,className:'panel form-panel qa-methodology-card'},
      h('div',{className:'panel-title'},h('div',null,h('span',{className:'eyebrow'},apps.find(a=>a.id===m.application_id)?.name??m.application_id),h('h2',null,`${m.name} ${m.version_label}`)),h(ReviewBadge,{status:m.status})),
      h('p',{className:'small muted'},`Revisión de la definición: ${m.revision}`),h('details',{className:'qa-details'},h('summary',null,'Ver definición y referencia'),h('p',null,m.source_reference),h('h3',null,'Análisis'),h('p',null,m.config.analysis_guidance),h('h3',null,'Casos'),h('p',null,m.config.case_guidance),h('p',null,`Prioridades: ${m.config.priorities.join(', ')}`),h('ol',null,...m.config.columns.map(c=>h('li',{key:c.key},`${c.range}: ${c.label}`)))),
      admin&&h('div',{className:'qa-row-actions'},m.status==='borrador'?h(Button,{variant:'secondary',onClick:()=>setForm({initial:m})},'Editar borrador'):h(Button,{variant:'secondary',onClick:()=>setForm({copy:m})},'Crear otra versión'),
        m.status==='borrador'&&h(Button,{disabled:busy,onClick:async()=>{setBusy(true);setError('');try{await backend.approveMethodology(m);await load();setSuccess('Versión aprobada. Su definición ya no puede modificarse.');}catch(e){setError(message(e));}finally{setBusy(false);}}},'Aprobar versión'))))));
}
