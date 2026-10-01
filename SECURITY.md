# Segurança

## Versões atendidas

Correções de segurança saem sempre na versão mais recente. Antes da 1.0, versões antigas não recebem correções.

## Como relatar uma falha

Não abra uma issue pública. Use o relato privado do GitHub: aba **Security** do repositório › **Report a vulnerability**. Descreva o problema, como reproduzir e o que alguém mal-intencionado conseguiria fazer.

Quando a correção sair, o relato é publicado junto com ela, com o crédito a quem avisou, se a pessoa quiser.

## O que conta como falha de segurança

- Um programa Cordel ler ou gravar arquivos fora do que está escrito nele ou da pasta de saída.
- Um programa acessar a internet sem `busque(…)` escrito nele.
- Um app `.html` gerado executar código que não veio do programa (por exemplo, a partir de um texto digitado num campo).
- O editor no navegador ou a extensão do VS Code executar código ao abrir um arquivo `.cordel`.

Falhas conhecidas do leitor de Excel (SheetJS 0.18.5) e como evitá-las estão no README, em **Segurança e limites**.
