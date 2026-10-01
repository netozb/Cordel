# Histórico de versões

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [versionamento semântico](https://semver.org/lang/pt-BR/). Antes da 1.0, uma versão nova pode mudar a linguagem; toda mudança assim fica registrada aqui.

## [0.7.0] — 2026-09-28

### Adicionado
- Origem dos valores: números, datas e linhas lidos de planilhas guardam a planilha, a linha e a coluna de onde vieram, e contas, somas, médias, contagens e registros montados a partir das linhas juntam as origens. `valor.origem` descreve a origem e `valor.linhas_de_origem` devolve as linhas. No editor, tocar num valor ou numa linha de tabela mostra as células e as linhas de onde ele veio; no terminal, `cordel rodar … --origens`; no VS Code, a configuração `cordel.origens`. Números de `busque` guardam o endereço e o caminho no JSON.
- Conciliação: `concilie(a, b, {por, folga_de_dias, folga_de_valor, compare})` devolve `resumo`, `pares`, `com_diferença`, `só_no_primeiro` e `só_no_segundo`. Casa o maior número possível de pares, prefere os mais próximos e explica cada diferença.
- `valor.reparta(n)` e `valor.reparta(pesos)`: parcelas e rateios sem perder centavo.
- Índices do Banco Central: `índice("IPCA")` (e IGP-M, INPC, Selic e CDI), com `acumulado`, `fator` e `série`; `valor.corrigido(índice, de, até)`; `cotação("dólar", dia)` e `cotação("euro", dia)`.
- Exemplo de conciliação de vendas com o extrato do banco, com a planilha `extrato_exemplo.csv`. O exemplo de dinheiro passa a usar `reparta`.
- Guia e referência: origem dos valores, conciliação, índices e cotações.

### Mudado
- As planilhas guardam a linha do arquivo de cada registro (contando linhas vazias e de título), para a origem apontar a linha que aparece no Excel.
- `npm run configurar` também troca o nome na licença mostrada pelo editor.

### Corrigido
- Os tipos para TypeScript não traziam as opções `modulos`, `buscar` e `rede`, o pedido de busca pendente nem o módulo de um erro.

## [0.6.0] — 2026-09-28

### Adicionado
- Datas com hora: `data("03/09/2026 08:15")`, `data(2026, 9, 3, 8, 15)` e `agora()`, com as ações `hora`, `minuto`, `segundo`, `horário`, `sem_hora`, `mais_horas`, `mais_minutos`, `minutos_até` e `horas_até`. Sem fuso horário para confundir: datas ISO com fuso são convertidas para a hora local. Planilhas CSV e Excel leem e gravam datas com hora. Na linha de comando, `--agora` fixa o momento usado por `agora()`.
- Módulos: `use "regras"` traz as funções e os nomes de outro programa, e `use "regras" como r` os deixa em `r.nome`. Nomes começados com `_` ficam só no módulo. O módulo roda uma vez, sem mostrar nada; usos em círculo são apontados; um erro dentro do módulo aponta o arquivo e a linha dele. No editor, qualquer programa guardado ou exemplo serve de módulo; no terminal e no VS Code, os arquivos `.cordel` da pasta do programa.
- Internet: `busque("https://…")` transforma respostas JSON em registros e listas, com números exatos, e as outras em texto; `busque(endereço, {cabeçalhos: {…}})` envia cabeçalhos, como uma chave de acesso; `tabela("https://…")` lê uma planilha CSV publicada. Apps buscam sem travar a tela, com uma barra de progresso, e um toque que busca nunca tem efeito dobrado. Falhas de rede, demora (mais de 15 segundos) e respostas de erro do servidor vêm com explicação e dica.
- Exemplos: horários na auditoria, regras de auditoria como módulo e consulta de CNPJ na BrasilAPI.
- Publicação: testes automáticos em Linux, Windows e macOS a cada mudança; publicação por etiqueta no GitHub, no npm, no Visual Studio Marketplace, no Open VSX e do editor no GitHub Pages; `npm run configurar`, `npm run versao` e `npm run pacote`; roteiro em `PUBLICAR.md`, guia de contribuição em `CONTRIBUTING.md` e política de segurança em `SECURITY.md`.
- Testes do editor no navegador (Chromium), além da suíte de resultados esperados e dos testes da extensão.

### Mudado
- `cordel.html` é um documento completo: funciona aberto direto do computador ou publicado em qualquer site. Fora do Claude, apps e arquivos gerados são baixados direto pelo navegador.
- O pacote para baixar traz o editor, o pacote do npm, a extensão, os exemplos e a documentação, com instruções de instalação.

### Corrigido
- Na linha de comando, respostas para `pergunte(…)` vindas de outro programa (`|`) podiam se perder a partir da segunda.
- O README da extensão do VS Code mostrava `{{VERSAO}}` no lugar do nome do arquivo.

## [0.5.0] — 2026-09-26

### Adicionado
- Diagnóstico sem rodar: todos os erros de sintaxe de uma vez, nomes que não existem (com sugestão), nomes usados fora do bloco ou antes de criados, mudança em nome fixo e `var` repetida. Avisos de qualidade: nome nunca usado, `var` que nunca muda, nome que esconde uma função pronta, função nunca chamada, código inalcançável, `enquanto verdadeiro` sem saída, condição sempre verdadeira ou falsa e comparação de um valor com ele mesmo.
- Editor: painel Problemas, marcas na margem e barra de status com posição, erros e avisos.
- Formatador oficial (Shift+Alt+F no editor, `cordel formatar` no terminal). Recuo de 2 espaços, espaçamento padrão, grafia oficial das palavras (`senão`, `então`, `até`) e comentários de fim de linha alinhados. Nunca muda o significado do programa e se recusa a mexer em código com erro de sintaxe.
- Meus programas: vários programas guardados no navegador, com abrir e salvar arquivos `.cordel`.
- Referência formal da linguagem: gramática em EBNF, precedência de operadores, tipos, escopo, telas, planilhas, diagnóstico e limites.
- Pacote para computador:
  - linha de comando `cordel` com `rodar`, `testar`, `verificar`, `formatar`, `app` e modo interativo;
  - extensão para o VS Code com destaque, diagnóstico, formatação, explicações, sugestões, estrutura do arquivo e comandos para rodar e gerar apps;
  - o interpretador como biblioteca para Node.js, com tipos para TypeScript;
  - suíte de testes com resultados esperados para execução, apps, diagnóstico, formatador, exemplos e linha de comando.

### Mudado
- Visual novo do editor: tipografia, cores e barra de ferramentas.
- Versões passam a ter três números (0.5.0).

## [0.4.0] — 2026-09-26

### Adicionado
- Descreva e o Claude escreve: o programa sugerido é conferido pelo interpretador antes de chegar ao editor.
- Máquina do tempo: o passo a passo da execução, com os valores de cada nome em cada linha.
- Páginas em apps, com `vá para`, `volte` e `abas`.
- Gráficos de barras com `gráfico "Título" de lista por campo`.
- Datas: `hoje()`, `data(…)`, contas com dias e ações como `mais_meses`, `útil` e `por_extenso`.
- Autocompletar no editor e app em tela cheia.

## [0.3.0] — 2026-09-26

### Adicionado
- Telas: sites e apps com `título`, `botão`, `campo`, `marque`, `seletor`, `link`, `cartão` e `linha`.
- Memória de apps com `guarde` e `guardado`.
- Exportação de apps como um único arquivo `.html`, que funciona sem internet.

### Corrigido
- Frações com denominadores gigantes (juros compostos por milhares de meses) levavam dezenas de segundos; agora levam milissegundos.
- `para i de 10 até 1` sem `passo` contava para trás. Agora o passo padrão é sempre 1; uma contagem regressiva escrita sem `passo -1` é apontada como erro, com a correção na dica.

## [0.2.0] — 2026-09-26

### Adicionado
- Planilhas CSV e Excel com `tabela(…)`, `abas(…)` e `leia(…)`, entendendo números e datas no formato brasileiro.
- `agrupe` para resumir listas.
- Tabelas na saída.
- `salve` em `.xlsx`, `.csv`, `.txt`, `.md` e `.json`.

## [0.1.0] — 2026-09-26

### Adicionado
- Linguagem base: números exatos, textos com encaixe `{…}`, listas que começam em 1, registros, funções e funções rápidas.
- Nomes fixos por padrão e `var` para nomes que mudam.
- Erros em português, com a linha, uma seta e uma dica de correção.
- Testes embutidos com `teste` e `confira`.
- Editor no navegador com destaque de sintaxe.
