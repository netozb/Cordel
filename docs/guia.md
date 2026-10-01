# Guia da linguagem Cordel

Um passeio pela linguagem, do primeiro `mostre` a apps com páginas. Cada trecho roda como está: copie para um arquivo `.cordel` e rode com `cordel rodar arquivo.cordel`.

## Por que Cordel

- **Contas exatas.** Números são guardados como frações exatas. `0.1 + 0.2` dá `0.3`, e somas de dinheiro nunca perdem centavo.
- **Escreva como fala.** Palavras em português. Acento e maiúscula não importam: `preço`, `preco` e `PREÇO` são o mesmo nome. Aspas curvas do teclado do celular funcionam. O primeiro item de uma lista é `lista[1]`.
- **Fixo por padrão.** O que é criado com `=` não muda mais. Para algo que precisa mudar, use `var`. Só de olhar, você sabe o que se altera no programa.
- **Cópias seguras.** Mudar a cópia de uma lista ou registro nunca altera o original. Some uma classe inteira de erros difíceis de achar.
- **Sites e apps em português.** Descreva a tela com `título`, `botão` e `campo`. Ela se redesenha sozinha quando os dados mudam, e um toque gera o app pronto num arquivo .html.
- **Erros que ensinam.** Mensagens em português com a linha, o motivo e uma sugestão: *“Listas não têm somar. Você quis dizer soma?”*
- **Testes de fábrica.** `teste` e `confira` fazem parte da linguagem. Provar que uma regra funciona é tão fácil quanto escrevê-la.
- **Planilhas de primeira.** `tabela("vendas.xlsx")` lê CSV e Excel como uma lista de registros. Entende `R$ 1.234,56`, mantém códigos como `00123` e pula linhas de título.
- **Seus dados ficam com você.** As planilhas são lidas no próprio aparelho. Nada é enviado para servidor nenhum, o que importa para dados de empresa.
- **Veja o programa pensar.** A máquina do tempo roda o programa passo a passo. Arraste e veja cada linha acontecer e o valor de cada variável naquele instante.
- **Descreva e o Claude escreve.** Conte em português o que você quer. O Claude escreve em Cordel e o próprio interpretador confere o código antes de entregar.
- **Pouco para decorar.** 25 palavras reservadas. Todo bloco termina com `fim`. Não há ponto e vírgula nem chaves para abrir e fechar blocos.

## Primeiros passos

`mostre` exibe valores. Dentro de um texto, `{…}` encaixa o valor de qualquer expressão. Tudo depois de `#` é comentário.

```cordel
mostre "Olá, mundo!"
nome = "Ana"
mostre "Olá, {nome}! Hoje é dia de programar."
mostre 2 + 3 * 4  # 14: multiplicação vem antes
```

## Fixo e var

Um nome criado com `=` é fixo. Se ele precisa mudar, crie com `var`. Depois, `+=`, `-=`, `*=` e `/=` atualizam o valor.

```cordel
taxa = 0.05
var saldo = 100
saldo = saldo + saldo * taxa
saldo += 10
mostre saldo
```

## Números

Operações: `+` `-` `*` `/`, `%` (resto) e `^` (potência). Decimais usam ponto: `3.5`. Só raiz e potência fracionária são aproximadas.

```cordel
mostre 0.1 + 0.2 == 0.3
mostre 1 / 3 * 3
mostre 2 ^ 64
mostre (10 / 3).arredondado(2)
mostre 1234.5.dinheiro
mostre 17 % 5, 16.raiz, 7.ímpar
mostre 100.reparta(3), 1000.reparta([3, 1, 1])
```

| Ação | O que faz |
|---|---|
| arredondado(casas) | arredonda; sem casas, para inteiro |
| dinheiro | formata em reais: R$ 1.234,50 |
| reparta(n) · reparta(pesos) | divide sem perder centavo: 100 em 3 dá 33,34 + 33,33 + 33,33 |
| raiz | raiz quadrada |
| absoluto | tira o sinal |
| inteiro | corta a parte decimal |
| par · ímpar | verdadeiro ou falso |

## Textos

Textos ficam entre aspas. `+` junta dois textos; para misturar com números, use `{…}`.

```cordel
frase = "  Cordel é poesia  "
limpo = frase.aparado
mostre limpo.maiúsculas
mostre limpo.palavras.tamanho, "palavras"
mostre limpo.troque("poesia", "código")
mostre "a,b,c".divida(",")
```

