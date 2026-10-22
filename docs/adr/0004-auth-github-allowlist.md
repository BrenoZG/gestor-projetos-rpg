# ADR-0004: Login via GitHub OAuth com allowlist

- **Status:** aceito
- **Data:** 2026-10-21

## Contexto
Sistema hospedado publicamente, mas de uso exclusivo do dono. O repositório também é público, então a configuração de acesso não pode depender de nada escrito no código.

## Decisão
Supabase Auth com **GitHub OAuth**, cadastro público desativado, e **allowlist de IDs numéricos do GitHub** em variável de ambiente (`ALLOWLIST_GITHUB_IDS`), verificada no middleware. RLS em todas as tabelas como terceira barreira.

## Alternativas consideradas
- **Magic link por e-mail:** sem senha, mas o SMTP gratuito do Supabase tem limite baixo de envio e pede SMTP próprio em produção.
- **E-mail e senha:** exige guardar senha, fluxo de recuperação e proteção contra força bruta, sem benefício para um único usuário.

## Consequências
- Nenhuma senha armazenada; o segundo fator é o da conta GitHub.
- ID numérico (e não username) na allowlist: username pode ser trocado e reaproveitado por outra pessoa; o ID não.
- Com cadastro desativado, o primeiro login do dono em produção exige habilitar o cadastro uma vez e desativá-lo em seguida (procedimento no README a partir do M1).
