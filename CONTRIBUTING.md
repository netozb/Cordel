# Como contribuir

Obrigado por querer melhorar a Cordel. Este guia mostra como o código está organizado, como testar uma mudança e o que conferir antes de abrir um pull request.

## Preparar

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo (para publicar, 22 ou mais novo).

```sh
npm ci                                # leitor de Excel e Playwright
npm ci --prefix editores/vscode       # motor de gramática do VS Code e vsce
npx playwright install chromium       # só para os testes no navegador
npm run construir
npm test
```

## Onde fica cada coisa

| Pasta ou arquivo | O que é |
|---|---|
| `lib/cordel.js` | A linguagem inteira: analisador léxico, analisador sintático, interpretador, diagnóstico (`verificar`) e formatador (`formatar`). Um arquivo só, sem dependências, o mesmo no navegador, no terminal e no VS Code. |
| `lib/app.js`, `lib/app.css` | O motor de telas dos apps (botões, campos, páginas, memória, buscas na internet). |
| `lib/planilha.js`, `lib/arquivos.js` | Leitura e gravação de planilhas e arquivos, e a busca de módulos na pasta do programa. |
| `lib/buscar.js` | `busque(…)` no computador: a busca roda num processo auxiliar e o programa espera a resposta. |
| `lib/terminal.js`, `lib/gerar-app.js` | Mensagens de erro no terminal e geração de apps `.html`. |
| `bin/cordel.js` | A linha de comando. |
| `web/modelo.html` | O editor no navegador. `npm run construir` junta nele o interpretador, o motor de telas e o conteúdo e grava `dist/cordel.html`. |
| `web/conteudo.js` | O guia, a referência, as explicações de funções e ações e a lista de exemplos. É a fonte de `docs/*.md` e das explicações da extensão. |
| `web/manual-ia.md` | O manual usado pelo botão Descrever e publicado em `docs/manual-para-ia.md`. |
| `exemplos/` | Programas de exemplo, sempre no formato oficial. |
| `editores/vscode/` | A extensão do VS Code. |
| `ferramentas/` | Construção, versão, configuração, pacotes, gramática, ícones e o criador de casos de teste. |
| `testes/` | A suíte de testes (veja abaixo). |
| `.github/workflows/` | Testes em Linux, Windows e macOS a cada envio, e a publicação a cada etiqueta de versão. |

### Arquivos gerados

`npm run construir` gera, a partir do código:

- **versionados** (entram no commit): `docs/*.md`, `exemplos/LEIA-ME.md`, `editores/cordel.tmLanguage.json`;
- **não versionados**: `dist/`, e em `editores/vscode/` as pastas `lib/` e `syntaxes/`, `LICENSE` e `CHANGELOG.md`.

Não edite os gerados à mão: edite a fonte (`web/conteudo.js`, `web/manual-ia.md`, `lib/cordel.js`) e rode `npm run construir`. `npm run checar` falha se algum versionado estiver desatualizado, e é a primeira coisa que os testes automáticos conferem.

## Testes

| Comando | O que testa |
|---|---|
| `npm test` | Execução, apps, diagnóstico, formatador, exemplos, trechos do guia e a linha de comando de ponta a ponta. |
| `npm run testar:extensao` | A gramática com o motor do VS Code e a extensão sobre uma imitação da API. |
| `npm run testar:navegador` | O editor (`dist/cordel.html`) no Chromium: diagnóstico, formatador, módulos, internet, guia, download de apps e tela de celular. |

`node testes/rodar.js formatador` roda só uma seção (o nome pode ser parcial).

Os testes de busca na internet usam um servidor local (`testes/servidor.js`) com respostas fixas, então nunca dependem da internet de verdade.

### Resultados esperados

As pastas `testes/execucao`, `testes/telas`, `testes/diagnostico` e `testes/formatador` guardam programas (`.cordel`) e o resultado exato que cada um deve dar (`.esperado`), comparados byte a byte. Para acrescentar um caso:

```sh
node ferramentas/novo-caso.js execucao "juros de um ano" /caminho/programa.cordel
```

O resultado é gravado com o interpretador atual: **revise o `.esperado` gerado**, porque ele passa a ser a verdade da suíte. As opções (`--planilhas`, `--respostas`, `--passos`, `--modulos`, `--rede`) estão no começo de `ferramentas/novo-caso.js`.

Depois de uma mudança intencional de comportamento, `node testes/rodar.js --atualizar` regrava os esperados. Confira a diferença no `git diff` antes de fazer o commit: cada linha alterada é uma mudança que as pessoas vão ver.

## Princípios

Mudanças na linguagem passam por estas regras:

- **Contas exatas.** Nada de ponto flutuante onde a pessoa espera um número decimal.
- **Erros que ensinam.** Toda mensagem nova diz o que aconteceu, em português simples, com a linha e uma dica de correção.
- **Acentos e maiúsculas não importam** em nomes e palavras (`senão`, `senao`, `SENÃO`).
- **O formatador nunca muda o significado** de um programa. A suíte confere isso em todos os programas de teste.
- **Um programa só faz o que está escrito nele.** Arquivos, pastas e endereços de internet vêm do próprio programa ou de quem o roda.
- **Compatibilidade.** Antes da 1.0 a linguagem pode mudar, mas toda mudança que quebra programas existentes fica registrada no `CHANGELOG.md`.

## Estilo

- Recuo de 2 espaços, fim de linha LF, UTF-8 (o `.editorconfig` cuida disso).
- Nomes no código em português, como na linguagem.
- O interpretador (`lib/cordel.js`) e o motor de telas (`lib/app.js`) não podem ter dependências: rodam dentro de um único arquivo `.html`.
- Exemplos no formato oficial: `node bin/cordel.js formatar --escrever exemplos/*.cordel`.

## Antes do pull request

- [ ] `npm run construir` rodado e os arquivos gerados incluídos no commit
- [ ] `npm test` e `npm run testar:extensao` passando
- [ ] Casos de teste novos para o que mudou, com os `.esperado` revisados
- [ ] Novidades visíveis descritas em `CHANGELOG.md`, na seção `## [Não lançado]`
- [ ] Funções, ações e palavras novas explicadas em `web/conteudo.js` (elas aparecem no editor, na extensão e em `docs/`)