| Ação | O que faz |
|---|---|
| tamanho | quantidade de letras |
| maiúsculas · minúsculas | muda a caixa |
| aparado | tira espaços das pontas |
| palavras · letras | quebra em lista |
| divida(sep) | quebra no separador |
| troque(a, b) | troca todo a por b |
| contém(t) | verdadeiro se t aparece |
| começa_com(t) · termina_com(t) | confere as pontas |
| invertido | de trás para frente |

## Datas

`hoje()` dá a data de hoje e `data("26/09/2026")` cria uma data. Somar um número soma dias; subtrair duas datas dá os dias entre elas. Nas planilhas, colunas com datas como 03/09/2026 já chegam como datas.

```cordel
vencimento = data("31/01/2026")
mostre vencimento + 30
mostre vencimento.mais_meses(1)
mostre data("26/09/2026") - vencimento, "dias"
mostre vencimento.dia_da_semana, vencimento.nome_do_mês
mostre vencimento.fim_do_mês, vencimento.útil
```

| Ação | O que faz |
|---|---|
| dia · mês · ano | as partes da data |
| dia_da_semana · nome_do_mês | por extenso: "sábado", "janeiro" |
| mês_ano · trimestre | para agrupar: "2026-01", 1 |
| formatada · por_extenso | "31/01/2026", "31 de janeiro de 2026" |
| início_do_mês · fim_do_mês | os limites do mês |
| mais_meses(n) | soma meses, respeitando o fim do mês |
| útil | verdadeiro de segunda a sexta |

## Datas com hora

`agora()` dá a data e a hora deste instante, e `data("03/09/2026 14:30")` cria uma data com hora (também aceita `"03/09/2026 às 14h30"` e `"2026-09-03T14:30:00"`). As contas são exatas, ao segundo: `minutos_até`, `horas_até` e `dias_até` medem o tempo entre dois momentos, e `mais_horas` e `mais_minutos` andam no tempo, virando o dia quando precisa. Nas planilhas, colunas como 03/09/2026 08:15 chegam como datas com hora, prontas para achar vendas fora do horário ou cancelamentos minutos depois da venda.

```cordel
entrada = data("03/09/2026 08:15")
saída = data("03/09/2026 17:40")
mostre entrada.horário, saída.horário, saída.dia_da_semana
mostre entrada.minutos_até(saída), "minutos"
mostre entrada.horas_até(saída).arredondado(2), "horas"
mostre entrada.mais_horas(9.5)
mostre entrada.hora >= 8 e saída.hora < 18
mostre saída.sem_hora == data("03/09/2026")
```

| Ação | O que faz |
|---|---|
| agora() | a data e a hora deste instante |
| hora · minuto · segundo | as partes do horário |
| horário | o horário como texto: "14:30" |
| sem_hora | só o dia, para agrupar por data |
| mais_horas(n) · mais_minutos(n) | anda no tempo; aceita frações, como 1.5 |
| minutos_até(outra) · horas_até(outra) · dias_até(outra) | o tempo até outra data, exato e negativo se ela vem antes |
| data(dia, "14:30") | junta uma data e uma hora vindas de colunas separadas |

## Decisões

Compare com `==` `!=` `<` `>` `<=` `>=` ou com a palavra `é`. Junte condições com `e`, `ou`, `não`. Comparações podem ser encadeadas, como na matemática.

```cordel
temperatura = 36
se temperatura >= 35
  mostre "Calor de sertão"
senão se temperatura >= 25
  mostre "Tempo bom"
senão
  mostre "Friozinho"
fim
mostre 18 <= temperatura < 40
mostre temperatura é 36 e não (temperatura > 40)
```

## Escolha

Quando um valor pode cair em vários casos. Um `caso` aceita vários valores separados por vírgula ou uma faixa com `até`.

```cordel
nota = 8
escolha nota
  caso 10
    mostre "Perfeito"
  caso 7 até 9
    mostre "Aprovado"
  senão
    mostre "Recuperação"
fim
```

## Repetições

Quatro formas, cada uma com um uso claro. Dentro de qualquer uma, `pare` sai do laço e `continue` pula para a próxima volta.

