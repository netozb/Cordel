# Referência da linguagem Cordel 0.7.0

Arquivos `.cordel` são texto UTF-8. Esta referência descreve a linguagem implementada pelo interpretador de referência (`lib/cordel.js`), o mesmo usado no editor do navegador, na linha de comando e na extensão do VS Code.

## Sumário

- [Gramática](#gramática)
- [Precedência de operadores](#precedência-de-operadores)
- [Tipos](#tipos)
- [Nomes e escopo](#nomes-e-escopo)
- [Palavras](#palavras)
- [Funções prontas](#funções-prontas)
- [Ações por tipo](#ações-por-tipo)
- [Módulos](#módulos)
- [Telas](#telas)
- [Planilhas](#planilhas)
- [Origem dos valores](#origem-dos-valores)
- [Conciliação](#conciliação)
- [Internet](#internet)
- [Índices e cotações](#índices-e-cotações)
- [Diagnóstico](#diagnóstico)
- [Limites](#limites)

## Gramática

Notação EBNF. Palavras entre aspas são literais; acentos e maiúsculas não importam em nomes nem em palavras.

```ebnf
programa      = { instrução } ;
bloco         = { instrução } ;           (* separadas por quebra de linha ou ";" *)

instrução     = mostre | declaração | atribuição | se | escolha | repita | para
              | enquanto | função | devolva | "pare" | "continue" | tente | falhe
              | teste | confira | tela | elemento | navegação | gráfico | uso | expressão ;

uso           = "use" texto [ "como" nome ] ;        (* só no nível principal *)

mostre        = "mostre" [ expressão { "," expressão } ] ;
declaração    = "var" nome "=" expressão ;
atribuição    = alvo ( "=" | "+=" | "-=" | "*=" | "/=" ) expressão ;
alvo          = nome { "." nome | "[" expressão "]" } ;

se            = "se" expressão [ "então" ] bloco
                { "senão" "se" expressão [ "então" ] bloco }
                [ "senão" bloco ] "fim" ;
escolha       = "escolha" expressão { "caso" padrão { "," padrão } bloco }
                [ "senão" bloco ] "fim" ;
padrão        = expressão [ "até" expressão ] ;
repita        = "repita" expressão "vezes" bloco "fim" ;
para          = "para" nome "de" expressão "até" expressão [ "passo" expressão ] bloco "fim"
              | "para" [ "cada" ] nome "em" expressão bloco "fim" ;
enquanto      = "enquanto" expressão [ "faça" ] bloco "fim" ;
função        = "função" nome "(" [ parâmetros ] ")" ( "=" expressão | bloco "fim" ) ;
devolva       = "devolva" [ expressão ] ;
tente         = "tente" bloco "falhou" [ nome ] bloco "fim" ;
falhe         = "falhe" expressão ;
teste         = "teste" expressão bloco "fim" ;
confira       = "confira" expressão ;

tela          = "tela" [ expressão ] bloco "fim" ;
elemento      = ( "título" | "subtítulo" | "cor" ) expressão
              | "botão" expressão bloco "fim"
              | ( "campo" | "marque" ) expressão "em" alvo
              | "seletor" expressão "em" alvo "de" expressão
              | "link" expressão "para" expressão
              | ( "cartão" | "linha" ) bloco "fim"
              | "página" expressão bloco "fim"
              | "espaço" | "abas" ;
navegação     = "vá" "para" expressão | "volte" ;
gráfico       = "gráfico" [ expressão ] "de" expressão [ "por" nome ] ;

expressão     = função_rápida | disjunção ;
função_rápida = ( nome | "(" [ parâmetros ] ")" ) "=>" expressão ;
disjunção     = conjunção { "ou" conjunção } ;
conjunção     = negação { "e" negação } ;
negação       = "não" negação | comparação ;
comparação    = aditiva { ( "==" | "!=" | "<" | ">" | "<=" | ">=" | "é" ) aditiva } ;
aditiva       = multiplicativa { ( "+" | "-" ) multiplicativa } ;
multiplicativa= unária { ( "*" | "/" | "%" ) unária } ;
unária        = ( "-" | "+" ) unária | potência ;
potência      = pós_fixa [ "^" unária ] ;
pós_fixa      = primária { "(" [ argumentos ] ")" | "." nome | "[" expressão "]" } ;
primária      = número | texto | "verdadeiro" | "falso" | nome
              | "(" expressão ")" | lista | registro ;
lista         = "[" [ expressão { "," expressão } [ "," ] ] "]" ;
registro      = "{" [ campo { "," campo } [ "," ] ] "}" ;
campo         = ( nome | texto ) ":" expressão ;
parâmetros    = nome { "," nome } ;
argumentos    = expressão { "," expressão } [ "," ] ;
```

## Precedência de operadores

| Nível | Operadores | Significado | Associatividade |
|---|---|---|---|
| 1 (mais forte) | f(x) · a.b · a[i] | Chamada, campo ou ação, posição | esquerda |
| 2 | ^ | Potência | direita: 2 ^ 3 ^ 2 = 2 ^ 9 |
| 3 | -x · +x | Sinal | −2 ^ 2 = −4 |
| 4 | * · / · % | Multiplicação, divisão, resto (sinal do divisor) | esquerda |
| 5 | + · - | Soma e subtração; + também junta textos e listas | esquerda |
| 6 | == · != ·  · = · é | Comparação; encadeável: 0 < x < 10 | em cadeia |
| 7 | não | Negação | — |
| 8 | e | Conjunção (curto-circuito) | esquerda |
| 9 | ou | Disjunção (curto-circuito) | esquerda |
| 10 (mais fraca) | x => … | Função rápida | — |

## Tipos

| Tipo | Exemplos | Descrição |
|---|---|---|
| número | 42 · 3.5 · 1_000_000 | Fração exata (inteiros de qualquer tamanho). Denominadores acima de 10⁴⁰ são arredondados a 30 casas. Exibido com até 10 casas decimais. |
| texto | "Olá, {nome}" | Sequência de letras Unicode. Aspas duplas, simples ou curvas; {…} encaixa valores; escapes \n, \t, \", \{. |
| lógico | verdadeiro · falso | Resultado de comparações. Condições só aceitam lógicos. |
| lista | [1, 2, 3] | Posições a partir de 1. Semântica de valor: copiar nunca compartilha. |
| registro | {nome: "Ana"} | Campos com nome; acesso por r.campo ou r["campo"]. Semântica de valor. |
| data | data("26/09/2026") · data("26/09/2026 14:30") | Dia do calendário gregoriano, com ou sem hora (precisão de um segundo, sem fuso horário). data ± n dias; data − data = dias (com fração, se houver horas). |
| função | função f(x) = … · x => … | Valor de primeira classe; captura o bloco onde foi criada. |

## Nomes e escopo

- `nome = valor` cria um nome **fixo** no bloco atual; tentar mudá-lo é erro. `var nome = valor` cria um nome que pode mudar.
- Cada bloco (`se`, laços, `escolha`, `tente`, função, `tela`, `página`, `cartão`, `linha`, `botão`) abre um escopo novo. Nomes criados dentro dele deixam de existir no `fim`.
- Um nome é procurado do bloco atual para fora. Atribuir a um nome de fora exige que ele seja `var`.
- Funções são içadas dentro do bloco: podem ser chamadas antes da linha que as define. Elas enxergam os nomes do bloco onde foram criadas (fechamento léxico).
- Parâmetros e variáveis de laço são fixos.
- Nomes ignoram acentos e maiúsculas: `preço`, `preco` e `PREÇO` são o mesmo nome. Isso vale também para campos de registros e colunas de planilhas.

## Palavras

Reservadas (25): `mostre` `var` `se` `senão` `fim` `escolha` `caso` `repita` `para` `enquanto` `pare` `continue` `função` `devolva` `tente` `falhou` `falhe` `teste` `confira` `tela` `e` `ou` `não` `verdadeiro` `falso`

De contexto (têm sentido especial só em certas posições e podem ser usadas como nomes): `de` `até` `passo` `cada` `em` `vezes` `então` `faça` `é` `título` `subtítulo` `botão` `campo` `marque` `seletor` `link` `cartão` `linha` `cor` `espaço` `página` `abas` `vá` `volte` `gráfico` `por` `use` `como`

## Funções prontas

| Função | Descrição |
|---|---|
| `número(texto)` | Converte um texto em número. Entende "42", "3.5", "1.234,56" e "R$ 10,50". |
| `texto(valor)` | Converte qualquer valor em texto. |
| `hoje()` | A data de hoje, no relógio do aparelho. |
| `agora()` | A data e a hora deste instante, no relógio do aparelho. |
| `data(texto)` · `data(dia, hora)` · `data(ano, mês, dia[, hora, minuto])` | Cria uma data, com ou sem hora, a partir de "dd/mm/aaaa", "dd/mm/aaaa hh:mm", "aaaa-mm-ddThh:mm", de uma data e uma hora ("14:30") ou de números. |
| `tipo(valor)` | O nome do tipo: "número", "texto", "lógico", "lista", "registro", "data" ou "função". |
| `aleatório(a, b)` | Um inteiro sorteado entre a e b, incluindo os dois. |
| `intervalo(a, b)` | A lista de a até b, de 1 em 1. Vazia se a > b. |
| `pergunte([pergunta])` | Pede uma resposta a quem usa o programa e devolve o texto digitado. Não existe em programas com tela. |
| `guarde(nome, valor)` | Grava um valor na memória do app, neste aparelho. Só em programas com tela. |
| `guardado(nome, padrão)` | Lê a memória do app; devolve o padrão se não houver nada guardado. |
| `arquivos()` | Os nomes dos arquivos adicionados no painel Arquivos. |
| `abas(arquivo)` | Os nomes das abas de uma planilha do Excel. |
| `leia(arquivo)` | O conteúdo de um arquivo de texto ou CSV, como texto. |
| `tabela(arquivo[, aba])` · `tabela("https://…")` | Lê uma planilha CSV ou Excel como lista de registros; com um endereço, lê um CSV (ou um JSON com uma lista de registros) da internet. |
| `busque(endereço[, {cabeçalhos: {…}}])` | Lê um endereço da internet: JSON vira registros, listas e números exatos; o resto vira texto. |
| `salve(nome, valor)` | Gera um arquivo .xlsx, .csv, .txt, .md ou .json para baixar. |
| `concilie(a, b, {por, folga_de_dias, folga_de_valor, compare})` | Casa cada registro de a com no máximo um de b. Devolve {resumo, pares, com_diferença, só_no_primeiro, só_no_segundo}. |
| `índice(nome)` | Um índice oficial do Banco Central (IPCA, IGP-M, INPC, Selic, CDI), com .acumulado(de, até), .fator(de, até) e .série(de, até). |
| `cotação(moeda, dia)` | A cotação de venda do dólar ou do euro no dia (ou no último dia útil antes), pelo Banco Central. |

## Ações por tipo

Ações são chamadas com ponto: `lista.soma`, `texto.maiúsculas`, `vencimento.mais_meses(1)`. Sem argumentos, os parênteses são opcionais.

### Listas

| Ação | Descrição |
|---|---|
| `tamanho` | Quantidade de itens. |
| `vazia` | verdadeiro se não há itens. |
| `primeiro` | O primeiro item. |
| `último` | O último item. |
| `soma[(f)]` | Soma dos itens, ou de f(item). |
| `média[(f)]` | Média dos itens, ou de f(item). |
| `maior` | O maior item. |
| `menor` | O menor item. |
| `ordenada[(f)]` | Nova lista em ordem crescente, ou pela chave f(item). Estável. |
| `invertida` | Nova lista de trás para frente. |
| `contém(x)` | verdadeiro se algum item é igual a x. |
| `posição(x)` | Posição do primeiro item igual a x, ou 0. |
| `filtre(f)` | Nova lista só com os itens em que f(item) é verdadeiro. |
| `transforme(f)` | Nova lista com f(item) no lugar de cada item. |
| `conte(f)` | Quantos itens tornam f(item) verdadeiro. |
| `algum(f)` | verdadeiro se f(item) vale para algum item. |
| `todos(f)` | verdadeiro se f(item) vale para todos. |
| `junte[(separador)]` | Um texto com os itens separados (padrão ", "). |
| `pegue(n)` | Os n primeiros itens. |
| `pule(n)` | Tudo depois dos n primeiros. |
| `única` | Nova lista sem itens repetidos. |
| `agrupe(f)` | Lista de registros {chave, quantidade, itens}, um por valor distinto de f(item). |
| `adicione(x)` | Põe x no fim da lista. Altera a variável (precisa ser var). |
| `remova(x)` | Tira o primeiro item igual a x. Altera a variável (precisa ser var). |
| `limpe` | Esvazia a lista. Altera a variável (precisa ser var). |
| `origem` | De onde vieram os itens: planilhas, colunas e linhas. |
| `linhas_de_origem` | As linhas das planilhas de onde vieram os itens. |

### Textos

| Ação | Descrição |
|---|---|
| `tamanho` | Quantidade de letras. |
| `vazio` | verdadeiro se é "". |
| `maiúsculas` | Em maiúsculas. |
| `minúsculas` | Em minúsculas. |
| `aparado` | Sem espaços nas pontas. |
| `invertido` | De trás para frente. |
| `letras` | Lista das letras. |
| `palavras` | Lista das palavras. |
| `contém(t)` | verdadeiro se t aparece no texto. |
| `começa_com(t)` | verdadeiro se começa com t. |
| `termina_com(t)` | verdadeiro se termina com t. |
| `divida(separador)` | Lista dos pedaços entre os separadores. |
| `troque(a, b)` | Troca todo a por b. |

### Números

| Ação | Descrição |
|---|---|
| `arredondado[(casas)]` | Arredondado (metade para longe do zero); sem casas, para inteiro. |
| `absoluto` | Sem sinal. |
| `inteiro` | A parte inteira (corta os decimais). |
| `raiz` | Raiz quadrada; exata para quadrados perfeitos, senão com 12 casas. |
| `dinheiro` | Texto em reais: "R$ 1.234,50". |
| `par` | verdadeiro se é inteiro par. |
| `ímpar` | verdadeiro se é inteiro ímpar. |
| `reparta(partes \| pesos[, casas])` | Divide em partes iguais ou proporcionais a uma lista de pesos, arredondando a centavos (ou a casas) sem perder nada: a soma das partes é o valor. |
| `corrigido(índice, de, até)` | O valor corrigido por um índice do Banco Central no período, como aluguel.corrigido("IGP-M", de, até). |
| `origem` | De onde o número veio: as células das planilhas (colunas e linhas), o endereço da internet ou o índice. |
| `linhas_de_origem` | As linhas das planilhas que formaram o número. |

### Datas

| Ação | Descrição |
|---|---|
| `dia` | Dia do mês. |
| `mês` | Mês (1 a 12). |
| `ano` | Ano. |
| `dia_da_semana` | "segunda-feira" … "domingo". |
| `nome_do_mês` | "janeiro" … "dezembro". |
| `trimestre` | 1 a 4. |
| `mês_ano` | Texto "aaaa-mm", bom para agrupar e ordenar. |
| `formatada` | "dd/mm/aaaa". |
| `por_extenso` | "26 de setembro de 2026". |
| `início_do_mês` | Primeiro dia do mês. |
| `fim_do_mês` | Último dia do mês. |
| `mais_meses(n)` | Soma n meses; se o dia não existir no mês de destino, usa o último. |
| `útil` | verdadeiro de segunda a sexta (não considera feriados). |
| `hora` | Hora (0 a 23); 0 numa data sem hora. |
| `minuto` | Minuto (0 a 59). |
| `segundo` | Segundo (0 a 59). |
| `horário` | O horário como texto: "14:30", ou "14:30:15" quando há segundos. |
| `sem_hora` | Só o dia, sem a hora: bom para agrupar e comparar por data. |
| `mais_horas(n)` | Anda n horas no tempo (aceita frações e negativos), virando o dia quando precisa. |
| `mais_minutos(n)` | Anda n minutos no tempo. |
| `minutos_até(outra)` | Minutos exatos até outra data; negativo se ela vem antes. |
| `horas_até(outra)` | Horas exatas até outra data (frações incluídas). |
| `dias_até(outra)` | Dias exatos até outra data, contando as horas. |
| `origem` | De onde a data veio. |
| `linhas_de_origem` | As linhas das planilhas de onde a data veio. |

### Registros

| Ação | Descrição |
|---|---|
| `campos` | Lista dos nomes dos campos. |
| `tem(nome)` | verdadeiro se o registro tem o campo. |
| `origem` | De onde o registro veio: a linha da planilha, ou tudo o que entrou nele. |
| `linhas_de_origem` | As linhas das planilhas que formaram o registro. |

## Módulos

- `use "nome"` fica no nível principal do programa (fora de blocos e funções) e traz as funções e os nomes do nível principal do módulo, exceto os que começam com `_`. Os nomes trazidos são fixos; um nome que já existe no programa é erro.
- `use "nome" como m` cria só o nome fixo `m`, um registro com o que o módulo oferece: `m.calculado(v)`, `m.limite`.
- Cada módulo roda uma vez por execução, no seu próprio escopo. Ao ser carregado ele não mostra nada, não desenha gráficos, não roda testes nem abre tela; `pergunte` e `salve` são erro durante o carregamento, mas funcionam dentro de funções do módulo chamadas depois.
- Módulos podem usar outros módulos; o que um módulo traz de outro não é repassado. Uso em círculo é erro.
- Onde o módulo é procurado: no editor, entre os programas de *Meus programas* (pelo nome) e os exemplos (pelo nome curto); no computador e no VS Code, entre os arquivos `.cordel` da pasta do programa (também `"pasta/nome"`), sem ligar para acentos e maiúsculas. Apps exportados levam dentro os módulos que usam.
- Erros no código de um módulo apontam o módulo e a linha dele. Um arquivo só com funções, nomes, `use` e testes é tratado como biblioteca: o diagnóstico não avisa que seus nomes nunca são usados.

## Telas

- O bloco `tela` é executado depois do programa e de novo a cada interação; o resultado substitui a tela anterior, preservando o foco e o texto sendo digitado.
- `botão` guarda o seu bloco e o escopo em que foi desenhado; o bloco roda no toque.
- `campo`, `marque` e `seletor` ligam o elemento a um alvo criado com `var`. O tipo do valor inicial define o campo: texto, número (teclado numérico, aceita 1.234,56) ou data.
- `página` fica direto dentro da tela. A primeira é a inicial; `vá para` empilha a atual e `volte` desempilha. `abas` mostra as páginas no topo.
- `guardado`/`guarde` usam a memória do navegador, separada por app. Valores exatos, datas, listas e registros são preservados.
- O app exportado é um único arquivo .html com o interpretador, o programa e as planilhas que ele usa. Não depende de internet.

## Planilhas

- CSV: separador detectado (`;`, `,` ou tabulação), aspas e BOM tratados, UTF-8 ou Windows-1252. Excel: .xlsx, .xls, .xlsm e .ods, todas as abas.
- O cabeçalho é a primeira linha pelo menos meio preenchida (linhas de título acima são ignoradas). Linhas vazias são descartadas.
- Nomes de coluna viram campos: espaços e sinais viram `_`; nomes repetidos ganham `_2`, `_3`…
- Cada coluna é convertida por inteiro: vira número se todos os valores preenchidos forem números (formato brasileiro preferido); vira data se todos forem datas (com ou sem hora, como 03/09/2026 14:30); senão fica texto. Códigos com zero à esquerda e sequências de 12+ dígitos (CPF, CNPJ, chaves) ficam texto.
- Células vazias viram `""`.

## Origem dos valores

- Números, datas e linhas lidos com `tabela` guardam a planilha (e a aba), a linha do arquivo e a coluna de onde vieram. Números de `busque` guardam o endereço e o caminho no JSON (como `qsa[1].valor`); valores de `índice` e `cotação`, a série e o período do Banco Central.
- Contas (`+ - * / % ^`), ações de número e de data e `reparta` juntam as origens dos valores usados. `soma`, `média`, `tamanho`, `conte` e a `quantidade` de `agrupe` ficam com a origem dos itens contados. `maior`, `menor`, `filtre`, `ordenada` e as demais devolvem os próprios itens, com a origem deles.
- Um registro criado com `{…}` guarda a origem de tudo o que entrou nele, inclusive de campos de texto lidos de linhas (`v.nota`) e de números que viraram texto (`"{v.total.dinheiro}"`). O que as funções de `filtre`, `conte`, `ordenada` e afins apenas consultam não entra.
- `valor.origem` descreve a origem em texto (ou `"do programa"`, se o valor não veio de fora); `valor.linhas_de_origem` devolve as linhas das planilhas, na ordem de cada planilha. Valem para números, datas, registros e listas. Textos não guardam origem sozinhos: peça a do registro de onde vieram.
- No editor, cada valor mostrado com origem vira um botão, e cada linha de tabela, um item que se toca para ver de onde veio (até 20 linhas de amostra). No terminal, `cordel rodar … --origens` escreve a origem abaixo de cada linha e numa coluna de cada tabela.

## Conciliação

- `concilie(a, b, regras)`: `a` e `b` são listas de registros. `regras.por` (obrigatório) é um nome de campo, uma lista de nomes (iguais nas duas listas) ou um registro `{campo_de_a: "campo_de_b"}`. `folga_de_dias` e `folga_de_valor` (padrão 0) valem para todos os campos de data e de número de `por`. `compare` (opcional) tem a mesma forma de `por`.
- Textos batem sem diferença de maiúsculas, acentos e espaços nas pontas; números e datas batem exatos, ou dentro da folga. Uma célula vazia num campo de `por` não casa com nada.
- Cada registro de `a` casa com no máximo um de `b` e vice-versa. O casamento tem o maior número possível de pares; entre as escolhas, prefere a menor diferença de valor e depois a de dias.
- O resultado é um registro: `resumo` (texto), `pares` (na ordem de `a`), `com_diferença` (pares com número diferente ou com algum campo de `compare` diferente; datas dentro da folga não contam), `só_no_primeiro` e `só_no_segundo` (na ordem original). Cada par tem `primeiro`, `segundo`, `diferença` (texto, vazio quando tudo bate) e, se houver, `dias` e `diferença_de_valor` (segundo menos primeiro, no primeiro campo de data e de número).

## Internet

- `busque(endereço)` faz um GET em um endereço `https://` ou `http://`. Se a resposta é JSON (pelo tipo ou por começar com `{` ou `[`), objetos viram registros, listas viram listas, números viram números exatos (inclusive com expoente), `null` vira `""`. Qualquer outra resposta vira texto.
- `busque(endereço, {cabeçalhos: {Authorization: "…"}})` envia cabeçalhos. Não há outros métodos além de GET.
- `tabela("https://…")` lê um CSV (ou um JSON que seja uma lista de registros) com as mesmas regras das planilhas.
- Numa execução, cada endereço (com os mesmos cabeçalhos) é buscado uma vez e a resposta é reaproveitada. Num app, um toque que precisa de uma resposta é desfeito e repetido quando ela chega, sem travar a tela e sem efeito duplicado.
- Erros claros para respostas fora de 200–299 (com o código), falta de conexão, tempo esgotado (15 segundos), resposta maior que 10 MB e JSON inválido. `tente … falhou` trata todos.
- No computador e no VS Code, qualquer endereço funciona. No navegador, o site precisa permitir acesso de outras páginas (CORS), e a página do editor pode bloquear endereços externos.

## Índices e cotações

- `índice(nome)` aceita IPCA (série 433 do SGS), IGP-M (189), INPC (188), Selic (11) e CDI (12), sem ligar para maiúsculas, hífens e acentos. Devolve um registro com `nome`, `descrição` e as funções `acumulado`, `fator` e `série`, que recebem duas datas.
- Índices mensais: do mês de `de` ao mês de `até`, inclusive. Se algum mês ainda não foi publicado, é erro. Selic e CDI (taxas diárias): os dias úteis de `de` até a véspera de `até`.
- `fator` é o produto de (1 + taxa ÷ 100), exato; `acumulado` é (fator − 1) × 100; `valor.corrigido(índice, de, até)` é valor × fator. Nada é arredondado: use `.arredondado(2)` ou `.dinheiro`.
- `cotação(moeda, dia)`: dólar (série 1) ou euro (21619), cotação de venda. Sem cotação no dia (fim de semana, feriado), usa a do último dia útil antes, até dez dias.
- Os dados vêm de `https://api.bcb.gov.br` com as mesmas regras de `busque`: cada consulta é feita uma vez por execução, e séries diárias vão em pedaços de até cinco anos.

## Diagnóstico

`cordel verificar` (e o editor, enquanto você digita) aponta estes problemas sem rodar o programa:

| Nível | Problema | Detalhe |
|---|---|---|
| erro | Erros de sintaxe | Todos de uma vez; após um erro, a leitura recomeça na linha seguinte ou no fim do bloco. |
| erro | Nome que não existe | Com sugestão do nome mais parecido. |
| erro | Nome usado fora do bloco onde foi criado | Aponta a linha onde ele nasceu. |
| erro | Nome usado antes de ser criado |  |
| erro | Mudança em nome fixo | Inclui adicione/remova/limpe e ligações de tela. |
| erro | var repetida no mesmo bloco |  |
| aviso | Nome criado e nunca usado | Nomes começando com _ são ignorados. |
| aviso | var que nunca muda | Sugere o nome fixo. |
| aviso | Nome que esconde uma função pronta | Ex.: data = … |
| aviso | Função nunca chamada |  |
| aviso | Código depois de devolva, pare, continue ou falhe |  |
| aviso | enquanto verdadeiro sem saída |  |
| aviso | Condição sempre verdadeira ou falsa |  |
| aviso | Comparação de um valor com ele mesmo |  |

## Limites

| Limite | Valor |
|---|---|
| Passos por execução | 20 milhões (programas) · 5 milhões por toque (apps) |
| Profundidade de chamadas | 700 |
| Linhas de saída | 5.000 |
| Linhas mostradas numa tabela | 500 (o restante é contado) |
| Barras num gráfico | 60 |
| Passos na máquina do tempo | 3.000 |
| intervalo(a, b) | 1 milhão de números |
| Módulos por execução | 500 |
| Buscas na internet por execução | 1.000 (15 segundos e 10 MB por resposta), contando as consultas de índice e cotação |
| reparta | 100.000 partes, até 10 casas |
| Linhas de amostra na origem (editor) | 20 |
