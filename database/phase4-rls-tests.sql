-- Isolated fictitious actors and metadata only. All changes, including storage
-- object metadata, are rolled back. No real image bytes are uploaded by this test.
begin;
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true);
create temporary table qa4_people(kind text primary key,id uuid default gen_random_uuid(),role text,active boolean);
insert into qa4_people(kind,role,active) values('admin','administrador',true),('editor','editor',true),('reader','lector',true),('outsider','editor',true);
insert into auth.users(id,email,raw_user_meta_data) select id,'qa4-'||id::text||'@example.test',jsonb_build_object('full_name','Prueba temporal '||kind) from qa4_people;
update public.user_profiles p set role=t.role,active=t.active from qa4_people t where p.id=t.id;
grant select on qa4_people to authenticated;
create function pg_temp.qa4_as(actor uuid) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claim.sub',actor::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
end;$$;
create function pg_temp.qa4_assert(ok boolean,label text) returns void language plpgsql as $$begin
 if ok is distinct from true then raise exception 'Falló Fase 4: %',label;end if;
end;$$;
create function pg_temp.qa4_error(query text,expected text) returns boolean language plpgsql as $$begin
 begin execute query;exception when others then if sqlstate=expected then return true;end if;raise exception 'Error inesperado: % %',sqlstate,sqlerrm;end;return false;
end;$$;
set local role anon;
select pg_temp.qa4_assert(pg_temp.qa4_error('select * from public.qa_evidence','42501'),'anon sin metadatos');
select pg_temp.qa4_assert(pg_temp.qa4_error('select public.qa_evidence_manifest(gen_random_uuid())','42501'),'anon sin manifest');
set local role authenticated;
do $$
declare actor uuid;admin_actor uuid;reader_actor uuid;other uuid;p uuid;method uuid;d jsonb;v integer;f uuid:=gen_random_uuid();c uuid:=gen_random_uuid();s uuid:=gen_random_uuid();e jsonb;x jsonb;rev integer;
 input jsonb:=jsonb_build_object('filename','prueba.png','caption','Datos ficticios','mime_type','image/png','extension','png','byte_size',68,'width',1,'height',1,'sha256',repeat('0',64));