```cordel
repita 2 vezes
  mostre "eco"
fim
para i de 10 até 0 passo -5
  mostre i
fim
para cada fruta em ["caju", "umbu", "pitomba"]
  mostre fruta.maiúsculas
fim
var n = 1
enquanto n < 100
  n = n * 3
fim
mostre n
```

## Listas

Posições começam em 1. As ações devolvem uma lista nova e deixam a original intacta. Só `adicione`, `remova` e `limpe` alteram a própria lista, e só se ela foi criada com `var`.

```cordel
vendas = [120, 80, 250, 80, 40]
mostre vendas.tamanho, vendas.soma, vendas.média
mostre vendas.ordenada, vendas.única
mostre vendas.filtre(v => v > 100)
mostre vendas.transforme(v => v * 2)
mostre vendas[1], vendas.último
var fila = ["Ana"]
fila.adicione("Bia")
mostre fila
```

| Ação | O que faz |
|---|---|
| tamanho · vazia | quantos itens · se não tem nenhum |
| soma · média · maior · menor | resumos (soma e média aceitam função) |
| primeiro · último | as pontas |
| ordenada · ordenada(f) | em ordem, ou pela chave f |
| filtre(f) | só os itens em que f é verdadeiro |
| transforme(f) | aplica f em cada item |
| conte(f) · algum(f) · todos(f) | contagem e testes |
| contém(x) · posição(x) | procura |
| única · invertida | sem repetidos · ao contrário |
| pegue(n) · pule(n) | os n primeiros · o resto |
| junte(sep) | vira um texto |
| adicione(x) · remova(x) · limpe | alteram a lista (var) |

## Registros

Um registro agrupa campos com nome. Copiar é seguro: mudar a cópia não mexe no original.

```cordel
produto = {nome: "Sofá 3 lugares", preço: 2499.90, estoque: 4}
mostre produto.nome
mostre (produto.preço * produto.estoque).dinheiro
var item = produto
item.estoque -= 1
mostre item.estoque, produto.estoque
mostre produto.campos
```

## Módulos

Um programa usa as funções e os nomes de outro com `use "nome"`. No editor, o nome é o de outro programa seu em *Meus programas* (ou de um exemplo, como `"regras"`); no computador e no VS Code, é outro arquivo `.cordel` na mesma pasta. O módulo roda uma vez, sem mostrar nada e sem rodar os testes dele, e nomes que começam com `_` ficam só lá dentro. Com `como`, tudo fica sob um nome só e nada se mistura com os nomes do programa.

```cordel
use "regras"
use "regras" como r

vendas = tabela("vendas_exemplo.csv")
mostre vendas.conte(desconto_alto), "notas com desconto acima de {limite_de_desconto}%"
mostre r.calculado(vendas[1]).dinheiro
```

| Ação | O que faz |
|---|---|
| use "nome" | traz as funções e os nomes do módulo |
| use "nome" como m | tudo fica em m: m.calculado(v), m.limite_de_desconto |
| _nome | fica só dentro do módulo que o criou |

## Funções

Função curta em uma linha com `=`, função longa em bloco com `devolva`. Para passar uma regra a outra função, use a forma rápida `x => …`.

```cordel
função dobro(x) = x * 2

função com_juros(valor, taxa, meses)
  devolva (valor * (1 + taxa) ^ meses).arredondado(2)
fim

mostre dobro(21)
mostre com_juros(1000, 0.02, 6)
quadrado = x => x * x
mostre [1, 2, 3].transforme(quadrado)
```

## Telas: sites e apps

Um bloco `tela` descreve o que aparece, de cima para baixo. `cartão` agrupa itens numa caixa e `linha` coloca itens lado a lado. Tudo que funciona fora da tela funciona dentro dela: `se`, `para cada` e funções, que viram componentes reaproveitáveis.

```cordel
produtos = [{nome: "Sofá 3 lugares", preço: 2499.9}, {nome: "Rack", preço: 399}]
tela "Vitrine"
  cor "urucum"
  título "Ofertas da semana"
  para cada p em produtos
    cartão
      subtítulo p.nome
      mostre p.preço.dinheiro
    fim
  fim
  link "Ver todas" para "https://example.com"
fim
```

