import {createClient,type SupabaseClient} from 'npm:@supabase/supabase-js@2.119.2';
import {createAIHandler} from '../_shared/ai-handler.ts';
import {callAIProvider} from '../_shared/ai-providers.ts';
import {callFreeChat,freeChatStatus} from '../_shared/ai-free-chat.ts';
import {assertAITarget,type AIContext} from '../../../src/ai-domain.ts';
import {QAError} from '../../../src/qa-domain.ts';

// The gateway verifies the JWT; getUser also validates it against Auth. All
// queries and RPC calls below use the caller's JWT and RLS, never service_role.
const freeConfig=()=>({key:Deno.env.get('GROQ_API_KEY')??'',freePlanConfirmed:Deno.env.get('GROQ_FREE_PLAN_CONFIRMED')==='true'});
const handler=createAIHandler({
  async authenticate(token){
    let publicKey=Deno.env.get('SUPABASE_ANON_KEY');
    try{publicKey=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')??'{}').default??publicKey;}catch{throw new QAError(503,'No fue posible cargar la configuración pública del intermediario.');}
    const url=Deno.env.get('SUPABASE_URL');if(!url||!publicKey)throw new QAError(503,'Falta la configuración pública del intermediario.');
    const client=createClient(url,publicKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data,error}=await client.auth.getUser(token);if(error||!data.user)throw new QAError(401,'La sesión terminó. Inicia sesión nuevamente.');return {client,id:data.user.id};
  },
  async load(caller,input){
    const {client,id}=caller as {client:SupabaseClient;id:string};
    const [profile,project,document]=await Promise.all([
      client.from('user_profiles').select('role,active').eq('id',id).single(),
      client.from('projects').select('id,status,name,code,objective,description,owner_id').eq('id',input.project_id).single(),
      client.from('qa_documents').select('*').eq('project_id',input.project_id).single(),
    ]);
    if(profile.error||!profile.data?.active||!['administrador','editor'].includes(profile.data.role)||project.error||document.error)throw new QAError(403,'La cartilla no está disponible para elaborar contenido con tu cuenta.');
    if(document.data.version!==input.version)throw new QAError(409,'La cartilla cambió. Conserva tu propuesta y recarga antes de enviarla.');
    const m=await client.from('qa_methodology_versions').select('*').eq('id',document.data.methodology_version_id).single();
    if(m.error)throw new QAError(403,'La metodología no está disponible.');
    const context={project:project.data,document:document.data,methodology:m.data} as AIContext;assertAITarget(context,input);return context;
  },
  async reserve(caller,input){
    const {client}=caller as {client:SupabaseClient};
    const {error}=await client.rpc('qa_ai_reserve',{target:input.project_id,expected_version:input.version,task:input.task,target_case:input.case_id??null});
    if(error)throw new QAError(error.code==='42501'?403:error.code==='40001'?409:error.code==='P0001'?429:422,error.message);
  },
  call:input=>callAIProvider(input),
  freeStatus:()=>freeChatStatus(freeConfig()),
  chat:input=>callFreeChat(input,freeConfig()),
});
Deno.serve(handler);
