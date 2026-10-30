-- Renomear e excluir tags (RF-28, RF-29, RN-19).
-- - renomear_tag: renomeia a tag ou, se o nome novo já é de outra tag do
--   usuário (comparação da RN-05), devolve o conflito; com p_juntar, junta as
--   duas numa transação. Grão de projeto_tags (1 linha por par Missão, tag)
--   preservado: o vínculo repetido é descartado.
-- - excluir: delete direto em tags, só da própria tag e só sem uso (policy).
-- Só acrescenta objetos e privilégios: o código anterior continua no ar
-- durante o deploy, sem etapa contrair.
--
-- Reversão:
--   drop function public.renomear_tag(uuid, text, boolean);
--   drop policy "tags: dono altera" on public.tags;
--   drop policy "tags: dono exclui sem uso" on public.tags;
--   revoke update (nome), delete on table public.tags from authenticated;
--   comment on table public.tags is 'Tags do usuário (RF-24); a primeira grafia cadastrada é a exibida (RN-05).';

create policy "tags: dono altera"
  on public.tags for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- O banco recusa excluir tag em uso mesmo que a tela falhe: o delete
-- simplesmente não alcança a linha (0 linhas afetadas, sem erro).
create policy "tags: dono exclui sem uso"
  on public.tags for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and not exists (select 1 from public.projeto_tags pt where pt.tag_id = tags.id)
  );

-- Privilégios mínimos: o usuário troca só o nome (nunca o dono) e exclui.
grant update (nome) on table public.tags to authenticated;
grant delete on table public.tags to authenticated;

comment on table public.tags is
  'Tags do usuário (RF-24); a primeira grafia cadastrada é a exibida (RN-05), até o dono renomear (RN-19).';

-- Renomeia uma tag do usuário ou a junta com a tag que já tem o nome novo.
-- SECURITY INVOKER: roda sob o RLS de quem chama.
-- Devolve uma linha: resultado ('renomeada' | 'conflito' | 'juntada'),
-- projetos (Missões que tinham a tag p_id) e destino (grafia final; no
-- conflito, a grafia atual da tag existente).
-- Erros: P0002 tag inexistente ou de outro usuário · 23514 nome fora da regra
-- (1 a 30 caracteres sem espaços nas pontas, CHECK da tabela).
create function public.renomear_tag(p_id uuid, p_nome text, p_juntar boolean)
returns table (resultado text, projetos integer, destino text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_nome text := coalesce(btrim(p_nome), '');
  v_projetos integer;
  v_destino_id uuid;
  v_destino_nome text;
begin
  perform 1 from public.tags t
  where t.id = p_id and t.user_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'Tag não encontrada' using errcode = 'P0002';
  end if;

  select count(*)::integer into v_projetos from public.projeto_tags pt where pt.tag_id = p_id;

  select t.id, t.nome into v_destino_id, v_destino_nome
  from public.tags t
  where t.user_id = (select auth.uid())
    and t.nome_normalizado = lower(v_nome)
    and t.id <> p_id
  for update;

  if v_destino_id is null then
    update public.tags t set nome = v_nome where t.id = p_id;
    return query select 'renomeada'::text, v_projetos, v_nome;
    return;
  end if;

  if not coalesce(p_juntar, false) then
    return query select 'conflito'::text, v_projetos, v_destino_nome;
    return;
  end if;

  insert into public.projeto_tags (projeto_id, tag_id)
  select pt.projeto_id, v_destino_id from public.projeto_tags pt where pt.tag_id = p_id
  on conflict do nothing;
  delete from public.projeto_tags pt where pt.tag_id = p_id;
  update public.tags t set nome = v_nome where t.id = v_destino_id;
  delete from public.tags t where t.id = p_id;
  return query select 'juntada'::text, v_projetos, v_nome;
end;
$$;

comment on function public.renomear_tag(uuid, text, boolean) is
  'Renomeia uma tag do usuário; se o nome novo já existe, devolve o conflito ou, com p_juntar, junta as duas (RN-19).';

revoke execute on function public.renomear_tag(uuid, text, boolean) from public, anon;
grant execute on function public.renomear_tag(uuid, text, boolean) to authenticated;
