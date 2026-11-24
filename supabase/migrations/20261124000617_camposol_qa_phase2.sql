-- Fase 2 aditiva: conserva cuentas, proyectos, roles, buckets y datos de Fase 1.
alter table public.applications add column if not exists version integer not null default 1 check(version>0);

create table public.qa_methodology_versions (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.applications(id),
  methodology_key text not null check(methodology_key ~ '^[a-z][a-z0-9_-]{1,59}$'),
  name text not null check(length(btrim(name)) between 1 and 160),
  version_label text not null check(length(btrim(version_label)) between 1 and 30),
  source_reference text not null check(length(btrim(source_reference)) between 1 and 3000),
  config jsonb not null,
  status text not null default 'borrador' check(status in ('borrador','aprobado')),
  revision integer not null default 1 check(revision>0),
  created_by uuid references public.user_profiles(id),
  approved_by uuid references public.user_profiles(id), approved_at timestamptz,
  unique(application_id,methodology_key,version_label)
);
create index qa_methodology_application_idx on public.qa_methodology_versions(application_id);
create index qa_methodology_creator_idx on public.qa_methodology_versions(created_by);
create index qa_methodology_approver_idx on public.qa_methodology_versions(approved_by);
create table public.qa_documents (
  project_id uuid primary key references public.projects(id),
  methodology_version_id uuid not null references public.qa_methodology_versions(id),
  version integer not null default 1 check(version>0),
  content jsonb not null check(jsonb_typeof(content)='object' and octet_length(content::text)<=2000000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index qa_documents_methodology_idx on public.qa_documents(methodology_version_id);
create table public.qa_document_revisions (
  project_id uuid not null references public.qa_documents(project_id),
  version integer not null check(version>0),action text not null,
  actor_id uuid not null references public.user_profiles(id),actor_name text not null,
  created_at timestamptz not null default now(),snapshot jsonb not null,
  primary key(project_id,version)
);
create index qa_revision_actor_idx on public.qa_document_revisions(actor_id);

-- La lectura usa RLS; las escrituras pasan por comandos que construyen los metadatos
-- de revisión en el servidor. No se conceden escrituras REST sobre estos registros.
alter table public.qa_methodology_versions enable row level security;
alter table public.qa_documents enable row level security;
alter table public.qa_document_revisions enable row level security;
revoke all on public.qa_methodology_versions,public.qa_documents,public.qa_document_revisions from public,anon,authenticated;
grant select on public.qa_methodology_versions,public.qa_documents,public.qa_document_revisions to authenticated;
create policy qa_methodology_read on public.qa_methodology_versions for select to authenticated
  using(private.is_admin() or (private.current_role() is not null and status='aprobado'));
create policy qa_document_read on public.qa_documents for select to authenticated using(private.has_project_access(project_id));
create policy qa_revision_read on public.qa_document_revisions for select to authenticated using(private.has_project_access(project_id));

create or replace view public.qa_progress with (security_invoker=true) as
select d.project_id,
  (select count(*)::integer from jsonb_array_elements(d.content->'cases') c where (c->>'included')::boolean) as total_cases,
  (select count(*)::integer from jsonb_array_elements(d.content->'cases') c where (c->>'included')::boolean and c->'review'->>'status'='aprobado') as approved_cases,
  d.content->'context'->'review'->>'status' as context_status,d.content->'selection'->>'status' as selection_status,d.updated_at
from public.qa_documents d;
revoke all on public.qa_progress from public,anon,authenticated;
grant select on public.qa_progress to authenticated;

drop policy applications_read on public.applications;
create policy applications_read on public.applications for select to authenticated using(
  private.current_role() is not null and (active or private.is_admin() or exists(
    select 1 from public.projects p where p.application_id=applications.id and private.has_project_access(p.id))));

create function private.qa_require(condition boolean,message text,code text default '22023') returns void
language plpgsql security invoker set search_path='' as $$ begin
  if condition is distinct from true then raise exception '%',message using errcode=code; end if;
end; $$;
create function private.qa_text(value jsonb,maximum integer default 4000,required boolean default false) returns text
language plpgsql immutable security invoker set search_path='' as $$ declare result text; begin
  perform private.qa_require(jsonb_typeof(value)='string','Revisa los textos obligatorios y su formato.');
  result=btrim(value#>>'{}',E' \n\r\t');
  perform private.qa_require(length(value#>>'{}')<=maximum and (not required or length(result)>0),'Revisa los textos obligatorios y su longitud.');return result;
end; $$;
create function private.qa_id(value jsonb) returns text language plpgsql immutable security invoker set search_path='' as $$ declare result text; begin
  result=private.qa_text(value,36,true);
  perform private.qa_require(result ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$','El identificador no es válido.');return result;
end; $$;
create function private.qa_review(actor uuid,actor_name text) returns jsonb language sql immutable security invoker set search_path='' as $$
  select jsonb_build_object('status','pendiente','version',1,'updated_by',actor,'updated_name',actor_name,
    'approved_by',null,'approved_name',null,'approved_at',null,'observation','');
$$;
create function private.qa_changed_review(review jsonb,actor uuid,actor_name text) returns jsonb language sql immutable security invoker set search_path='' as $$
  select private.qa_review(actor,actor_name)||jsonb_build_object('version',(review->>'version')::integer+1,
    'status',case when review->>'status'='aprobado' then 'requiere_correccion' else 'borrador' end);
$$;
create function private.qa_invalidate(content jsonb,actor uuid,actor_name text) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare result jsonb:=content; cases jsonb:='[]'; c jsonb; begin
  result=jsonb_set(result,'{context,review}',private.qa_changed_review(result->'context'->'review',actor,actor_name));
  result=jsonb_set(result,'{selection}',private.qa_changed_review(result->'selection',actor,actor_name));
  for c in select value from jsonb_array_elements(result->'cases') loop cases=cases||jsonb_build_array(jsonb_set(c,'{review}',private.qa_changed_review(c->'review',actor,actor_name))); end loop;
  return jsonb_set(result,'{cases}',cases);
end; $$;
create function private.qa_can_review(target uuid,review jsonb) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and coalesce(private.is_admin() or (
   private.current_role()='revisor' and review->>'updated_by'<>(select auth.uid())::text and exists(
     select 1 from public.projects p where p.id=target and (p.owner_id=(select auth.uid()) or exists(
       select 1 from public.project_members m where m.project_id=p.id and m.user_id=(select auth.uid()) and m.role='revisor')))) or (
   private.current_role()='editor' and private.can_edit_project(target) and review->>'updated_by'=(select auth.uid())::text and exists(
     select 1 from public.user_profiles u where u.id=(select auth.uid()) and u.active and u.can_self_approve)),false);
$$;
create function private.qa_validate_methodology(input jsonb) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare c jsonb; cols jsonb; item jsonb; idx integer:=0; fields jsonb;
  keys text[]:=array['requirement','item','name','description','priority','step','step_description','arguments','expected_result','reference','comment'];
  ranges text[]:=array['A','B','C','D','E','F','G','H','I','J','K:M'];
  labels text[]:=array['Nombre Requisito','ITEM','Nombre CP','Descripción Caso de Prueba','Prioridad','Paso','Descripción Paso','Argumentos','Resultado Esperado','REFERENCIA','Comentario'];
begin
  perform private.qa_require(jsonb_typeof(input)='object' and jsonb_typeof(input->'config')='object','La metodología no tiene un formato válido.');c=input->'config';
  perform private.qa_text(input->'application_id',60,true);perform private.qa_text(input->'name',160,true);perform private.qa_text(input->'version_label',30,true);perform private.qa_text(input->'source_reference',3000,true);
  perform private.qa_require(private.qa_text(input->'methodology_key',60,true) ~ '^[a-z][a-z0-9_-]{1,59}$','El código de metodología no es válido.');
  perform private.qa_require(jsonb_typeof(c->'columns')='array' and jsonb_array_length(c->'columns')=11,'Conserva las columnas de la matriz.');
  cols='[]';for item in select value from jsonb_array_elements(c->'columns') loop
    idx=idx+1;perform private.qa_require(item->>'key'=keys[idx] and item->>'range'=ranges[idx],'Conserva la estructura de las columnas de la matriz.');
    if input->>'application_id'='digiproy' then perform private.qa_require(private.qa_text(item->'label',100,true)=labels[idx],'Los encabezados oficiales de DigiProy no se pueden renombrar.');end if;
    cols=cols||jsonb_build_array(jsonb_build_object('key',keys[idx],'range',ranges[idx],'label',private.qa_text(item->'label',100,true)));
  end loop;
  perform private.qa_require(jsonb_typeof(c->'priorities')='array' and jsonb_array_length(c->'priorities') between 1 and 20,'Define las prioridades de la metodología.');
  for item in select value from jsonb_array_elements(c->'priorities') loop perform private.qa_text(item,40,true); end loop;
  perform private.qa_require((select count(distinct value) from jsonb_array_elements_text(c->'priorities'))=jsonb_array_length(c->'priorities'),'Las prioridades deben ser distintas.');
  perform private.qa_require(jsonb_typeof(c->'required_case_fields')='array' and jsonb_typeof(c->'required_step_fields')='array','Define los campos requeridos.');
  for item in select value from jsonb_array_elements(c->'required_case_fields') loop perform private.qa_require(item#>>'{}' in ('requirement','description','comment'),'El campo del caso no es válido.');end loop;
  for item in select value from jsonb_array_elements(c->'required_step_fields') loop perform private.qa_require(item#>>'{}' in ('description','arguments','expected_result'),'El campo del paso no es válido.');end loop;
  return jsonb_build_object('application_id',private.qa_text(input->'application_id',60,true),'methodology_key',private.qa_text(input->'methodology_key',60,true),
    'name',private.qa_text(input->'name',160,true),'version_label',private.qa_text(input->'version_label',30,true),'source_reference',private.qa_text(input->'source_reference',3000,true),
    'config',jsonb_build_object('columns',cols,'priorities',c->'priorities','required_case_fields',c->'required_case_fields','required_step_fields',c->'required_step_fields',
      'analysis_guidance',private.qa_text(c->'analysis_guidance',4000,true),'case_guidance',private.qa_text(c->'case_guidance',4000,true)));
end; $$;

create function private.qa_application_save(input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare key text; title text; expected integer; old public.applications; result public.applications; begin
  perform private.qa_require((select auth.uid()) is not null and private.is_admin(),'Se requiere un administrador.','42501');
  perform private.qa_require(jsonb_typeof(input)='object' and jsonb_typeof(input->'active')='boolean' and input->>'version' ~ '^[0-9]{1,9}$','Revisa el estado y la versión de la aplicación.');
  key=private.qa_text(input->'id',60,true);title=private.qa_text(input->'name',160,true);expected=(input->>'version')::integer;
  perform private.qa_require(key ~ '^[a-z][a-z0-9_-]{1,59}$','Usa un código de aplicación en minúsculas y sin espacios.');
  perform pg_advisory_xact_lock(hashtextextended('qa-app:'||key,0));
  select * into old from public.applications where id=key for update;
  perform private.qa_require(coalesce(old.version,0)=expected,'Otra persona actualizó esta aplicación. Recarga antes de guardar.','40001');
  if old.id is null then insert into public.applications(id,name,active) values(key,title,(input->>'active')::boolean) returning * into result;
  else update public.applications set name=title,active=(input->>'active')::boolean,version=version+1 where id=key returning * into result;end if;
  insert into public.audit_logs(actor_id,action,details) values((select auth.uid()),case when old.id is null then 'Creó una aplicación' else 'Actualizó una aplicación' end,key);
  return to_jsonb(result);
end; $$;
create function public.qa_application_save(input jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.qa_application_save(input); $$;

create function private.qa_methodology_save(input jsonb,target uuid,expected_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb; old public.qa_methodology_versions; result public.qa_methodology_versions; begin
  perform private.qa_require((select auth.uid()) is not null and private.is_admin(),'Se requiere un administrador.','42501');
  perform private.qa_require(expected_revision is not null and expected_revision>=0,'Falta la revisión de la metodología.');v=private.qa_validate_methodology(input);
  perform private.qa_require(exists(select 1 from public.applications where id=v->>'application_id'),'La aplicación no existe.');
  if target is not null then select * into old from public.qa_methodology_versions where id=target for update;perform private.qa_require(old.id is not null,'La metodología no existe.');end if;
  perform private.qa_require(coalesce(old.revision,0)=expected_revision,'La metodología cambió. Recarga antes de guardar.','40001');
  perform private.qa_require(old.id is null or old.status='borrador','Una metodología aprobada es inmutable. Crea otra versión.','40001');
  if old.id is null then
    insert into public.qa_methodology_versions(application_id,methodology_key,name,version_label,source_reference,config,created_by)
      values(v->>'application_id',v->>'methodology_key',v->>'name',v->>'version_label',v->>'source_reference',v->'config',(select auth.uid())) returning * into result;
  else
    perform private.qa_require(old.application_id=v->>'application_id' and old.methodology_key=v->>'methodology_key','La identidad de una metodología no puede cambiar.');
    update public.qa_methodology_versions set name=v->>'name',version_label=v->>'version_label',source_reference=v->>'source_reference',config=v->'config',revision=revision+1 where id=target returning * into result;
  end if;
  insert into public.audit_logs(actor_id,action,entity_id,details) values((select auth.uid()),'Guardó una metodología en borrador',result.id,result.name||' '||result.version_label);
  return to_jsonb(result);
end; $$;
create function public.qa_methodology_save(input jsonb,target uuid default null,expected_revision integer default 0) returns jsonb language sql security invoker set search_path='' as $$ select private.qa_methodology_save(input,target,expected_revision); $$;
create function private.qa_methodology_approve(target uuid,expected_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.qa_methodology_versions; begin
  perform private.qa_require((select auth.uid()) is not null and private.is_admin(),'Se requiere un administrador.','42501');
  select * into m from public.qa_methodology_versions where id=target for update;perform private.qa_require(m.id is not null,'La metodología no existe.');
  perform private.qa_require(m.status='borrador' and m.revision=expected_revision,'La versión cambió o ya está aprobada.','40001');
  perform private.qa_validate_methodology(to_jsonb(m));
  update public.qa_methodology_versions set status='aprobado',revision=revision+1,approved_by=(select auth.uid()),approved_at=now() where id=target returning * into m;
  insert into public.audit_logs(actor_id,action,entity_id,details) values((select auth.uid()),'Aprobó una versión de metodología',m.id,m.name||' '||m.version_label);return to_jsonb(m);
end; $$;
create function public.qa_methodology_approve(target uuid,expected_revision integer) returns jsonb language sql security invoker set search_path='' as $$ select private.qa_methodology_approve(target,expected_revision); $$;
create function private.qa_guard_methodology() returns trigger language plpgsql security invoker set search_path='' as $$ begin
  perform private.qa_require(old.status<>'aprobado','Una metodología aprobada es inmutable. Crea otra versión.','42501');return coalesce(new,old);
end; $$;
create trigger qa_methodology_immutable before update or delete on public.qa_methodology_versions for each row execute function private.qa_guard_methodology();

create function private.qa_apply(content jsonb,command jsonb,config jsonb,actor uuid,actor_name text,target uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb:=content; action text:=command->>'action'; draft jsonb; fields jsonb; old_fields jsonb;
  items jsonb; item jsonb; old_item jsonb; cases jsonb; steps jsonb; review jsonb; scope text; case_id text;
  ids text[]:='{}'; key text; fid text; idx integer; item_index integer; path text[]; changed boolean;
begin
  if action in ('save_context','save_selection','save_case','submit') then perform private.qa_require(private.can_edit_project(target),'No tienes permiso para editar esta cartilla.','42501');end if;
  if action='save_context' then
    draft=command->'context';perform private.qa_require(jsonb_typeof(draft)='object' and jsonb_typeof(draft->'functionalities')='array','El contexto no tiene un formato válido.');items='[]';
    for item in select value from jsonb_array_elements(draft->'functionalities') loop
      key=private.qa_id(item->'id');perform private.qa_require(not(key=any(ids)),'Hay identificadores repetidos.');ids=array_append(ids,key);
      items=items||jsonb_build_array(jsonb_build_object('id',key,'name',private.qa_text(item->'name',160,true),'description',private.qa_text(item->'description',4000),'source',private.qa_text(item->'source',2000)));
    end loop;
    perform private.qa_require(not exists(select 1 from jsonb_array_elements(result->'cases') c where not(c->>'functionality_id'=any(ids))),'Retira primero los casos vinculados a la funcionalidad que deseas eliminar.');
    fields=jsonb_build_object('summary',private.qa_text(draft->'summary',10000),'functioning',private.qa_text(draft->'functioning',20000),'source_notes',private.qa_text(draft->'source_notes',10000),'functionalities',items);
    old_fields=(result->'context')-'review';
    if fields<>old_fields then result=private.qa_invalidate(result,actor,actor_name);result=jsonb_set(result,'{context}',fields||jsonb_build_object('review',result->'context'->'review'));
    elsif result->'context'->'review'->>'status'='pendiente' then result=jsonb_set(result,'{context,review,status}','"borrador"');end if;
  elsif action='save_selection' then
    perform private.qa_require(jsonb_typeof(command->'cases')='array','La lista de casos no tiene un formato válido.');cases='[]';
    for item in select value from jsonb_array_elements(command->'cases') loop
      key=private.qa_id(item->'id');fid=private.qa_id(item->'functionality_id');
      perform private.qa_require(not(key=any(ids)),'Hay identificadores repetidos.');ids=array_append(ids,key);
      perform private.qa_require(exists(select 1 from jsonb_array_elements(result->'context'->'functionalities') f where f->>'id'=fid),'Selecciona una funcionalidad de esta cartilla.');
      perform private.qa_require(jsonb_typeof(item->'included')='boolean','Indica qué casos se incluyen.');
      fields=jsonb_build_object('id',key,'functionality_id',fid,'included',item->'included','name',private.qa_text(item->'name',200,true),'justification',private.qa_text(item->'justification',4000,true),'priority',private.qa_text(item->'priority',40,true));
      perform private.qa_require(config->'priorities' ? (fields->>'priority'),'Selecciona una prioridad de la metodología.');
      select value into old_item from jsonb_array_elements(result->'cases') where value->>'id'=key;
      if old_item is null then item=fields||jsonb_build_object('requirement','','description','','comment','','steps','[]'::jsonb,'review',private.qa_review(actor,actor_name));
      else
        old_fields=jsonb_build_object('id',old_item->'id','functionality_id',old_item->'functionality_id','included',old_item->'included','name',old_item->'name','justification',old_item->'justification','priority',old_item->'priority');
        review=case when fields<>old_fields then private.qa_changed_review(old_item->'review',actor,actor_name) else old_item->'review' end;
        item=old_item||fields||jsonb_build_object('review',review);
      end if;cases=cases||jsonb_build_array(item);
    end loop;
    select coalesce(jsonb_agg(jsonb_build_object('id',c->'id','functionality_id',c->'functionality_id','included',c->'included','name',c->'name','justification',c->'justification','priority',c->'priority')),'[]') into old_fields from jsonb_array_elements(result->'cases') c;
    select coalesce(jsonb_agg(jsonb_build_object('id',c->'id','functionality_id',c->'functionality_id','included',c->'included','name',c->'name','justification',c->'justification','priority',c->'priority')),'[]') into fields from jsonb_array_elements(cases) c;
    if fields<>old_fields then result=jsonb_set(result,'{cases}',cases);result=jsonb_set(result,'{selection}',private.qa_changed_review(result->'selection',actor,actor_name));
    elsif result->'selection'->>'status'='pendiente' then result=jsonb_set(result,'{selection,status}','"borrador"');end if;
  elsif action='save_case' then
    perform private.qa_require(result->'context'->'review'->>'status'='aprobado' and result->'selection'->>'status'='aprobado','Aprueba primero el contexto y la selección de casos.');
    case_id=private.qa_id(command->'case_id');select value,ordinality::integer-1 into old_item,item_index from jsonb_array_elements(result->'cases') with ordinality where value->>'id'=case_id and (value->>'included')::boolean;
    perform private.qa_require(old_item is not null,'El caso no está seleccionado.');draft=command->'case';
    perform private.qa_require(jsonb_typeof(draft)='object' and jsonb_typeof(draft->'steps')='array','Los pasos no tienen el formato esperado.');steps='[]';
    for item in select value from jsonb_array_elements(draft->'steps') loop
      key=private.qa_id(item->'id');perform private.qa_require(not(key=any(ids)),'Hay identificadores repetidos.');ids=array_append(ids,key);
      steps=steps||jsonb_build_array(jsonb_build_object('id',key,'description',private.qa_text(item->'description',6000),'arguments',private.qa_text(item->'arguments',6000),'expected_result',private.qa_text(item->'expected_result',6000)));
    end loop;
    fields=jsonb_build_object('requirement',private.qa_text(draft->'requirement',4000),'description',private.qa_text(draft->'description',10000),'comment',private.qa_text(draft->'comment',6000),'steps',steps);
    old_fields=jsonb_build_object('requirement',old_item->'requirement','description',old_item->'description','comment',old_item->'comment','steps',old_item->'steps');
    review=old_item->'review';if fields<>old_fields then review=private.qa_changed_review(review,actor,actor_name);elsif review->>'status'='pendiente' then review=jsonb_set(review,'{status}','"borrador"');end if;
    result=jsonb_set(result,array['cases',item_index::text],old_item||fields||jsonb_build_object('review',review));
  elsif action in ('submit','approve','correct') then
    scope=private.qa_text(command->'scope',20,true);perform private.qa_require(scope in ('context','selection','case'),'El elemento de revisión no está disponible.');
    if scope='context' then path=array['context','review'];elsif scope='selection' then path=array['selection'];else
      case_id=private.qa_id(command->'case_id');select value,ordinality::integer-1 into old_item,item_index from jsonb_array_elements(result->'cases') with ordinality where value->>'id'=case_id and (value->>'included')::boolean;
      perform private.qa_require(old_item is not null,'El caso no está seleccionado.');path=array['cases',item_index::text,'review'];end if;
    review=result#>path;
    perform private.qa_require(action='submit' or private.qa_can_review(target,review),'Tu rol no permite aprobar esta versión.','42501');
    if action='correct' then
      perform private.qa_require(review->>'status'='en_revision','El elemento debe estar en revisión.');
      review=review||jsonb_build_object('status','requiere_correccion','observation',private.qa_text(command->'observation',4000,true),'approved_by',null,'approved_name',null,'approved_at',null);
    else
      if scope='context' then perform private.qa_require(length(result->'context'->>'summary')>0 and length(result->'context'->>'functioning')>0 and jsonb_array_length(result->'context'->'functionalities')>0,'Completa la descripción, el funcionamiento y al menos una funcionalidad.');
      else perform private.qa_require(result->'context'->'review'->>'status'='aprobado','El contexto requiere aprobación.');end if;
      if scope='selection' then perform private.qa_require(exists(select 1 from jsonb_array_elements(result->'cases') c where (c->>'included')::boolean),'Selecciona al menos un caso.');end if;
      if scope='case' then
        perform private.qa_require(result->'selection'->>'status'='aprobado','La selección de casos requiere aprobación.');
        for key in select jsonb_array_elements_text(config->'required_case_fields') loop perform private.qa_require(length(btrim(coalesce(old_item->>key,'')))>0,'Completa los campos requeridos del caso.');end loop;
        perform private.qa_require(jsonb_array_length(old_item->'steps')>0,'Agrega al menos un paso al caso.');
        for item in select value from jsonb_array_elements(old_item->'steps') loop
          for key in select jsonb_array_elements_text(config->'required_step_fields') loop perform private.qa_require(length(btrim(coalesce(item->>key,'')))>0,'Completa los campos requeridos de cada paso.');end loop;
        end loop;
      end if;
      if action='submit' then perform private.qa_require(review->>'status'<>'aprobado','Este contenido ya está aprobado.');review=review||jsonb_build_object('status','en_revision','observation','');
      else perform private.qa_require(review->>'status'='en_revision','Envía el contenido a revisión antes de aprobar.');review=review||jsonb_build_object('status','aprobado','approved_by',actor,'approved_name',actor_name,'approved_at',now(),'observation',private.qa_text(coalesce(command->'observation','""'::jsonb),4000));end if;
    end if;result=jsonb_set(result,path,review);
  else raise exception 'La acción documental no es válida.' using errcode='22023';end if;
  return result;
end; $$;

create function private.qa_record(doc public.qa_documents,action text) returns void language plpgsql security invoker set search_path='' as $$
declare actor uuid:=(select auth.uid()); title text; begin
  select full_name into title from public.user_profiles where id=actor and active;
  perform private.qa_require(actor is not null and title is not null,'Se requiere una cuenta activa.','42501');
  insert into public.qa_document_revisions(project_id,version,action,actor_id,actor_name,created_at,snapshot) values(doc.project_id,doc.version,action,actor,title,doc.updated_at,to_jsonb(doc));
  insert into public.audit_logs(actor_id,project_id,action,entity_id,details) values(actor,doc.project_id,
    case action when 'init' then 'Inició la cartilla' when 'save_context' then 'Guardó el contexto de la cartilla' when 'save_selection' then 'Actualizó la selección de casos'
      when 'save_case' then 'Guardó un caso' when 'submit' then 'Envió contenido a revisión' when 'approve' then 'Aprobó contenido' when 'correct' then 'Solicitó una corrección' else 'Cambió la información de la cartilla' end,
    doc.project_id,'Versión documental '||doc.version);
end; $$;
create function private.qa_command(target uuid,expected_version integer,command jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.projects; d public.qa_documents; m public.qa_methodology_versions; actor uuid:=(select auth.uid()); title text; c jsonb; review jsonb; begin
  perform private.qa_require(actor is not null and private.has_project_access(target),'La cartilla no está disponible para tu cuenta.','42501');
  perform private.qa_require(expected_version is not null and expected_version>=0 and jsonb_typeof(command)='object','Falta la versión documental o la acción no es válida.');
  perform private.qa_require(octet_length(command::text)<=2000000,'La solicitud excede 2 MB.');
  select * into p from public.projects where id=target for update;
  perform private.qa_require(p.status<>'archivado','Reabre el proyecto antes de modificar su cartilla.','40001');
  select full_name into title from public.user_profiles where id=actor and active;
  select * into d from public.qa_documents where project_id=target for update;
  perform private.qa_require(coalesce(d.version,0)=expected_version,'Otra persona actualizó la cartilla. Conserva tus textos y recarga antes de guardar.','40001');
  if command->>'action'='init' then
    perform private.qa_require(private.can_edit_project(target),'No tienes permiso para iniciar esta cartilla.','42501');
    perform private.qa_require(d.project_id is null,'La cartilla ya tiene una metodología vinculada.','40001');
    select * into m from public.qa_methodology_versions where id=private.qa_id(command->'methodology_version_id')::uuid and status='aprobado';
    perform private.qa_require(m.id is not null and m.application_id=p.application_id,'Selecciona una metodología aprobada para esta aplicación.');review=private.qa_review(actor,title);
    c=jsonb_build_object('context',jsonb_build_object('summary',p.description,'functioning','','source_notes','','functionalities','[]'::jsonb,'review',review),'selection',review,'cases','[]'::jsonb);
    insert into public.qa_documents(project_id,methodology_version_id,content) values(target,m.id,c) returning * into d;
  else
    perform private.qa_require(d.project_id is not null,'Selecciona primero la metodología de la cartilla.');select * into m from public.qa_methodology_versions where id=d.methodology_version_id;
    c=private.qa_apply(d.content,command,m.config,actor,title,target);
    perform private.qa_require(octet_length(c::text)<=2000000,'La cartilla excede el límite técnico de 2 MB de texto.');
    update public.qa_documents set content=c,version=version+1,updated_at=clock_timestamp() where project_id=target returning * into d;
  end if;
  perform private.qa_record(d,command->>'action');return to_jsonb(d);
end; $$;
create function public.qa_command(target uuid,expected_version integer,command jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.qa_command(target,expected_version,command); $$;

create or replace function private.guard_project_update() returns trigger language plpgsql security invoker set search_path='' as $$ begin
  if new.owner_id<>old.owner_id or new.created_at<>old.created_at or new.id<>old.id then raise exception 'El creador y la identidad del proyecto son inmutables' using errcode='42501';end if;
  if new.application_id<>old.application_id then
    if exists(select 1 from public.qa_documents where project_id=old.id) then raise exception 'La cartilla tiene una metodología vinculada. Crea otro proyecto para otra aplicación.' using errcode='22023';end if;
    if not exists(select 1 from public.applications a where a.id=new.application_id and a.active) then raise exception 'Selecciona una aplicación activa.' using errcode='22023';end if;
  end if;
  new.version=old.version+1;new.updated_at=now();return new;
end; $$;
create function private.qa_project_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.qa_documents; title text; actor uuid:=(select auth.uid()); begin
  if (new.code,new.name,new.objective,new.description) is not distinct from (old.code,old.name,old.objective,old.description) then return new;end if;
  select * into d from public.qa_documents where project_id=new.id for update;if d.project_id is null then return new;end if;
  select full_name into title from public.user_profiles where id=actor and active;perform private.qa_require(actor is not null and title is not null,'El cambio documental requiere una cuenta activa.','42501');
  update public.qa_documents set content=private.qa_invalidate(content,actor,title),version=version+1,updated_at=clock_timestamp() where project_id=new.id returning * into d;
  perform private.qa_record(d,'project_context_changed');return new;
end; $$;
create trigger qa_project_document_changed after update on public.projects for each row execute function private.qa_project_changed();

-- Solo los cuatro comandos acotados se pueden invocar desde el rol autenticado.
revoke all on function private.qa_require(boolean,text,text),private.qa_text(jsonb,integer,boolean),private.qa_id(jsonb),
  private.qa_review(uuid,text),private.qa_changed_review(jsonb,uuid,text),private.qa_invalidate(jsonb,uuid,text),private.qa_can_review(uuid,jsonb),
  private.qa_validate_methodology(jsonb),private.qa_apply(jsonb,jsonb,jsonb,uuid,text,uuid),private.qa_record(public.qa_documents,text),
  private.qa_guard_methodology(),private.qa_project_changed() from public,anon,authenticated;
revoke all on function private.qa_application_save(jsonb),private.qa_methodology_save(jsonb,uuid,integer),private.qa_methodology_approve(uuid,integer),private.qa_command(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function private.qa_application_save(jsonb),private.qa_methodology_save(jsonb,uuid,integer),private.qa_methodology_approve(uuid,integer),private.qa_command(uuid,integer,jsonb) to authenticated;
revoke all on function public.qa_application_save(jsonb),public.qa_methodology_save(jsonb,uuid,integer),public.qa_methodology_approve(uuid,integer),public.qa_command(uuid,integer,jsonb) from public,anon;
grant execute on function public.qa_application_save(jsonb),public.qa_methodology_save(jsonb,uuid,integer),public.qa_methodology_approve(uuid,integer),public.qa_command(uuid,integer,jsonb) to authenticated;

insert into public.qa_methodology_versions(application_id,methodology_key,name,version_label,source_reference,config,status)
values('digiproy','digiproy','DigiProy','1.0','DigiProy_Casos_Prueba_CO_Muestreo_Calidad_Fruta_Campo_E819.xlsx',
  '{"columns":[{"key":"requirement","label":"Nombre Requisito","range":"A"},{"key":"item","label":"ITEM","range":"B"},{"key":"name","label":"Nombre CP","range":"C"},{"key":"description","label":"Descripción Caso de Prueba","range":"D"},{"key":"priority","label":"Prioridad","range":"E"},{"key":"step","label":"Paso","range":"F"},{"key":"step_description","label":"Descripción Paso","range":"G"},{"key":"arguments","label":"Argumentos","range":"H"},{"key":"expected_result","label":"Resultado Esperado","range":"I"},{"key":"reference","label":"REFERENCIA","range":"J"},{"key":"comment","label":"Comentario","range":"K:M"}],"priorities":["Alta","Media"],"required_case_fields":["requirement","description"],"required_step_fields":["description","expected_result"],"analysis_guidance":"Identifica únicamente operaciones y reglas respaldadas por la información de la cartilla. Registra su origen.","case_guidance":"Redacta instrucciones claras. Usa valores concretos cuando exista un cálculo documentado. No añadas escenarios no solicitados."}'::jsonb,'aprobado');