| Ação | O que faz |
|---|---|
| título · subtítulo | textos de destaque |
| mostre | texto; vira tabela se for lista de registros |
| cartão … fim | caixa que agrupa itens |
| linha … fim | itens lado a lado |
| link "texto" para "https://…" | abre outro endereço |
| espaço | respiro entre blocos |
| cor "verde" | azul, anil, verde, caatinga, vermelho, urucum, laranja, amarelo, roxo, rosa, preto, cinza, marrom ou um código como "#1E7A4C" |

## Botões e campos

`botão` roda o bloco dele quando tocado. `campo`, `marque` e `seletor` ligam o que a pessoa digita, marca ou escolhe a uma variável criada com `var`. Depois de cada toque a tela inteira é redesenhada com os valores novos, sem você atualizar nada à mão.

```cordel
var nome = ""
var vezes = 0
tela "Olá"
  campo "Seu nome" em nome
  botão "Cumprimentar"
    vezes += 1
  fim
  se vezes > 0 e nome != ""
    mostre "Olá, {nome}! Você tocou {vezes} vez(es)."
  fim
fim
```

| Ação | O que faz |
|---|---|
| botão "texto" … fim | o bloco roda a cada toque |
| campo "rótulo" em x | texto ou número, conforme o valor de x |
| marque "rótulo" em x | caixa de marcar (x é verdadeiro ou falso) |
| seletor "rótulo" em x de lista | escolhe uma opção da lista |

## Páginas e navegação

Dentro da tela, cada `página "Nome" … fim` é uma página do app; a primeira é a inicial. Num botão, `vá para "Nome"` troca de página e `volte` retorna, e a barra do app ganha a seta de voltar. `abas` mostra as páginas como abas no topo.

```cordel
cidades = ["Iguatu", "Crato", "Sobral"]
var escolhida = cidades[1]
tela "Filiais"
  abas
  página "Lista"
    para cada c em cidades
      botão c
        escolhida = c
        vá para "Filial"
      fim
    fim
  fim
  página "Filial"
    título escolhida
    mostre "Loja de {escolhida}, no Ceará."
    botão "Voltar"
      volte
    fim
  fim
fim
```

| Ação | O que faz |
|---|---|
| página "Nome" … fim | uma página do app |
| vá para "Nome" | troca de página (dentro de um botão) |
| volte | retorna à página anterior |
| abas | mostra as páginas como abas |

## Memória e publicação

`guardado("nome", padrão)` lê o que o app guardou neste aparelho (ou o padrão, na primeira vez) e `guarde("nome", valor)` grava. Como a tela é redesenhada a cada toque, um `guarde` dentro dela salva sempre. No editor, **Baixar app** gera um arquivo `.html` com tudo dentro, inclusive as planilhas que o app usa: dá para abrir no celular, mandar para alguém ou publicar em qualquer hospedagem de sites, com o nome `index.html`.

```cordel
visitas = guardado("visitas", 0) + 1
tela "Memória"
  guarde("visitas", visitas)
  mostre "Esta é a visita número {visitas} neste aparelho."
fim
```

| Ação | O que faz |
|---|---|
| guardado(nome, padrão) | lê a memória do app |
| guarde(nome, valor) | grava na memória do app |

## Máquina do tempo

No editor, **Passo a passo** roda o programa guardando cada passo: a linha que rodou, a decisão tomada (`se: verdadeiro`), a volta do laço (`para: i = 3`), a chamada de função e o valor devolvido. Arraste o controle para ir e voltar no tempo; a linha fica marcada no código e as variáveis que acabaram de mudar aparecem destacadas. Abra este trecho no editor e experimente.

```cordel
função fatorial(n)
  se n <= 1
    devolva 1
  fim
  devolva n * fatorial(n - 1)
fim
var soma = 0
para i de 1 até 4
  soma += fatorial(i)
fim
mostre soma
```

## Planilhas

Adicione um arquivo CSV ou Excel no painel *Arquivos* do editor e leia com `tabela("nome")`. Cada linha vira um registro e cada coluna vira um campo: *Valor Unitário* vira `valor_unitário`. Números no formato brasileiro viram números de verdade; códigos com zero à esquerda, CPF e CNPJ continuam texto; células vazias viram `""`.

```cordel
vendas = tabela("vendas_exemplo.csv")
mostre vendas.tamanho, "notas"
mostre vendas.pegue(3)
mostre vendas.soma(v => v.total).dinheiro
```

