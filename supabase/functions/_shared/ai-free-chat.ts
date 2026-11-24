import {chatInstructions,FREE_CHAT_MODEL,CHAT_OUTPUT_TOKENS,type AIChatInput,type FreeChatStatus,type ChatTransportResult} from '../../../src/ai-chat-domain.ts';
import {QAError} from '../../../src/qa-domain.ts';

export interface FreeChatConfig {key:string;freePlanConfirmed:boolean}
export function freeChatStatus(config:FreeChatConfig):FreeChatStatus {
  return {enabled:config.freePlanConfirmed===true&&typeof config.key==='string'&&config.key.length>=20&&config.key.length<=512&&!/[\r\n]/.test(config.key),provider:'groq',model:FREE_CHAT_MODEL};
}
export const freeChatUnavailable='El chat gratuito aún necesita activación del administrador. Puedes continuar elaborando la cartilla manualmente.';
export async function callFreeChat(input:AIChatInput,config:FreeChatConfig,fetcher:typeof fetch=fetch):Promise<ChatTransportResult>{
  if(!freeChatStatus(config).enabled)throw new QAError(503,freeChatUnavailable);
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),50_000);
  const headers:Record<string,string>={'Content-Type':'application/json',Authorization:`Bearer ${config.key}`};
  try{
    const response=await fetcher('https://api.groq.com/openai/v1/chat/completions',{method:'POST',redirect:'error',signal:controller.signal,headers,
      body:JSON.stringify({model:FREE_CHAT_MODEL,messages:[{role:'system',content:chatInstructions(input)},{role:'user',content:`CONTEXTO REVISADO\n${input.prompt}\nFIN DE CONTEXTO`},...input.history,{role:'user',content:input.message}],
        response_format:{type:'json_object'},stream:false,max_completion_tokens:CHAT_OUTPUT_TOKENS,reasoning_effort:'low',include_reasoning:false})});
    if(!response.ok){await response.body?.cancel();
      if(response.status===429)throw new QAError(429,'Se alcanzó la cuota gratuita compartida de Groq o un límite temporal. Espera al restablecimiento antes de volver a enviar. No se cambió a un servicio de pago.');
      if(response.status===401||response.status===403)throw new QAError(503,'El administrador debe revisar la conexión del chat gratuito con Groq.');
      throw new QAError(502,'El chat gratuito no pudo completar la consulta. Conserva tu pregunta y vuelve a intentar más tarde.');
    }
    const reader=response.body?.getReader();if(!reader)throw new QAError(502,'La IA devolvió una respuesta vacía.');
    const chunks:Uint8Array[]=[];let size=0;
    try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>200_000){await reader.cancel();throw new QAError(502,'La respuesta del chat excedió el límite. Solicita una propuesta más breve.');}chunks.push(value);}}finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    let data:Record<string,any>;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new QAError(502,'La IA no devolvió una respuesta válida.');}
    const choice=data.choices?.[0],result=choice?.message?.content;
    if(choice?.finish_reason!=='stop'||typeof result!=='string'||!result.trim()||choice.message.tool_calls?.length)throw new QAError(502,'La respuesta del chat quedó incompleta. Conserva tu pregunta y solicita una propuesta más pequeña.');
    if(result.includes(config.key))throw new QAError(502,'La respuesta del proveedor no es válida.');
    const count=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0?n:null;
    return {text:result,input_tokens:count(data.usage?.prompt_tokens),output_tokens:count(data.usage?.completion_tokens)};
  }catch(error){if(error instanceof QAError)throw error;throw new QAError(502,'No se pudo completar la conexión del chat gratuito. Conserva tu pregunta. No se reintentó automáticamente.');}
  finally{clearTimeout(timeout);delete headers.Authorization;}
}
