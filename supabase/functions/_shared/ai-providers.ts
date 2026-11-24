import {AI_OUTPUT_TOKENS,AI_RESPONSE_LIMIT,type AIGenerateInput,type AIResult} from '../../../src/ai-domain.ts';
import {QAError} from '../../../src/qa-domain.ts';

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
    if(!response.ok){await response.body?.cancel();
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
