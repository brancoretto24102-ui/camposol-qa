export type Role = 'administrador' | 'editor' | 'revisor' | 'lector';
export type ProjectStatus = 'borrador' | 'en_preparacion' | 'archivado';
export interface Profile { id: string; email: string; full_name: string; role: Role; active: boolean; can_self_approve: boolean }
export interface Application { id: string; name: string; active: boolean }
export interface Project { id: string; owner_id: string; application_id: string; application_name: string; code: string; name: string; objective: string; description: string; status: ProjectStatus; version: number; created_at: string; updated_at: string; can_edit: boolean }
export interface ProjectInput { application_id: string; code: string; name: string; objective: string; description: string; status: ProjectStatus }
export interface Member { user_id: string; full_name: string; role: Role }
export interface AuditEvent { id: string; actor_name: string; action: string; entity_id: string | null; created_at: string; details: string }
export const roles: Role[] = ['administrador', 'editor', 'revisor', 'lector'];
export const statusLabels: Record<ProjectStatus, string> = { borrador: 'Borrador', en_preparacion: 'En preparación', archivado: 'Archivado' };
export function canCreate(profile: Profile): boolean { return profile.active && ['administrador','editor'].includes(profile.role); }
export function initials(name: string): string { return name.trim().split(/\s+/).slice(0,2).map(n=>n[0] ?? '').join('').toUpperCase(); }
export function summarize(projects: Project[]) { return { total: projects.length, active: projects.filter(p=>p.status!=='archivado').length, drafts: projects.filter(p=>p.status==='borrador').length, archived: projects.filter(p=>p.status==='archivado').length }; }
export function validateProject(input: ProjectInput): string | null {
  if (!input || typeof input!=='object' || ['application_id','code','name','objective','description','status'].some(field=>typeof (input as unknown as Record<string,unknown>)[field]!=='string')) return 'Los datos del proyecto no tienen el formato esperado.';
  if (!input.application_id) return 'Selecciona una aplicación.';
  if (input.name.trim().length < 3 || input.name.trim().length > 160) return 'El nombre debe tener entre 3 y 160 caracteres.';
  if (!input.code.trim() || input.code.trim().length > 60) return 'Indica un código de cartilla de hasta 60 caracteres.';
  if (!input.objective.trim() || input.objective.length > 2000) return 'Indica un objetivo de hasta 2.000 caracteres.';
  if (input.description.length > 10000) return 'La descripción admite hasta 10.000 caracteres.';
  if (!Object.hasOwn(statusLabels,input.status)) return 'El estado no es válido.';
  return null;
}
