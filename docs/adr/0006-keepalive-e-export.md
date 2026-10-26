# ADR-0006: Keepalive diário e export JSON como backup

- **Status:** aceito
- **Data:** 2026-10-21

## Contexto
No plano gratuito do Supabase, segundo fontes de terceiros consultadas (não a documentação oficial), o projeto é **pausado após cerca de 7 dias sem requisições** e **não há backup automático** nem recuperação point-in-time. Um sistema pessoal pode ficar uma semana sem uso.

## Decisão
- **Keepalive:** Vercel Cron diário chama `/api/manutencao/keepalive`, protegido por `CRON_SECRET`, que executa uma consulta mínima.
- **Backup:** exportação de todos os dados do usuário em JSON (RF-14), sob demanda.

## Alternativas consideradas
- **Plano pago do Supabase:** resolve os dois pontos, com custo mensal fixo para um sistema pessoal.
- **Backup automático commitado no repositório:** descartado; o repositório é público e os dados reais iriam junto.
- **GitHub Actions como keepalive:** workflows agendados em repositório público são desativados após 60 dias sem atividade no repositório.

## Consequências
- Disponibilidade sem SLA: aceita para uso pessoal.
- O backup depende de o dono exportar periodicamente.
- Revalidar a política de pausa e o limite de cron do plano Hobby da Vercel na documentação oficial no M6, antes de depender deles.

## Atualização (2026-10-26, M1b): keepalive pelo `/api/saude`
Revalidado na documentação oficial antes de depender dele, como pedia a consequência acima:
- Supabase: projetos do plano Free são pausados com **baixa atividade no banco ao longo de 7 dias**; "algumas requisições por dia" bastam para evitar a pausa ([Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)).
- Vercel Hobby: cada cron roda **no máximo uma vez por dia**, com precisão de ±59 min, até 100 crons por projeto; crons **não seguem redirecionamentos** ([Usage & Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)).

**Decisão revista:** três crons diários (`0 3`, `0 11` e `0 19` UTC, no `vercel.json`) chamam o `/api/saude`, que já é público, já consulta o banco pela função `verificar_saude` e já tem limite de 3 s. A rota `/api/manutencao/keepalive` e o `CRON_SECRET` deixam de existir.

- **Por que não a rota protegida:** como os crons não seguem redirecionamento, a rota teria de ser pública no proxy de qualquer forma; o segredo só protegeria uma consulta que não lê dado nenhum e que o `/api/saude` já expõe. É uma rota e um segredo a menos para manter e trocar.
- **Por que três horários:** um cron por dia deixaria uma única requisição diária, no limite do "algumas". Três dão folga, e uma falha isolada (a Vercel não repete invocações) não chega perto dos 7 dias.
- **Como conferir:** Vercel → projeto → Settings → Cron Jobs lista os três; os logs de execução mostram `GET /api/saude 200`.
