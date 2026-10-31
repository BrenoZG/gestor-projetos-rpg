# Especificação de Requisitos — Gestor de Projetos

> Versão 1.7 · baseline da v1. Mudanças de requisito atualizam este documento **e** a matriz de rastreabilidade no fim.
>
> **1.7 (2026-10-31, M3):** o HUD mostra também a trilha Produtividade (nível e progresso), só quando ela tem XP (RF-12, RN-18); a revogação do XP de criação vale para as Atualizações excluídas junto com o Projeto (RN-06c); ao concluir, a interface informa o XP ganho ou por que não houve XP; a Maestria e o Domínio são calculados e exibidos no M5, e o M3 grava o snapshot das stacks e ferramentas na conclusão (RN-10). Origem: proposta do M3 aprovada pelo dono.
>
> **1.6 (2026-10-31, antes do M3):** vocabulário da interface — "Missão" passa a ser "Projeto" e "Rank do Caçador" passa a ser "Rank do Aventureiro" (o Rank de Missão vira Rank do Projeto). Só nomes mudam: nenhuma regra, RF ou RN muda de sentido. No código e no banco o nome continua "Missão" (glossário). Origem: pedido do dono.
>
> **1.5 (2026-10-30, antes do M3):** página Tags com a quantidade de Projetos de cada tag (RF-27), renomear tag (RF-28) e excluir tag sem uso (RF-29); renomear para um nome que já existe junta as tags, depois de confirmação (RN-19). Sai do fora de escopo "renomear ou excluir tags"; entra "excluir tag em uso". Origem: pedido do dono, para corrigir tags digitadas errado.
>
> **1.4 (2026-10-29, antes do M3):** o Projeto ganha tipo — Desenvolvimento (tudo como antes) ou Geral (sem parte técnica e sem Rank, com ferramentas opcionais) (RF-23, RN-15, RN-16, ADR-0010); tags criadas pelo usuário (RF-24); links de referência (RF-26, RN-17); filtros por tipo e por tag (RF-25); a edição deixa de mudar o status, que muda pelo Quadro e pela ficha (RF-03); a trilha de XP Produtividade para os projetos Gerais fica especificada para o M3 (RN-18). Origem: pedido do dono, para gerir ideias fora da programação (revenda, vídeos, marketing, serviços).
>
> **1.3 (M2, 2026-10-28):** as Atualizações ficam na ficha da Missão, depois dos dados e antes de editar e excluir (RF-09, com o histórico pela data de criação); a página geral de Atualizações só consulta e muda status (RF-10); o RF-11 e a parte "Projetos por status" do RF-10 ficam atendidos pelo Quadro do M1c.
>
> **1.2 (M1c, 2026-10-27):** a dificuldade declarada sai; o Rank de Missão passa a ser calculado pelo estilo arquitetural, pelas capacidades e pelas stacks (RN-14); a estrutura/arquitetura vira obrigatória; mover Missões arrastando ou pelo botão (RF-20), filtros (RF-21) e visão Lista (RF-22) entram no escopo, e o "Kanban com arrastar" sai do fora de escopo. Origem: teste do dono em produção, em 26/10.
>
> **1.1 (M1b, 2026-10-26):** nome de stack limitado a 40 caracteres; rótulos das dificuldades intermediárias; RN-02 (status) e o keepalive (RNF-07) antecipados para o M1b.

## 1. Objetivo

Registrar todo projeto pessoal e toda atualização de projeto num lugar só, para que nenhuma ideia fique apenas "na cabeça". A progressão estilo RPG (XP, níveis, medalhas, Ranks) existe para **motivar a conclusão**, não para substituir o registro.

- **Usuário:** um único (o dono do sistema). Não há multiusuário na v1.
- **Medida de sucesso:** o sistema ser a fonte única dos projetos do dono. Não é medível automaticamente; o sinal prático é o uso contínuo.

## 2. Glossário

