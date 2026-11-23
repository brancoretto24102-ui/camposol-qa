-- Camposol QA: ejecutar exclusivamente en el backend independiente de desarrollo.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null check(length(full_name) between 1 and 160),
  role text not null default 'lector' check(role in ('administrador','editor','revisor','lector')),
  active boolean not null default false,
  can_self_approve boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.applications (
  id text primary key, name text not null unique, active boolean not null default true
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.user_profiles(id),
  application_id text not null references public.applications(id),
  code text not null check(length(btrim(code)) between 1 and 60),
  name text not null check(length(btrim(name)) between 3 and 160),
  objective text not null check(length(btrim(objective)) between 1 and 2000),
  description text not null default '' check(length(description)<=10000),
  status text not null default 'borrador' check(status in ('borrador','en_preparacion','archivado')),
  version integer not null default 1 check(version>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role text not null check(role in ('editor','revisor','lector')),
  primary key(project_id,user_id)
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.user_profiles(id),
  project_id uuid references public.projects(id),
  action text not null, entity_id uuid, details text not null default '',
  created_at timestamptz not null default now()
);
create index projects_owner_idx on public.projects(owner_id);
create index projects_application_idx on public.projects(application_id);
create index project_members_user_idx on public.project_members(user_id);
create index audit_project_idx on public.audit_logs(project_id,created_at desc);
create index audit_actor_idx on public.audit_logs(actor_id);

create function private.current_role() returns text language sql stable security definer set search_path='' as $$
  select p.role from public.user_profiles p where p.id=(select auth.uid()) and p.active;
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select auth.uid()) is not null and private.current_role()='administrador',false);
$$;
create function private.has_project_access(target uuid) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and private.current_role() is not null and (
    private.is_admin() or exists(select 1 from public.projects p where p.id=target and (
      p.owner_id=(select auth.uid()) or exists(select 1 from public.project_members m where m.project_id=p.id and m.user_id=(select auth.uid())))));
$$;
create function private.can_edit_project(target uuid) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and (private.is_admin() or (private.current_role()='editor' and
    exists(select 1 from public.projects p where p.id=target and (p.owner_id=(select auth.uid()) or
      exists(select 1 from public.project_members m where m.project_id=p.id and m.user_id=(select auth.uid()) and m.role='editor')))));
$$;
create function private.can_read_profile(target uuid) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and (target=(select auth.uid()) or private.is_admin() or
    exists(select 1 from public.projects p where private.has_project_access(p.id) and
      (p.owner_id=target or exists(select 1 from public.project_members m where m.project_id=p.id and m.user_id=target))));
$$;
create function private.has_path_access(path text,edit boolean default false) returns boolean language sql stable security definer set search_path='' as $$
  select case when split_part(path,'/',1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then case when edit then private.can_edit_project(split_part(path,'/',1)::uuid) else private.has_project_access(split_part(path,'/',1)::uuid) end
    else false end;
$$;

create function private.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.user_profiles(id,email,full_name,role,active)
  values(new.id,coalesce(new.email,''),left(coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''),'Usuario'),160),'lector',false);
  return new;
end; $$;
create trigger qa_create_profile after insert on auth.users for each row execute function private.create_profile();

create function private.guard_project_update() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.owner_id<>old.owner_id or new.created_at<>old.created_at or new.id<>old.id then raise exception 'El creador y la identidad del proyecto son inmutables' using errcode='42501'; end if;
  if not exists(select 1 from public.applications a where a.id=new.application_id and a.active) then raise exception 'Aplicación no activa' using errcode='23514'; end if;
  new.version=old.version+1; new.updated_at=now(); return new;
end; $$;
create trigger qa_project_update before update on public.projects for each row execute function private.guard_project_update();

create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; entity uuid; label text; detail text;
begin
  if tg_table_name='projects' then target=coalesce(new.id,old.id);entity=target;label=case when tg_op='INSERT' then 'Creó un proyecto' else 'Actualizó un proyecto' end;detail='Versión '||new.version;
  elsif tg_table_name='project_members' then target=coalesce(new.project_id,old.project_id);entity=coalesce(new.user_id,old.user_id);label=case when tg_op='DELETE' then 'Retiró un miembro del proyecto' else 'Asignó un miembro al proyecto' end;detail=coalesce(new.role,old.role);
  else target=null;entity=coalesce(new.id,old.id);label='Actualizó un perfil';detail=case when new.role is distinct from old.role or new.active is distinct from old.active or new.can_self_approve is distinct from old.can_self_approve then 'Cambió permisos de acceso' else 'Actualizó el nombre' end;
  end if;
  insert into public.audit_logs(actor_id,project_id,action,entity_id,details) values((select auth.uid()),target,label,entity,detail);
  return coalesce(new,old);
end; $$;
create trigger qa_project_audit after insert or update on public.projects for each row execute function private.audit_change();
create trigger qa_members_audit after insert or update or delete on public.project_members for each row execute function private.audit_change();
create trigger qa_profile_audit after update on public.user_profiles for each row execute function private.audit_change();

