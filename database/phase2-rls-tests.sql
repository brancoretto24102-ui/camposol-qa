-- Prueba aislada de Fase 2. Apta para el backend existente: solo crea fixtures
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
 if condition is distinct from true then raise exception 'Falló la comprobación de Fase 2: %',label;end if;
end; $$;
create function pg_temp.qa_as(actor uuid) returns void language plpgsql security invoker as $$ begin
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','user_metadata',jsonb_build_object('role','administrador'))::text,true);
end; $$;
create function pg_temp.qa_error(query text,expected text) returns boolean language plpgsql security invoker as $$ begin
 begin execute query;exception when others then
   if sqlstate=expected then return true;end if;
   raise exception 'Error inesperado en prueba de Fase 2: % %',sqlstate,sqlerrm;
 end;return false;
end; $$;

set local role anon;
select pg_temp.qa_assert(pg_temp.qa_error('select * from public.qa_documents','42501'),'anon no consulta documentos');
select pg_temp.qa_assert(pg_temp.qa_error('select * from public.qa_methodology_versions','42501'),'anon no consulta metodologías');
select pg_temp.qa_assert(pg_temp.qa_error('select public.qa_command(gen_random_uuid(),0,''{}''::jsonb)','42501'),'anon no invoca comandos');
set local role authenticated;

do $$
declare admin uuid;editor uuid;reviewer uuid;reader uuid;outsider uuid;disabled uuid;wrong_review uuid;
 p uuid; p2 uuid; method uuid; d jsonb; saved jsonb; saved_version integer; draft jsonb; fake_app jsonb;
 fid uuid:=gen_random_uuid();cid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();step2 uuid:=gen_random_uuid();config jsonb;
 context jsonb;proposal jsonb;body jsonb;new_method jsonb; input jsonb;