| Termo | Significado |
|---|---|
| **Projeto** | O que o dono cadastra e acompanha no Quadro, de dois tipos (abaixo). É o nome usado na interface. No código e no banco continua **Missão** (tabela `missoes`, rota `/missoes`, `salvar_missao_v4`). |
| **Tipo de Projeto** | **Desenvolvimento**: o resultado principal é código que o dono escreve e mantém (site, SaaS, app, automação, pipeline). **Geral**: o resultado principal é outra coisa (venda, conteúdo, serviço, aprendizado); código, se houver, é ferramenta de apoio. |
| **Ferramenta** | O que um Projeto Geral usa para ser feito (ex.: Canva, CapCut). Mesmo cadastro das stacks; muda o rótulo. |
| **Tag** | Etiqueta livre, criada pelo dono, para organizar e filtrar Projetos de qualquer tipo (ex.: Revenda, IA). Não muda regra nenhuma. |
| **Link de referência** | Endereço `https` guardado no Projeto como lembrete (Google Drive, página, vídeo do YouTube ou do Instagram). O sistema nunca o abre. |
| **Atualização** | Melhoria, correção ou implementação nova dentro de um Projeto existente. Sempre vinculada a um Projeto. |
| **Ideia** | Não é entidade: uma ideia é um Projeto (ou Atualização) em status `Backlog`. |
| **Estilo arquitetural** | Como o Projeto se organiza: Script ou automação, Monolito, Monolito modular, Hexagonal / Clean, Serverless, Orientado a eventos ou Microsserviços. |
| **Capacidade** | O que o Projeto entrega além do código de negócio: Autenticação, Banco de dados, Integração com API externa, Tempo real, Filas e processamento assíncrono, IA ou machine learning, CI/CD e deploy, App mobile. |
| **Rank do Projeto** | Letra E–S calculada pelo sistema a partir do estilo arquitetural, das capacidades e da quantidade de stacks do Projeto (RN-14). É a dificuldade do Projeto. |
| **Rank do Aventureiro** | Letra E–S do personagem, derivada do nível. Independe do Rank do Projeto. |
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
| Tipo | Obrigatório: `Desenvolvimento` ou `Geral` (RN-15). Projetos anteriores à 1.4 são `Desenvolvimento`. |
| Descrição | Obrigatória, 1–2.000 caracteres. |
| Estrutura / arquitetura | Só em Desenvolvimento: obrigatória, Markdown, 1–20.000 caracteres (só espaços não vale). |
| Estilo arquitetural | Só em Desenvolvimento: obrigatório, um da lista do glossário. |
| Capacidades | Só em Desenvolvimento: 0 a 8, da lista do glossário, sem repetição. |
| Stacks / ferramentas | Desenvolvimento: 1 a 20 stacks. Geral: 0 a 20 ferramentas. Cada nome com 1 a 40 caracteres; na digitação, a vírgula separa os nomes. |
| Tags | 0 a 10, cada uma com 1 a 30 caracteres, sem repetição (mesma regra da RN-05). |
| Links de referência | 0 a 20, conforme RN-17, cada um com título opcional de até 80 caracteres. |
| Status | `Backlog` · `Desenvolvimento` · `Concluído`. Padrão: `Backlog`. Escolhido no cadastro; depois, muda pelo Quadro e pela ficha. |
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
| RF-03 | O sistema deve permitir editar um Projeto, inclusive o tipo (RN-16). A edição não muda o status, que muda pelo Quadro (RF-20) e pela ficha. | Must |
| RF-04 | O sistema deve permitir excluir um Projeto, conforme RN-04. | Must |
| RF-05 | O sistema deve permitir cadastrar uma Atualização vinculada a um Projeto. | Must |
| RF-06 | O sistema deve listar as Atualizações de um Projeto. | Must |
| RF-07 | O sistema deve permitir editar uma Atualização, inclusive o Projeto vinculado. | Must |
| RF-08 | O sistema deve permitir excluir uma Atualização. | Must |
| RF-09 | O sistema deve exibir, no fim da página do Projeto (antes de editar e excluir), o histórico das Atualizações em ordem decrescente de **data de criação**, com registro, edição, exclusão e mudança de status ali mesmo. | Must |
| RF-10 | O sistema deve filtrar Projetos e Atualizações por status, e Atualizações também por Projeto. | Should |
| RF-11 | O sistema deve buscar Projetos por trecho do nome e por stack. | Should |
| RF-12 | O sistema deve exibir XP total, nível, título, Rank do Aventureiro e progresso até o próximo nível e, quando a trilha Produtividade tiver XP, o nível e o progresso dela (RN-18). | Must |
| RF-13 | O sistema deve permitir acesso apenas a contas GitHub presentes na allowlist. | Must |
| RF-14 | O sistema deve exportar todos os dados do usuário em um arquivo JSON. | Must |
| RF-15 | O sistema deve exibir as medalhas conquistadas e bloqueadas. | Must |
| RF-16 | O sistema deve exibir a animação de conquista ao subir de nível e ao ganhar medalha, conforme RN-08. | Should |
| RF-17 | O sistema deve exigir a escolha de uma Classe no primeiro acesso, antes de exibir o Quadro de Projetos. | Must |
| RF-18 | O sistema deve permitir trocar de Classe a qualquer momento pela Ficha do Personagem. | Should |
| RF-19 | O sistema deve exibir a Ficha do Personagem, acessível pelo menu e pela tecla `C`, conforme RN-12. | Must |
| RF-20 | O sistema deve permitir mover um Projeto entre as colunas do Quadro sem abrir a edição: arrastando o cartão (mouse ou toque) ou pelo botão "Mover", que funciona só com o teclado (WCAG 2.5.7), conforme RN-02. | Must |
| RF-21 | O sistema deve filtrar os Projetos do Quadro por texto (no nome e na descrição, sem diferenciar maiúsculas nem acentos), por stack e por Rank do Projeto, com todos os filtros combinados; os filtros ficam na URL. | Should |
| RF-22 | O sistema deve oferecer a visão Lista: uma tabela com todos os Projetos (nome, status, Rank, pontos, stacks e última edição), ordenada pela última edição, mais recente primeiro, com os mesmos filtros do RF-21. | Should |
| RF-23 | O sistema deve permitir cadastrar Projetos do tipo Desenvolvimento ou Geral, conforme RN-15. | Must |
| RF-24 | O sistema deve permitir criar tags durante o cadastro ou a edição de um Projeto e atribuir de 0 a 10 tags a qualquer Projeto. | Should |
| RF-25 | O sistema deve filtrar o Quadro e a visão Lista por tipo e por tag, combinados com os filtros do RF-21 e guardados na URL. | Should |
| RF-26 | O sistema deve permitir cadastrar de 0 a 20 links de referência em qualquer Projeto, conforme RN-17, e exibi-los na ficha com o tipo do endereço (YouTube, Instagram, Google Drive ou página), abrindo numa aba nova. | Should |
| RF-27 | O sistema deve exibir, numa página Tags acessível pelo menu principal, as tags do usuário em ordem alfabética, cada uma com a quantidade de Projetos que a usam; sem tags, a página explica que elas nascem no cadastro ou na edição de um Projeto. | Should |
| RF-28 | O sistema deve permitir renomear uma tag na própria linha da página Tags (Salvar, Cancelar e Esc), com a mesma regra de nome da criação (1 a 30 caracteres, sem espaços nas pontas); o nome novo vale para todos os Projetos que usam a tag, conforme RN-19. | Should |
| RF-29 | O sistema deve permitir excluir, com confirmação, uma tag que nenhum Projeto usa. | Should |

