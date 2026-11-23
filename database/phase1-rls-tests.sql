-- Datos ficticios temporales. La transacción siempre termina con ROLLBACK.
begin;
do $$ begin
  if exists(select 1 from public.user_profiles) or exists(select 1 from public.projects) then
    raise exception 'Estas pruebas requieren un backend de desarrollo vacío; no ejecutarlas con usuarios o proyectos existentes';
  end if;
end $$;
create temporary table qa_results(label text,passed boolean);
grant select,insert on qa_results to authenticated,anon;
insert into auth.users(id,email,raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001','admin@qa.example.test','{"full_name":"Admin ficticio"}'),
('10000000-0000-4000-8000-000000000002','editor@qa.example.test','{"full_name":"Editor ficticio"}'),
('10000000-0000-4000-8000-000000000003','otro@qa.example.test','{"full_name":"Otro editor"}'),
('10000000-0000-4000-8000-000000000004','lector@qa.example.test','{"full_name":"Lector ficticio"}'),
('10000000-0000-4000-8000-000000000005','inactivo@qa.example.test','{"full_name":"Cuenta inactiva","role":"administrador","active":true}');
insert into qa_results select 'Metadatos no conceden permisos',role='lector' and not active from public.user_profiles where id='10000000-0000-4000-8000-000000000005';
update public.user_profiles set role=case when id='10000000-0000-4000-8000-000000000001' then 'administrador' when id in ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003') then 'editor' else 'lector' end,
active=(id<>'10000000-0000-4000-8000-000000000005');
insert into public.projects(id,owner_id,application_id,code,name,objective) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','digiproy','FICTICIO-A','Proyecto A ficticio','Verificar aislamiento'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','digiproy','FICTICIO-B','Proyecto B ficticio','Verificar aislamiento');
insert into public.project_members values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','lector');

set local role anon;
do $$ begin
  begin perform * from public.projects;raise exception 'El anónimo pudo consultar proyectos';
  exception when insufficient_privilege then insert into qa_results values('Acceso anónimo bloqueado',true);end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into qa_results select 'Editor ve únicamente su proyecto',count(*)=1 from public.projects;
insert into qa_results select 'Conocer ID ajeno no da acceso',count(*)=0 from public.projects where id='20000000-0000-4000-8000-000000000002';
insert into qa_results select 'Puede editar su proyecto',public.project_editable('20000000-0000-4000-8000-000000000001');
insert into qa_results select 'No puede editar el ajeno',not public.project_editable('20000000-0000-4000-8000-000000000002');
update public.projects set name='Proyecto A actualizado' where id='20000000-0000-4000-8000-000000000001' and version=1;
insert into qa_results select 'Actualización incrementa versión',version=2 from public.projects where id='20000000-0000-4000-8000-000000000001';
update public.projects set name='Cambio antiguo' where id='20000000-0000-4000-8000-000000000001' and version=1;
insert into qa_results select 'Edición concurrente no sobrescribe',name='Proyecto A actualizado' from public.projects where id='20000000-0000-4000-8000-000000000001';
insert into qa_results select 'Ruta privada propia permitida',private.has_path_access('20000000-0000-4000-8000-000000000001/captura.png');
insert into qa_results select 'Ruta ajena bloqueada',not private.has_path_access('20000000-0000-4000-8000-000000000002/captura.png');
insert into qa_results select 'Ruta inválida bloqueada',not private.has_path_access('sin-proyecto/captura.png');
with created as(insert into public.projects(owner_id,application_id,code,name,objective) values((select auth.uid()),'digiproy','FICTICIO-C','Proyecto C ficticio','Validar INSERT RETURNING con RLS') returning id)
insert into qa_results select 'Crear proyecto con RETURNING funciona',count(*)=1 from created;
do $$ begin
  begin insert into public.projects(owner_id,application_id,code,name,objective) values('10000000-0000-4000-8000-000000000003','digiproy','FICTICIO-IMPOSTOR','Creador falso','Prueba');raise exception 'Se aceptó un creador ajeno';
  exception when insufficient_privilege then insert into qa_results values('No se suplanta al creador',true);end;
  begin update public.projects set owner_id='10000000-0000-4000-8000-000000000003' where id='20000000-0000-4000-8000-000000000001';raise exception 'Se cambió el propietario';
  exception when insufficient_privilege then insert into qa_results values('Propietario inmutable para el cliente',true);end;
  begin update public.user_profiles set role='administrador' where id=(select auth.uid());raise exception 'Autoelevación permitida';
  exception when insufficient_privilege then insert into qa_results values('Autoelevación bloqueada',true);end;
  begin insert into public.project_members values('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','editor');raise exception 'Asignación no autorizada permitida';
  exception when insufficient_privilege then insert into qa_results values('Asignación requiere administrador',true);end;
  begin insert into public.audit_logs(action) values('Auditoría falsificada');raise exception 'Auditoría modificable';
  exception when insufficient_privilege then insert into qa_results values('Auditoría no falsificable por el cliente',true);end;
  begin perform public.admin_update_user('10000000-0000-4000-8000-000000000002','administrador',true,false);raise exception 'RPC permitió autoelevación';
  exception when insufficient_privilege then insert into qa_results values('RPC verifica al administrador',true);end;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
