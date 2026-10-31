# Gamificação — regras e fórmulas

> Fonte da verdade numérica das RN-06 a RN-13 de [`requisitos.md`](requisitos.md). Os valores vivem num **único módulo de configuração** do domínio (`src/dominio/gamificacao/xp.ts`, desde o M3). Os números desta página foram calculados pela mesma fórmula, não digitados à mão.

## 1. Rank do Projeto — RN-14

O sistema calcula o Rank; o usuário não declara dificuldade (desde o M1c, `src/dominio/missoes/rank.ts`).

```
pontos = estilo + 5 × capacidades distintas + 2 × min(stacks, 10)      (0 a 80)
```

| Estilo arquitetural | Pontos |
|---|---|
| Script ou automação | 0 |
| Monolito | 5 |
| Monolito modular | 10 |
| Hexagonal / Clean | 12 |
| Serverless | 12 |
| Orientado a eventos | 16 |
| Microsserviços | 20 |

Capacidades, 5 pontos cada (até 8): Autenticação · Banco de dados · Integração com API externa · Tempo real · Filas e processamento assíncrono · IA ou machine learning · CI/CD e deploy · App mobile.

| Rank | Pontos |
|---|---|
| E | < 15 |
| D | 15–29 |
| C | 30–44 |
| B | 45–59 |
| A | 60–69 |
| S | ≥ 70 |

Só as 10 primeiras stacks pontuam: sem teto, cadastrar 40 tags viraria atalho de Rank. Marcar capacidades que o Projeto não tem infla o próprio Rank (e, a partir do M3, o próprio XP): num app de um usuário só, o risco é aceito.

| Exemplo | Pontos | Rank |
|---|---|---|
| Script, nenhuma capacidade, 7 stacks | 14 | E |
| Script, 1 capacidade, 5 stacks | 15 | D |
| Monolito, 4 capacidades, 6 stacks | 37 | C |
| Microsserviços, 3 capacidades, 5 stacks | 45 | B |
| Microsserviços, 6 capacidades, 5 stacks | 60 | A |
| Microsserviços, 6 capacidades, 10 stacks | 70 | S |

## 2. XP por evento

| Evento | XP | Observação |
|---|---|---|
| Criar Projeto | 10 | Revogado se o Projeto for excluído sem XP de conclusão |
| Criar Atualização | 5 | Revogado se a Atualização for excluída sem XP de conclusão |
| Concluir Atualização | E 15 · D 20 · C 25 · B 30 · A 35 · S 40 | Pelo Rank do Projeto no momento da conclusão |
| Concluir Projeto | `base × (1 + 0,03 × min(atualizações concluídas, 20))` | Exige 24 h em Desenvolvimento (RN-06d) |

Base por Rank: **E 40 · D 60 · C 90 · B 130 · A 180 · S 250**. Resultado arredondado ao inteiro mais próximo, meio para cima (RN-13). A conta é feita em inteiros (centésimos): em ponto flutuante, `90 × 1,15` dá `103,4999…` e arredondaria para baixo.

| Exemplo de conclusão de Projeto | XP |
|---|---|
| Rank E, 0 atualizações | 40 |
| Rank C, 5 atualizações | 104 (90 × 1,15 = 103,5) |
| Rank B, 7 atualizações | 157 |
| Rank S, 20 ou mais atualizações (teto) | 400 |

### Permanência (ledger)
- Cada par `(item, tipo de evento)` gera **no máximo um** evento. Reconcluir não rende XP de novo, e a tela avisa que o XP já foi recebido, em vez de pedir outras 24 h.
- XP de conclusão nunca é removido: excluir ou reabrir o item não o afeta.
- XP de criação é removido na exclusão **somente** se o item não tem evento de conclusão.
- Consequência aceita (ADR-0002): mudar uma fórmula afeta apenas eventos futuros.

## 3. Nível do personagem

```
limiar(n) = arredondar(20 × (n − 1)^1,5)
nível = maior n em 1..100 tal que XP total ≥ limiar(n)
```

