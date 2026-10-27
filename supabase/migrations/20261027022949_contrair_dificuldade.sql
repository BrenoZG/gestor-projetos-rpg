-- RN-14, etapa CONTRAIR (docs/operacao.md §4). O código no ar desde o deploy
-- da migration rank_por_arquitetura já não lê a dificuldade nem chama a
-- salvar_missao: as duas saem, e a arquitetura vira obrigatória no banco.
--
-- Reversão (a dificuldade volta vazia; o valor antigo não é recuperável):
--   alter table public.projetos alter column arquitetura drop not null;
--   alter table public.projetos drop constraint projetos_arquitetura_tamanho,
--     add constraint projetos_arquitetura_tamanho check (char_length(arquitetura) <= 20000);
--   alter table public.projetos add column dificuldade smallint
--     constraint projetos_dificuldade_faixa check (dificuldade between 1 and 5);
--   grant insert (dificuldade), update (dificuldade) on table public.projetos to authenticated;
--   e recriar a salvar_missao a partir da migration criar_missoes.

-- Pré-condição: nenhuma Missão sem arquitetura. Se houver, a migration para
-- aqui (e a transação desfaz tudo), em vez de inventar um texto.
do $$
begin
  if exists (select 1 from public.projetos where arquitetura is null or btrim(arquitetura) = '') then
    raise exception 'Há Missões sem estrutura e arquitetura; preencha-as antes desta migration'
      using errcode = '23514';
  end if;
end;
$$;

drop function public.salvar_missao(uuid, text, text, text, smallint, text, text[]);

-- O CHECK da faixa e os privilégios de coluna saem junto com a coluna.
alter table public.projetos drop column dificuldade;

alter table public.projetos
  alter column arquitetura set not null,
  drop constraint projetos_arquitetura_tamanho,
  add constraint projetos_arquitetura_tamanho
    check (char_length(arquitetura) <= 20000 and btrim(arquitetura) <> '');

comment on column public.projetos.arquitetura is 'Estrutura e arquitetura da Missão em Markdown, obrigatória (RN-14).';
