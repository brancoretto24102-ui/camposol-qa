-- Política explícita de denegación. Los contadores solo se modifican mediante
-- el comando privado que comprueba identidad, proyecto, versión y cuotas.
create policy qa_ai_usage_no_client_access on private.qa_ai_usage as restrictive
  for all to anon,authenticated using(false) with check(false);