## 5. Regras de negócio

| ID | Regra |
|---|---|
| RN-01 | Uma Atualização pertence a exatamente um Projeto. O vínculo pode ser alterado para outro Projeto do mesmo usuário. |
| RN-02 | Qualquer transição entre status é permitida. Entrar em `Concluído` grava a data de conclusão; sair de `Concluído` apaga essa data. Entrar em `Desenvolvimento` grava a data de ingresso (sobrescreve a anterior). |
| RN-03 | Um Projeto `Concluído` aceita novas Atualizações e **não** é reaberto automaticamente por isso. |
| RN-04 | Excluir um Projeto exclui suas Atualizações. A interface pede confirmação exibindo a quantidade de Atualizações que serão excluídas. |
| RN-05 | Stacks são normalizadas para comparação: sem espaços nas pontas, sem diferenciar maiúscula/minúscula. A primeira grafia cadastrada é a exibida. A mesma regra vale para ferramentas e tags; para tags, renomear (RN-19) troca a grafia exibida. |
| RN-06 | XP é registrado no ledger, conforme `docs/gamificacao.md`: (a) cada tipo de evento é concedido no máximo **uma vez por item**; (b) XP de conclusão é **permanente**, mesmo que o item seja excluído ou reaberto depois; (c) XP de criação é **revogado** se o item for excluído sem ter recebido XP de conclusão, inclusive as Atualizações excluídas junto com o Projeto (RN-04); (d) XP de conclusão de **Projeto** só é concedido se o Projeto estiver há **24 horas ou mais** em `Desenvolvimento`, contadas do ingresso mais recente. Conclusão que não cumpre a trava não registra evento, e uma conclusão futura que cumpra ainda pode conceder o XP. |
| RN-07 | Nível é o maior `n` (1 a 100) tal que `XP total ≥ arredondar(20 × (n − 1)^1,5)`. |
| RN-08 | Medalha e título são concedidos ao alcançar os níveis 10, 20, …, 100 e são **permanentes**. A animação de cada medalha toca uma única vez. |
| RN-09 | Rank do Aventureiro por faixa de nível: E 1–19 · D 20–29 · C 30–49 · B 50–69 · A 70–89 · S 90–100. Independe do Rank do Projeto: um personagem de qualquer Rank pode cadastrar projeto de qualquer Rank. |
| RN-10 | Maestria de uma stack = soma do XP de **conclusão de Projetos** cuja lista de stacks (no momento da conclusão) contém a stack. Nível pela mesma curva da RN-07, com **máximo no nível 50**. Atualizações não contam. |
| RN-11 | A Classe é identidade visual. **Não** altera XP, nível, Rank ou Maestria. A troca é livre e sem custo. |
| RN-12 | O atalho de teclado `C` abre a Ficha e `Esc` fecha. O atalho é ignorado com foco em campo de texto e pode ser desligado pelo usuário (WCAG 2.1.4). |
| RN-13 | Valores de XP são inteiros, arredondados ao inteiro mais próximo (meio para cima). |
| RN-14 | Pontos do Projeto = pontos do estilo arquitetural + 5 por capacidade marcada + 2 por stack, contando só as 10 primeiras (0 a 80, valores em `docs/gamificacao.md` §1). Rank do Projeto pela faixa de pontos: E < 15 · D 15–29 · C 30–44 · B 45–59 · A 60–69 · S ≥ 70. O sistema calcula; o usuário não declara dificuldade. Só Projetos de Desenvolvimento têm Rank (RN-15). |
| RN-15 | O tipo define os campos. Desenvolvimento exige estilo arquitetural, arquitetura e de 1 a 20 stacks e tem Rank (RN-14). Geral não tem estilo, capacidades, arquitetura nem Rank, e as ferramentas são opcionais (0 a 20). |
| RN-16 | O tipo pode ser trocado na edição. De Desenvolvimento para Geral, estilo, capacidades e arquitetura são apagados depois de uma confirmação que avisa a perda; as stacks passam a valer como ferramentas. De Geral para Desenvolvimento, os campos técnicos precisam ser preenchidos. A partir do M3, o XP já concedido fica na trilha em que nasceu. |
| RN-17 | Link válido: endereço `https://` bem formado, com até 2.000 caracteres e sem usuário ou senha embutidos. O sistema nunca abre o link no servidor; na tela, o link abre numa aba nova sem dar acesso à página de origem. |
| RN-18 | (M3) Trilha **Produtividade**, só para Projetos Gerais: criar Projeto 10 XP · criar Atualização 5 · concluir Atualização 20 · concluir Projeto `60 × (1 + 0,03 × min(Atualizações concluídas, 20))`, com a trava de 24 h da RN-06d. Mesma curva de níveis da RN-07, sem medalha, título nem Rank. **Domínio por ferramenta**: a regra da RN-10 aplicada às conclusões de Projetos Gerais. Os eventos de Desenvolvimento continuam na trilha Desenvolvedor (RN-06 a RN-10). |
| RN-19 | Renomear uma tag para um nome que já é de outra tag do usuário (comparação da RN-05) **junta** as duas, depois de uma confirmação que mostra quantos Projetos serão movidos: os Projetos passam para a tag existente, que fica com a grafia digitada; um Projeto que tinha as duas fica com uma só; a tag renomeada deixa de existir. A junção não pode ser desfeita. Trocar só maiúsculas e minúsculas renomeia a mesma tag. |

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

