# Especificação de Requisitos — Gestor de Projetos

> Versão 1.0 · baseline da v1. Mudanças de requisito atualizam este documento **e** a matriz de rastreabilidade no fim.

## 1. Objetivo

Registrar todo projeto pessoal e toda atualização de projeto num lugar só, para que nenhuma ideia fique apenas "na cabeça". A progressão estilo RPG (XP, níveis, medalhas, Ranks) existe para **motivar a conclusão**, não para substituir o registro.

- **Usuário:** um único (o dono do sistema). Não há multiusuário na v1.
- **Medida de sucesso:** o sistema ser a fonte única dos projetos do dono. Não é medível automaticamente; o sinal prático é o uso contínuo.

## 2. Glossário

| Termo | Significado |
|---|---|
| **Missão** | Sinônimo de **Projeto** na interface. |
| **Atualização** | Melhoria, correção ou implementação nova dentro de um Projeto existente. Sempre vinculada a um Projeto. |
| **Ideia** | Não é entidade: uma ideia é um Projeto (ou Atualização) em status `Backlog`. |
| **Dificuldade** | Valor declarado de 1 (Trivial) a 5 (Extremo) no cadastro do Projeto. |
| **Rank de Missão** | Letra E–S calculada a partir da dificuldade e da quantidade de stacks do Projeto. |
| **Rank do Caçador** | Letra E–S do personagem, derivada do nível. Independe do Rank de Missão. |
| **XP** | Pontos de experiência. Concedidos por eventos registrados no ledger. |
| **Ledger de XP** | Registro permanente e append-only de cada ganho de XP. |
| **Medalha / Título** | Conquista a cada 10 níveis; cada medalha traz um título novo. |
| **Maestria** | Nível por stack, derivado do XP dos projetos concluídos que usam a stack. |
| **Classe** | Identidade do personagem (ex.: Arquimago de Dados). Puramente visual. |

## 3. Entidades e campos

### Projeto
| Campo | Regra |
|---|---|
| Nome | Obrigatório, 3–80 caracteres, **único por usuário** sem diferenciar maiúscula/minúscula e ignorando espaços nas pontas. |
| Descrição | Obrigatória, 1–2.000 caracteres. |
| Estrutura / arquitetura | Opcional, Markdown, até 20.000 caracteres. |
| Stacks | 1 a 20 tags. |
| Dificuldade | Obrigatória, inteiro de 1 a 5. |
| Status | `Backlog` · `Desenvolvimento` · `Concluído`. Padrão: `Backlog`. |
| Datas (automáticas) | Criação · última edição · ingresso mais recente em `Desenvolvimento` · conclusão. |

### Atualização
| Campo | Regra |
|---|---|
| Projeto | Obrigatório. |
| Título | Obrigatório, 3–120 caracteres. |
| Descrição | Obrigatória, 1–5.000 caracteres, Markdown. Descreve o que foi feito. |
| Status | `Backlog` · `Desenvolvimento` · `Concluído`. Padrão: `Backlog`. |
| Datas (automáticas) | Criação · última edição · conclusão. |

### Personagem
| Campo | Regra |
|---|---|
| Classe | Uma das 8 classes da seção 6. Vazia até a primeira escolha. |
| Nível máximo alcançado | Mantido pelo sistema; garante medalhas permanentes. |
| Última medalha vista | Mantido pelo sistema; garante que a animação de conquista toque uma única vez. |

