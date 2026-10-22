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
