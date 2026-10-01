# Cordel para VS Code

Suporte completo à linguagem Cordel no VS Code, usando o mesmo interpretador do editor no navegador e da linha de comando.

## Recursos

- **Destaque de sintaxe** para arquivos `.cordel`, com acentos e maiúsculas opcionais como na linguagem (`senão`, `senao` e `SENÃO`).
- **Erros e avisos enquanto você digita**: todos os erros de sintaxe de uma vez, nomes que não existem (com sugestão), nomes usados fora do bloco, mudança em nome fixo, nomes nunca usados, código inalcançável e mais. Cada problema vem com a dica de correção.
- **Formatação oficial** com Shift+Alt+F (ou ao salvar, com `editor.formatOnSave`). O formatador nunca muda o significado do programa e se recusa a mexer em código com erro de sintaxe.
- **Explicações ao passar o mouse** sobre funções prontas (`número`, `tabela`…), ações (`.soma`, `.dinheiro`, `.mais_meses`…) e palavras da linguagem.
- **Sugestões** de ações depois do ponto e de funções e palavras no resto do código, além de modelos prontos (`se`, `para`, `função`, `tela`, `botão`, `teste`…).
- **Estrutura do arquivo** (painel Estrutura, trilha no topo e Ctrl+Shift+O): funções, nomes, tela, páginas e testes.
- **Módulos**: `use "regras"` acha `regras.cordel` na pasta do programa (inclusive com alterações ainda não salvas), o diagnóstico conhece os nomes que vêm dele e um erro dentro do módulo aponta o arquivo e a linha certos.
- **Internet**: `busque("https://…")` funciona no comando **Rodar programa**; as respostas são reaproveitadas quando o programa roda de novo por causa de `pergunte(…)`.
- **Origem, conciliação e índices**: `total.origem`, `concilie(…)`, `valor.reparta(…)`, `índice("IPCA")` e `cotação("dólar", dia)` funcionam no **Rodar programa**, com explicações ao passar o mouse.
- **Comandos**
  - **Cordel: Rodar programa** (Ctrl+Enter ou o botão ▶): roda aqui mesmo e mostra o resultado no painel Saída. `pergunte(…)` abre uma caixa de resposta; planilhas CSV citadas no programa são achadas na pasta dele; `salve(…)` grava ao lado do programa.
  - **Cordel: Rodar no terminal**: roda com a linha de comando `cordel`, que também lê e grava Excel.
  - **Cordel: Gerar app (.html)**: transforma um programa com tela num app de um arquivo só, que funciona sem internet.

## Configuração

| Configuração | Padrão | Efeito |
|---|---|---|
| `cordel.diagnostico.ativo` | `true` | Mostrar erros e avisos enquanto você digita |
| `cordel.origens` | `false` | No **Rodar programa**, mostrar de onde veio cada valor: as células das planilhas, o endereço da internet ou o índice do Banco Central |

Arquivos `.cordel` usam recuo de 2 espaços e têm o formatador da Cordel como padrão.

## Limitações conhecidas

- Planilhas do Excel (`.xlsx`, `.xls`, `.ods`) não abrem pelo comando **Rodar programa**; use CSV ou **Rodar no terminal** (com o pacote Cordel para computador instalado).
- Programas com tela não abrem dentro do VS Code: use **Gerar app (.html)** e abra no navegador.

## Instalação

Procure **Cordel** na aba Extensões. Para instalar um arquivo `.vsix` baixado da página de versões:

```sh
code --install-extension cordel-x.y.z.vsix
```

## Desenvolvimento

```sh
npm install   # motor de gramática do VS Code (para os testes) e o vsce
npm test      # gramática com o motor do VS Code + a extensão sobre uma imitação da API
```

A extensão usa arquivos gerados a partir da raiz do repositório: rode `npm run construir` lá antes de testar, e `npm run pacote` para gerar o `.vsix` em `dist/`.
