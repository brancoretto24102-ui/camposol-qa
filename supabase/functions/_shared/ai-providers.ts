import {AI_OUTPUT_TOKENS,AI_RESPONSE_LIMIT,type AIGenerateInput,type AIResult} from '../../../src/ai-domain.ts';
import {QAError} from '../../../src/qa-domain.ts';

// Inspect only bounded error codes. Never return the provider's raw error
// message: it may include credentials, prompts, or private account details.
async function openAIQuotaError(response:Response):Promise<QAError>{
  let code='',type='';
  const reader=response.body?.getReader();
  if(reader)try{
    const chunks:Uint8Array[]=[];let size=0;
    for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>16_384){await reader.cancel();return new QAError(429,'OpenAI rechazó la consulta por un límite de uso, saldo o cuota (429). Revisa los límites y la facturación de tu cuenta API.');}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const data=JSON.parse(new TextDecoder().decode(bytes));code=typeof data?.error?.code==='string'?data.error.code:'';type=typeof data?.error?.type==='string'?data.error.type:'';
  }catch{/* A malformed or interrupted error body keeps the safe fallback. */}
  finally{reader.releaseLock();}
  const messages:Record<string,string>={
    credit_balance_exhausted:'OpenAI indica que el saldo de créditos API está agotado. Revisa la facturación de tu cuenta API antes de volver a enviar la consulta.',
    organization_spend_limit_exceeded:'OpenAI indica que se alcanzó el límite de gasto de la organización. Revisa ese límite con quien administra tu cuenta API antes de volver a intentar.',
    project_spend_limit_exceeded:'OpenAI indica que se alcanzó el límite de gasto del proyecto API. Revisa la configuración de ese proyecto antes de volver a intentar.',
    organization_usage_limit_exceeded:'OpenAI indica que se alcanzó el límite de uso asignado a la organización. Revisa los límites de tu cuenta API antes de volver a intentar.',
    rate_limit_exceeded:'OpenAI limitó temporalmente las solicitudes o los tokens. Espera antes de volver a intentar y revisa los límites del modelo en tu cuenta API.',
    slow_down:'OpenAI pidió reducir la frecuencia de solicitudes. Espera antes de volver a enviar la consulta.',
    insufficient_quota:'OpenAI indica que no hay cuota API disponible. Revisa el saldo y los límites de gasto o uso de tu cuenta API. Reintentar sin resolverlo no restablece el acceso.',
  };
  const known=Object.hasOwn(messages,code)?messages[code]:type==='insufficient_quota'?messages.insufficient_quota:null;
  return new QAError(429,known??'OpenAI rechazó la consulta por un límite de uso, saldo o cuota (429). Revisa los límites y la facturación de tu cuenta API.');
}

// Only server entrypoints import this transport. Keys are never added to URLs,
// returned values, prompts, logs, retries, or persistent storage.
export async function callAIProvider(input:AIGenerateInput,fetcher:typeof fetch=fetch):Promise<AIResult>{
  const {provider,model,prompt}=input;
  let url:string,headers:Record<string,string>={'Content-Type':'application/json'},body:Record<string,unknown>;
  if(provider==='openai'){
    url='https://api.openai.com/v1/responses';headers.Authorization=`Bearer ${input.api_key}`;
    body={model,input:prompt,store:false,max_output_tokens:AI_OUTPUT_TOKENS,text:{format:{type:'json_object'}}};
  }else if(provider==='gemini'){
    url='https://generativelanguage.googleapis.com/v1beta/interactions';headers['x-goog-api-key']=input.api_key;headers['Api-Revision']='2026-05-20';
    body={model,input:prompt,store:false,generation_config:{max_output_tokens:AI_OUTPUT_TOKENS},response_format:{type:'text',mime_type:'application/json'}};
  }else if(provider==='claude'){
    url='https://api.anthropic.com/v1/messages';headers.Authorization=`Bearer ${input.api_key}`;headers['anthropic-version']='2026-10-21';
    body={model,max_tokens:AI_OUTPUT_TOKENS,messages:[{role:'user',content:prompt}]};
  }else throw new QAError(422,'La API de este proveedor no está habilitada. Usa la modalidad manual.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),50_000);
  try{
    const response=await fetcher(url,{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal:controller.signal});
    if(!response.ok){if(provider==='openai'&&response.status===429)throw await openAIQuotaError(response);await response.body?.cancel();
      if(response.status===401||response.status===403)throw new QAError(422,'El proveedor no autorizó la clave, el modelo o su ámbito. Comprueba tu cuenta API.');
      if(response.status===429)throw new QAError(429,'El proveedor alcanzó su límite de uso o cuota. Revisa tu cuenta antes de volver a intentar.');
      throw new QAError(502,'El proveedor no pudo completar la solicitud. Comprueba el modelo, su compatibilidad JSON y tu cuota. No se reintentó automáticamente.');
    }
    const reader=response.body?.getReader();if(!reader)throw new QAError(502,'El proveedor devolvió una respuesta vacía.');
    const chunks:Uint8Array[]=[];let size=0;
    try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1_000_000){await reader.cancel();throw new QAError(502,'La respuesta del proveedor excede el límite técnico. Solicita una propuesta más pequeña.');}chunks.push(value);}}finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    let data:Record<string,any>;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new QAError(502,'El proveedor no devolvió JSON válido.');}
    let content:string[],inputTokens:unknown,outputTokens:unknown;
    if(provider==='openai'){
      if(data.status!=='completed')throw new QAError(502,'La respuesta del proveedor quedó incompleta o fue rechazada. Reduce el alcance antes de volver a intentar.');
      content=(Array.isArray(data.output)?data.output:[]).filter((x:any)=>x.type==='message').flatMap((x:any)=>Array.isArray(x.content)?x.content:[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text);
      inputTokens=data.usage?.input_tokens;outputTokens=data.usage?.output_tokens;
    }else if(provider==='gemini'){
      if(data.status!=='completed')throw new QAError(502,'Gemini no completó la respuesta. Reduce el alcance antes de volver a intentar.');
      content=(Array.isArray(data.steps)?data.steps:[]).filter((x:any)=>x.type==='model_output').flatMap((x:any)=>Array.isArray(x.content)?x.content:[]).filter((x:any)=>x.type==='text').map((x:any)=>x.text);
      inputTokens=data.usage?.total_input_tokens;outputTokens=data.usage?.total_output_tokens;
    }else{
      if(data.stop_reason!=='end_turn')throw new QAError(502,'Claude no completó la respuesta o llegó al límite. Reduce el alcance antes de volver a intentar.');
      content=(Array.isArray(data.content)?data.content:[]).filter((x:any)=>x.type==='text').map((x:any)=>x.text);
      inputTokens=data.usage?.input_tokens;outputTokens=data.usage?.output_tokens;
    }
    if(!content.length||content.some(x=>typeof x!=='string'))throw new QAError(502,'El proveedor no devolvió una propuesta de texto.');
    const result=content.join('\n');if(new TextEncoder().encode(result).length>AI_RESPONSE_LIMIT)throw new QAError(502,'La propuesta supera 140 KB. Divide la solicitud.');
    const count=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0?n:null;
    return {text:result,provider,model,input_tokens:count(inputTokens),output_tokens:count(outputTokens)};
  }catch(error){if(error instanceof QAError)throw error;throw new QAError(502,'No se pudo completar la conexión con el proveedor. No se reintentó automáticamente ni se guardó la clave.');}
  finally{clearTimeout(timeout);input.api_key='';headers={};}
}
