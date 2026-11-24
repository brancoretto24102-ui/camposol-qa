import {createElement as h,useEffect,useState} from 'react';
import type {Backend} from '../backend.ts';
import type {FreeChatStatus} from '../ai-chat-domain.ts';
import {Alert,Button} from '../ui.ts';
import {message} from '../forms.ts';

export function useFreeChatStatus(backend:Backend){
  const [status,setStatus]=useState<FreeChatStatus|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  async function reload(){setLoading(true);setError('');try{setStatus(await backend.aiFreeStatus());}catch(e){setStatus(null);setError(message(e));}finally{setLoading(false);}}
  useEffect(()=>{void reload();},[backend]);
  return {status,loading,error,reload};
}
export function FreeChatAvailability({status,loading,error,onReload,busy=false}:{status:FreeChatStatus|null;loading:boolean;error:string;onReload:()=>void;busy?:boolean}){
  return h('div',{className:'free-chat-availability'},h(Alert,{message:error}),loading?h('p',{role:'status'},'Comprobando el chat gratuito…'):
    h('p',{className:status?.enabled?'notice success':'notice info',role:'status'},status?.enabled?'Chat gratuito disponible · Groq. Utiliza una cuota compartida y se detiene cuando se alcanza su límite.':'El chat gratuito necesita activación del administrador. Tu cuenta de Camposol QA no necesita una clave propia ni una suscripción de IA.'),
    h(Button,{variant:'ghost',disabled:loading||busy,onClick:onReload},'Comprobar disponibilidad'));
}
export function FreeChatService({backend}:{backend:Backend}){
  const state=useFreeChatStatus(backend);
  return h('section',{className:'panel form-panel'},h('div',{className:'eyebrow'},'CHAT INTEGRADO'),h('h2',null,'Asistente gratuito de Camposol QA'),
    h('p',null,'Abre el Asistente IA de una cartilla y elige Chat gratuito. Puedes conversar y revisar propuestas dentro de la página; cada cambio requiere tu revisión antes de guardarse.'),
    h(FreeChatAvailability,{...state,onReload:()=>void state.reload()}),
    h('div',{className:'ai-links'},h('a',{href:'https://console.groq.com/docs/rate-limits',target:'_blank',rel:'noopener noreferrer'},'Cuota gratuita de Groq'),h('a',{href:'https://console.groq.com/docs/your-data',target:'_blank',rel:'noopener noreferrer'},'Privacidad del proveedor')));
}