| Nível | XP total | Medalha | Título |
|---|---|---|---|
| 1 | 0 | — | Estagiário |
| 2 · 3 · 4 · 5 | 20 · 57 · 104 · 160 | — | Estagiário |
| 10 | 540 | I · Bronze | Desenvolvedor Iniciante |
| 20 | 1.656 | II · Prata | Desenvolvedor Aprendiz |
| 30 | 3.123 | III · Ouro | Desenvolvedor Júnior |
| 40 | 4.871 | IV · Platina | Desenvolvedor Júnior Avançado |
| 50 | 6.860 | V · Esmeralda | Desenvolvedor Pleno |
| 60 | 9.064 | VI · Safira | Desenvolvedor Pleno Avançado |
| 70 | 11.463 | VII · Rubi | Especialista |
| 80 | 14.043 | VIII · Diamante | Arquiteto |
| 90 | 16.792 | IX · Mítica | Mestre |
| 100 | 19.701 | X · Lendária | Desenvolvedor Sênior (máximo) |

O título vale do nível da medalha até o nível anterior à próxima. Medalhas são permanentes (RN-08).

**Calibração:** com ritmo estimado de ~1,5 Projeto e ~10 Atualizações concluídos por mês, o Nv 100 chega em cerca de 3 anos. A curva é côncava: o começo é rápido para motivar, e o fim é mais conquistado.

## 4. Rank do Aventureiro

| Rank | Níveis | Títulos dentro da faixa |
|---|---|---|
| E | 1–19 | Estagiário · Iniciante |
| D | 20–29 | Aprendiz |
| C | 30–49 | Júnior · Júnior Avançado |
| B | 50–69 | Pleno · Pleno Avançado |
| A | 70–89 | Especialista · Arquiteto |
| S | 90–100 | Mestre · Sênior |

## 5. Maestria por stack

```
XP da stack = soma do XP de conclusão de Projetos cujo snapshot de stacks contém a stack
nível da stack = mesma curva da seção 3, com máximo 50
```

| XP da stack | Nível |
|---|---|
| 150 (1 projeto) | 4 |
| 1.500 (~10 projetos) | 18 |
| 3.750 (~25 projetos) | 33 |
| 6.860 ou mais (~45 projetos) | 50 (máximo) |

> **Grão:** o XP de um Projeto conta **integralmente para cada uma** das stacks dele. Por isso a soma da Maestria de todas as stacks é maior que o XP do personagem. Isso é intencional, não é contagem duplicada por erro: a pergunta respondida é "quanto progresso houve usando esta stack", não "como o XP se divide entre stacks".

## 6. Classe

A Classe é identidade visual e não entra em nenhuma fórmula desta página (RN-11).

## 7. Trilha Produtividade (Projetos Gerais) — RN-18, a partir do M3

Os Projetos Gerais (RN-15) não têm Rank e rendem XP numa trilha separada, para o esforço fora da programação aparecer sem misturar com a evolução como desenvolvedor. Cada evento do ledger guarda a trilha em que nasceu; trocar o tipo do Projeto depois não move o XP (RN-16).

| Evento (Geral) | XP |
|---|---|
| Criar Projeto | 10 (revogado como na trilha Desenvolvedor) |
| Criar Atualização | 5 (idem) |
| Concluir Atualização | 20 |
| Concluir Projeto | `60 × (1 + 0,03 × min(Atualizações concluídas, 20))`, de 60 a 96; exige 24 h em Desenvolvimento (RN-06d) |

Sem Rank, o tamanho do Projeto aparece pelo progresso registrado: mais Atualizações concluídas, mais XP. O teto de 20 limita picar Atualizações só para pontuar.

- **Nível de Produtividade:** a mesma curva da §3 (1 a 100), **sem** medalha, título nem Rank. Mede conclusões registradas, não produtividade real.
- **Domínio por ferramenta:** a regra da §5 aplicada às conclusões de Projetos Gerais (máximo nível 50). O mesmo grão: o XP de um Projeto conta inteiro para cada ferramenta dele.
