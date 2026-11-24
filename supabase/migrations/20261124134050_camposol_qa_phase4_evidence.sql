create table public.qa_evidence_sets (
  project_id uuid primary key references public.projects(id),revision integer not null default 0 check(revision>=0)
);
create table public.qa_evidence (
  id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),
  case_id uuid not null,step_id uuid not null,object_path text not null unique,
  filename text not null check(length(filename) between 1 and 200),caption text not null default '' check(length(caption)<=2000),
  mime_type text not null check(mime_type in ('image/png','image/jpeg')),extension text not null check(extension in ('png','jpg')),
  byte_size integer not null check(byte_size between 1 and 5242880),
  width integer not null check(width between 1 and 20000),height integer not null check(height between 1 and 20000),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),step_snapshot jsonb not null,
  state text not null default 'pending' check(state in ('pending','active','retired')),
  created_by uuid not null references public.user_profiles(id),created_at timestamptz not null default now(),retired_at timestamptz,
  check(width::bigint*height<=24000000),
  check((mime_type='image/png' and extension='png') or (mime_type='image/jpeg' and extension='jpg'))
);
create index qa_evidence_project_step_idx on public.qa_evidence(project_id,case_id,step_id,state);
create index qa_evidence_creator_idx on public.qa_evidence(created_by);
alter table public.qa_evidence enable row level security;
alter table public.qa_evidence_sets enable row level security;
revoke all on public.qa_evidence,public.qa_evidence_sets from public,anon,authenticated;
grant select on public.qa_evidence,public.qa_evidence_sets to authenticated;
create policy qa_evidence_read on public.qa_evidence for select to authenticated using(private.has_project_access(project_id));
create policy qa_evidence_sets_read on public.qa_evidence_sets for select to authenticated using(private.has_project_access(project_id));

create function private.qa_evidence_lock(target uuid,expected_version integer) returns public.qa_documents
language plpgsql security definer set search_path='' as $$
declare p public.projects;d public.qa_documents;
begin
  if auth.uid() is null or not private.can_edit_project(target) then raise exception 'No tienes permiso para adjuntar capturas.' using errcode='42501';end if;
  select * into p from public.projects where id=target for update;
  if p.id is null or p.status='archivado' then raise exception 'Reabre el proyecto antes de modificar las capturas.' using errcode='40001';end if;
  select * into d from public.qa_documents where project_id=target for update;
  if d.project_id is null or expected_version is null or d.version<>expected_version then raise exception 'La cartilla cambió. Recarga antes de adjuntar o retirar capturas.' using errcode='40001';end if;
  return d;
