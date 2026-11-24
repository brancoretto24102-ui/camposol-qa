import {parseAIResponse,validateAIGenerate,assertAITarget,type AIContext,type AIGenerateInput,type AIResult} from '../../../src/ai-domain.ts';
import {QAError} from '../../../src/qa-domain.ts';
import {validateChatInput,parseChatResult,FREE_CHAT_MODEL,type AIRequestTarget,type AIChatInput,type ChatTransportResult,type FreeChatStatus} from '../../../src/ai-chat-domain.ts';
import {freeChatUnavailable} from './ai-free-chat.ts';

export const aiOrigins=['https://brancoretto24102-ui.github.io','https://camposol-qa.ingbca-360.chatgpt.site','http://127.0.0.1:5173','http://127.0.0.1:4317','http://localhost:5173','http://localhost:4317'];
interface Dependencies {
  authenticate:(token:string)=>Promise<unknown>;
  load:(caller:unknown,input:AIRequestTarget)=>Promise<AIContext>;
  reserve:(caller:unknown,input:AIRequestTarget)=>Promise<void>;
  call:(input:AIGenerateInput)=>Promise<AIResult>;
  freeStatus?:()=>FreeChatStatus;
  chat?:(input:AIChatInput)=>Promise<ChatTransportResult>;
}
export function createAIHandler(deps:Dependencies){return async(req:Request):Promise<Response>=>{
  const origin=req.headers.get('Origin')??'',allowed=aiOrigins.includes(origin);
  const headers:Record<string,string>={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff',...(allowed?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}:{})};
  const send=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});let input:AIGenerateInput|undefined,raw:Record<string,unknown>|undefined;
  try{
    if(!allowed)return send(403,{error:'Origen no autorizado.'});
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(req.method!=='POST')return send(405,{error:'Método no permitido.'});
    const authorization=req.headers.get('Authorization')??'';
    if(!/^Bearer [A-Za-z0-9._-]+$/.test(authorization))return send(401,{error:'Inicia sesión para utilizar el asistente.'});
    const caller=await deps.authenticate(authorization.slice(7));
    if(!req.headers.get('Content-Type')?.startsWith('application/json'))return send(415,{error:'Se requiere JSON.'});
    const reader=req.body?.getReader();if(!reader)return send(400,{error:'La solicitud está vacía.'});
    const chunks:Uint8Array[]=[];let size=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>280_000){await reader.cancel();return send(413,{error:'La solicitud es demasiado grande.'});}chunks.push(value);}}finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    try{raw=JSON.parse(new TextDecoder().decode(bytes));}catch{return send(400,{error:'La solicitud no contiene JSON válido.'});}
    if(raw?.action==='free_status'){
      if(Object.keys(raw).length!==1)throw new QAError(422,'La consulta de disponibilidad no admite otros campos.');
      return send(200,deps.freeStatus?.()??{enabled:false,provider:'groq',model:FREE_CHAT_MODEL});
    }
    if(raw?.action==='chat'){
      const chat=validateChatInput(raw),context=await deps.load(caller,chat);assertAITarget(context,chat);
      if(!deps.chat||!deps.freeStatus?.().enabled)throw new QAError(503,freeChatUnavailable);
      await deps.reserve(caller,chat);return send(200,parseChatResult(await deps.chat(chat),context,chat));
    }
    input=validateAIGenerate(raw);const context=await deps.load(caller,input);await deps.reserve(caller,input);
    const result=await deps.call(input);try{parseAIResponse(result.text,context,input);}catch(error){result.validation_error=error instanceof Error?error.message:'Revisa el formato de la respuesta.';}
    return send(200,result);
  }catch(error){return send(error instanceof QAError?error.status:500,{error:error instanceof QAError?error.message:'No fue posible completar la solicitud. No se guardó la clave ni se reintentó el envío.'});}
  finally{if(input)input.api_key='';if(raw)delete raw.api_key;}
};}