## 4. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF-01 | O sistema deve permitir ao usuário autenticado cadastrar um Projeto. | Must |
| RF-02 | O sistema deve listar os Projetos do usuário. | Must |
| RF-03 | O sistema deve permitir editar um Projeto. | Must |
| RF-04 | O sistema deve permitir excluir um Projeto, conforme RN-04. | Must |
| RF-05 | O sistema deve permitir cadastrar uma Atualização vinculada a um Projeto. | Must |
| RF-06 | O sistema deve listar as Atualizações de um Projeto. | Must |
| RF-07 | O sistema deve permitir editar uma Atualização, inclusive o Projeto vinculado. | Must |
| RF-08 | O sistema deve permitir excluir uma Atualização. | Must |
| RF-09 | O sistema deve exibir, na página do Projeto, a linha do tempo das Atualizações em ordem cronológica decrescente. | Must |
| RF-10 | O sistema deve filtrar Projetos e Atualizações por status, e Atualizações também por Projeto. | Should |
| RF-11 | O sistema deve buscar Projetos por trecho do nome e por stack. | Should |
| RF-12 | O sistema deve exibir XP total, nível, título, Rank do Caçador e progresso até o próximo nível. | Must |
| RF-13 | O sistema deve permitir acesso apenas a contas GitHub presentes na allowlist. | Must |
| RF-14 | O sistema deve exportar todos os dados do usuário em um arquivo JSON. | Must |
| RF-15 | O sistema deve exibir as medalhas conquistadas e bloqueadas. | Must |
| RF-16 | O sistema deve exibir a animação de conquista ao subir de nível e ao ganhar medalha, conforme RN-08. | Should |
| RF-17 | O sistema deve exigir a escolha de uma Classe no primeiro acesso, antes de exibir o Quadro de Missões. | Must |
| RF-18 | O sistema deve permitir trocar de Classe a qualquer momento pela Ficha do Personagem. | Should |
| RF-19 | O sistema deve exibir a Ficha do Personagem, acessível pelo menu e pela tecla `C`, conforme RN-12. | Must |

## 5. Regras de negócio

| ID | Regra |
|---|---|
| RN-01 | Uma Atualização pertence a exatamente um Projeto. O vínculo pode ser alterado para outro Projeto do mesmo usuário. |
| RN-02 | Qualquer transição entre status é permitida. Entrar em `Concluído` grava a data de conclusão; sair de `Concluído` apaga essa data. Entrar em `Desenvolvimento` grava a data de ingresso (sobrescreve a anterior). |
| RN-03 | Um Projeto `Concluído` aceita novas Atualizações e **não** é reaberto automaticamente por isso. |
| RN-04 | Excluir um Projeto exclui suas Atualizações. A interface pede confirmação exibindo a quantidade de Atualizações que serão excluídas. |
| RN-05 | Stacks são normalizadas para comparação: sem espaços nas pontas, sem diferenciar maiúscula/minúscula. A primeira grafia cadastrada é a exibida. |
| RN-06 | XP é registrado no ledger, conforme `docs/gamificacao.md`: (a) cada tipo de evento é concedido no máximo **uma vez por item**; (b) XP de conclusão é **permanente**, mesmo que o item seja excluído ou reaberto depois; (c) XP de criação é **revogado** se o item for excluído sem ter recebido XP de conclusão; (d) XP de conclusão de **Projeto** só é concedido se o Projeto estiver há **24 horas ou mais** em `Desenvolvimento`, contadas do ingresso mais recente. Conclusão que não cumpre a trava não registra evento, e uma conclusão futura que cumpra ainda pode conceder o XP. |
| RN-07 | Nível é o maior `n` (1 a 100) tal que `XP total ≥ arredondar(20 × (n − 1)^1,5)`. |
| RN-08 | Medalha e título são concedidos ao alcançar os níveis 10, 20, …, 100 e são **permanentes**. A animação de cada medalha toca uma única vez. |
| RN-09 | Rank do Caçador por faixa de nível: E 1–19 · D 20–29 · C 30–49 · B 50–69 · A 70–89 · S 90–100. Independe do Rank de Missão: um personagem de qualquer Rank pode cadastrar missão de qualquer Rank. |
| RN-10 | Maestria de uma stack = soma do XP de **conclusão de Projetos** cuja lista de stacks (no momento da conclusão) contém a stack. Nível pela mesma curva da RN-07, com **máximo no nível 50**. Atualizações não contam. |
| RN-11 | A Classe é identidade visual. **Não** altera XP, nível, Rank ou Maestria. A troca é livre e sem custo. |
| RN-12 | O atalho de teclado `C` abre a Ficha e `Esc` fecha. O atalho é ignorado com foco em campo de texto e pode ser desligado pelo usuário (WCAG 2.1.4). |
| RN-13 | Valores de XP são inteiros, arredondados ao inteiro mais próximo (meio para cima). |

## 6. Classes

