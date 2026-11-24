-- Fase 3 aditiva. Las preferencias no contienen claves, prompts ni respuestas.
create table public.ai_provider_preferences(
  user_id uuid primary key references public.user_profiles(id),
  provider text not null check(provider in ('none','openai','gemini','claude','copilot')),
  mode text not null check(mode in ('manual','api')),
  model text not null default '' check(length(model)<=120),
  version integer not null default 1 check(version>0),
  check((mode='manual' and model='') or (mode='api' and provider in ('openai','gemini','claude') and model ~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,119}$'))
);
alter table public.ai_provider_preferences enable row level security;
revoke all on public.ai_provider_preferences from public,anon,authenticated;
grant select on public.ai_provider_preferences to authenticated;
create policy ai_preferences_own_read on public.ai_provider_preferences for select to authenticated
  using(user_id=(select auth.uid()) and private.current_role() is not null);

create table private.qa_ai_usage(
  user_id uuid primary key references public.user_profiles(id),
  minute_start timestamptz not null,minute_count integer not null,
  day_start timestamptz not null,day_count integer not null
);
alter table private.qa_ai_usage enable row level security;
revoke all on private.qa_ai_usage from public,anon,authenticated;

create function private.qa_ai_preferences_save(input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());old public.ai_provider_preferences;result public.ai_provider_preferences;
 p text;m text;model_id text;expected integer;
begin
  perform private.qa_require(actor is not null and private.current_role() is not null,'Se requiere una cuenta activa.','42501');
  perform private.qa_require(jsonb_typeof(input)='object' and not exists(select 1 from jsonb_object_keys(input) k where k not in ('provider','mode','model','version')),'Las preferencias contienen campos no permitidos.');
  p=private.qa_text(input->'provider',20,true);m=private.qa_text(input->'mode',10,true);model_id=private.qa_text(input->'model',120);
  perform private.qa_require(p in ('none','openai','gemini','claude','copilot') and m in ('manual','api'),'Selecciona un proveedor y modalidad disponibles.');
  perform private.qa_require(m='manual' or (p in ('openai','gemini','claude') and model_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,119}$'),'Este proveedor requiere modalidad manual o un identificador de modelo válido.');
  perform private.qa_require(jsonb_typeof(input->'version')='number' and (input->>'version') ~ '^[0-9]{1,9}$','Falta la versión de tus preferencias.');expected=(input->>'version')::integer;
  -- El perfil ya existe y proporciona un bloqueo por cuenta incluso en el primer guardado.
  perform 1 from public.user_profiles where id=actor for update;
  select * into old from public.ai_provider_preferences where user_id=actor for update;
  perform private.qa_require(coalesce(old.version,0)=expected,'Tus preferencias cambiaron en otra ventana. Recárgalas antes de guardar.','40001');
  insert into public.ai_provider_preferences(user_id,provider,mode,model,version) values(actor,p,m,case when m='api' then model_id else '' end,expected+1)
    on conflict(user_id) do update set provider=excluded.provider,mode=excluded.mode,model=excluded.model,version=excluded.version returning * into result;
  return to_jsonb(result)-'user_id';
end; $$;
create function public.qa_ai_preferences_save(input jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select private.qa_ai_preferences_save(input); $$;

create function private.qa_ai_reserve(target uuid,expected_version integer,task text,target_case uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());p public.projects;d public.qa_documents;u private.qa_ai_usage;t timestamptz:=clock_timestamp();same_minute boolean;same_day boolean;
begin
  perform private.qa_require(actor is not null and private.can_edit_project(target),'Tu cuenta no tiene permiso de edición en esta cartilla.','42501');
  perform private.qa_require(task in ('analysis','selection','coverage','generate_case','improve_case','shorten_case','arguments','results'),'La tarea de IA no es válida.');
  select * into p from public.projects where id=target for share;
  select * into d from public.qa_documents where project_id=target for share;
  perform private.qa_require(p.status<>'archivado' and d.project_id is not null,'Inicia o reabre la cartilla antes de utilizar su asistente.');
  perform private.qa_require(expected_version is not null and d.version=expected_version,'La cartilla cambió. Conserva la propuesta y recarga antes de enviarla.','40001');
  perform private.qa_require(task='analysis' or d.content->'context'->'review'->>'status'='aprobado','Aprueba primero el contexto.');
  if task not in ('analysis','selection','coverage') then
    perform private.qa_require(d.content->'selection'->>'status'='aprobado' and exists(select 1 from jsonb_array_elements(d.content->'cases') c where c->>'id'=target_case::text and (c->>'included')::boolean),'Aprueba la selección y elige un caso incluido.');
  end if;
  insert into private.qa_ai_usage values(actor,t,0,t,0) on conflict(user_id) do nothing;
  select * into u from private.qa_ai_usage where user_id=actor for update;
  same_minute=t-u.minute_start<interval '1 minute';same_day=t-u.day_start<interval '24 hours';
  perform private.qa_require((not same_minute or u.minute_count<4) and (not same_day or u.day_count<20),'Límite de seguridad: 4 solicitudes por minuto y 20 por 24 horas por cuenta.','P0001');
  update private.qa_ai_usage set minute_start=case when same_minute then u.minute_start else t end,minute_count=case when same_minute then u.minute_count+1 else 1 end,
    day_start=case when same_day then u.day_start else t end,day_count=case when same_day then u.day_count+1 else 1 end where user_id=actor;
  insert into public.audit_logs(actor_id,project_id,action,entity_id,details) values(actor,target,'Solicitó asistencia por API',target,'Tarea: '||task||'; versión documental '||d.version||'. Sin almacenar prompt, respuesta ni credenciales.');
end; $$;
create function public.qa_ai_reserve(target uuid,expected_version integer,task text,target_case uuid default null) returns void
language sql security invoker set search_path='' as $$ select private.qa_ai_reserve(target,expected_version,task,target_case); $$;

revoke all on function private.qa_ai_preferences_save(jsonb),private.qa_ai_reserve(uuid,integer,text,uuid) from public,anon,authenticated;
grant execute on function private.qa_ai_preferences_save(jsonb),private.qa_ai_reserve(uuid,integer,text,uuid) to authenticated;
revoke all on function public.qa_ai_preferences_save(jsonb),public.qa_ai_reserve(uuid,integer,text,uuid) from public,anon;
grant execute on function public.qa_ai_preferences_save(jsonb),public.qa_ai_reserve(uuid,integer,text,uuid) to authenticated;