| Ação | O que faz |
|---|---|
| tabela(arquivo) | lê a planilha como lista de registros |
| tabela(arquivo, aba) | escolhe a aba de um Excel |
| abas(arquivo) | nomes das abas |
| leia(arquivo) | o conteúdo como texto |
| arquivos() | nomes dos arquivos adicionados |

## Agrupar e resumir

`agrupe` junta os itens que têm a mesma chave. Cada grupo é um registro com `chave`, `quantidade` e `itens`. Quando `mostre` recebe uma lista de registros, a saída vira tabela.

```cordel
vendas = tabela("vendas_exemplo.csv")
por_vendedor = vendas.agrupe(v => v.vendedor).transforme(g => {
  vendedor: g.chave,
  notas: g.quantidade,
  total: g.itens.soma(v => v.total),
})
mostre por_vendedor.ordenada(r => r.total).invertida.pegue(4)
```

## De onde veio cada número

Cada número, data e linha lido de uma planilha lembra de onde veio, e as contas levam essa lembrança adiante. `total.origem` diz quais células formaram o total; `total.linhas_de_origem` devolve as linhas da planilha que entraram na conta. Registros montados a partir das linhas, como uma lista de achados, também guardam a origem: cada achado sabe a linha que o gerou.

No editor, os valores com origem aparecem sublinhados: toque num número mostrado, ou numa linha de tabela, para ver as células e as linhas de onde ele veio. No computador, `cordel rodar programa.cordel --origens` escreve a origem de cada resultado. Valores da internet e dos índices do Banco Central também dizem de onde vieram.

```cordel
vendas = tabela("vendas_exemplo.csv")
crato = vendas.filtre(v => v.filial == "Crato")
total = crato.soma(v => v.total)
mostre total.dinheiro
mostre total.origem
mostre total.linhas_de_origem.pegue(3)
```

| Ação | O que faz |
|---|---|
| valor.origem | texto: de que planilha, colunas e linhas o valor veio |
| valor.linhas_de_origem | as linhas das planilhas que formaram o valor |
| cordel rodar … --origens | no terminal, a origem de cada resultado |

## Conciliar duas tabelas

`concilie(a, b, regras)` casa cada registro de `a` com no máximo um de `b`: vendas com o extrato do banco, notas com pedidos, o estoque de ontem com o de hoje. Em `por` vão os campos que precisam bater; quando o nome muda de uma tabela para a outra, use um registro, como `{total: "valor"}`. `folga_de_dias` e `folga_de_valor` aceitam pequenas diferenças em datas e números, e `compare` lista campos conferidos depois de casar.

O resultado traz `resumo`, `pares` (cada um com `primeiro`, `segundo` e a `diferença` explicada), `com_diferença` (valores ou campos de `compare` diferentes), `só_no_primeiro` e `só_no_segundo`. Nenhum par possível se perde, e entre vários candidatos fica o mais próximo.

```cordel
vendas = tabela("vendas_exemplo.csv")
extrato = tabela("extrato_exemplo.csv")
r = concilie(vendas, extrato, {por: {total: "valor", data: "data"}, folga_de_dias: 2, folga_de_valor: 0.10})
mostre r.resumo
mostre r.só_no_primeiro.transforme(v => {nota: v.nota, data: v.data, total: v.total})
mostre r.com_diferença.transforme(p => {nota: p.primeiro.nota, diferença: p.diferença})
```

| Ação | O que faz |
|---|---|
| por: ["valor", "data"] | campos que precisam bater (mesmo nome nas duas) |
| por: {total: "valor"} | campo do primeiro: campo do segundo |
| folga_de_dias · folga_de_valor | diferença aceita em datas e em números |
| compare: ["filial"] | campos conferidos depois de casar |
| r.pares · r.com_diferença | registros {primeiro, segundo, diferença, dias, diferença_de_valor} |
| r.só_no_primeiro · r.só_no_segundo | o que ficou sem par |

## Gráficos

`gráfico "Título" de lista por campo` desenha barras, uma para cada item. O nome de cada barra vem do primeiro campo de texto. Funciona no console e dentro de telas, e aceita também uma lista de números ou um registro com números.

```cordel
vendas = tabela("vendas_exemplo.csv")
por_filial = vendas.agrupe(v => v.filial).transforme(g => {
  filial: g.chave,
  total: g.itens.soma(v => v.total),
})
gráfico "Vendas por filial" de por_filial.ordenada(f => f.total).invertida por total
```