| Chave | Nome | Área |
|---|---|---|
| `arquimago_dados` | Arquimago de Dados | Dados, BI, engenharia e análise de dados |
| `guerreiro_backend` | Guerreiro do Backend | APIs, servidores, banco de dados |
| `arqueiro_frontend` | Arqueiro do Frontend | Interfaces web |
| `lamina_arcana_fullstack` | Lâmina Arcana Full Stack | Full stack |
| `paladino_devops` | Paladino DevOps | Infraestrutura, CI/CD, cloud, SRE |
| `sombra_seguranca` | Sombra da Segurança | Segurança de aplicações, pentest |
| `invocador_ia` | Invocador de IA | IA, machine learning, LLMs |
| `bardo_experiencia` | Bardo da Experiência | UI/UX, design de produto |

## 7. Requisitos não funcionais

| ID | Categoria | Requisito |
|---|---|---|
| RNF-01 | Segurança | Toda rota exige autenticação. Cadastro público desativado. Acesso validado em três camadas: provedor (cadastro fechado), aplicação (allowlist por ID do GitHub) e banco (RLS `user_id = auth.uid()` em todas as tabelas). |
| RNF-02 | Acessibilidade | WCAG 2.1 nível AA. Com `prefers-reduced-motion`, toda animação exibe diretamente o estado final. |
| RNF-03 | Responsividade | Todas as funcionalidades utilizáveis a partir de 360 px de largura, sem rolagem horizontal. |
| RNF-04 | Desempenho | Listagem de Projetos em até 1 s no p95, com até 500 Projetos e 5.000 Atualizações. |
| RNF-05 | Datas | Armazenamento em UTC (`timestamptz`); exibição no fuso `America/Sao_Paulo`. |
| RNF-06 | Privacidade | Nenhum dado pessoal em log. Repositório público contém apenas dados fictícios. |
| RNF-07 | Disponibilidade | Sem SLA (plano gratuito). Mitigações: keepalive diário contra a pausa por inatividade e export JSON como backup (ADR-0006). |

## 8. Critérios de aceite (RN-06)

```gherkin
Cenário: concluir projeto após a trava
  Dado um Projeto Rank B, em Desenvolvimento há 25 horas, com 7 Atualizações concluídas
  Quando o usuário o marca como Concluído
  Então o ledger registra 157 XP de conclusão para o Projeto

Cenário: reconcluir não duplica XP
  Dado um Projeto que já recebeu XP de conclusão
  Quando o usuário o reabre e o conclui novamente
  Então nenhum novo evento de conclusão é registrado

Cenário: excluir projeto concluído preserva XP
  Dado um Projeto que já recebeu XP de criação e de conclusão
  Quando o usuário o exclui
  Então o XP total do personagem não diminui

Cenário: excluir projeto não concluído revoga XP de criação
  Dado um Projeto em Backlog que concedeu 10 XP de criação
  Quando o usuário o exclui
  Então o XP total do personagem diminui em 10

Cenário: concluir antes da trava não concede XP
  Dado um Projeto em Desenvolvimento há 2 horas
  Quando o usuário o marca como Concluído
  Então o status muda para Concluído
  E nenhum evento de conclusão é registrado
  E a interface informa que a recompensa exige 24 h em Desenvolvimento
```

## 9. Fora de escopo (v1)

Ideia como entidade própria · multiusuário e compartilhamento · Kanban com arrastar · conquistas além de medalhas · anexos e imagens · notificações · integração com GitHub (além do login) · uso offline · tema claro · bônus de Classe.

## 10. Questões em aberto

Nenhuma no fechamento da baseline 1.0.

## 11. Rastreabilidade

| Requisito | Marco | Verificação |
|---|---|---|
| RF-01..04, RF-13, RN-04, RN-05 | M1 | E2E + integração (RLS) |
| RF-05..11, RN-01..03 | M2 | E2E |
| RF-12, RN-06, RN-07, RN-09, RN-10, RN-13 | M3 | Unitário (domínio) + integração (função atômica) |
| RF-15, RF-17, RF-18, RN-11 | M4 | E2E |
| RF-16, RF-19, RN-08, RN-12 | M5 | E2E + axe |
| RF-14, RNF-07 | M6 | Integração |
| RNF-01..06 | Todos | CI + revisão |