insert into qa_results select 'Lector ve el proyecto asignado',count(*)=1 from public.projects;
insert into qa_results select 'Lector no puede editar',not public.project_editable('20000000-0000-4000-8000-000000000001');
update public.projects set name='Edición de lector' where id='20000000-0000-4000-8000-000000000001';
insert into qa_results select 'UPDATE de lector no modifica filas',name='Proyecto A actualizado' from public.projects where id='20000000-0000-4000-8000-000000000001';
do $$ begin
  begin insert into public.projects(owner_id,application_id,code,name,objective) values((select auth.uid()),'digiproy','FICTICIO','Proyecto no permitido','Prueba');raise exception 'Lector pudo crear';
  exception when insufficient_privilege then insert into qa_results values('Lector no crea proyectos',true);end;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
insert into qa_results select 'Cuenta inactiva no consulta proyectos',count(*)=0 from public.projects;
insert into qa_results select 'Cuenta inactiva no ve aplicaciones',count(*)=0 from public.applications;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into qa_results select 'Administrador ve todos los proyectos',count(*)=3 from public.projects;
do $$ begin
  begin perform public.admin_update_user((select auth.uid()),'lector',true,false);raise exception 'Se eliminó al último administrador';
  exception when check_violation then insert into qa_results values('Último administrador protegido',true);end;
end $$;
select public.admin_update_user('10000000-0000-4000-8000-000000000004','revisor',true,true);
insert into qa_results select 'Administrador cambia permisos',role='revisor' and can_self_approve from public.user_profiles where id='10000000-0000-4000-8000-000000000004';
delete from public.project_members where project_id='20000000-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000004';
insert into qa_results select 'Retirar miembro genera auditoría',count(*)=1 from public.audit_logs where action='Retiró un miembro del proyecto' and entity_id='10000000-0000-4000-8000-000000000004';
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
insert into qa_results select 'Acceso retirado con sesión aún vigente',count(*)=0 from public.projects;
reset role;
insert into qa_results select 'Todos los buckets son privados',count(*)=3 and bool_and(not public) from storage.buckets where id like 'qa-%';
do $$ declare failures text; count_tests integer; begin
  select string_agg(label,', ') into failures from qa_results where passed is distinct from true;
  select count(*) into count_tests from qa_results;
  if failures is not null or count_tests<>30 then raise exception 'Fallos RLS: %, total %',failures,count_tests;end if;
end $$;
rollback;
select '30 verificaciones RLS superadas; datos ficticios revertidos' as resultado;
