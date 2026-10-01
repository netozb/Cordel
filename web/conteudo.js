const CONTEUDO = {
exemplos: [
  // O código de cada exemplo fica em exemplos/<id>.cordel e entra na página ao construir.
  { id: 'tour', nome: 'Tour rápido' },
  { id: 'tarefas', nome: 'App: lista de tarefas' },
  { id: 'parcelas', nome: 'App: simulador de parcelas' },
  { id: 'site', nome: 'Site: página de apresentação' },
  { id: 'painel', nome: 'App: painel de vendas' },
  { id: 'catalogo', nome: 'App: catálogo com páginas' },
  { id: 'prazos', nome: 'Prazos e vencimentos' },
  { id: 'auditoria', nome: 'Auditoria de planilha' },
  { id: 'conciliacao', nome: 'Conciliação de vendas com o extrato' },
  { id: 'horarios', nome: 'Horários na auditoria' },
  { id: 'regras', nome: 'Módulo: regras de auditoria' },
  { id: 'cnpj', nome: 'App: consulta de CNPJ (internet)' },
  { id: 'caixa', nome: 'Conferência de caixa' },
  { id: 'dinheiro', nome: 'Parcelas, rateio e juros' },
  { id: 'testes', nome: 'Testes embutidos' },
  { id: 'adivinha', nome: 'Jogo de adivinhação' },
  { id: 'pergunte', nome: 'Pergunte e responda' },
  { id: 'estrofe', nome: 'Estrofe de cordel' },
  { id: 'erros', nome: 'Erros que ensinam' },
],

principios: [
  ['Contas exatas', 'Números são guardados como frações exatas. <code>0.1 + 0.2</code> dá <code>0.3</code>, e somas de dinheiro nunca perdem centavo.'],
  ['Escreva como fala', 'Palavras em português. Acento e maiúscula não importam: <code>preço</code>, <code>preco</code> e <code>PREÇO</code> são o mesmo nome. Aspas curvas do teclado do celular funcionam. O primeiro item de uma lista é <code>lista[1]</code>.'],
  ['Fixo por padrão', 'O que é criado com <code>=</code> não muda mais. Para algo que precisa mudar, use <code>var</code>. Só de olhar, você sabe o que se altera no programa.'],
  ['Cópias seguras', 'Mudar a cópia de uma lista ou registro nunca altera o original. Some uma classe inteira de erros difíceis de achar.'],
  ['Sites e apps em português', 'Descreva a tela com <code>título</code>, <code>botão</code> e <code>campo</code>. Ela se redesenha sozinha quando os dados mudam, e um toque gera o app pronto num arquivo .html.'],
  ['Erros que ensinam', 'Mensagens em português com a linha, o motivo e uma sugestão: <em>“Listas não têm somar. Você quis dizer soma?”</em>'],
  ['Testes de fábrica', '<code>teste</code> e <code>confira</code> fazem parte da linguagem. Provar que uma regra funciona é tão fácil quanto escrevê-la.'],
  ['Planilhas de primeira', '<code>tabela("vendas.xlsx")</code> lê CSV e Excel como uma lista de registros. Entende <code>R$ 1.234,56</code>, mantém códigos como <code>00123</code> e pula linhas de título.'],
  ['Seus dados ficam com você', 'As planilhas são lidas no próprio aparelho. Nada é enviado para servidor nenhum, o que importa para dados de empresa.'],
  ['Veja o programa pensar', 'A máquina do tempo roda o programa passo a passo. Arraste e veja cada linha acontecer e o valor de cada variável naquele instante.'],
  ['Descreva e o Claude escreve', 'Conte em português o que você quer. O Claude escreve em Cordel e o próprio interpretador confere o código antes de entregar.'],
  ['Pouco para decorar', '25 palavras reservadas. Todo bloco termina com <code>fim</code>. Não há ponto e vírgula nem chaves para abrir e fechar blocos.'],
],

guia: [
{ id: 'primeiros', titulo: 'Primeiros passos',
  texto: '<p><code>mostre</code> exibe valores. Dentro de um texto, <code>{…}</code> encaixa o valor de qualquer expressão. Tudo depois de <code>#</code> é comentário.</p>',
  codigo: `mostre "Olá, mundo!"
nome = "Ana"
mostre "Olá, {nome}! Hoje é dia de programar."
mostre 2 + 3 * 4  # 14: multiplicação vem antes` },
{ id: 'var', titulo: 'Fixo e var',
  texto: '<p>Um nome criado com <code>=</code> é fixo. Se ele precisa mudar, crie com <code>var</code>. Depois, <code>+=</code>, <code>-=</code>, <code>*=</code> e <code>/=</code> atualizam o valor.</p>',
  codigo: `taxa = 0.05
var saldo = 100
saldo = saldo + saldo * taxa
saldo += 10
mostre saldo` },
{ id: 'numeros', titulo: 'Números',
  texto: '<p>Operações: <code>+</code> <code>-</code> <code>*</code> <code>/</code>, <code>%</code> (resto) e <code>^</code> (potência). Decimais usam ponto: <code>3.5</code>. Só raiz e potência fracionária são aproximadas.</p>',
  codigo: `mostre 0.1 + 0.2 == 0.3
mostre 1 / 3 * 3
mostre 2 ^ 64
mostre (10 / 3).arredondado(2)
mostre 1234.5.dinheiro
mostre 17 % 5, 16.raiz, 7.ímpar
mostre 100.reparta(3), 1000.reparta([3, 1, 1])`,
  acoes: [['arredondado(casas)', 'arredonda; sem casas, para inteiro'], ['dinheiro', 'formata em reais: R$ 1.234,50'], ['reparta(n) · reparta(pesos)', 'divide sem perder centavo: 100 em 3 dá 33,34 + 33,33 + 33,33'], ['raiz', 'raiz quadrada'], ['absoluto', 'tira o sinal'], ['inteiro', 'corta a parte decimal'], ['par · ímpar', 'verdadeiro ou falso']] },
{ id: 'textos', titulo: 'Textos',
  texto: '<p>Textos ficam entre aspas. <code>+</code> junta dois textos; para misturar com números, use <code>{…}</code>.</p>',
  codigo: `frase = "  Cordel é poesia  "
limpo = frase.aparado
mostre limpo.maiúsculas
mostre limpo.palavras.tamanho, "palavras"
mostre limpo.troque("poesia", "código")
mostre "a,b,c".divida(",")`,
  acoes: [['tamanho', 'quantidade de letras'], ['maiúsculas · minúsculas', 'muda a caixa'], ['aparado', 'tira espaços das pontas'], ['palavras · letras', 'quebra em lista'], ['divida(sep)', 'quebra no separador'], ['troque(a, b)', 'troca todo a por b'], ['contém(t)', 'verdadeiro se t aparece'], ['começa_com(t) · termina_com(t)', 'confere as pontas'], ['invertido', 'de trás para frente']] },
{ id: 'datas', titulo: 'Datas',
  texto: '<p><code>hoje()</code> dá a data de hoje e <code>data("26/09/2026")</code> cria uma data. Somar um número soma dias; subtrair duas datas dá os dias entre elas. Nas planilhas, colunas com datas como 03/09/2026 já chegam como datas.</p>',
  codigo: `vencimento = data("31/01/2026")
mostre vencimento + 30
mostre vencimento.mais_meses(1)
mostre data("26/09/2026") - vencimento, "dias"
mostre vencimento.dia_da_semana, vencimento.nome_do_mês
mostre vencimento.fim_do_mês, vencimento.útil`,
  acoes: [['dia · mês · ano', 'as partes da data'], ['dia_da_semana · nome_do_mês', 'por extenso: "sábado", "janeiro"'], ['mês_ano · trimestre', 'para agrupar: "2026-01", 1'], ['formatada · por_extenso', '"31/01/2026", "31 de janeiro de 2026"'], ['início_do_mês · fim_do_mês', 'os limites do mês'], ['mais_meses(n)', 'soma meses, respeitando o fim do mês'], ['útil', 'verdadeiro de segunda a sexta']] },
{ id: 'horas', titulo: 'Datas com hora',
  texto: '<p><code>agora()</code> dá a data e a hora deste instante, e <code>data("03/09/2026 14:30")</code> cria uma data com hora (também aceita <code>"03/09/2026 às 14h30"</code> e <code>"2026-09-03T14:30:00"</code>). As contas são exatas, ao segundo: <code>minutos_até</code>, <code>horas_até</code> e <code>dias_até</code> medem o tempo entre dois momentos, e <code>mais_horas</code> e <code>mais_minutos</code> andam no tempo, virando o dia quando precisa. Nas planilhas, colunas como 03/09/2026 08:15 chegam como datas com hora, prontas para achar vendas fora do horário ou cancelamentos minutos depois da venda.</p>',
  codigo: `entrada = data("03/09/2026 08:15")
saída = data("03/09/2026 17:40")
mostre entrada.horário, saída.horário, saída.dia_da_semana
mostre entrada.minutos_até(saída), "minutos"
mostre entrada.horas_até(saída).arredondado(2), "horas"
mostre entrada.mais_horas(9.5)
mostre entrada.hora >= 8 e saída.hora < 18
mostre saída.sem_hora == data("03/09/2026")`,
  acoes: [['agora()', 'a data e a hora deste instante'], ['hora · minuto · segundo', 'as partes do horário'], ['horário', 'o horário como texto: "14:30"'], ['sem_hora', 'só o dia, para agrupar por data'], ['mais_horas(n) · mais_minutos(n)', 'anda no tempo; aceita frações, como 1.5'], ['minutos_até(outra) · horas_até(outra) · dias_até(outra)', 'o tempo até outra data, exato e negativo se ela vem antes'], ['data(dia, "14:30")', 'junta uma data e uma hora vindas de colunas separadas']] },
{ id: 'decisoes', titulo: 'Decisões',
  texto: '<p>Compare com <code>==</code> <code>!=</code> <code>&lt;</code> <code>&gt;</code> <code>&lt;=</code> <code>&gt;=</code> ou com a palavra <code>é</code>. Junte condições com <code>e</code>, <code>ou</code>, <code>não</code>. Comparações podem ser encadeadas, como na matemática.</p>',
  codigo: `temperatura = 36
se temperatura >= 35
  mostre "Calor de sertão"
senão se temperatura >= 25
  mostre "Tempo bom"
senão
  mostre "Friozinho"
fim
mostre 18 <= temperatura < 40
mostre temperatura é 36 e não (temperatura > 40)` },
{ id: 'escolha', titulo: 'Escolha',
  texto: '<p>Quando um valor pode cair em vários casos. Um <code>caso</code> aceita vários valores separados por vírgula ou uma faixa com <code>até</code>.</p>',
  codigo: `nota = 8
escolha nota
  caso 10
    mostre "Perfeito"
  caso 7 até 9
    mostre "Aprovado"
  senão
    mostre "Recuperação"
fim` },
{ id: 'repeticoes', titulo: 'Repetições',
  texto: '<p>Quatro formas, cada uma com um uso claro. Dentro de qualquer uma, <code>pare</code> sai do laço e <code>continue</code> pula para a próxima volta.</p>',
  codigo: `repita 2 vezes
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
mostre n` },
{ id: 'listas', titulo: 'Listas',
  texto: '<p>Posições começam em 1. As ações devolvem uma lista nova e deixam a original intacta. Só <code>adicione</code>, <code>remova</code> e <code>limpe</code> alteram a própria lista, e só se ela foi criada com <code>var</code>.</p>',
  codigo: `vendas = [120, 80, 250, 80, 40]
mostre vendas.tamanho, vendas.soma, vendas.média
mostre vendas.ordenada, vendas.única
mostre vendas.filtre(v => v > 100)
mostre vendas.transforme(v => v * 2)
mostre vendas[1], vendas.último
var fila = ["Ana"]
fila.adicione("Bia")
mostre fila`,
  acoes: [['tamanho · vazia', 'quantos itens · se não tem nenhum'], ['soma · média · maior · menor', 'resumos (soma e média aceitam função)'], ['primeiro · último', 'as pontas'], ['ordenada · ordenada(f)', 'em ordem, ou pela chave f'], ['filtre(f)', 'só os itens em que f é verdadeiro'], ['transforme(f)', 'aplica f em cada item'], ['conte(f) · algum(f) · todos(f)', 'contagem e testes'], ['contém(x) · posição(x)', 'procura'], ['única · invertida', 'sem repetidos · ao contrário'], ['pegue(n) · pule(n)', 'os n primeiros · o resto'], ['junte(sep)', 'vira um texto'], ['adicione(x) · remova(x) · limpe', 'alteram a lista (var)']] },
{ id: 'registros', titulo: 'Registros',
  texto: '<p>Um registro agrupa campos com nome. Copiar é seguro: mudar a cópia não mexe no original.</p>',
  codigo: `produto = {nome: "Sofá 3 lugares", preço: 2499.90, estoque: 4}
mostre produto.nome
mostre (produto.preço * produto.estoque).dinheiro
var item = produto
item.estoque -= 1
mostre item.estoque, produto.estoque
mostre produto.campos` },
{ id: 'modulos', titulo: 'Módulos',
  texto: '<p>Um programa usa as funções e os nomes de outro com <code>use "nome"</code>. No editor, o nome é o de outro programa seu em <em>Meus programas</em> (ou de um exemplo, como <code>"regras"</code>); no computador e no VS Code, é outro arquivo <code>.cordel</code> na mesma pasta. O módulo roda uma vez, sem mostrar nada e sem rodar os testes dele, e nomes que começam com <code>_</code> ficam só lá dentro. Com <code>como</code>, tudo fica sob um nome só e nada se mistura com os nomes do programa.</p>',
  codigo: `use "regras"
use "regras" como r

vendas = tabela("vendas_exemplo.csv")
mostre vendas.conte(desconto_alto), "notas com desconto acima de {limite_de_desconto}%"
mostre r.calculado(vendas[1]).dinheiro`,
  acoes: [['use "nome"', 'traz as funções e os nomes do módulo'], ['use "nome" como m', 'tudo fica em m: m.calculado(v), m.limite_de_desconto'], ['_nome', 'fica só dentro do módulo que o criou']] },
{ id: 'funcoes', titulo: 'Funções',
  texto: '<p>Função curta em uma linha com <code>=</code>, função longa em bloco com <code>devolva</code>. Para passar uma regra a outra função, use a forma rápida <code>x =&gt; …</code>.</p>',
  codigo: `função dobro(x) = x * 2

função com_juros(valor, taxa, meses)
  devolva (valor * (1 + taxa) ^ meses).arredondado(2)
fim

mostre dobro(21)
mostre com_juros(1000, 0.02, 6)
quadrado = x => x * x
mostre [1, 2, 3].transforme(quadrado)` },
{ id: 'telas', titulo: 'Telas: sites e apps',
  texto: '<p>Um bloco <code>tela</code> descreve o que aparece, de cima para baixo. <code>cartão</code> agrupa itens numa caixa e <code>linha</code> coloca itens lado a lado. Tudo que funciona fora da tela funciona dentro dela: <code>se</code>, <code>para cada</code> e funções, que viram componentes reaproveitáveis.</p>',
  codigo: `produtos = [{nome: "Sofá 3 lugares", preço: 2499.9}, {nome: "Rack", preço: 399}]
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
fim`,
  acoes: [['título · subtítulo', 'textos de destaque'], ['mostre', 'texto; vira tabela se for lista de registros'], ['cartão … fim', 'caixa que agrupa itens'], ['linha … fim', 'itens lado a lado'], ['link "texto" para "https://…"', 'abre outro endereço'], ['espaço', 'respiro entre blocos'], ['cor "verde"', 'azul, anil, verde, caatinga, vermelho, urucum, laranja, amarelo, roxo, rosa, preto, cinza, marrom ou um código como "#1E7A4C"']] },
{ id: 'interacao', titulo: 'Botões e campos',
  texto: '<p><code>botão</code> roda o bloco dele quando tocado. <code>campo</code>, <code>marque</code> e <code>seletor</code> ligam o que a pessoa digita, marca ou escolhe a uma variável criada com <code>var</code>. Depois de cada toque a tela inteira é redesenhada com os valores novos, sem você atualizar nada à mão.</p>',
  codigo: `var nome = ""
var vezes = 0
tela "Olá"
  campo "Seu nome" em nome
  botão "Cumprimentar"
    vezes += 1
  fim
  se vezes > 0 e nome != ""
    mostre "Olá, {nome}! Você tocou {vezes} vez(es)."
  fim
fim`,
  acoes: [['botão "texto" … fim', 'o bloco roda a cada toque'], ['campo "rótulo" em x', 'texto ou número, conforme o valor de x'], ['marque "rótulo" em x', 'caixa de marcar (x é verdadeiro ou falso)'], ['seletor "rótulo" em x de lista', 'escolhe uma opção da lista']] },
{ id: 'paginas', titulo: 'Páginas e navegação',
  texto: '<p>Dentro da tela, cada <code>página "Nome" … fim</code> é uma página do app; a primeira é a inicial. Num botão, <code>vá para "Nome"</code> troca de página e <code>volte</code> retorna, e a barra do app ganha a seta de voltar. <code>abas</code> mostra as páginas como abas no topo.</p>',
  codigo: `cidades = ["Iguatu", "Crato", "Sobral"]
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
fim`,
  acoes: [['página "Nome" … fim', 'uma página do app'], ['vá para "Nome"', 'troca de página (dentro de um botão)'], ['volte', 'retorna à página anterior'], ['abas', 'mostra as páginas como abas']] },
{ id: 'publicar', titulo: 'Memória e publicação',
  texto: '<p><code>guardado("nome", padrão)</code> lê o que o app guardou neste aparelho (ou o padrão, na primeira vez) e <code>guarde("nome", valor)</code> grava. Como a tela é redesenhada a cada toque, um <code>guarde</code> dentro dela salva sempre. No editor, <strong>Baixar app</strong> gera um arquivo <code>.html</code> com tudo dentro, inclusive as planilhas que o app usa: dá para abrir no celular, mandar para alguém ou publicar em qualquer hospedagem de sites, com o nome <code>index.html</code>.</p>',
  codigo: `visitas = guardado("visitas", 0) + 1
tela "Memória"
  guarde("visitas", visitas)
  mostre "Esta é a visita número {visitas} neste aparelho."
fim`,
  acoes: [['guardado(nome, padrão)', 'lê a memória do app'], ['guarde(nome, valor)', 'grava na memória do app']] },
{ id: 'maquina', titulo: 'Máquina do tempo',
  texto: '<p>No editor, <strong>Passo a passo</strong> roda o programa guardando cada passo: a linha que rodou, a decisão tomada (<code>se: verdadeiro</code>), a volta do laço (<code>para: i = 3</code>), a chamada de função e o valor devolvido. Arraste o controle para ir e voltar no tempo; a linha fica marcada no código e as variáveis que acabaram de mudar aparecem destacadas. Abra este trecho no editor e experimente.</p>',
  codigo: `função fatorial(n)
  se n <= 1
    devolva 1
  fim
  devolva n * fatorial(n - 1)
fim
var soma = 0
para i de 1 até 4
  soma += fatorial(i)
fim
mostre soma` },
{ id: 'claude', titulo: 'Descreva e o Claude escreve',
  texto: '<p>No editor, <strong>Descrever</strong> abre um campo onde você conta, em português, o programa ou a mudança que quer. O Claude escreve em Cordel e o código aparece no editor enquanto é escrito. Antes de entregar, o próprio interpretador roda o programa; se achar um erro, devolve a mensagem ao Claude para corrigir, até duas vezes. Quando um erro aparece na saída, o botão <strong>Corrigir com o Claude</strong> faz o mesmo com o seu código. O botão só aparece quando a página consegue falar com o Claude, e cada pedido usa a sua conta.</p>' },
{ id: 'planilhas', titulo: 'Planilhas',
  texto: '<p>Adicione um arquivo CSV ou Excel no painel <em>Arquivos</em> do editor e leia com <code>tabela("nome")</code>. Cada linha vira um registro e cada coluna vira um campo: <em>Valor Unitário</em> vira <code>valor_unitário</code>. Números no formato brasileiro viram números de verdade; códigos com zero à esquerda, CPF e CNPJ continuam texto; células vazias viram <code>""</code>.</p>',
  codigo: `vendas = tabela("vendas_exemplo.csv")
mostre vendas.tamanho, "notas"
mostre vendas.pegue(3)
mostre vendas.soma(v => v.total).dinheiro`,
  acoes: [['tabela(arquivo)', 'lê a planilha como lista de registros'], ['tabela(arquivo, aba)', 'escolhe a aba de um Excel'], ['abas(arquivo)', 'nomes das abas'], ['leia(arquivo)', 'o conteúdo como texto'], ['arquivos()', 'nomes dos arquivos adicionados']] },
{ id: 'agrupar', titulo: 'Agrupar e resumir',
  texto: '<p><code>agrupe</code> junta os itens que têm a mesma chave. Cada grupo é um registro com <code>chave</code>, <code>quantidade</code> e <code>itens</code>. Quando <code>mostre</code> recebe uma lista de registros, a saída vira tabela.</p>',
  codigo: `vendas = tabela("vendas_exemplo.csv")
por_vendedor = vendas.agrupe(v => v.vendedor).transforme(g => {
  vendedor: g.chave,
  notas: g.quantidade,
  total: g.itens.soma(v => v.total),
})
mostre por_vendedor.ordenada(r => r.total).invertida.pegue(4)` },
{ id: 'origem', titulo: 'De onde veio cada número',
  texto: '<p>Cada número, data e linha lido de uma planilha lembra de onde veio, e as contas levam essa lembrança adiante. <code>total.origem</code> diz quais células formaram o total; <code>total.linhas_de_origem</code> devolve as linhas da planilha que entraram na conta. Registros montados a partir das linhas, como uma lista de achados, também guardam a origem: cada achado sabe a linha que o gerou.</p><p>No editor, os valores com origem aparecem sublinhados: toque num número mostrado, ou numa linha de tabela, para ver as células e as linhas de onde ele veio. No computador, <code>cordel rodar programa.cordel --origens</code> escreve a origem de cada resultado. Valores da internet e dos índices do Banco Central também dizem de onde vieram.</p>',
  codigo: `vendas = tabela("vendas_exemplo.csv")
crato = vendas.filtre(v => v.filial == "Crato")
total = crato.soma(v => v.total)
mostre total.dinheiro
mostre total.origem
mostre total.linhas_de_origem.pegue(3)`,
  acoes: [['valor.origem', 'texto: de que planilha, colunas e linhas o valor veio'], ['valor.linhas_de_origem', 'as linhas das planilhas que formaram o valor'], ['cordel rodar … --origens', 'no terminal, a origem de cada resultado']] },
{ id: 'conciliacao', titulo: 'Conciliar duas tabelas',
  texto: '<p><code>concilie(a, b, regras)</code> casa cada registro de <code>a</code> com no máximo um de <code>b</code>: vendas com o extrato do banco, notas com pedidos, o estoque de ontem com o de hoje. Em <code>por</code> vão os campos que precisam bater; quando o nome muda de uma tabela para a outra, use um registro, como <code>{total: "valor"}</code>. <code>folga_de_dias</code> e <code>folga_de_valor</code> aceitam pequenas diferenças em datas e números, e <code>compare</code> lista campos conferidos depois de casar.</p><p>O resultado traz <code>resumo</code>, <code>pares</code> (cada um com <code>primeiro</code>, <code>segundo</code> e a <code>diferença</code> explicada), <code>com_diferença</code> (valores ou campos de <code>compare</code> diferentes), <code>só_no_primeiro</code> e <code>só_no_segundo</code>. Nenhum par possível se perde, e entre vários candidatos fica o mais próximo.</p>',
  codigo: `vendas = tabela("vendas_exemplo.csv")
extrato = tabela("extrato_exemplo.csv")
r = concilie(vendas, extrato, {por: {total: "valor", data: "data"}, folga_de_dias: 2, folga_de_valor: 0.10})
mostre r.resumo
mostre r.só_no_primeiro.transforme(v => {nota: v.nota, data: v.data, total: v.total})
mostre r.com_diferença.transforme(p => {nota: p.primeiro.nota, diferença: p.diferença})`,
  acoes: [['por: ["valor", "data"]', 'campos que precisam bater (mesmo nome nas duas)'], ['por: {total: "valor"}', 'campo do primeiro: campo do segundo'], ['folga_de_dias · folga_de_valor', 'diferença aceita em datas e em números'], ['compare: ["filial"]', 'campos conferidos depois de casar'], ['r.pares · r.com_diferença', 'registros {primeiro, segundo, diferença, dias, diferença_de_valor}'], ['r.só_no_primeiro · r.só_no_segundo', 'o que ficou sem par']] },
{ id: 'graficos', titulo: 'Gráficos',
  texto: '<p><code>gráfico "Título" de lista por campo</code> desenha barras, uma para cada item. O nome de cada barra vem do primeiro campo de texto. Funciona no console e dentro de telas, e aceita também uma lista de números ou um registro com números.</p>',
  codigo: `vendas = tabela("vendas_exemplo.csv")
por_filial = vendas.agrupe(v => v.filial).transforme(g => {
  filial: g.chave,
  total: g.itens.soma(v => v.total),
})
gráfico "Vendas por filial" de por_filial.ordenada(f => f.total).invertida por total` },
{ id: 'internet', titulo: 'Dados da internet', internet: true,
  texto: '<p><code>busque("https://…")</code> lê um endereço da internet. Respostas em JSON, o formato da maioria das APIs, viram registros, listas e números exatos (sem arredondar nenhuma casa); o resto chega como texto. <code>tabela("https://…")</code> lê uma planilha CSV publicada, como uma planilha do Google publicada na web. Numa execução, cada endereço é buscado uma vez; nos apps, a tela não trava enquanto a resposta não chega. No computador, com <code>cordel rodar</code>, qualquer endereço funciona; no navegador, só os de sites que permitem acesso de outras páginas, como a BrasilAPI.</p>',
  codigo: `empresa = busque("https://brasilapi.com.br/api/cnpj/v1/00000000000191")
mostre empresa.razao_social
mostre empresa.descricao_situacao_cadastral
mostre empresa.campos`,
  acoes: [['busque(endereço)', 'JSON vira registros e listas; o resto, texto'], ['busque(endereço, {cabeçalhos: {…}})', 'envia cabeçalhos, como uma chave de acesso'], ['tabela("https://….csv")', 'uma planilha publicada na internet'], ['registro.campos', 'os nomes dos campos que vieram']] },
{ id: 'indices', titulo: 'Índices e cotações', internet: true,
  texto: '<p><code>índice("IPCA")</code> usa a série oficial do Banco Central: <code>.acumulado(de, até)</code> dá a variação acumulada em %, <code>.fator(de, até)</code> o multiplicador e <code>.série(de, até)</code> o valor de cada mês ou dia. Para corrigir um valor, <code>aluguel.corrigido("IGP-M", de, até)</code>. Os índices mensais (IPCA, IGP-M e INPC) contam do mês inicial ao final, inclusive; Selic e CDI contam os dias úteis do início até a véspera do fim, como juros. <code>cotação("dólar", dia)</code> dá a cotação de venda do dia, ou do último dia útil antes dele.</p><p>As contas são exatas, e o resultado diz de onde veio: <code>novo.origem</code>. Precisa de internet: no computador sempre funciona; no navegador, depende de o Banco Central permitir o acesso.</p>',
  codigo: `ipca = índice("IPCA")
mostre ipca.acumulado(data("01/01/2025"), data("31/12/2025")).arredondado(2), "%"
aluguel = 1500
novo = aluguel.corrigido("IGP-M", data("01/09/2025"), data("31/08/2026"))
mostre novo.dinheiro, "·", novo.origem
mostre cotação("dólar", data("28/08/2026"))`,
  acoes: [['índice(nome)', 'IPCA, IGP-M, INPC, Selic ou CDI'], ['.acumulado(de, até)', 'variação acumulada no período, em %'], ['.fator(de, até)', 'o multiplicador: 1 + acumulado ÷ 100'], ['.série(de, até)', 'lista de {data, valor}'], ['valor.corrigido(índice, de, até)', 'o valor corrigido pelo índice'], ['cotação(moeda, dia)', 'dólar ou euro, cotação de venda']] },
{ id: 'salvar', titulo: 'Salvar resultados',
  texto: '<p><code>salve("nome.xlsx", lista)</code> gera um arquivo com o resultado. Tabelas saem em <code>.xlsx</code> ou <code>.csv</code> (no padrão do Excel brasileiro); textos em <code>.txt</code> ou <code>.md</code>; dados em <code>.json</code>. No editor, aparece um botão para baixar ou copiar.</p>',
  codigo: `vendas = tabela("vendas_exemplo.csv")
grandes = vendas.filtre(v => v.total > 3000)
salve("vendas_grandes.xlsx", grandes)
salve("notas.txt", grandes.transforme(v => v.nota))` },
{ id: 'erros', titulo: 'Erros e testes',
  texto: '<p><code>falhe</code> interrompe com uma mensagem; <code>tente … falhou</code> trata o problema. <code>teste</code> agrupa verificações que rodam depois do programa, e cada <code>confira</code> mostra os dois lados quando falha.</p>',
  codigo: `função sacar(saldo, valor)
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
fim` },
{ id: 'prontas', titulo: 'Funções prontas',
  texto: '<p><code>pergunte("…")</code> pede uma resposta a quem usa o programa; experimente no editor com o exemplo <em>Pergunte e responda</em>. <code>número</code> entende o formato brasileiro, inclusive com R$.</p>',
  codigo: `mostre número("R$ 1.234,56") + 1
mostre texto(42) + " anos"
mostre tipo([1, 2]), tipo("oi"), tipo(3)
mostre intervalo(1, 5)
mostre aleatório(1, 6)` },
],

// Explicação curta de cada palavra reservada (usada pela extensão do VS Code ao passar o mouse).
docPalavras: {
  mostre: 'Mostra valores na saída, ou um texto na tela de um app: `mostre "Total:", total`.',
  var: 'Cria um nome que pode mudar depois. Sem `var`, o nome é fixo.',
  se: 'Decisão: `se condição` … `senão se` … `senão` … `fim`.',
  'senão': 'O caminho alternativo de um `se`, ou o caso padrão de um `escolha`.',
  fim: 'Fecha o bloco aberto por `se`, `para`, `função`, `tela`, `botão`…',
  escolha: 'Compara um valor com vários casos: `escolha nota` / `caso 10` / `caso 7 até 9` / `senão` / `fim`.',
  caso: 'Um caso de `escolha`. Aceita vários valores (`caso 1, 2`) e faixas (`caso 7 até 9`).',
  repita: 'Repete um bloco um número de vezes: `repita 3 vezes` … `fim`.',
  para: 'Laço com contador (`para i de 1 até 10`, com `passo` opcional) ou por itens (`para cada x em lista`).',
  enquanto: 'Repete o bloco enquanto a condição for verdadeira.',
  pare: 'Sai do laço atual.',
  continue: 'Pula para a próxima volta do laço atual.',
  'função': 'Cria uma função: `função dobro(x) = x * 2`, ou com bloco e `devolva`.',
  devolva: 'Devolve o resultado de uma função e sai dela.',
  tente: 'Roda um bloco que pode dar erro; se der, roda o bloco de `falhou`.',
  falhou: 'Parte de `tente` que roda quando algo dá errado: `falhou erro` guarda a mensagem em `erro`.',
  falhe: 'Interrompe com uma mensagem de erro sua: `falhe "Saldo insuficiente"`.',
  teste: 'Teste embutido: `teste "descrição"` … `confira` … `fim`. Roda com o programa ou com `cordel testar`.',
  confira: 'Confere que uma condição é verdadeira; se não for, mostra os valores envolvidos.',
  tela: 'Descreve a tela de um site ou app. O bloco roda de novo a cada toque. No máximo uma por programa.',
  e: 'Verdadeiro se os dois lados forem verdadeiros (o segundo só é avaliado se preciso).',
  ou: 'Verdadeiro se pelo menos um lado for verdadeiro (o segundo só é avaliado se preciso).',
  'não': 'Inverte um valor lógico.',
  verdadeiro: 'Valor lógico verdadeiro.',
  falso: 'Valor lógico falso.',
},

palavras: ['mostre', 'var', 'se', 'senão', 'fim', 'escolha', 'caso', 'repita', 'para', 'enquanto', 'pare', 'continue', 'função', 'devolva', 'tente', 'falhou', 'falhe', 'teste', 'confira', 'tela', 'e', 'ou', 'não', 'verdadeiro', 'falso'],
contexto: ['de', 'até', 'passo', 'cada', 'em', 'vezes', 'então', 'faça', 'é', 'título', 'subtítulo', 'botão', 'campo', 'marque', 'seletor', 'link', 'cartão', 'linha', 'cor', 'espaço', 'página', 'abas', 'vá', 'volte', 'gráfico', 'por', 'use', 'como'],
};
if (typeof module !== 'undefined') module.exports = CONTEUDO;