end; $$;
create function private.qa_evidence_prepare(target uuid,expected_version integer,target_case uuid,target_step uuid,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.qa_documents;c jsonb;s jsonb;e public.qa_evidence;n integer;total bigint;
begin
  d=private.qa_evidence_lock(target,expected_version);
  if jsonb_typeof(input) is distinct from 'object' then raise exception 'Revisa los datos de la captura.' using errcode='22023';end if;
  if exists(select 1 from jsonb_object_keys(input) k where k not in ('filename','caption','mime_type','extension','byte_size','width','height','sha256')) then raise exception 'La captura contiene campos no admitidos.' using errcode='22023';end if;
  select v into c from jsonb_array_elements(d.content->'cases') v where v->>'id'=target_case::text and v->>'included'='true';
  select v into s from jsonb_array_elements(c->'steps') v where v->>'id'=target_step::text;
  if s is null then raise exception 'Guarda el caso y el paso antes de adjuntar una captura.' using errcode='22023';end if;
  if jsonb_typeof(input->'filename') is distinct from 'string' or jsonb_typeof(input->'caption') is distinct from 'string'
    or jsonb_typeof(input->'mime_type') is distinct from 'string' or jsonb_typeof(input->'extension') is distinct from 'string'
    or jsonb_typeof(input->'sha256') is distinct from 'string'
    or jsonb_typeof(input->'byte_size') is distinct from 'number' or jsonb_typeof(input->'width') is distinct from 'number' or jsonb_typeof(input->'height') is distinct from 'number'
    then raise exception 'Revisa el formato de los datos de la captura.' using errcode='22023';end if;
  if (input->>'byte_size') !~ '^[0-9]{1,8}$' or (input->>'width') !~ '^[0-9]{1,5}$' or (input->>'height') !~ '^[0-9]{1,5}$' then raise exception 'Las dimensiones y el tamaño deben ser enteros válidos.' using errcode='22023';end if;
  if length(btrim(input->>'filename')) not between 1 and 200 or length(input->>'caption')>2000
    or (input->>'sha256') !~ '^[a-f0-9]{64}$'
    or (input->>'mime_type') not in ('image/png','image/jpeg') or (input->>'extension') not in ('png','jpg')
    or ((input->>'mime_type'='image/png')<>(input->>'extension'='png'))
    or (input->>'byte_size')::integer not between 1 and 5242880 or (input->>'width')::integer not between 1 and 20000 or (input->>'height')::integer not between 1 and 20000
    or (input->>'width')::bigint*(input->>'height')::bigint>24000000 then raise exception 'Adjunta una captura PNG o JPG de hasta 5 MB y 24 megapíxeles.' using errcode='22023';end if;
  select count(*) into n from public.qa_evidence where project_id=target and case_id=target_case and step_id=target_step and (state='active' or (state='pending' and created_at>now()-interval '24 hours'));
  if n>=5 then raise exception 'Este paso ya tiene cinco capturas o cargas pendientes. Retira una antes de adjuntar otra.' using errcode='22023';end if;
  select coalesce(sum(byte_size),0) into total from public.qa_evidence where project_id=target and (state='active' or (state='pending' and created_at>now()-interval '24 hours'));
  if total+(input->>'byte_size')::integer>52428800 then raise exception 'Las capturas de la cartilla exceden 50 MB.' using errcode='22023';end if;
  e.id=gen_random_uuid();e.project_id=target;e.case_id=target_case;e.step_id=target_step;
  e.object_path=target::text||'/'||target_case::text||'/'||target_step::text||'/'||e.id::text||'.'||(input->>'extension');
  e.filename=btrim(input->>'filename');e.caption=btrim(input->>'caption');e.mime_type=input->>'mime_type';e.extension=input->>'extension';e.byte_size=(input->>'byte_size')::integer;
  e.width=(input->>'width')::integer;e.height=(input->>'height')::integer;e.sha256=input->>'sha256';e.step_snapshot=s;e.state='pending';e.created_by=auth.uid();e.created_at=now();
  insert into public.qa_evidence select e.*;
  insert into public.qa_evidence_sets(project_id) values(target) on conflict do nothing;
  return to_jsonb(e);
end; $$;
create function private.qa_evidence_finish(target uuid,expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.qa_evidence;d public.qa_documents;s jsonb;meta jsonb;
begin
  select * into e from public.qa_evidence where id=target;
  if e.id is null then raise exception 'La captura no está disponible.' using errcode='22023';end if;
  d=private.qa_evidence_lock(e.project_id,expected_version);
  select * into e from public.qa_evidence where id=target for update;
  if e.state='active' then return to_jsonb(e);end if;
  if e.state<>'pending' or e.created_by<>auth.uid() or e.created_at<=now()-interval '24 hours' then raise exception 'La carga pendiente no está disponible para tu cuenta.' using errcode='42501';end if;
  select v into s from jsonb_array_elements(d.content->'cases') c cross join lateral jsonb_array_elements(c->'steps') v where c->>'id'=e.case_id::text and c->>'included'='true' and v->>'id'=e.step_id::text;
  if s is distinct from e.step_snapshot then raise exception 'El paso cambió. Retira la carga pendiente y adjunta una captura actual.' using errcode='40001';end if;
  select metadata into meta from storage.objects where bucket_id='qa-evidence' and name=e.object_path;
  if meta is null or coalesce(meta->>'size','')<>e.byte_size::text or coalesce(meta->>'mimetype','')<>e.mime_type then raise exception 'La imagen aún no se cargó por completo. Reintenta la confirmación o retira la carga pendiente.' using errcode='22023';end if;
  update public.qa_evidence set state='active' where id=e.id returning * into e;
  update public.qa_evidence_sets set revision=revision+1 where project_id=e.project_id;
  insert into public.audit_logs(actor_id,project_id,action,entity_id,details) values(auth.uid(),e.project_id,'Adjuntó una captura de un paso',e.id,'Captura vinculada al documento v'||expected_version);
  return to_jsonb(e);
end; $$;
create function private.qa_evidence_retire(target uuid,expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare e public.qa_evidence;d public.qa_documents;
begin
  select * into e from public.qa_evidence where id=target;
  if e.id is null then raise exception 'La captura no está disponible.' using errcode='22023';end if;
  d=private.qa_evidence_lock(e.project_id,expected_version);
  select * into e from public.qa_evidence where id=target for update;
  if e.state='retired' then return;end if;
  if e.state='pending' and e.created_by<>auth.uid() then raise exception 'Solo quien inició esta carga puede retirarla.' using errcode='42501';end if;
  update public.qa_evidence set state='retired',retired_at=now() where id=e.id;
  update public.qa_evidence_sets set revision=revision+1 where project_id=e.project_id;
  insert into public.audit_logs(actor_id,project_id,action,entity_id,details) values(auth.uid(),e.project_id,'Retiró una captura de la exportación',e.id,'Archivo conservado; documento v'||expected_version);
end; $$;

create function public.qa_evidence_prepare(target uuid,expected_version integer,target_case uuid,target_step uuid,input jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.qa_evidence_prepare(target,expected_version,target_case,target_step,input);$$;
create function public.qa_evidence_finish(target uuid,expected_version integer) returns jsonb language sql security invoker set search_path='' as $$select private.qa_evidence_finish(target,expected_version);$$;
create function public.qa_evidence_retire(target uuid,expected_version integer) returns void language sql security invoker set search_path='' as $$select private.qa_evidence_retire(target,expected_version);$$;
create function public.qa_evidence_manifest(target uuid) returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('revision',coalesce((select revision from public.qa_evidence_sets where project_id=target),0),
    'items',coalesce((select jsonb_agg(to_jsonb(e) order by created_at,id) from public.qa_evidence e where e.project_id=target and (e.state='active' or (e.state='pending' and e.created_by=auth.uid()))),'[]'::jsonb))
  where private.has_project_access(target);
$$;
create function private.qa_evidence_storage_access(path text,write_access boolean default false) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.qa_evidence e join public.projects p on p.id=e.project_id where e.object_path=path and
    case when write_access then e.state='pending' and e.created_by=auth.uid() and e.created_at>now()-interval '24 hours' and p.status<>'archivado' and private.can_edit_project(e.project_id)
    else private.has_project_access(e.project_id) end);
$$;
revoke all on function private.qa_evidence_lock(uuid,integer),private.qa_evidence_prepare(uuid,integer,uuid,uuid,jsonb),private.qa_evidence_finish(uuid,integer),private.qa_evidence_retire(uuid,integer),private.qa_evidence_storage_access(text,boolean) from public,anon,authenticated;
grant execute on function private.qa_evidence_prepare(uuid,integer,uuid,uuid,jsonb),private.qa_evidence_finish(uuid,integer),private.qa_evidence_retire(uuid,integer),private.qa_evidence_storage_access(text,boolean) to authenticated;
revoke all on function public.qa_evidence_prepare(uuid,integer,uuid,uuid,jsonb),public.qa_evidence_finish(uuid,integer),public.qa_evidence_retire(uuid,integer),public.qa_evidence_manifest(uuid) from public,anon;
grant execute on function public.qa_evidence_prepare(uuid,integer,uuid,uuid,jsonb),public.qa_evidence_finish(uuid,integer),public.qa_evidence_retire(uuid,integer),public.qa_evidence_manifest(uuid) to authenticated;
alter policy qa_files_read on storage.objects using(bucket_id='qa-source-documents' and private.has_path_access(name));
alter policy qa_files_insert on storage.objects with check(bucket_id='qa-source-documents' and private.has_path_access(name,true));
alter policy qa_files_update on storage.objects using(bucket_id='qa-source-documents' and private.has_path_access(name,true)) with check(bucket_id='qa-source-documents' and private.has_path_access(name,true));
alter policy qa_files_delete on storage.objects using(bucket_id='qa-source-documents' and private.has_path_access(name,true));
create policy qa_evidence_object_read on storage.objects for select to authenticated using(bucket_id='qa-evidence' and private.qa_evidence_storage_access(name));
create policy qa_evidence_object_insert on storage.objects for insert to authenticated with check(bucket_id='qa-evidence' and private.qa_evidence_storage_access(name,true));
-- No UPDATE/DELETE policy: captures are immutable. Retiring keeps the original.

