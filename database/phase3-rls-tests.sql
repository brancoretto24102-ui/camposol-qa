-- Prueba aislada de Fase 3. Apta para el backend existente: solo crea fixtures
-- con UUID aleatorios dentro de una transacción y revierte TODOS sus cambios.
-- No ejecutar el script de Fase 1 reservado para una base vacía.
begin;
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true);
create temporary table qa_test_people(kind text primary key,id uuid default gen_random_uuid(),role text,active boolean);
insert into qa_test_people(kind,role,active) values
 ('admin','administrador',true),('editor','editor',true),('reviewer','revisor',true),
 ('reader','lector',true),('outsider','editor',true),('disabled','editor',false),('wrong_review','revisor',true);
insert into auth.users(id,email,raw_user_meta_data)
 select id,'qa-f2-'||id::text||'@example.test',jsonb_build_object('full_name','Prueba temporal '||kind,'role','administrador','active',true) from qa_test_people;
update public.user_profiles p set role=t.role,active=t.active,can_self_approve=false from qa_test_people t where p.id=t.id;
grant select on qa_test_people to authenticated;

create function pg_temp.qa_assert(condition boolean,label text) returns void language plpgsql security invoker as $$ begin
 if condition is distinct from true then raise exception 'Falló la comprobación de Fase 3: %',label;end if;
end; $$;
create function pg_temp.qa_as(actor uuid) returns void language plpgsql security invoker as $$ begin
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','user_metadata',jsonb_build_object('role','administrador'))::text,true);
end; $$;
create function pg_temp.qa_error(query text,expected text) returns boolean language plpgsql security invoker as $$ begin
 begin execute query;exception when others then
   if sqlstate=expected then return true;end if;
   raise exception 'Error inesperado en prueba de Fase 3: % %',sqlstate,sqlerrm;
 end;return false;
end; $$;

set local role anon;
select pg_temp.qa_assert(pg_temp.qa_error($query$select * from public.ai_provider_preferences$query$,'42501'),'anon no lee preferencias');
select pg_temp.qa_assert(pg_temp.qa_error($query$select public.qa_ai_preferences_save('{}'::jsonb)$query$,'42501'),'anon no guarda preferencias');
select pg_temp.qa_assert(pg_temp.qa_error($query$select public.qa_ai_reserve(gen_random_uuid(),1,'analysis',null)$query$,'42501'),'anon no reserva solicitudes');
set local role authenticated;
do $$
declare actor uuid;other_actor uuid;admin_actor uuid;reader_actor uuid;p uuid;method uuid;d jsonb;pref jsonb;v integer;
begin
 select id into actor from pg_temp.qa_test_people where kind='editor';select id into other_actor from pg_temp.qa_test_people where kind='outsider';select id into admin_actor from pg_temp.qa_test_people where kind='admin';select id into reader_actor from pg_temp.qa_test_people where kind='reader';
 perform pg_temp.qa_as(actor);
 perform pg_temp.qa_assert((select count(*) from public.ai_provider_preferences)=0,'cuenta nueva sin preferencias de otros');
 pref=public.qa_ai_preferences_save('{"provider":"openai","mode":"manual","model":"","version":0}');
 perform pg_temp.qa_assert(pref->>'version'='1' and not(pref ? 'user_id'),'devuelve solo preferencias propias y versión');
 perform pg_temp.qa_assert((select count(*) from public.ai_provider_preferences where user_id=actor)=1,'lee sus preferencias');
 perform pg_temp.qa_assert(pg_temp.qa_error($query$select public.qa_ai_preferences_save('{"provider":"openai","mode":"manual","model":"","version":0}'::jsonb)$query$,'40001'),'rechaza versión antigua de preferencias');
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_ai_preferences_save(%L::jsonb)',jsonb_build_object('provider','openai','mode','manual','model','','version',1,'user_id',other_actor)::text),'22023'),'no acepta otra identidad');
 perform pg_temp.qa_assert(pg_temp.qa_error($query$select public.qa_ai_preferences_save('{"provider":"openai","mode":"manual","model":"","version":1,"api_key":"synthetic-rejected-value"}'::jsonb)$query$,'22023'),'no admite claves en preferencias');
 perform pg_temp.qa_assert(pg_temp.qa_error($query$select public.qa_ai_preferences_save('{"provider":"copilot","mode":"api","model":"model","version":1}'::jsonb)$query$,'22023'),'Copilot solo manual');
 perform pg_temp.qa_assert(pg_temp.qa_error($query$select public.qa_ai_preferences_save('{"provider":"openai","mode":"api","model":"","version":1}'::jsonb)$query$,'22023'),'modelo API obligatorio');
 perform pg_temp.qa_assert(pg_temp.qa_error($query$update public.ai_provider_preferences set provider='claude'$query$,'42501'),'sin escritura REST directa');
 perform pg_temp.qa_assert(pg_temp.qa_error($query$select * from private.qa_ai_usage$query$,'42501'),'no expone contadores privados');
 pref=public.qa_ai_preferences_save('{"provider":"gemini","mode":"api","model":"model-test","version":1}');
 perform pg_temp.qa_assert(pref->>'version'='2' and pref->>'model'='model-test','guarda modelo propio versionado');
 perform pg_temp.qa_as(other_actor);
 perform pg_temp.qa_assert((select count(*) from public.ai_provider_preferences)=0,'otra cuenta no lee preferencias ajenas');
 pref=public.qa_ai_preferences_save('{"provider":"copilot","mode":"manual","model":"","version":0}');
 perform pg_temp.qa_assert(pref->>'provider'='copilot','preferencia independiente por cuenta');
 perform pg_temp.qa_as(admin_actor);
 perform pg_temp.qa_assert((select count(*) from public.ai_provider_preferences)=0,'administrador no consulta preferencias personales ajenas');
 perform pg_temp.qa_as(actor);
 insert into public.projects(owner_id,application_id,code,name,objective,description) values(actor,'digiproy','F3-TEMP-'||gen_random_uuid()::text,'Prueba temporal IA','Verificar permisos ficticios','Dato ficticio') returning id into p;
 select id into method from public.qa_methodology_versions where application_id='digiproy' and version_label='1.0';
 d=public.qa_command(p,0,jsonb_build_object('action','init','methodology_version_id',method));v=(d->>'version')::integer;
 perform public.qa_ai_reserve(p,v,'analysis',null);
 perform pg_temp.qa_assert((select count(*) from public.audit_logs where project_id=p and action='Solicitó asistencia por API')=1,'audita intento sin prompt ni clave');
 perform pg_temp.qa_assert(pg_temp.qa_error(format($query$select public.qa_ai_reserve(%L,0,'analysis',null)$query$,p),'40001'),'rechaza snapshot antiguo');
 perform pg_temp.qa_assert(pg_temp.qa_error(format($query$select public.qa_ai_reserve(%L,%s,'selection',null)$query$,p,v),'22023'),'contexto aprobado antes de proponer casos');
 perform pg_temp.qa_assert(pg_temp.qa_error(format($query$select public.qa_ai_reserve(%L,%s,'unknown',null)$query$,p,v),'22023'),'rechaza tarea desconocida');
 perform pg_temp.qa_as(other_actor);
 perform pg_temp.qa_assert(pg_temp.qa_error(format($query$select public.qa_ai_reserve(%L,%s,'analysis',null)$query$,p,v),'42501'),'editor ajeno no utiliza el asistente');
 perform pg_temp.qa_as(admin_actor);insert into public.project_members(project_id,user_id,role) values(p,reader_actor,'editor');
 perform pg_temp.qa_as(reader_actor);
 perform pg_temp.qa_assert(pg_temp.qa_error(format($query$select public.qa_ai_reserve(%L,%s,'analysis',null)$query$,p,v),'42501'),'membresía no eleva a lector');
 perform pg_temp.qa_as(actor);
 perform public.qa_ai_reserve(p,v,'analysis',null);perform public.qa_ai_reserve(p,v,'analysis',null);perform public.qa_ai_reserve(p,v,'analysis',null);
 perform pg_temp.qa_assert(pg_temp.qa_error(format($query$select public.qa_ai_reserve(%L,%s,'analysis',null)$query$,p,v),'P0001'),'cuatro solicitudes por minuto');