begin
 select id into actor from qa4_people where kind='editor';select id into admin_actor from qa4_people where kind='admin';select id into reader_actor from qa4_people where kind='reader';select id into other from qa4_people where kind='outsider';
 perform pg_temp.qa4_as(actor);
 insert into public.projects(owner_id,application_id,code,name,objective,description) values(actor,'digiproy','F4-TEMP-'||gen_random_uuid()::text,'Prueba temporal capturas','Verificar permisos','Datos ficticios') returning id into p;
 select id into method from public.qa_methodology_versions where application_id='digiproy' and status='aprobado' limit 1;
 d=public.qa_command(p,0,jsonb_build_object('action','init','methodology_version_id',method));
 d=public.qa_command(p,(d->>'version')::integer,jsonb_build_object('action','save_context','context',jsonb_build_object('summary','Formulario ficticio','functioning','Guardar dato','source_notes','Regla ficticia','functionalities',jsonb_build_array(jsonb_build_object('id',f,'name','Guardar','description','Guardar dato','source','Regla ficticia')))));
 d=public.qa_command(p,(d->>'version')::integer,'{"action":"submit","scope":"context"}');
 perform pg_temp.qa4_as(admin_actor);d=public.qa_command(p,(d->>'version')::integer,'{"action":"approve","scope":"context"}');
 insert into public.project_members(project_id,user_id,role) values(p,reader_actor,'editor');
 perform pg_temp.qa4_as(actor);
 d=public.qa_command(p,(d->>'version')::integer,jsonb_build_object('action','save_selection','cases',jsonb_build_array(jsonb_build_object('id',c,'functionality_id',f,'included',true,'name','Guardar dato','justification','Regla ficticia','priority','Alta'))));
 d=public.qa_command(p,(d->>'version')::integer,'{"action":"submit","scope":"selection"}');
 perform pg_temp.qa4_as(admin_actor);d=public.qa_command(p,(d->>'version')::integer,'{"action":"approve","scope":"selection"}');
 perform pg_temp.qa4_as(actor);
 d=public.qa_command(p,(d->>'version')::integer,jsonb_build_object('action','save_case','case_id',c,'case',jsonb_build_object('requirement','Guardar dato','description','Guardar dato','comment','','steps',jsonb_build_array(jsonb_build_object('id',s,'description','Guardar','arguments','Ejemplo','expected_result','Dato guardado')))));
 v=(d->>'version')::integer;
 perform pg_temp.qa4_assert(pg_temp.qa4_error(format('select public.qa_evidence_prepare(%L,%s,%L,%L,%L::jsonb)',p,v-1,c,s,input::text),'40001'),'versión antigua');
 perform pg_temp.qa4_assert(pg_temp.qa4_error(format('select public.qa_evidence_prepare(%L,%s,%L,%L,%L::jsonb)',p,v,c,gen_random_uuid(),input::text),'22023'),'paso ajeno');
 perform pg_temp.qa4_assert(pg_temp.qa4_error(format('select public.qa_evidence_prepare(%L,%s,%L,%L,%L::jsonb)',p,v,c,s,(input||'{"created_by":"forged"}')::text),'22023'),'identidad no elegible en input');
 e=public.qa_evidence_prepare(p,v,c,s,input);
 perform pg_temp.qa4_assert(e->>'state'='pending' and e->>'created_by'=actor::text,'reserva identidad real');
 perform pg_temp.qa4_assert(private.qa_evidence_storage_access(e->>'object_path',true),'carga propia pendiente');
 perform pg_temp.qa4_assert(not private.qa_evidence_storage_access(p::text||'/arbitrario.png',true),'ruta no reservada');
 perform pg_temp.qa4_assert(pg_temp.qa4_error(format('select public.qa_evidence_finish(%L,%s)',e->>'id',v),'22023'),'no confirma sin objeto');
 perform pg_temp.qa4_as(other);
 perform pg_temp.qa4_assert(public.qa_evidence_manifest(p) is null,'editor ajeno sin manifest');
 perform pg_temp.qa4_assert((select count(*) from public.qa_evidence where project_id=p)=0,'editor ajeno sin metadatos');
 perform pg_temp.qa4_assert(not private.qa_evidence_storage_access(e->>'object_path'),'editor ajeno sin objeto');
 perform pg_temp.qa4_assert(pg_temp.qa4_error(format('select public.qa_evidence_prepare(%L,%s,%L,%L,%L::jsonb)',p,v,c,s,input::text),'42501'),'editor ajeno no reserva');
 perform pg_temp.qa4_as(reader_actor);
 perform pg_temp.qa4_assert(pg_temp.qa4_error(format('select public.qa_evidence_prepare(%L,%s,%L,%L,%L::jsonb)',p,v,c,s,input::text),'42501'),'membresía no eleva lector');
 perform pg_temp.qa4_assert(not private.qa_evidence_storage_access(e->>'object_path',true),'lector no carga');
 perform pg_temp.qa4_as(actor);
 insert into storage.objects(bucket_id,name,owner_id,metadata) values('qa-evidence',e->>'object_path',actor::text,jsonb_build_object('size',68,'mimetype','image/png'));
 e=public.qa_evidence_finish((e->>'id')::uuid,v);
 perform pg_temp.qa4_assert(e->>'state'='active','confirma tras objeto');
 perform pg_temp.qa4_assert(not private.qa_evidence_storage_access(e->>'object_path',true),'imagen confirmada inmutable');
 perform pg_temp.qa4_assert((public.qa_evidence_manifest(p)->>'revision')::integer=1,'revision de evidencias');
 x=public.qa_evidence_finish((e->>'id')::uuid,v);
 perform pg_temp.qa4_assert((public.qa_evidence_manifest(p)->>'revision')::integer=1,'confirmación idempotente');
 perform pg_temp.qa4_as(reader_actor);
 perform pg_temp.qa4_assert(jsonb_array_length(public.qa_evidence_manifest(p)->'items')=1,'lector ve captura confirmada');
 perform pg_temp.qa4_assert(private.qa_evidence_storage_access(e->>'object_path'),'lector autorizado ve objeto');
 perform pg_temp.qa4_assert(pg_temp.qa4_error(format('select public.qa_evidence_retire(%L,%s)',e->>'id',v),'42501'),'lector no retira');
 perform pg_temp.qa4_as(actor);
 perform public.qa_evidence_retire((e->>'id')::uuid,v);
 perform pg_temp.qa4_assert(jsonb_array_length(public.qa_evidence_manifest(p)->'items')=0 and (public.qa_evidence_manifest(p)->>'revision')::integer=2,'retiro sin exportar');
 perform pg_temp.qa4_assert(private.qa_evidence_storage_access(e->>'object_path'),'archivo histórico conservado');
 perform pg_temp.qa4_assert((select version from public.qa_documents where project_id=p)=v,'no altera aprobación documental');
 perform pg_temp.qa4_assert(pg_temp.qa4_error('update public.qa_evidence set caption=''forged''','42501'),'sin actualización directa');
 update public.projects set status='archivado' where id=p;
 perform pg_temp.qa4_assert(pg_temp.qa4_error(format('select public.qa_evidence_prepare(%L,%s,%L,%L,%L::jsonb)',p,v,c,s,input::text),'40001'),'archivo no admite capturas');
end; $$;
reset role;
rollback;
select jsonb_build_object('phase4_rls','passed','assertions',27,'fixtures_rolled_back',true,'evidence_rows_after',(select count(*) from public.qa_evidence),'objects_after',(select count(*) from storage.objects where bucket_id='qa-evidence')) as verification;

