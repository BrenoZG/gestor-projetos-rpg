-- M6: export JSON de todos os dados do usuário (RF-14, backup do ADR-0006).
-- - Um único valor jsonb: a Data API corta cada consulta em `max_rows` (1.000)
--   linhas, e o ledger de XP passa disso com o uso; um valor só não é cortado.
-- - Um único comando SQL: todas as subconsultas leem a mesma foto do banco,
--   então nenhum vínculo aponta para uma stack ou tag que ficou de fora.
-- - Cada tabela sai pela linha inteira, menos `user_id` (a conta não vai no
--   arquivo, LGPD) e `nome_normalizado` (coluna gerada). O teste pgTAP prende o
--   conjunto de chaves: coluna nova muda o formato e passa por decisão.
-- - SECURITY INVOKER: roda sob o RLS de quem chama; o filtro por auth.uid()
--   repete a regra de propósito (e usa os índices por user_id).
-- Só expande: nada usa esta função antes do deploy do código do M6.
--
-- Reversão:
--   drop function public.exportar_dados();

create function public.exportar_dados()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with projetos_do_usuario as (
    select p.id from public.projetos p where p.user_id = (select auth.uid())
  )
  select jsonb_build_object(
    'personagem', (
      select to_jsonb(pe) - 'user_id'
      from public.personagem pe
      where pe.user_id = (select auth.uid())
    ),
    'projetos', coalesce((
      select jsonb_agg(to_jsonb(p) - 'user_id' - 'nome_normalizado' order by p.criado_em, p.id)
      from public.projetos p
      where p.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'stacks', coalesce((
      select jsonb_agg(to_jsonb(s) - 'user_id' - 'nome_normalizado' order by s.criado_em, s.id)
      from public.stacks s
      where s.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'projeto_stacks', coalesce((
      select jsonb_agg(to_jsonb(ps) order by ps.projeto_id, ps.stack_id)
      from public.projeto_stacks ps
      where ps.projeto_id in (select id from projetos_do_usuario)
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(to_jsonb(t) - 'user_id' - 'nome_normalizado' order by t.criado_em, t.id)
      from public.tags t
      where t.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'projeto_tags', coalesce((
      select jsonb_agg(to_jsonb(pt) order by pt.projeto_id, pt.tag_id)
      from public.projeto_tags pt
      where pt.projeto_id in (select id from projetos_do_usuario)
    ), '[]'::jsonb),
    'projeto_links', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.projeto_id, l.ordem)
      from public.projeto_links l
      where l.projeto_id in (select id from projetos_do_usuario)
    ), '[]'::jsonb),
    'atualizacoes', coalesce((
      select jsonb_agg(to_jsonb(a) - 'user_id' order by a.criado_em, a.id)
      from public.atualizacoes a
      where a.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'eventos_xp', coalesce((
      select jsonb_agg(to_jsonb(e) - 'user_id' order by e.criado_em, e.id)
      from public.eventos_xp e
      where e.user_id = (select auth.uid())
    ), '[]'::jsonb)
  );
$$;

comment on function public.exportar_dados() is
  'Todos os dados do usuário logado num jsonb, uma lista por tabela, sem user_id nem colunas geradas (RF-14).';

revoke execute on function public.exportar_dados() from public, anon;
grant execute on function public.exportar_dados() to authenticated;