## 8. Critérios de aceite

### RN-14 (Rank do Projeto)

```gherkin
Cenário: o Rank sai da conta, não de uma escolha
  Dado um Projeto Monolito com Autenticação, Banco de dados, Integração com API externa e CI/CD e 6 stacks
  Quando o usuário o cadastra
  Então o Projeto soma 37 pontos (estilo 5, capacidades 20, stacks 12) e é Rank C
  E a tela mostra a conta de cada fator

Cenário: fronteiras das faixas
  Dado um Projeto com 14 pontos, outro com 15, outro com 69 e outro com 70
  Então os Ranks são E, D, A e S, nessa ordem

Cenário: arquitetura em branco
  Dado o formulário de Projeto com a estrutura/arquitetura só com espaços
  Quando o usuário envia
  Então o campo mostra "Descreva a estrutura e a arquitetura do projeto."
  E nada é gravado
```

### RF-20 a RF-22 (Quadro)

```gherkin
Cenário: arrastar muda o status sem abrir a edição
  Dado um Projeto no Backlog
  Quando o usuário arrasta o cartão para "Em desenvolvimento" (mouse ou toque longo)
  Então o cartão aparece na coluna nova na hora e continua lá ao recarregar
  E a data de ingresso em Desenvolvimento é gravada (RN-02)

Cenário: mover só com o teclado
  Dado o foco no botão "Mover" de um cartão
  Quando o usuário escolhe "Para Concluídas"
  Então o cartão vai para Concluídas, a mudança é anunciada e o foco fica no botão do cartão

Cenário: servidor recusa ou rede cai
  Quando a gravação do movimento falha
  Então o cartão volta à coluna de origem e um alerta explica que o projeto não foi movido

Cenário: filtro na URL
  Dado o filtro de texto "gestor"
  Quando o usuário recarrega a página
  Então o filtro continua aplicado
  E, sem nenhum resultado, aparece "Nenhum projeto com esses filtros." com "Limpar filtros"
```