// ───────── Referência formal ─────────
CONTEUDO.docFuncoes = {
  'número': ['número(texto)', 'Converte um texto em número. Entende "42", "3.5", "1.234,56" e "R$ 10,50".'],
  'texto': ['texto(valor)', 'Converte qualquer valor em texto.'],
  'hoje': ['hoje()', 'A data de hoje, no relógio do aparelho.'],
  'agora': ['agora()', 'A data e a hora deste instante, no relógio do aparelho.'],
  'data': ['data(texto) · data(dia, hora) · data(ano, mês, dia[, hora, minuto])', 'Cria uma data, com ou sem hora, a partir de "dd/mm/aaaa", "dd/mm/aaaa hh:mm", "aaaa-mm-ddThh:mm", de uma data e uma hora ("14:30") ou de números.'],
  'tipo': ['tipo(valor)', 'O nome do tipo: "número", "texto", "lógico", "lista", "registro", "data" ou "função".'],
  'aleatório': ['aleatório(a, b)', 'Um inteiro sorteado entre a e b, incluindo os dois.'],
  'intervalo': ['intervalo(a, b)', 'A lista de a até b, de 1 em 1. Vazia se a > b.'],
  'pergunte': ['pergunte([pergunta])', 'Pede uma resposta a quem usa o programa e devolve o texto digitado. Não existe em programas com tela.'],
  'guarde': ['guarde(nome, valor)', 'Grava um valor na memória do app, neste aparelho. Só em programas com tela.'],
  'guardado': ['guardado(nome, padrão)', 'Lê a memória do app; devolve o padrão se não houver nada guardado.'],
  'arquivos': ['arquivos()', 'Os nomes dos arquivos adicionados no painel Arquivos.'],
  'abas': ['abas(arquivo)', 'Os nomes das abas de uma planilha do Excel.'],
  'leia': ['leia(arquivo)', 'O conteúdo de um arquivo de texto ou CSV, como texto.'],
  'tabela': ['tabela(arquivo[, aba]) · tabela("https://…")', 'Lê uma planilha CSV ou Excel como lista de registros; com um endereço, lê um CSV (ou um JSON com uma lista de registros) da internet.'],
  'busque': ['busque(endereço[, {cabeçalhos: {…}}])', 'Lê um endereço da internet: JSON vira registros, listas e números exatos; o resto vira texto.'],
  'salve': ['salve(nome, valor)', 'Gera um arquivo .xlsx, .csv, .txt, .md ou .json para baixar.'],
  'concilie': ['concilie(a, b, {por, folga_de_dias, folga_de_valor, compare})', 'Casa cada registro de a com no máximo um de b. Devolve {resumo, pares, com_diferença, só_no_primeiro, só_no_segundo}.'],
  'índice': ['índice(nome)', 'Um índice oficial do Banco Central (IPCA, IGP-M, INPC, Selic, CDI), com .acumulado(de, até), .fator(de, até) e .série(de, até).'],
  'cotação': ['cotação(moeda, dia)', 'A cotação de venda do dólar ou do euro no dia (ou no último dia útil antes), pelo Banco Central.'],
};
CONTEUDO.docMetodos = {
  'lista:tamanho': ['', 'Quantidade de itens.'], 'lista:vazia': ['', 'verdadeiro se não há itens.'],
  'lista:primeiro': ['', 'O primeiro item.'], 'lista:último': ['', 'O último item.'],
  'lista:soma': ['[(f)]', 'Soma dos itens, ou de f(item).'], 'lista:média': ['[(f)]', 'Média dos itens, ou de f(item).'],
  'lista:maior': ['', 'O maior item.'], 'lista:menor': ['', 'O menor item.'],
  'lista:ordenada': ['[(f)]', 'Nova lista em ordem crescente, ou pela chave f(item). Estável.'],
  'lista:invertida': ['', 'Nova lista de trás para frente.'],
  'lista:contém': ['(x)', 'verdadeiro se algum item é igual a x.'], 'lista:posição': ['(x)', 'Posição do primeiro item igual a x, ou 0.'],
  'lista:filtre': ['(f)', 'Nova lista só com os itens em que f(item) é verdadeiro.'],
  'lista:transforme': ['(f)', 'Nova lista com f(item) no lugar de cada item.'],
  'lista:conte': ['(f)', 'Quantos itens tornam f(item) verdadeiro.'], 'lista:algum': ['(f)', 'verdadeiro se f(item) vale para algum item.'],
  'lista:todos': ['(f)', 'verdadeiro se f(item) vale para todos.'], 'lista:junte': ['[(separador)]', 'Um texto com os itens separados (padrão ", ").'],
  'lista:pegue': ['(n)', 'Os n primeiros itens.'], 'lista:pule': ['(n)', 'Tudo depois dos n primeiros.'],
  'lista:única': ['', 'Nova lista sem itens repetidos.'],
  'lista:agrupe': ['(f)', 'Lista de registros {chave, quantidade, itens}, um por valor distinto de f(item).'],
  'lista:adicione': ['(x)', 'Põe x no fim da lista. Altera a variável (precisa ser var).'],
  'lista:remova': ['(x)', 'Tira o primeiro item igual a x. Altera a variável (precisa ser var).'],
  'lista:limpe': ['', 'Esvazia a lista. Altera a variável (precisa ser var).'],
  'lista:origem': ['', 'De onde vieram os itens: planilhas, colunas e linhas.'], 'lista:linhas_de_origem': ['', 'As linhas das planilhas de onde vieram os itens.'],
  'texto:tamanho': ['', 'Quantidade de letras.'], 'texto:vazio': ['', 'verdadeiro se é "".'],
  'texto:maiúsculas': ['', 'Em maiúsculas.'], 'texto:minúsculas': ['', 'Em minúsculas.'],
  'texto:aparado': ['', 'Sem espaços nas pontas.'], 'texto:invertido': ['', 'De trás para frente.'],
  'texto:letras': ['', 'Lista das letras.'], 'texto:palavras': ['', 'Lista das palavras.'],
  'texto:contém': ['(t)', 'verdadeiro se t aparece no texto.'], 'texto:começa_com': ['(t)', 'verdadeiro se começa com t.'],
  'texto:termina_com': ['(t)', 'verdadeiro se termina com t.'], 'texto:divida': ['(separador)', 'Lista dos pedaços entre os separadores.'],
  'texto:troque': ['(a, b)', 'Troca todo a por b.'],
  'número:arredondado': ['[(casas)]', 'Arredondado (metade para longe do zero); sem casas, para inteiro.'],
  'número:absoluto': ['', 'Sem sinal.'], 'número:inteiro': ['', 'A parte inteira (corta os decimais).'],
  'número:raiz': ['', 'Raiz quadrada; exata para quadrados perfeitos, senão com 12 casas.'],
  'número:dinheiro': ['', 'Texto em reais: "R$ 1.234,50".'], 'número:par': ['', 'verdadeiro se é inteiro par.'], 'número:ímpar': ['', 'verdadeiro se é inteiro ímpar.'],
  'número:reparta': ['(partes | pesos[, casas])', 'Divide em partes iguais ou proporcionais a uma lista de pesos, arredondando a centavos (ou a casas) sem perder nada: a soma das partes é o valor.'],
  'número:corrigido': ['(índice, de, até)', 'O valor corrigido por um índice do Banco Central no período, como aluguel.corrigido("IGP-M", de, até).'],
  'número:origem': ['', 'De onde o número veio: as células das planilhas (colunas e linhas), o endereço da internet ou o índice.'],
  'número:linhas_de_origem': ['', 'As linhas das planilhas que formaram o número.'],
  'data:dia': ['', 'Dia do mês.'], 'data:mês': ['', 'Mês (1 a 12).'], 'data:ano': ['', 'Ano.'],
  'data:dia_da_semana': ['', '"segunda-feira" … "domingo".'], 'data:nome_do_mês': ['', '"janeiro" … "dezembro".'],
  'data:trimestre': ['', '1 a 4.'], 'data:mês_ano': ['', 'Texto "aaaa-mm", bom para agrupar e ordenar.'],
  'data:formatada': ['', '"dd/mm/aaaa".'], 'data:por_extenso': ['', '"26 de setembro de 2026".'],
  'data:início_do_mês': ['', 'Primeiro dia do mês.'], 'data:fim_do_mês': ['', 'Último dia do mês.'],
  'data:mais_meses': ['(n)', 'Soma n meses; se o dia não existir no mês de destino, usa o último.'],
  'data:útil': ['', 'verdadeiro de segunda a sexta (não considera feriados).'],
  'data:hora': ['', 'Hora (0 a 23); 0 numa data sem hora.'], 'data:minuto': ['', 'Minuto (0 a 59).'], 'data:segundo': ['', 'Segundo (0 a 59).'],
  'data:horário': ['', 'O horário como texto: "14:30", ou "14:30:15" quando há segundos.'],
  'data:sem_hora': ['', 'Só o dia, sem a hora: bom para agrupar e comparar por data.'],
  'data:mais_horas': ['(n)', 'Anda n horas no tempo (aceita frações e negativos), virando o dia quando precisa.'],
  'data:mais_minutos': ['(n)', 'Anda n minutos no tempo.'],
  'data:minutos_até': ['(outra)', 'Minutos exatos até outra data; negativo se ela vem antes.'],
  'data:horas_até': ['(outra)', 'Horas exatas até outra data (frações incluídas).'],
  'data:dias_até': ['(outra)', 'Dias exatos até outra data, contando as horas.'],
  'data:origem': ['', 'De onde a data veio.'], 'data:linhas_de_origem': ['', 'As linhas das planilhas de onde a data veio.'],
  'registro:campos': ['', 'Lista dos nomes dos campos.'], 'registro:tem': ['(nome)', 'verdadeiro se o registro tem o campo.'],
  'registro:origem': ['', 'De onde o registro veio: a linha da planilha, ou tudo o que entrou nele.'], 'registro:linhas_de_origem': ['', 'As linhas das planilhas que formaram o registro.'],
};
CONTEUDO.ref = {
  gramatica: `programa      = { instrução } ;
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
argumentos    = expressão { "," expressão } [ "," ] ;`,
  precedencia: [
    ['1 (mais forte)', 'f(x) · a.b · a[i]', 'Chamada, campo ou ação, posição', 'esquerda'],
    ['2', '^', 'Potência', 'direita: 2 ^ 3 ^ 2 = 2 ^ 9'],
    ['3', '-x · +x', 'Sinal', '−2 ^ 2 = −4'],
    ['4', '* · / · %', 'Multiplicação, divisão, resto (sinal do divisor)', 'esquerda'],
    ['5', '+ · -', 'Soma e subtração; + também junta textos e listas', 'esquerda'],
    ['6', '== · != · < · > · <= · >= · é', 'Comparação; encadeável: 0 < x < 10', 'em cadeia'],
    ['7', 'não', 'Negação', '—'],
    ['8', 'e', 'Conjunção (curto-circuito)', 'esquerda'],
    ['9', 'ou', 'Disjunção (curto-circuito)', 'esquerda'],
    ['10 (mais fraca)', 'x => …', 'Função rápida', '—'],
  ],
  tipos: [
    ['número', '42 · 3.5 · 1_000_000', 'Fração exata (inteiros de qualquer tamanho). Denominadores acima de 10⁴⁰ são arredondados a 30 casas. Exibido com até 10 casas decimais.'],
    ['texto', '"Olá, {nome}"', 'Sequência de letras Unicode. Aspas duplas, simples ou curvas; {…} encaixa valores; escapes \\n, \\t, \\", \\{.'],
    ['lógico', 'verdadeiro · falso', 'Resultado de comparações. Condições só aceitam lógicos.'],
    ['lista', '[1, 2, 3]', 'Posições a partir de 1. Semântica de valor: copiar nunca compartilha.'],
    ['registro', '{nome: "Ana"}', 'Campos com nome; acesso por r.campo ou r["campo"]. Semântica de valor.'],
    ['data', 'data("26/09/2026") · data("26/09/2026 14:30")', 'Dia do calendário gregoriano, com ou sem hora (precisão de um segundo, sem fuso horário). data ± n dias; data − data = dias (com fração, se houver horas).'],
    ['função', 'função f(x) = … · x => …', 'Valor de primeira classe; captura o bloco onde foi criada.'],
  ],
  escopo: `<ul class="ref-lista">
<li><code>nome = valor</code> cria um nome <strong>fixo</strong> no bloco atual; tentar mudá-lo é erro. <code>var nome = valor</code> cria um nome que pode mudar.</li>
<li>Cada bloco (<code>se</code>, laços, <code>escolha</code>, <code>tente</code>, função, <code>tela</code>, <code>página</code>, <code>cartão</code>, <code>linha</code>, <code>botão</code>) abre um escopo novo. Nomes criados dentro dele deixam de existir no <code>fim</code>.</li>
<li>Um nome é procurado do bloco atual para fora. Atribuir a um nome de fora exige que ele seja <code>var</code>.</li>
<li>Funções são içadas dentro do bloco: podem ser chamadas antes da linha que as define. Elas enxergam os nomes do bloco onde foram criadas (fechamento léxico).</li>
<li>Parâmetros e variáveis de laço são fixos.</li>
<li>Nomes ignoram acentos e maiúsculas: <code>preço</code>, <code>preco</code> e <code>PREÇO</code> são o mesmo nome. Isso vale também para campos de registros e colunas de planilhas.</li>
</ul>`,
  modulos: `<ul class="ref-lista">
<li><code>use "nome"</code> fica no nível principal do programa (fora de blocos e funções) e traz as funções e os nomes do nível principal do módulo, exceto os que começam com <code>_</code>. Os nomes trazidos são fixos; um nome que já existe no programa é erro.</li>
<li><code>use "nome" como m</code> cria só o nome fixo <code>m</code>, um registro com o que o módulo oferece: <code>m.calculado(v)</code>, <code>m.limite</code>.</li>
<li>Cada módulo roda uma vez por execução, no seu próprio escopo. Ao ser carregado ele não mostra nada, não desenha gráficos, não roda testes nem abre tela; <code>pergunte</code> e <code>salve</code> são erro durante o carregamento, mas funcionam dentro de funções do módulo chamadas depois.</li>
<li>Módulos podem usar outros módulos; o que um módulo traz de outro não é repassado. Uso em círculo é erro.</li>
<li>Onde o módulo é procurado: no editor, entre os programas de <em>Meus programas</em> (pelo nome) e os exemplos (pelo nome curto); no computador e no VS Code, entre os arquivos <code>.cordel</code> da pasta do programa (também <code>"pasta/nome"</code>), sem ligar para acentos e maiúsculas. Apps exportados levam dentro os módulos que usam.</li>
<li>Erros no código de um módulo apontam o módulo e a linha dele. Um arquivo só com funções, nomes, <code>use</code> e testes é tratado como biblioteca: o diagnóstico não avisa que seus nomes nunca são usados.</li>
</ul>`,
  internet: `<ul class="ref-lista">
<li><code>busque(endereço)</code> faz um GET em um endereço <code>https://</code> ou <code>http://</code>. Se a resposta é JSON (pelo tipo ou por começar com <code>{</code> ou <code>[</code>), objetos viram registros, listas viram listas, números viram números exatos (inclusive com expoente), <code>null</code> vira <code>""</code>. Qualquer outra resposta vira texto.</li>
<li><code>busque(endereço, {cabeçalhos: {Authorization: "…"}})</code> envia cabeçalhos. Não há outros métodos além de GET.</li>
<li><code>tabela("https://…")</code> lê um CSV (ou um JSON que seja uma lista de registros) com as mesmas regras das planilhas.</li>
<li>Numa execução, cada endereço (com os mesmos cabeçalhos) é buscado uma vez e a resposta é reaproveitada. Num app, um toque que precisa de uma resposta é desfeito e repetido quando ela chega, sem travar a tela e sem efeito duplicado.</li>
<li>Erros claros para respostas fora de 200–299 (com o código), falta de conexão, tempo esgotado (15 segundos), resposta maior que 10 MB e JSON inválido. <code>tente … falhou</code> trata todos.</li>
<li>No computador e no VS Code, qualquer endereço funciona. No navegador, o site precisa permitir acesso de outras páginas (CORS), e a página do editor pode bloquear endereços externos.</li>
</ul>`,
  origem: `<ul class="ref-lista">
<li>Números, datas e linhas lidos com <code>tabela</code> guardam a planilha (e a aba), a linha do arquivo e a coluna de onde vieram. Números de <code>busque</code> guardam o endereço e o caminho no JSON (como <code>qsa[1].valor</code>); valores de <code>índice</code> e <code>cotação</code>, a série e o período do Banco Central.</li>
<li>Contas (<code>+ - * / % ^</code>), ações de número e de data e <code>reparta</code> juntam as origens dos valores usados. <code>soma</code>, <code>média</code>, <code>tamanho</code>, <code>conte</code> e a <code>quantidade</code> de <code>agrupe</code> ficam com a origem dos itens contados. <code>maior</code>, <code>menor</code>, <code>filtre</code>, <code>ordenada</code> e as demais devolvem os próprios itens, com a origem deles.</li>
<li>Um registro criado com <code>{…}</code> guarda a origem de tudo o que entrou nele, inclusive de campos de texto lidos de linhas (<code>v.nota</code>) e de números que viraram texto (<code>"{v.total.dinheiro}"</code>). O que as funções de <code>filtre</code>, <code>conte</code>, <code>ordenada</code> e afins apenas consultam não entra.</li>
<li><code>valor.origem</code> descreve a origem em texto (ou <code>"do programa"</code>, se o valor não veio de fora); <code>valor.linhas_de_origem</code> devolve as linhas das planilhas, na ordem de cada planilha. Valem para números, datas, registros e listas. Textos não guardam origem sozinhos: peça a do registro de onde vieram.</li>
<li>No editor, cada valor mostrado com origem vira um botão, e cada linha de tabela, um item que se toca para ver de onde veio (até 20 linhas de amostra). No terminal, <code>cordel rodar … --origens</code> escreve a origem abaixo de cada linha e numa coluna de cada tabela.</li>
</ul>`,
  conciliacao: `<ul class="ref-lista">
<li><code>concilie(a, b, regras)</code>: <code>a</code> e <code>b</code> são listas de registros. <code>regras.por</code> (obrigatório) é um nome de campo, uma lista de nomes (iguais nas duas listas) ou um registro <code>{campo_de_a: "campo_de_b"}</code>. <code>folga_de_dias</code> e <code>folga_de_valor</code> (padrão 0) valem para todos os campos de data e de número de <code>por</code>. <code>compare</code> (opcional) tem a mesma forma de <code>por</code>.</li>
<li>Textos batem sem diferença de maiúsculas, acentos e espaços nas pontas; números e datas batem exatos, ou dentro da folga. Uma célula vazia num campo de <code>por</code> não casa com nada.</li>
<li>Cada registro de <code>a</code> casa com no máximo um de <code>b</code> e vice-versa. O casamento tem o maior número possível de pares; entre as escolhas, prefere a menor diferença de valor e depois a de dias.</li>
<li>O resultado é um registro: <code>resumo</code> (texto), <code>pares</code> (na ordem de <code>a</code>), <code>com_diferença</code> (pares com número diferente ou com algum campo de <code>compare</code> diferente; datas dentro da folga não contam), <code>só_no_primeiro</code> e <code>só_no_segundo</code> (na ordem original). Cada par tem <code>primeiro</code>, <code>segundo</code>, <code>diferença</code> (texto, vazio quando tudo bate) e, se houver, <code>dias</code> e <code>diferença_de_valor</code> (segundo menos primeiro, no primeiro campo de data e de número).</li>
</ul>`,
  indices: `<ul class="ref-lista">
<li><code>índice(nome)</code> aceita IPCA (série 433 do SGS), IGP-M (189), INPC (188), Selic (11) e CDI (12), sem ligar para maiúsculas, hífens e acentos. Devolve um registro com <code>nome</code>, <code>descrição</code> e as funções <code>acumulado</code>, <code>fator</code> e <code>série</code>, que recebem duas datas.</li>
<li>Índices mensais: do mês de <code>de</code> ao mês de <code>até</code>, inclusive. Se algum mês ainda não foi publicado, é erro. Selic e CDI (taxas diárias): os dias úteis de <code>de</code> até a véspera de <code>até</code>.</li>
<li><code>fator</code> é o produto de (1 + taxa ÷ 100), exato; <code>acumulado</code> é (fator − 1) × 100; <code>valor.corrigido(índice, de, até)</code> é valor × fator. Nada é arredondado: use <code>.arredondado(2)</code> ou <code>.dinheiro</code>.</li>
<li><code>cotação(moeda, dia)</code>: dólar (série 1) ou euro (21619), cotação de venda. Sem cotação no dia (fim de semana, feriado), usa a do último dia útil antes, até dez dias.</li>
<li>Os dados vêm de <code>https://api.bcb.gov.br</code> com as mesmas regras de <code>busque</code>: cada consulta é feita uma vez por execução, e séries diárias vão em pedaços de até cinco anos.</li>
</ul>`,
  telas: `<ul class="ref-lista">
<li>O bloco <code>tela</code> é executado depois do programa e de novo a cada interação; o resultado substitui a tela anterior, preservando o foco e o texto sendo digitado.</li>
<li><code>botão</code> guarda o seu bloco e o escopo em que foi desenhado; o bloco roda no toque.</li>
<li><code>campo</code>, <code>marque</code> e <code>seletor</code> ligam o elemento a um alvo criado com <code>var</code>. O tipo do valor inicial define o campo: texto, número (teclado numérico, aceita 1.234,56) ou data.</li>
<li><code>página</code> fica direto dentro da tela. A primeira é a inicial; <code>vá para</code> empilha a atual e <code>volte</code> desempilha. <code>abas</code> mostra as páginas no topo.</li>
<li><code>guardado</code>/<code>guarde</code> usam a memória do navegador, separada por app. Valores exatos, datas, listas e registros são preservados.</li>
<li>O app exportado é um único arquivo .html com o interpretador, o programa e as planilhas que ele usa. Não depende de internet.</li>
</ul>`,
  planilhas: `<ul class="ref-lista">
<li>CSV: separador detectado (<code>;</code>, <code>,</code> ou tabulação), aspas e BOM tratados, UTF-8 ou Windows-1252. Excel: .xlsx, .xls, .xlsm e .ods, todas as abas.</li>
<li>O cabeçalho é a primeira linha pelo menos meio preenchida (linhas de título acima são ignoradas). Linhas vazias são descartadas.</li>
<li>Nomes de coluna viram campos: espaços e sinais viram <code>_</code>; nomes repetidos ganham <code>_2</code>, <code>_3</code>…</li>
<li>Cada coluna é convertida por inteiro: vira número se todos os valores preenchidos forem números (formato brasileiro preferido); vira data se todos forem datas (com ou sem hora, como 03/09/2026 14:30); senão fica texto. Códigos com zero à esquerda e sequências de 12+ dígitos (CPF, CNPJ, chaves) ficam texto.</li>
<li>Células vazias viram <code>""</code>.</li>
</ul>`,
  diagnostico: [
    ['erro', 'Erros de sintaxe', 'Todos de uma vez; após um erro, a leitura recomeça na linha seguinte ou no fim do bloco.'],
    ['erro', 'Nome que não existe', 'Com sugestão do nome mais parecido.'],
    ['erro', 'Nome usado fora do bloco onde foi criado', 'Aponta a linha onde ele nasceu.'],
    ['erro', 'Nome usado antes de ser criado', ''],
    ['erro', 'Mudança em nome fixo', 'Inclui adicione/remova/limpe e ligações de tela.'],
    ['erro', 'var repetida no mesmo bloco', ''],
    ['aviso', 'Nome criado e nunca usado', 'Nomes começando com _ são ignorados.'],
    ['aviso', 'var que nunca muda', 'Sugere o nome fixo.'],
    ['aviso', 'Nome que esconde uma função pronta', 'Ex.: data = …'],
    ['aviso', 'Função nunca chamada', ''],
    ['aviso', 'Código depois de devolva, pare, continue ou falhe', ''],
    ['aviso', 'enquanto verdadeiro sem saída', ''],
    ['aviso', 'Condição sempre verdadeira ou falsa', ''],
    ['aviso', 'Comparação de um valor com ele mesmo', ''],
  ],
  limites: [
    ['Passos por execução', '20 milhões (programas) · 5 milhões por toque (apps)'],
    ['Profundidade de chamadas', '700'],
    ['Linhas de saída', '5.000'],
    ['Linhas mostradas numa tabela', '500 (o restante é contado)'],
    ['Barras num gráfico', '60'],
    ['Passos na máquina do tempo', '3.000'],
    ['intervalo(a, b)', '1 milhão de números'],
    ['Módulos por execução', '500'],
    ['Buscas na internet por execução', '1.000 (15 segundos e 10 MB por resposta), contando as consultas de índice e cotação'],
    ['reparta', '100.000 partes, até 10 casas'],
    ['Linhas de amostra na origem (editor)', '20'],
  ],
  atalhos: [
    ['Ctrl + Enter', 'Rodar'], ['Shift + Alt + F', 'Formatar'], ['Ctrl + S', 'Salvar agora'], ['Tab', 'Recuo, ou aceitar a sugestão'], ['Esc', 'Fechar sugestões e menus'],
  ],
  novidades: [
    ['0.7.0', '28/09/2026', 'Origem dos valores: toque num número e veja as células e linhas de onde ele veio; concilie para casar duas tabelas; reparta sem perder centavo; índices e cotações do Banco Central.'],
    ['0.6.0', '28/09/2026', 'Datas com hora e agora(); módulos com use; busque(…) para consultar a internet, também em apps; editor que funciona fora do Claude; pronto para publicar no GitHub, npm e lojas de extensões.'],
    ['0.5.0', '26/09/2026', 'Diagnóstico sem rodar (todos os erros de sintaxe de uma vez e avisos de qualidade), painel Problemas e barra de status; formatador oficial; Meus programas com abrir e salvar arquivos; referência formal; visual novo; pacote para computador com linha de comando e extensão para o VS Code.'],
    ['0.4.0', '26/09/2026', 'Descreva e o Claude escreve, com conferência pelo interpretador; máquina do tempo; páginas, navegação e abas; gráficos; datas; autocompletar; app em tela cheia.'],
    ['0.3.0', '26/09/2026', 'Telas: sites e apps com botões, campos, memória e exportação em .html. Correções: dízimas gigantes em milissegundos; para sem passo só conta para cima.'],
    ['0.2.0', '26/09/2026', 'Planilhas CSV e Excel, agrupe, tabelas na saída, salve em .xlsx, .csv, .txt e .json.'],
    ['0.1.0', '26/09/2026', 'Linguagem base: números exatos, erros em português, fixo e var, testes embutidos, editor com destaque de sintaxe.'],
  ],
};
