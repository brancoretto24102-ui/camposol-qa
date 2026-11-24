import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Backend, BackendInfo, AccountInput } from './backend.ts';
import type { Application, AuditEvent, Member, Profile, Project, ProjectInput, Role } from './domain.ts';
import type { MethodologyInput, MethodologyVersion, QACommand, QADocument, QAProgress, QARevision } from './qa-domain.ts';
const authMessages:Record<string,string>={
  invalid_credentials:'Correo o contraseña incorrectos.',
  email_not_confirmed:'Confirma tu correo antes de iniciar sesión.',
  email_address_not_authorized:'El servicio de correo no permite enviar a esta dirección. Contacta al administrador.',
  over_email_send_rate_limit:'Se alcanzó el límite temporal de correos. Espera antes de solicitar otro. Si ya recibiste el enlace, confirma tu cuenta y vuelve al inicio de sesión.',
  over_request_rate_limit:'Se alcanzó el límite temporal de solicitudes. Espera un momento y vuelve a intentarlo.',
  weak_password:'La contraseña no cumple los requisitos de seguridad. Revisa las indicaciones del formulario.',
};
function check(error:{message:string;code?:string}|null){
  if(!error)return;
  const wait=error.message.match(/^For security purposes, you can only request this after (\d+) seconds?\.?$/i)?.[1];
  if(wait)throw new Error(`Espera ${wait} segundos antes de volver a intentarlo. Si ya recibiste el correo, confirma tu cuenta y vuelve al inicio de sesión.`);
  if(error.code&&authMessages[error.code])throw new Error(authMessages[error.code]);
  if(error.code==='PGRST116')throw new Error('El registro no está disponible o cambió su versión. Recarga los datos.');
  if(error.code==='42501')throw new Error('No tienes permiso para esta operación.');
  throw new Error(error.message);
}
export class SupabaseBackend implements Backend {
  private client:SupabaseClient;
  private current:Profile|null=null;
  constructor(){const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error('Falta configurar la URL y la clave publicable del backend independiente.');this.client=createClient(url,key,{auth:{storage:window.sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});}
  async info():Promise<BackendInfo>{return {mode:'supabase',bootstrap_required:false,microsoft_enabled:import.meta.env.VITE_MICROSOFT_ENABLED==='true',google_enabled:import.meta.env.VITE_GOOGLE_ENABLED==='true'};}
  async session(){const {data:{session}}=await this.client.auth.getSession();if(!session){this.current=null;return null;}const {data:{user},error}=await this.client.auth.getUser();check(error);if(!user){this.current=null;return null;}const {data,error:profileError}=await this.client.from('user_profiles').select('*').eq('id',user.id).single();check(profileError);this.current=data as Profile;return this.current;}
  async signIn(email:string,password:string){const {error}=await this.client.auth.signInWithPassword({email,password});check(error);}
  async signUp(input:AccountInput){const {error}=await this.client.auth.signUp({email:input.email,password:input.password,options:{data:{full_name:input.full_name},emailRedirectTo:window.location.origin+window.location.pathname}});check(error);return 'Confirma tu correo y después vuelve a esta ventana para iniciar sesión. Un administrador debe activar tu acceso antes de crear o consultar proyectos.';}
  async bootstrap(_input:AccountInput):Promise<void>{throw new Error('El administrador remoto debe ser habilitado desde el backend por su propietario.');}
  async logout(){const {error}=await this.client.auth.signOut();check(error);this.current=null;}
  async oauth(provider:'azure'|'google'){const {error}=await this.client.auth.signInWithOAuth({provider,options:{scopes:provider==='azure'?'email':undefined,redirectTo:window.location.origin+window.location.pathname}});check(error);}
  async recover(email:string){const {error}=await this.client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+window.location.pathname+'#restablecer'});check(error);return 'Si la cuenta existe y el servicio de correo está configurado, recibirás las instrucciones para recuperar tu acceso.';}
  async reset(_token:string,password:string){const {error}=await this.client.auth.updateUser({password});check(error);await this.logout();}
  async applications(){const {data,error}=await this.client.from('applications').select('*').order('name');check(error);return data as Application[];}
  private async allRows<T>(table:string,sort:string,key:string):Promise<T[]>{
    const rows:T[]=[];
    for(let start=0;;start+=500){
      const {data,error}=await this.client.from(table).select('*').order(sort).order(key).range(start,start+499);
      check(error);rows.push(...(data??[]) as unknown as T[]);if(!data||data.length<500)return rows;
    }
  }
  async saveApplication(input:Application){const {data,error}=await this.client.rpc('qa_application_save',{input});check(error);return data as Application;}
  methodologies(){return this.allRows<MethodologyVersion>('qa_methodology_versions','name','id');}
  async saveMethodology(input:MethodologyInput,previous?:MethodologyVersion){const {data,error}=await this.client.rpc('qa_methodology_save',{input,target:previous?.id??null,expected_revision:previous?.revision??0});check(error);return data as MethodologyVersion;}
  async approveMethodology(previous:MethodologyVersion){const {data,error}=await this.client.rpc('qa_methodology_approve',{target:previous.id,expected_revision:previous.revision});check(error);return data as MethodologyVersion;}
  async qaDocument(id:string){const {data,error}=await this.client.from('qa_documents').select('*').eq('project_id',id).maybeSingle();check(error);return data as QADocument|null;}
  async qaCommand(id:string,version:number,command:QACommand){const {data,error}=await this.client.rpc('qa_command',{target:id,expected_version:version,command});check(error);return data as QADocument;}
  qaProgress(){return this.allRows<QAProgress>('qa_progress','updated_at','project_id');}
  async qaHistory(id:string,offset=0){const {data,error}=await this.client.from('qa_document_revisions').select('project_id,version,action,actor_id,actor_name,created_at').eq('project_id',id).order('version',{ascending:false}).range(offset,offset+19);check(error);return (data??[]) as QARevision[];}
  async qaRevision(id:string,version:number){const {data,error}=await this.client.from('qa_document_revisions').select('snapshot').eq('project_id',id).eq('version',version).single();check(error);if(!data)throw new Error('La versión no está disponible.');return data.snapshot as QADocument;}
  private async mapProjects(rows:Record<string,unknown>[]):Promise<Project[]>{const profile=this.current??await this.session();if(!profile)return [];const {data:members,error}=await this.client.from('project_members').select('project_id,role').eq('user_id',profile.id);check(error);return rows.map(row=>({...row,application_name:(row.applications as {name:string}|null)?.name??'',can_edit:profile.active&&(profile.role==='administrador'||(profile.role==='editor'&&(row.owner_id===profile.id||members?.some(m=>m.project_id===row.id&&m.role==='editor'))))}) as unknown as Project);}
  async projects(){const {data,error}=await this.client.from('projects').select('*,applications(name)').order('updated_at',{ascending:false});check(error);return this.mapProjects(data??[]);}
  async project(id:string){const {data,error}=await this.client.from('projects').select('*,applications(name)').eq('id',id).single();check(error);return (await this.mapProjects([data]))[0];}
  async saveProject(input:ProjectInput,previous?:Project){const user=this.current??await this.session();if(!user)throw new Error('Inicia sesión nuevamente.');const query=previous?this.client.from('projects').update(input).eq('id',previous.id).eq('version',previous.version):this.client.from('projects').insert({...input,owner_id:user.id});const {data,error}=await query.select('*,applications(name)').single();check(error);return (await this.mapProjects([data]))[0];}
  async users(){const {data,error}=await this.client.from('user_profiles').select('*').order('full_name');check(error);return data as Profile[];}
  async createUser(_input:AccountInput):Promise<void>{throw new Error('El usuario debe registrar y confirmar su propia cuenta. Luego puedes activarla y asignar su rol.');}
  async updateUser(user:Profile){const {error}=await this.client.rpc('admin_update_user',{target:user.id,new_role:user.role,new_active:user.active,self_approval:user.can_self_approve});check(error);}
  async updateProfile(full_name:string){if(!this.current)throw new Error('Inicia sesión nuevamente.');const {data,error}=await this.client.from('user_profiles').update({full_name}).eq('id',this.current.id).select('*').single();check(error);this.current=data as Profile;return this.current;}
  async members(projectId:string){const {data,error}=await this.client.from('project_members').select('user_id,role,user_profiles(full_name)').eq('project_id',projectId);check(error);return (data??[]).map(m=>({user_id:m.user_id,role:m.role,full_name:(m.user_profiles as unknown as {full_name:string}|null)?.full_name??'Usuario'})) as Member[];}
  async setMember(id:string,user_id:string,role:Role){const {error}=await this.client.from('project_members').upsert({project_id:id,user_id,role});check(error);}
  async removeMember(id:string,userId:string){const {error}=await this.client.from('project_members').delete().eq('project_id',id).eq('user_id',userId);check(error);}
  async audit(id?:string){let query=this.client.from('audit_logs').select('id,action,entity_id,details,created_at,user_profiles(full_name)').order('created_at',{ascending:false}).limit(100);if(id)query=query.eq('project_id',id);const {data,error}=await query;check(error);return (data??[]).map(a=>({...a,actor_name:(a.user_profiles as unknown as {full_name:string}|null)?.full_name??'Sistema'})) as AuditEvent[];}
}
