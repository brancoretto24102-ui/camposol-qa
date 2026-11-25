import {createElement as h,useEffect,useRef,useState,type ChangeEvent,type FormEvent} from 'react';
import type {Backend} from '../backend.ts';
import type {QADocument,QACommand} from '../qa-domain.ts';
import {aiTasks,aiProposalCommand,type AIContext,type AITask,type AITarget,type AIProposal} from '../ai-domain.ts';
import {buildChatSource,validateChatInput,chatHistoryForTurns,chatHistoryWindow,CHAT_MESSAGE_LIMIT,CHAT_SOURCE_LIMIT,CHAT_REPAIR_MESSAGE,type ChatTurn} from '../ai-chat-domain.ts';
import {Alert,Button} from '../ui.ts';
import {message} from '../forms.ts';
import {QAField} from './qa-common.ts';
import {ProposalEditor} from './ai.ts';
import {useFreeChatStatus,FreeChatAvailability} from './free-chat-status.ts';
import {FreeChatProposalIssue} from './free-chat-feedback.ts';

export function FreeAIChat({backend,context,initialTask,caseId,run,onBusy}:{backend:Backend;context:AIContext;initialTask:AITask;caseId?:string;run:(command:QACommand)=>Promise<QADocument>;onBusy?:(busy:boolean)=>void}){
  const service=useFreeChatStatus(backend),cases=context.document.content.cases.filter(c=>c.included);
  const [task,setTask]=useState<AITask>(initialTask),[selectedCase,setSelectedCase]=useState(caseId??cases[0]?.id??''),[prepared,setPrepared]=useState<{context:AIContext;target:AITarget}|null>(null),
    [source,setSource]=useState(''),[turns,setTurns]=useState<ChatTurn[]>([]),[draft,setDraft]=useState(''),[pending,setPending]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),
    [error,setError]=useState(''),[success,setSuccess]=useState(''),[proposal,setProposal]=useState<AIProposal|null>(null),[reviewed,setReviewed]=useState(false);
  const bottom=useRef<HTMLDivElement|null>(null),caseTask=!['analysis','selection','coverage'].includes(task);
  const lastTurn=turns.at(-1),validationIssue=!proposal&&lastTurn?.role==='assistant'?lastTurn.validation_error??'':'';
  function clearConversation(){setTurns([]);setDraft('');setPending('');setProposal(null);setReviewed(false);setConsent(false);setError('');setSuccess('');}
  useEffect(()=>{clearConversation();try{const target={task,...(caseTask?{case_id:selectedCase}:{})},snapshot=structuredClone(context);setSource(buildChatSource(snapshot,target));setPrepared({context:snapshot,target});}catch(e){setPrepared(null);setSource('');setError(message(e));}},[context.project.id,context.document.version,task,selectedCase]);
  useEffect(()=>{onBusy?.(busy);},[busy,onBusy]);
  useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest'});},[turns,pending]);
  async function send(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!prepared)return;setError('');setSuccess('');
    try{
      const history=chatHistoryForTurns(turns);
      const input=validateChatInput({...prepared.target,project_id:context.project.id,version:prepared.context.document.version,prompt:source,message:draft,history:chatHistoryWindow(history,source,draft),consent});
      if(!service.status?.enabled)throw new Error('El administrador debe activar el chat gratuito antes de enviar consultas.');
      setBusy(true);setPending(input.message);setProposal(null);setReviewed(false);
      const result=await backend.aiChat(input);
      setTurns([...turns,{role:'user',content:input.message},{role:'assistant',content:result.reply,proposal:result.proposal,validation_error:result.validation_error}]);setDraft('');
      if(result.proposal)setProposal(structuredClone(result.proposal));
    }catch(e){setError(message(e));}finally{setPending('');setBusy(false);}
  }
  async function apply(){if(!prepared||!proposal||!reviewed)return;setBusy(true);setError('');setSuccess('');try{
    const latest=await backend.qaDocument(context.project.id);if(!latest||latest.version!==prepared.context.document.version)throw new Error('La cartilla cambió durante la conversación. Conserva la propuesta y recarga antes de aplicarla.');
    await run(aiProposalCommand(proposal,prepared.context,prepared.target,()=>crypto.randomUUID()));clearConversation();
  }catch(e){setError(message(e));}finally{setBusy(false);}}
  return h('section',{className:'panel form-panel free-chat'},h('div',{className:'panel-title'},h('div',null,h('span',{className:'eyebrow'},'ASISTENTE CAMPOSOL'),h('h2',null,'Chat gratuito de la cartilla')),h('span',{className:'tag'},'Groq · plan Free')),
    h('p',{className:'muted'},'Pregunta, aclara requisitos y solicita propuestas sin salir de la página. La IA propone; tú revisas y decides qué guardar.'),
    h(FreeChatAvailability,{status:service.status,loading:service.loading,error:service.error,onReload:()=>void service.reload(),busy}),
    h('div',{className:'form-grid'},h('label',{className:'field'},h('span',null,'Tema de la conversación'),h('select',{value:task,disabled:busy,onChange:(e:ChangeEvent<HTMLSelectElement>)=>setTask(e.target.value as AITask)},...Object.entries(aiTasks).map(([id,label])=>h('option',{key:id,value:id},label)))),
      caseTask&&h('label',{className:'field'},h('span',null,'Caso incluido'),h('select',{value:selectedCase,disabled:busy,onChange:(e:ChangeEvent<HTMLSelectElement>)=>setSelectedCase(e.target.value)},h('option',{value:''},'Selecciona un caso'),...cases.map((c,i)=>h('option',{key:c.id,value:c.id},`CP${String(i+1).padStart(2,'0')} · ${c.name}`))))),
    prepared&&h('details',{className:'qa-details'},h('summary',null,'Revisar el contexto que compartirá el chat'),
      h('p',{className:'small muted'},'Se comparte este contexto y los últimos mensajes de esta conversación. Puedes retirar o reemplazar datos antes de enviar. Cambiar el contexto inicia una conversación nueva.'),
      h(QAField,{label:'Contexto para el chat',value:source,onChange:v=>{setSource(v);clearConversation();},rows:12,maxLength:CHAT_SOURCE_LIMIT,readOnly:busy}),
      h('p',{className:'small muted'},`${source.length.toLocaleString('es-PE')} de ${CHAT_SOURCE_LIMIT.toLocaleString('es-PE')} caracteres. Si necesitas reducirlo, conserva los fragmentos literales que respaldan la propuesta.`)),
    h('div',{className:'free-chat-log',role:'log','aria-label':'Conversación con el Asistente Camposol','aria-live':'polite','aria-relevant':'additions text'},
      !turns.length&&!pending&&h('div',{className:'free-chat-welcome'},h('h3',null,'¿Qué revisamos en esta cartilla?'),h('p',null,'Puedo ayudarte a entender las funcionalidades, detectar información que falta y preparar propuestas basadas en los requisitos guardados.'),
        h('div',{className:'free-chat-starters'},...['Resume la información disponible.','¿Qué información falta por aclarar?','Prepara una propuesta para la tarea seleccionada.'].map(text=>h(Button,{key:text,variant:'secondary',disabled:busy||!prepared,onClick:()=>setDraft(text)},text)))),
      ...turns.map((turn,i)=>h('article',{key:i,className:`free-chat-bubble ${turn.role}`},h('strong',null,turn.role==='user'?'Tú':'Asistente Camposol'),h('p',null,turn.content),turn.proposal&&h(Button,{variant:'secondary',disabled:busy,onClick:()=>{setProposal(structuredClone(turn.proposal!));setReviewed(false);setError('');}},'Revisar esta propuesta'))),
      pending&&h('article',{className:'free-chat-bubble user'},h('strong',null,'Tú'),h('p',null,pending)),pending&&h('p',{role:'status',className:'free-chat-thinking'},'El asistente está preparando la respuesta…'),h('div',{ref:bottom})),
    h(Alert,{message:error}),h(FreeChatProposalIssue,{error:validationIssue,busy,onRepair:()=>{setDraft(CHAT_REPAIR_MESSAGE);setError('');}}),h(Alert,{message:success,success:true}),
    prepared&&h('form',{className:'free-chat-composer',onSubmit:send},h(QAField,{label:'Tu mensaje',value:draft,onChange:setDraft,rows:3,maxLength:CHAT_MESSAGE_LIMIT,readOnly:busy,hint:'La conversación es temporal. Las propuestas que apliques sí se guardan en la cartilla y su historial.'}),
      h('label',{className:'checkbox ai-consent'},h('input',{type:'checkbox',checked:consent,disabled:busy,onChange:(e:ChangeEvent<HTMLInputElement>)=>setConsent(e.target.checked)}),' Revisé el contexto y cuento con autorización para compartirlo, junto con los mensajes que envíe, con Groq durante esta conversación.'),
      h('div',{className:'form-actions'},h(Button,{variant:'ghost',disabled:busy,onClick:clearConversation},'Nueva conversación'),h(Button,{type:'submit',disabled:busy||service.loading||!service.status?.enabled||!consent||!draft.trim()},busy?'Consultando…':'Enviar mensaje'))),
    h('p',{className:'small muted'},'El servicio gratuito comparte una cuota limitada. Si se agota, espera su restablecimiento. No cambia automáticamente a una API de pago.'),
    proposal&&prepared&&h('section',{className:'free-chat-proposal'},h(ProposalEditor,{proposal,functionalities:prepared.context.document.content.context.functionalities,onChange:p=>{setProposal(p);setReviewed(false);}}),
      proposal.kind!=='coverage'&&h('div',{className:'ai-apply'},h('p',null,proposal.kind==='analysis'?'La propuesta se incorporará al contexto conservando las funcionalidades existentes. Requerirá revisión.':proposal.kind==='selection'?'Se agregarán los casos propuestos a la selección existente. El conjunto requerirá revisión.':'Se actualizarán los campos de este caso. La versión anterior seguirá en el historial y se requerirá una nueva revisión.'),
        h('label',{className:'checkbox'},h('input',{type:'checkbox',checked:reviewed,disabled:busy,onChange:(e:ChangeEvent<HTMLInputElement>)=>setReviewed(e.target.checked)}),' Revisé los requisitos, las citas y la propuesta; deseo guardarla como borrador.'),
        h(Button,{disabled:busy||!reviewed,onClick:()=>void apply()},busy?'Guardando…':'Guardar propuesta como borrador'))));
}
