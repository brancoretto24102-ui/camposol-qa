import type { Application, AuditEvent, Member, Profile, Project, ProjectInput, Role } from './domain.ts';
export interface BackendInfo { mode:'local'|'supabase'; bootstrap_required:boolean; microsoft_enabled:boolean; google_enabled:boolean }
export interface AccountInput { full_name:string; email:string; password:string; role?:Role }
export interface Backend {
  info():Promise<BackendInfo>; session():Promise<Profile|null>;
  signIn(email:string,password:string):Promise<void>; signUp(input:AccountInput):Promise<string>;
  bootstrap(input:AccountInput):Promise<void>; logout():Promise<void>; oauth(provider:'azure'|'google'):Promise<void>;
  recover(email:string):Promise<string>; reset(token:string,password:string):Promise<void>;
  applications():Promise<Application[]>; projects():Promise<Project[]>; project(id:string):Promise<Project>;
  saveProject(input:ProjectInput,previous?:Project):Promise<Project>;
  users():Promise<Profile[]>; createUser(input:AccountInput):Promise<void>;
  updateUser(user:Profile):Promise<void>; updateProfile(full_name:string):Promise<Profile>;
  members(projectId:string):Promise<Member[]>; setMember(projectId:string,user_id:string,role:Role):Promise<void>;
  removeMember(projectId:string,userId:string):Promise<void>; audit(projectId?:string):Promise<AuditEvent[]>;
}
export class LocalBackend implements Backend {
  private csrf='';
  private async request<T>(path:string,method='GET',body?:unknown):Promise<T>{
    const response=await fetch(`/api${path}`,{method,credentials:'same-origin',headers:{'Content-Type':'application/json',...(this.csrf?{'X-CSRF-Token':this.csrf}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await response.json();if(!response.ok)throw new Error(value.error??'No fue posible completar la operación.');return value as T;
  }
  info(){return this.request<BackendInfo>('/info');}
  async session(){const r=await this.request<{user:Profile|null;csrf:string}>('/session');this.csrf=r.csrf;return r.user;}
  async signIn(email:string,password:string){const r=await this.request<{csrf:string}>('/login','POST',{email,password});this.csrf=r.csrf;}
  async bootstrap(input:AccountInput){const r=await this.request<{csrf:string}>('/bootstrap','POST',input);this.csrf=r.csrf;}
  async signUp(_input:AccountInput):Promise<string>{throw new Error('Las cuentas locales las crea el administrador.');}
  async logout(){await this.request('/logout','POST',{});this.csrf='';}
  async oauth(_provider:'azure'|'google'):Promise<void>{throw new Error('El acceso con proveedores externos requiere configurar Supabase.');}
  async recover(email:string){return (await this.request<{message:string}>('/recovery','POST',{email})).message;}
  async reset(token:string,password:string){await this.request('/reset-password','POST',{token,password});}
  applications(){return this.request<Application[]>('/applications');}
  projects(){return this.request<Project[]>('/projects');}
  project(id:string){return this.request<Project>(`/projects/${id}`);}
  saveProject(input:ProjectInput,previous?:Project){return this.request<Project>(previous?`/projects/${previous.id}`:'/projects',previous?'PATCH':'POST',{...input,...(previous?{version:previous.version}:{})});}
  users(){return this.request<Profile[]>('/users');}
  async createUser(input:AccountInput){await this.request('/users','POST',input);}
  async updateUser(user:Profile){await this.request(`/users/${user.id}`,'PATCH',{role:user.role,active:user.active,can_self_approve:user.can_self_approve});}
  updateProfile(full_name:string){return this.request<Profile>('/profile','PATCH',{full_name});}
  members(id:string){return this.request<Member[]>(`/projects/${id}/members`);}
  async setMember(id:string,user_id:string,role:Role){await this.request(`/projects/${id}/members`,'PUT',{user_id,role});}
  async removeMember(id:string,userId:string){await this.request(`/projects/${id}/members/${userId}`,'DELETE',{});}
  audit(id?:string){return this.request<AuditEvent[]>(`/audit${id?`?project_id=${encodeURIComponent(id)}`:''}`);}
}
export async function createBackend():Promise<Backend>{
  if(import.meta.env.VITE_BACKEND==='supabase'){const { SupabaseBackend }=await import('./supabase-backend.ts');return new SupabaseBackend();}
  return new LocalBackend();
}