### RF-23 a RF-26 (tipos, tags e links)

```gherkin
Cenário: Projeto Geral sem a parte técnica
  Dado o formulário de Projeto com o tipo Geral
  Quando o usuário envia nome, descrição e status, sem ferramentas e sem arquitetura
  Então o Projeto é gravado sem estilo, capacidades, arquitetura e Rank
  E a ficha mostra "Geral" no lugar do Rank

Cenário: Desenvolvimento continua exigindo a arquitetura
  Dado o formulário de Projeto com o tipo Desenvolvimento
  Quando o usuário envia a estrutura/arquitetura só com espaços
  Então o campo mostra "Descreva a estrutura e a arquitetura do projeto."

Cenário: link que não é https
  Dado um link "javascript:alert(1)" ou "http://exemplo.com"
  Quando o usuário envia o formulário
  Então aparece "Link 1: o endereço precisa começar com https:// e ser válido."
  E nada é gravado

Cenário: troca de Desenvolvimento para Geral
  Dado um Projeto de Desenvolvimento em edição
  Quando o usuário escolhe o tipo Geral
  Então um aviso diz que estilo, capacidades e arquitetura serão apagados
  E salvar só fica disponível depois de marcar "Entendi"

Cenário: filtro por tag na URL
  Dado o filtro de tag "Revenda"
  Quando o usuário recarrega a página
  Então o filtro continua aplicado
```

### RF-27 a RF-29 e RN-19 (tags)

```gherkin
Cenário: renomear para um nome livre
  Dado a tag "Vidos" usada por 1 Projeto
  Quando o usuário a renomeia para "Vídeos"
  Então o Projeto passa a mostrar a tag "Vídeos"
  E a tag "Vidos" não aparece mais na página Tags

Cenário: renomear para um nome que já existe junta as tags
  Dado a tag "Revnda" usada por 2 Projetos, um deles também com a tag "Revenda"
  Quando o usuário renomeia "Revnda" para "revenda"
  Então aparece a confirmação de que os 2 Projetos passam para "Revenda" e "Revnda" deixa de existir
  E, ao confirmar, os 2 Projetos ficam com uma única tag "revenda"
  E a tag "Revnda" deixa de existir

Cenário: nome fora da regra
  Dado a edição do nome de uma tag
  Quando o usuário salva um nome só com espaços ou com 31 caracteres
  Então o campo mostra "A tag precisa ter de 1 a 30 caracteres."
  E nada é gravado

Cenário: excluir só tag sem uso
  Dado uma tag usada por 0 Projetos e outra usada por 1 Projeto
  Então só a tag sem uso oferece "Excluir"
  E, se a tag voltar a ser usada antes da confirmação, o sistema recusa a exclusão e explica o motivo
```

### RN-06 (XP)

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
  E a interface informa que a recompensa exige 24 h em Desenvolvimento e quantas horas faltaram

Cenário: excluir projeto revoga a criação das Atualizações que saem junto
  Dado um Projeto em Backlog com 2 Atualizações, uma delas concluída
  Quando o usuário exclui o Projeto
  Então o XP total diminui em 10 (Projeto) + 5 (Atualização não concluída)
  E o XP de criação e de conclusão da Atualização concluída permanece