begin
 select id into admin from pg_temp.qa_test_people where kind='admin';select id into editor from pg_temp.qa_test_people where kind='editor';
 select id into reviewer from pg_temp.qa_test_people where kind='reviewer';select id into reader from pg_temp.qa_test_people where kind='reader';
 select id into outsider from pg_temp.qa_test_people where kind='outsider';select id into disabled from pg_temp.qa_test_people where kind='disabled';select id into wrong_review from pg_temp.qa_test_people where kind='wrong_review';
 perform pg_temp.qa_as(editor);
 insert into public.projects(owner_id,application_id,code,name,objective,description)
 values(editor,'digiproy','F2-TEMP-'||fid::text,'Prueba temporal Fase 2','Verificar controles con datos ficticios','Datos ficticios de comprobación') returning id into p;
 select m.id,m.config into method,config from public.qa_methodology_versions m where application_id='digiproy' and methodology_key='digiproy' and version_label='1.0';
 d=public.qa_command(p,0,jsonb_build_object('action','init','methodology_version_id',method));
 perform pg_temp.qa_assert(d->>'version'='1','inicia documento real con versión 1');
 perform pg_temp.qa_assert(d->>'methodology_version_id'=method::text,'vincula la metodología aprobada');
 perform pg_temp.qa_assert((select count(*) from public.qa_documents where project_id=p)=1,'el creador puede leer su cartilla');
 perform pg_temp.qa_assert(pg_temp.qa_error(format('update public.qa_documents set content=''{}'' where project_id=%L',p),'42501'),'no hay escritura REST directa');
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_command(%L,1,%L::jsonb)',p,'{"action":"submit","scope":"context"}'),'22023'),'no envía contexto vacío');
 context=jsonb_build_object('summary','Formulario ficticio','functioning','La persona ingresa un dato y lo guarda.','source_notes','Regla técnica ficticia','functionalities',jsonb_build_array(jsonb_build_object('id',fid,'name','Guardar registro ficticio','description','Guardar únicamente el dato ingresado','source','Requisito aportado para la prueba')));
 d=public.qa_command(p,1,jsonb_build_object('action','save_context','context',context));
 d=public.qa_command(p,(d->>'version')::integer,'{"action":"submit","scope":"context"}');
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_command(%L,%s,%L::jsonb)',p,d->>'version','{"action":"approve","scope":"context"}'),'42501'),'editor no autoaprueba sin permiso');
 saved_version=(d->>'version')::integer;
 perform pg_temp.qa_as(outsider);
 perform pg_temp.qa_assert((select count(*) from public.qa_documents where project_id=p)=0,'otro editor no lee la cartilla');
 perform pg_temp.qa_assert((select count(*) from public.qa_document_revisions where project_id=p)=0,'otro editor no lee versiones');
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_command(%L,%s,%L::jsonb)',p,saved_version,'{"action":"submit","scope":"context"}'),'42501'),'otro editor no modifica aunque conozca el ID');
 perform pg_temp.qa_as(admin);
 insert into public.project_members(project_id,user_id,role) values(p,reviewer,'revisor'),(p,reader,'editor'),(p,wrong_review,'lector');
 perform pg_temp.qa_as(reader);
 perform pg_temp.qa_assert((select count(*) from public.qa_documents where project_id=p)=1,'lector asignado puede consultar');
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_command(%L,%s,%L::jsonb)',p,saved_version,'{"action":"submit","scope":"context"}'),'42501'),'el rol de miembro no eleva al lector');
 perform pg_temp.qa_as(wrong_review);
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_command(%L,%s,%L::jsonb)',p,saved_version,'{"action":"approve","scope":"context"}'),'42501'),'revisor global asignado como lector no aprueba');
 perform pg_temp.qa_as(reviewer);
 d=public.qa_command(p,saved_version,'{"action":"approve","scope":"context"}');
 perform pg_temp.qa_assert(d->'content'->'context'->'review'->>'status'='aprobado','revisor asignado aprueba contexto');
 perform pg_temp.qa_assert(d->'content'->'context'->'review'->>'approved_by'=reviewer::text,'se conserva identidad de quien aprueba');
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_command(%L,%s,%L::jsonb)',p,saved_version,'{"action":"approve","scope":"context"}'),'40001'),'rechaza versión documental antigua');
 proposal=jsonb_build_object('id',cid,'functionality_id',fid,'included',true,'name','Validar guardado ficticio','justification','Operación descrita en el contexto','priority','Alta');
 perform pg_temp.qa_as(editor);
 d=public.qa_command(p,(d->>'version')::integer,jsonb_build_object('action','save_selection','cases',jsonb_build_array(proposal)));
 d=public.qa_command(p,(d->>'version')::integer,'{"action":"submit","scope":"selection"}');
 perform pg_temp.qa_as(reviewer);d=public.qa_command(p,(d->>'version')::integer,'{"action":"approve","scope":"selection"}');
 perform pg_temp.qa_assert(d->'content'->'selection'->>'status'='aprobado','aprueba el conjunto de casos');
 body=jsonb_build_object('requirement','Guardar un dato ficticio','description','Comprobar el guardado documentado.','comment','',
   'steps',jsonb_build_array(jsonb_build_object('id',sid,'description','Ingresar un dato.','arguments','Dato: ejemplo.','expected_result','El dato se muestra en el formulario.'),jsonb_build_object('id',step2,'description','Guardar el formulario.','arguments','','expected_result','El registro queda disponible para consulta.')),
   'review',jsonb_build_object('status','aprobado','approved_by',editor));
 perform pg_temp.qa_as(editor);d=public.qa_command(p,(d->>'version')::integer,jsonb_build_object('action','save_case','case_id',cid,'case',body));
 perform pg_temp.qa_assert(d->'content'->'cases'->0->'review'->>'status'='borrador','ignora metadatos de aprobación del cliente');
 d=public.qa_command(p,(d->>'version')::integer,jsonb_build_object('action','submit','scope','case','case_id',cid));
 perform pg_temp.qa_as(reviewer);d=public.qa_command(p,(d->>'version')::integer,jsonb_build_object('action','approve','scope','case','case_id',cid));
 perform pg_temp.qa_assert(d->'content'->'cases'->0->'review'->>'status'='aprobado','aprueba caso con pasos reales');
 perform pg_temp.qa_assert((select approved_cases from public.qa_progress where project_id=p)=1,'el avance refleja los casos aprobados');
 saved=d;saved_version=(d->>'version')::integer;
 body=jsonb_set(body,'{steps,0,expected_result}','"Resultado esperado corregido."');
 perform pg_temp.qa_as(editor);d=public.qa_command(p,saved_version,jsonb_build_object('action','save_case','case_id',cid,'case',body));
 perform pg_temp.qa_assert(d->'content'->'cases'->0->'review'->>'status'='requiere_correccion','editar aprobado exige otra revisión');
 perform pg_temp.qa_assert((select snapshot->'content'->'cases'->0->'review'->>'status' from public.qa_document_revisions where project_id=p and qa_document_revisions.version=saved_version)='aprobado','conserva snapshot aprobado');
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_command(%L,%s,%L::jsonb)',p,saved_version,jsonb_build_object('action','save_case','case_id',cid,'case',body)::text),'40001'),'evita sobrescribir edición concurrente');
 perform pg_temp.qa_assert((select count(*) from public.qa_document_revisions where project_id=p)=(d->>'version')::integer,'conserva cada versión documental');
 update public.projects set objective='Objetivo técnico corregido' where id=p;
 select to_jsonb(q) into d from public.qa_documents q where project_id=p;
 perform pg_temp.qa_assert(d->'content'->'context'->'review'->>'status'<>'aprobado' and d->'content'->'selection'->>'status'<>'aprobado','la ficha del proyecto invalida el contexto aprobado');
 perform pg_temp.qa_assert((select action from public.qa_document_revisions where project_id=p order by qa_document_revisions.version desc limit 1)='project_context_changed','audita el cambio de ficha');
 perform pg_temp.qa_as(disabled);
 perform pg_temp.qa_assert((select count(*) from public.qa_methodology_versions)=0,'una cuenta inactiva no lee metodologías');
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_command(%L,%s,%L::jsonb)',p,d->>'version','{"action":"submit","scope":"context"}'),'42501'),'una cuenta inactiva no modifica');
 perform pg_temp.qa_as(admin);
 select to_jsonb(m) into input from public.qa_methodology_versions m where id=method;
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_methodology_save(%L::jsonb,%L,1)',input::text,method),'40001'),'una metodología aprobada es inmutable');
 new_method=public.qa_methodology_save(input||jsonb_build_object('version_label','qa-'||left(fid::text,8)),null,0);
 perform pg_temp.qa_assert(new_method->>'status'='borrador','crea otra versión sin cambiar la anterior');
 perform pg_temp.qa_as(editor);
 perform pg_temp.qa_assert((select count(*) from public.qa_methodology_versions where id=(new_method->>'id')::uuid)=0,'solo administradores consultan borradores');
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_application_save(%L::jsonb)',jsonb_build_object('id','qa-prohibida','name','No autorizada','active',true,'version',0)::text),'42501'),'editor no gestiona aplicaciones');
 perform pg_temp.qa_as(admin);
 new_method=public.qa_methodology_approve((new_method->>'id')::uuid,(new_method->>'revision')::integer);
 perform pg_temp.qa_assert(new_method->>'status'='aprobado','aprueba la nueva versión de metodología');
 perform pg_temp.qa_assert((select methodology_version_id from public.qa_documents where project_id=p)=method,'el proyecto conserva la versión original');
 fake_app=public.qa_application_save(jsonb_build_object('id','qa-f2-'||left(fid::text,8),'name','Aplicación ficticia '||fid::text,'active',true,'version',0));
 perform pg_temp.qa_assert(fake_app->>'version'='1','crea aplicación versionada');
 insert into public.projects(owner_id,application_id,code,name,objective,description) values(admin,fake_app->>'id','F2-INACTIVE-'||fid::text,'Prueba temporal de aplicación','Comprobar lectura de aplicación inactiva','Datos ficticios') returning id into p2;
 insert into public.project_members(project_id,user_id,role) values(p2,reader,'lector');
 fake_app=public.qa_application_save(fake_app||'{"active":false}'::jsonb);
 perform pg_temp.qa_assert(fake_app->>'version'='2' and fake_app->>'active'='false','desactiva aplicación con control de versión');
 perform pg_temp.qa_as(reader);
 perform pg_temp.qa_assert((select count(*) from public.applications where id=fake_app->>'id')=1,'lector conserva la aplicación de un proyecto asignado');
 perform pg_temp.qa_assert((select count(*) from public.projects where id=p2)=1,'consulta el proyecto de aplicación inactiva sin recursión');
 perform pg_temp.qa_as(outsider);
 perform pg_temp.qa_assert((select count(*) from public.applications where id=fake_app->>'id')=0,'no expone aplicaciones inactivas ajenas');
 perform pg_temp.qa_as(admin);
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_application_save(%L::jsonb)',(fake_app||'{"version":1}'::jsonb)::text),'40001'),'el catálogo evita pérdida de cambios');
 perform pg_temp.qa_assert(pg_temp.qa_error(format('update public.projects set application_id=%L where id=%L',fake_app->>'id',p),'22023'),'no cambia aplicación de una cartilla vinculada');
 update public.projects set status='archivado' where id=p;
 perform pg_temp.qa_assert(pg_temp.qa_error(format('select public.qa_command(%L,%s,%L::jsonb)',p,d->>'version','{"action":"submit","scope":"context"}'),'40001'),'un proyecto archivado conserva su cartilla en consulta');
end; $$;
reset role;
rollback;
select jsonb_build_object('phase2_transaction_tests','passed','fixtures_rolled_back',true,
  'users_after',(select count(*) from auth.users),'projects_after',(select count(*) from public.projects),
  'documents_after',(select count(*) from public.qa_documents)) as verification;
