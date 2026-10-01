# Cordel 0.7.0
<!-- configurar:links -->
[![Testes](https://github.com/netozb/cordel/actions/workflows/testes.yml/badge.svg)](https://github.com/netozb/cordel/actions/workflows/testes.yml)

**Experimente no navegador:** https://netozb.github.io/cordel/
<!-- /configurar:links -->

**Cordel** é uma linguagem de programação em português, feita para quem está aprendendo e para quem trabalha com números, planilhas e pequenos sistemas. As contas são exatas, os erros explicam o que aconteceu e como corrigir, e um mesmo programa pode ler planilhas, consultar a internet, gerar relatórios ou virar um app.

```cordel
vendas = tabela("vendas_exemplo.csv")

resumo = vendas.agrupe(v => v.vendedor).transforme(g => {
  vendedor: g.chave,
  notas: g.quantidade,
  total: g.itens.soma(v => v.total),
})

mostre resumo.ordenada(r => r.total).invertida
gráfico "Vendas por vendedor" de resumo por total

teste "nenhuma venda se perde no resumo"
  confira resumo.soma(r => r.total) == vendas.soma(v => v.total)
fim
```

- **Contas exatas.** `0.1 + 0.2 == 0.3` é verdadeiro, e dinheiro nunca perde centavos: `1999.90.reparta(3)` dá 666,64 + 666,63 + 666,63.
- **De onde veio cada número.** `total.origem` diz quais células da planilha formaram o total, e cada achado de uma auditoria sabe a linha que o gerou. No editor, basta tocar no valor.
- **Conciliação.** `concilie(vendas, extrato, {por: {total: "valor"}, folga_de_dias: 2})` casa duas tabelas e explica cada diferença.
- **Índices oficiais.** `aluguel.corrigido("IGP-M", de, até)`, `índice("IPCA").acumulado(de, até)` e `cotação("dólar", dia)`, direto do Banco Central.
- **Erros que ensinam.** Linha, seta e uma dica de correção em português; o diagnóstico aponta todos os problemas antes de rodar.
- **Planilhas de verdade.** CSV e Excel com números e datas no formato brasileiro; `salve` grava `.xlsx`, `.csv`, `.json` e mais.
- **Datas com hora.** `data("03/09/2026 08:15").minutos_até(saida)`, dias úteis, meses e horários sem fuso para confundir.
- **Módulos.** `use "regras"` traz as funções de outro arquivo, e o erro aponta o arquivo e a linha certos.
- **Internet.** `busque("https://…")` devolve registros prontos de JSON ou CSV, com números exatos.
- **Sites e apps.** `tela`, `botão`, `campo` e páginas viram um app de um arquivo `.html` que funciona sem internet.
- **Testes embutidos.** `teste … confira … fim` no próprio programa.

## Instalação

### Editor no navegador

Não precisa instalar nada: abra `cordel.html` (vem no `.zip` de cada versão) no Chrome, Edge, Firefox ou Safari. Tem guia interativo, máquina do tempo, planilhas, apps e funciona também no celular e sem internet.

### Linha de comando

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```sh
npm install -g cordel
cordel --versao
```

Com o pacote baixado da página de versões (`cordel-0.7.0.zip`), descompacte e, dentro da pasta:

```sh
npm install -g ./cordel-0.7.0.tgz
```

Para desinstalar: `npm uninstall -g cordel`.

### VS Code

Procure **Cordel** na aba Extensões (Visual Studio Marketplace ou Open VSX), ou instale o arquivo do pacote:

```sh
code --install-extension cordel-0.7.0.vsix
```

A extensão traz destaque de sintaxe, erros e avisos enquanto você digita, formatação oficial (Shift+Alt+F), explicações ao passar o mouse, sugestões depois do ponto, a estrutura do arquivo e três comandos: **Rodar programa** (Ctrl+Enter, com o resultado no painel Saída), **Rodar no terminal** e **Gerar app (.html)**. Detalhes em [`editores/vscode/README.md`](editores/vscode/README.md).

### Outros editores

[`editores/cordel.tmLanguage.json`](editores/cordel.tmLanguage.json) é a gramática TextMate da linguagem, para qualquer editor ou ferramenta que use esse formato, como Shiki e Sublime Text.

## Uso

| Comando | O que faz |
|---|---|
| `cordel rodar programa.cordel` | Roda um programa. A palavra `rodar` é opcional. |
| `cordel testar programas…` | Roda os testes (`teste … confira … fim`). Termina com código 1 se algum falhar. |
| `cordel verificar programas…` | Aponta erros e avisos sem rodar, no formato `arquivo:linha:coluna`. |
| `cordel formatar programas…` | Mostra o código no formato oficial. `--escrever` grava; `--checar` só confere. |
| `cordel app programa.cordel` | Gera um app num único `.html` que funciona sem internet. |
| `cordel` | Modo interativo: digite instruções e veja o resultado na hora. |

```sh
cordel rodar exemplos/tour.cordel
cordel rodar exemplos/pergunte.cordel               # pergunte(…) lê do teclado
cordel rodar exemplos/pergunte.cordel --respostas respostas.txt
cordel rodar exemplos/auditoria.cordel              # usa o módulo regras.cordel e a planilha da pasta
cordel rodar exemplos/conciliacao.cordel --origens  # e mostra de onde veio cada valor
cordel testar exemplos/testes.cordel
cordel verificar exemplos/*.cordel
cordel formatar --escrever meu_programa.cordel
cordel app exemplos/cnpj.cordel -o cnpj.html        # app que consulta a internet
```

Opções de `rodar` e `testar`:

| Opção | Efeito |
|---|---|
| `--arquivo <planilha>` | Deixa uma planilha disponível para `tabela(…)`. Repita para várias. Planilhas citadas no programa são achadas sozinhas na pasta dele, mesmo sem extensão ou com acentos e maiúsculas diferentes. |
| `--saida <pasta>` | Onde gravar os arquivos de `salve(…)` (padrão: a pasta atual). |
| `--respostas <arquivo>` | Respostas para `pergunte(…)`, uma por linha. |
| `--semente <n>` | Sorteios de `aleatório(…)` repetíveis. |
| `--hoje <aaaa-mm-dd>` | A data usada por `hoje()` e `agora()`. |
| `--agora <data e hora>` | O momento usado por `agora()`, como `"2026-09-26 14:30"`. |
| `--origens` | Mostra de onde veio cada valor: abaixo de cada linha e numa coluna de cada tabela. |

Módulos (`use "nome"`) são procurados na pasta do programa, pelo nome do arquivo `.cordel`, sem diferença de acentos e maiúsculas.

Códigos de saída: `0` deu certo; `1` erro no programa, teste que falhou ou arquivo fora do formato; `2` uso incorreto do comando. Cores no terminal podem ser desligadas com `NO_COLOR=1`.

## Como biblioteca

O interpretador é um único arquivo JavaScript sem dependências, com tipos para TypeScript:

```js
const Cordel = require('cordel');

const r = Cordel.run('mostre 0.1 + 0.2 == 0.3');
console.log(r.out[0].text); // verdadeiro

Cordel.verificar('mostre total').problemas; // [{ nivel: 'erro', linha: 1, col: 8, msg: '…', dica: '…' }]
Cordel.formatar('se 1<2 entao\nmostre "sim"\nfim'); // 'se 1 < 2 então\n  mostre "sim"\nfim\n'
```

[`lib/cordel.d.ts`](lib/cordel.d.ts) descreve todas as opções (respostas para `pergunte`, semente, planilhas, módulos, busca na internet, data e hora, memória de apps) e o formato dos resultados.

## Documentação

| Arquivo | Conteúdo |
|---|---|
| [`docs/guia.md`](docs/guia.md) | Guia da linguagem, com exemplos que rodam como estão |
| [`docs/referencia.md`](docs/referencia.md) | Gramática (EBNF), precedência, tipos, escopo, funções prontas, ações por tipo, módulos, telas, planilhas, internet, diagnóstico e limites |
| [`docs/manual-para-ia.md`](docs/manual-para-ia.md) | Manual para pedir a uma IA que escreva programas em Cordel |
| [`exemplos/LEIA-ME.md`](exemplos/LEIA-ME.md) | Os exemplos e como rodar cada um |
| [`CHANGELOG.md`](CHANGELOG.md) | Histórico de versões |

## Segurança e limites

- Um programa só lê as planilhas citadas nele ou passadas com `--arquivo`, e só usa módulos `.cordel`. `salve(…)` só grava na pasta de saída: o nome do arquivo nunca pode apontar para outra pasta.
- `busque(…)` só acessa os endereços escritos no programa, sem cookies nem senhas guardadas, com limite de 15 segundos e 10 MB por busca e de 1.000 buscas por execução. `índice(…)` e `cotação(…)` acessam só a API pública do Banco Central (`api.bcb.gov.br`).
- Cada execução tem limite de passos (20 milhões) e de profundidade de chamadas, então um laço infinito termina com uma mensagem de erro em vez de travar.
- A leitura e a gravação de Excel usam a biblioteca SheetJS. A versão publicada no npm (0.18.5) tem duas falhas conhecidas ao abrir arquivos preparados para atacar ([CVE-2023-30533](https://cdn.sheetjs.com/advisories/CVE-2023-30533) e [CVE-2024-22363](https://cdn.sheetjs.com/advisories/CVE-2024-22363)). Para planilhas de origem desconhecida, troque pela versão corrigida, distribuída pela própria SheetJS, na pasta onde o Cordel está instalado: `cd "$(npm root -g)/cordel"` e depois `npm install --no-save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (numa cópia do código, basta o segundo comando).
- Apps gerados guardam os dados de `guarde(…)` no próprio navegador de quem usa, nunca num servidor.
- Antes da versão 1.0, a linguagem ainda pode mudar entre versões. Mudanças são registradas no [`CHANGELOG.md`](CHANGELOG.md).

Para relatar uma falha de segurança, veja [`SECURITY.md`](SECURITY.md).

## Desenvolvimento

```sh
npm ci && npm ci --prefix editores/vscode
npm run construir          # editor, documentação, gramática e extensão
npm test                   # a suíte principal
```

O código, a organização das pastas e como acrescentar testes estão em [`CONTRIBUTING.md`](CONTRIBUTING.md). Como publicar uma versão (npm, VS Code, GitHub e o editor na web) está em [`PUBLICAR.md`](PUBLICAR.md).

## Licença

[MIT](LICENSE) © 2026 Antônio Duarte Neto
