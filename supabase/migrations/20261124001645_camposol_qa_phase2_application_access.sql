-- Evita el ciclo applications -> projects -> applications al evaluar políticas.
-- Solo devuelve un booleano del acceso efectivo del actor, sin exponer proyectos.
create function private.qa_uses_application(target text) returns boolean
language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and private.current_role() is not null and exists(
    select 1 from public.projects p where p.application_id=target and private.has_project_access(p.id));
$$;
revoke all on function private.qa_uses_application(text) from public,anon,authenticated;
grant execute on function private.qa_uses_application(text) to authenticated;
drop policy applications_read on public.applications;
create policy applications_read on public.applications for select to authenticated using(
  private.current_role() is not null and (active or private.is_admin() or private.qa_uses_application(id)));