## Dados da internet

`busque("https://…")` lê um endereço da internet. Respostas em JSON, o formato da maioria das APIs, viram registros, listas e números exatos (sem arredondar nenhuma casa); o resto chega como texto. `tabela("https://…")` lê uma planilha CSV publicada, como uma planilha do Google publicada na web. Numa execução, cada endereço é buscado uma vez; nos apps, a tela não trava enquanto a resposta não chega. No computador, com `cordel rodar`, qualquer endereço funciona; no navegador, só os de sites que permitem acesso de outras páginas, como a BrasilAPI.

```cordel
empresa = busque("https://brasilapi.com.br/api/cnpj/v1/00000000000191")
mostre empresa.razao_social
mostre empresa.descricao_situacao_cadastral
mostre empresa.campos
```

| Ação | O que faz |
|---|---|
| busque(endereço) | JSON vira registros e listas; o resto, texto |
| busque(endereço, {cabeçalhos: {…}}) | envia cabeçalhos, como uma chave de acesso |
| tabela("https://….csv") | uma planilha publicada na internet |
| registro.campos | os nomes dos campos que vieram |

## Índices e cotações

`índice("IPCA")` usa a série oficial do Banco Central: `.acumulado(de, até)` dá a variação acumulada em %, `.fator(de, até)` o multiplicador e `.série(de, até)` o valor de cada mês ou dia. Para corrigir um valor, `aluguel.corrigido("IGP-M", de, até)`. Os índices mensais (IPCA, IGP-M e INPC) contam do mês inicial ao final, inclusive; Selic e CDI contam os dias úteis do início até a véspera do fim, como juros. `cotação("dólar", dia)` dá a cotação de venda do dia, ou do último dia útil antes dele.

As contas são exatas, e o resultado diz de onde veio: `novo.origem`. Precisa de internet: no computador sempre funciona; no navegador, depende de o Banco Central permitir o acesso.

```cordel
ipca = índice("IPCA")
mostre ipca.acumulado(data("01/01/2025"), data("31/12/2025")).arredondado(2), "%"
aluguel = 1500
novo = aluguel.corrigido("IGP-M", data("01/09/2025"), data("31/08/2026"))
mostre novo.dinheiro, "·", novo.origem
mostre cotação("dólar", data("28/08/2026"))
```

| Ação | O que faz |
|---|---|
| índice(nome) | IPCA, IGP-M, INPC, Selic ou CDI |
| .acumulado(de, até) | variação acumulada no período, em % |
| .fator(de, até) | o multiplicador: 1 + acumulado ÷ 100 |
| .série(de, até) | lista de {data, valor} |
| valor.corrigido(índice, de, até) | o valor corrigido pelo índice |
| cotação(moeda, dia) | dólar ou euro, cotação de venda |

## Salvar resultados

`salve("nome.xlsx", lista)` gera um arquivo com o resultado. Tabelas saem em `.xlsx` ou `.csv` (no padrão do Excel brasileiro); textos em `.txt` ou `.md`; dados em `.json`. No editor, aparece um botão para baixar ou copiar.

```cordel
vendas = tabela("vendas_exemplo.csv")
grandes = vendas.filtre(v => v.total > 3000)
salve("vendas_grandes.xlsx", grandes)
salve("notas.txt", grandes.transforme(v => v.nota))
```

## Erros e testes

`falhe` interrompe com uma mensagem; `tente … falhou` trata o problema. `teste` agrupa verificações que rodam depois do programa, e cada `confira` mostra os dois lados quando falha.

```cordel
função sacar(saldo, valor)
  se valor > saldo
    falhe "Saldo insuficiente"
  fim
  devolva saldo - valor
fim

tente
  mostre sacar(100, 30)
  mostre sacar(100, 500)
falhou erro
  mostre "Não deu: {erro}"
fim

teste "saque normal"
  confira sacar(100, 30) == 70
fim
```

## Funções prontas

`pergunte("…")` pede uma resposta a quem usa o programa; experimente no editor com o exemplo *Pergunte e responda*. `número` entende o formato brasileiro, inclusive com R$.

```cordel
mostre número("R$ 1.234,56") + 1
mostre texto(42) + " anos"
mostre tipo([1, 2]), tipo("oi"), tipo(3)
mostre intervalo(1, 5)
mostre aleatório(1, 6)
```