Cenário: concluir mostra o XP ganho
  Dado um Projeto que cumpre a trava e ainda não recebeu XP de conclusão
  Quando o usuário o conclui pelo Quadro ou pela ficha
  Então a interface mostra o XP ganho e o HUD atualiza o XP e o nível

Cenário: reconcluir informa que o XP já foi recebido
  Dado um Projeto que já recebeu XP de conclusão
  Quando o usuário o reabre e o conclui de novo
  Então a interface informa que o XP deste Projeto já foi recebido
```

### RN-18 (trilha Produtividade)

```gherkin
Cenário: Projeto Geral rende XP na trilha Produtividade
  Dado um Projeto Geral, em Desenvolvimento há 25 horas, com 5 Atualizações concluídas
  Quando o usuário o marca como Concluído
  Então o ledger registra 69 XP de conclusão na trilha Produtividade
  E o XP da trilha Desenvolvedor não muda

Cenário: Produtividade só aparece no HUD com XP
  Dado um usuário sem XP na trilha Produtividade
  Então o HUD não mostra a linha de Produtividade
  Quando ele cria um Projeto Geral
  Então o HUD mostra "Produtividade" no nível 1 com 10 XP

Cenário: trocar o tipo não move o XP
  Dado um Projeto Geral que já concedeu 10 XP de criação na Produtividade
  Quando o usuário o troca para Desenvolvimento
  Então os 10 XP continuam na trilha Produtividade
```

## 9. Fora de escopo (v1)

Ideia como entidade própria · multiusuário e compartilhamento · reordenar cartões dentro da mesma coluna · conquistas além de medalhas · anexos e imagens · notificações · integração com GitHub (além do login) · uso offline · tema claro · bônus de Classe · excluir tag em uso · tags em Atualizações · pré-visualização de links (vídeo embutido ou leitura do título) · medalhas, títulos e Rank na trilha Produtividade.

## 10. Questões em aberto

Nenhuma no fechamento da baseline 1.0.

## 11. Rastreabilidade

| Requisito | Marco | Verificação |
|---|---|---|
| RF-13 | M1a | E2E do retorno do OAuth + allowlist |
| RF-01..04, RN-02, RN-04 (sem Atualizações), RN-05 | M1b | E2E (Playwright + axe) + pgTAP (RLS, trigger, função) |
| RF-05..09, RF-10 (Atualizações por status e por Projeto), RN-01, RN-03, RN-04 (contagem de Atualizações) | M2 | pgTAP (RLS, trigger, cascata) + unitário (validação, filtros, paginação) + E2E (ficha, página geral, axe) |
| RF-10 (Projetos por status), RF-11 | M1c | Colunas e filtros do Quadro (RF-21): E2E do M1c |
| RF-23, RF-24, RF-26, RN-15, RN-16, RN-17, RF-03 (edição sem status) | 1.4, parte 1 | Unitário (domínio, validação, dados) + pgTAP (CHECKs, RLS e `salvar_missao_v4`) + E2E (cadastro Geral, link recusado, troca de tipo, 360 px, axe) |
| RF-25 | 1.4, parte 2 | Unitário (filtros) + E2E (URL, axe) |
| RF-27, RF-28, RF-29, RN-19 | 1.5 | Unitário (validação, dados) + pgTAP (`renomear_tag`, policies de alterar e excluir) + E2E (juntar, teclado, nome inválido, excluir sem uso, 360 px, axe) |
| RF-12, RN-06, RN-07, RN-09, RN-13, RN-18, RN-10 (snapshot) | M3 | Unitário (domínio) + pgTAP (RLS do ledger, trigger de revogação, funções atômicas) + E2E (HUD, trava, aviso, 360 px, axe) |
| RF-15, RF-17, RF-18, RN-11 | M4 | E2E |
| RF-16, RF-19, RN-08, RN-10 (cálculo e exibição), RN-12 | M5 | E2E + axe |
| RNF-07 (keepalive) | M1b | Crons na Vercel + log de execução |
| RN-14, campos do Projeto (estilo, capacidades, arquitetura obrigatória) | M1c | Unitário (domínio e validação) + pgTAP (CHECKs e `salvar_missao_v4`) + E2E |
| RF-20, RF-21, RF-22 | M1c | Unitário (filtros) + E2E (mouse, toque emulado, teclado, falha do servidor, URL e axe) |
| RF-14, RNF-07 (export) | M6 | Integração |
| RNF-01..06 | Todos | CI + revisão |