end; $$;
reset role;
update private.qa_ai_usage u set minute_start=now()-interval '2 minutes',minute_count=0,day_count=20 from pg_temp.qa_test_people t where u.user_id=t.id and t.kind='editor';
set local role authenticated;
do $$
declare actor uuid;p uuid;v integer;
begin
 select id into actor from pg_temp.qa_test_people where kind='editor';perform pg_temp.qa_as(actor);select id into p from public.projects where owner_id=actor;select version into v from public.qa_documents where project_id=p;
 perform pg_temp.qa_assert(pg_temp.qa_error(format($query$select public.qa_ai_reserve(%L,%s,'analysis',null)$query$,p,v),'P0001'),'veinte solicitudes por 24 horas');
 update public.projects set status='archivado' where id=p;
 perform pg_temp.qa_assert(pg_temp.qa_error(format($query$select public.qa_ai_reserve(%L,%s,'analysis',null)$query$,p,v),'22023'),'proyecto archivado solo consulta');
end; $$;
reset role;
update public.user_profiles p set active=false from pg_temp.qa_test_people t where p.id=t.id and t.kind='editor';
set local role authenticated;
do $$
declare actor uuid;
begin
 select id into actor from pg_temp.qa_test_people where kind='editor';perform pg_temp.qa_as(actor);
 perform pg_temp.qa_assert((select count(*) from public.ai_provider_preferences)=0,'cuenta inactiva no lee preferencias');
 perform pg_temp.qa_assert(pg_temp.qa_error($query$select public.qa_ai_preferences_save('{"provider":"none","mode":"manual","model":"","version":2}'::jsonb)$query$,'42501'),'cuenta inactiva no guarda preferencias');
end; $$;
reset role;
rollback;
select jsonb_build_object('phase3_transaction_tests','passed','fixtures_rolled_back',true,'users_after',(select count(*) from auth.users),'projects_after',(select count(*) from public.projects),'documents_after',(select count(*) from public.qa_documents),'preferences_after',(select count(*) from public.ai_provider_preferences),'usage_after',(select count(*) from private.qa_ai_usage)) as verification;