-- Operación administrativa acotada. El endpoint público invoca una función privada,
-- que verifica al actor; las columnas privilegiadas no son actualizables por REST.
create function private.admin_update_user(target uuid,new_role text,new_active boolean,self_approval boolean) returns public.user_profiles language plpgsql security definer set search_path='' as $$
declare result public.user_profiles; old_profile public.user_profiles;
begin
  if (select auth.uid()) is null or not private.is_admin() then raise exception 'Se requiere administrador' using errcode='42501'; end if;
  if new_role not in ('administrador','editor','revisor','lector') or new_active is null or self_approval is null then raise exception 'Perfil no válido' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtext('camposol-qa-admin-guard'));
  select * into strict old_profile from public.user_profiles where id=target for update;
  if old_profile.role='administrador' and old_profile.active and (new_role<>'administrador' or not new_active) and
     (select count(*) from public.user_profiles where role='administrador' and active)<2 then raise exception 'Debe permanecer un administrador activo' using errcode='23514'; end if;
  update public.user_profiles set role=new_role,active=new_active,can_self_approve=self_approval where id=target returning * into result;
  return result;
end; $$;
create function public.admin_update_user(target uuid,new_role text,new_active boolean,self_approval boolean) returns public.user_profiles language sql security invoker set search_path='' as $$
  select private.admin_update_user(target,new_role,new_active,self_approval);
$$;
create function public.project_editable(target uuid) returns boolean language sql stable security invoker set search_path='' as $$ select private.can_edit_project(target); $$;

alter table public.user_profiles enable row level security;
alter table public.applications enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.audit_logs enable row level security;
revoke all on all tables in schema public from anon,authenticated;
grant select on public.user_profiles,public.applications,public.projects,public.project_members,public.audit_logs to authenticated;
grant update(full_name) on public.user_profiles to authenticated;
grant insert(owner_id,application_id,code,name,objective,description,status) on public.projects to authenticated;
grant update(application_id,code,name,objective,description,status) on public.projects to authenticated;
grant insert,update,delete on public.project_members to authenticated;

create policy profile_read on public.user_profiles for select to authenticated using(private.can_read_profile(id));
create policy profile_update_name on public.user_profiles for update to authenticated using(id=(select auth.uid()) and active) with check(id=(select auth.uid()) and active);
create policy applications_read on public.applications for select to authenticated using(private.current_role() is not null and active);
create policy projects_read on public.projects for select to authenticated using((owner_id=(select auth.uid()) and private.current_role() is not null) or private.has_project_access(id));
create policy projects_insert on public.projects for insert to authenticated with check(owner_id=(select auth.uid()) and private.current_role() in ('administrador','editor') and exists(select 1 from public.applications a where a.id=application_id and a.active));
create policy projects_update on public.projects for update to authenticated using(private.can_edit_project(id)) with check(private.can_edit_project(id));
create policy members_read on public.project_members for select to authenticated using(private.has_project_access(project_id));
create policy members_insert on public.project_members for insert to authenticated with check(private.is_admin() and exists(select 1 from public.user_profiles p where p.id=user_id and p.active));
create policy members_update on public.project_members for update to authenticated using(private.is_admin()) with check(private.is_admin() and exists(select 1 from public.user_profiles p where p.id=user_id and p.active));
create policy members_delete on public.project_members for delete to authenticated using(private.is_admin());
create policy audit_read on public.audit_logs for select to authenticated using(private.is_admin() or (project_id is not null and private.has_project_access(project_id)));

revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.current_role(),private.is_admin(),private.has_project_access(uuid),private.can_edit_project(uuid),private.can_read_profile(uuid),private.has_path_access(text,boolean),private.admin_update_user(uuid,text,boolean,boolean) to authenticated;
revoke all on function public.admin_update_user(uuid,text,boolean,boolean),public.project_editable(uuid) from public,anon;
grant execute on function public.admin_update_user(uuid,text,boolean,boolean),public.project_editable(uuid) to authenticated;
insert into public.applications(id,name) values('digiproy','DigiProy');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('qa-source-documents','qa-source-documents',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','image/png','image/jpeg']),
  ('qa-templates','qa-templates',false,10485760,array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('qa-evidence','qa-evidence',false,5242880,array['image/png','image/jpeg','image/webp']);
create policy qa_files_read on storage.objects for select to authenticated using(bucket_id in ('qa-source-documents','qa-evidence') and private.has_path_access(name));
create policy qa_files_insert on storage.objects for insert to authenticated with check(bucket_id in ('qa-source-documents','qa-evidence') and private.has_path_access(name,true));
create policy qa_files_update on storage.objects for update to authenticated using(bucket_id in ('qa-source-documents','qa-evidence') and private.has_path_access(name,true)) with check(bucket_id in ('qa-source-documents','qa-evidence') and private.has_path_access(name,true));
create policy qa_files_delete on storage.objects for delete to authenticated using(bucket_id in ('qa-source-documents','qa-evidence') and private.has_path_access(name,true));
create policy qa_template_read on storage.objects for select to authenticated using(bucket_id='qa-templates' and private.current_role() is not null);
create policy qa_template_insert on storage.objects for insert to authenticated with check(bucket_id='qa-templates' and private.is_admin());
create policy qa_template_update on storage.objects for update to authenticated using(bucket_id='qa-templates' and private.is_admin()) with check(bucket_id='qa-templates' and private.is_admin());
create policy qa_template_delete on storage.objects for delete to authenticated using(bucket_id='qa-templates' and private.is_admin());
