-- Ledger de XP (M3, ADR-0002), etapa CONTRAIR (docs/operacao.md §4). O código
-- no ar desde a v0.8.0 grava só pela salvar_missao_v4 (com o XP de criação):
-- a v3 sai. Voltar o app para antes da v0.8.0 exige a reversão abaixo.
--
-- Reversão: recriar a salvar_missao_v3 (o create function, o comment, o
-- revoke e o grant) a partir da migration tipos_tags_links, numa migration
-- nova. Ela grava sem XP, como gravava antes do M3.

drop function public.salvar_missao_v3(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb);
