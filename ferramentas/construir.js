#!/usr/bin/env node
'use strict';
// Constrói tudo o que é gerado a partir do código-fonte:
//
//   dist/cordel.html                       o editor no navegador (um arquivo só)
//   docs/guia.md, docs/referencia.md,      a documentação, a partir de web/conteudo.js
//   docs/manual-para-ia.md
//   exemplos/LEIA-ME.md                    a lista de exemplos
//   editores/cordel.tmLanguage.json        a gramática de destaque, a partir do interpretador
//   editores/vscode/{lib,syntaxes,…}       o que a extensão do VS Code precisa para rodar
//
//   node ferramentas/construir.js           (o mesmo que npm run construir)
//   node ferramentas/construir.js --checar  falha se algum arquivo versionado estiver desatualizado
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const CHECAR = process.argv.includes('--checar');
const le = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const json = v => JSON.stringify(v, null, 2) + '\n';
const desatualizados = [];
function escreve(rel, conteudo, versionado) {
  const f = path.join(RAIZ, rel);
  const atual = fs.existsSync(f) ? fs.readFileSync(f) : null;
  const novo = Buffer.from(conteudo);
  if (atual && Buffer.compare(atual, novo) === 0) return;
  if (CHECAR && versionado) { desatualizados.push(rel); return; }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, novo);
}
function copia(de, para) { escreve(para, fs.readFileSync(path.join(RAIZ, de)), false); }

const C = require('../lib/cordel.js');
const K = require('../web/conteudo.js');
const { gerarGramatica } = require('./gramatica.js');
const PACOTE = JSON.parse(le('package.json'));
const V = PACOTE.version;

// ───────── versões consistentes ─────────
const problemas = [];
if (C.version !== V) problemas.push('lib/cordel.js diz ' + C.version + ', package.json diz ' + V);
if (!le('CHANGELOG.md').includes('## [' + V + ']')) problemas.push('CHANGELOG.md não tem a versão ' + V);
if (K.ref.novidades[0][0] !== V) problemas.push('web/conteudo.js (ref.novidades) começa em ' + K.ref.novidades[0][0] + ', não em ' + V);
if (problemas.length) { console.error('Versões desencontradas:\n  ' + problemas.join('\n  ') + '\nUse: npm run versao -- ' + V); process.exit(1); }

// ───────── exemplos ─────────
const exemplos = K.exemplos.map(e => {
  const codigo = le('exemplos/' + e.id + '.cordel');
  if (C.formatar(codigo) !== codigo) throw new Error('exemplos/' + e.id + '.cordel não está no formato oficial (rode: node bin/cordel.js formatar --escrever exemplos/' + e.id + '.cordel)');
  return Object.assign({}, e, { codigo });
});
const temTela = src => /^[ \t]*tela\b/m.test(src);
escreve('exemplos/LEIA-ME.md', [
  '# Exemplos', '',
  'Programas prontos para rodar, estudar e modificar. Todos seguem o formato oficial e rodam sem avisos, menos `erros.cordel`, que tem erros de propósito.', '',
  '| Arquivo | O que faz | Como abrir |', '|---|---|---|',
  ...exemplos.map(e => {
    const arq = 'exemplos/' + e.id + '.cordel';
    const usadoPor = exemplos.filter(o => C.usosDe(o.codigo).some(u => C.norm(u.nome) === C.norm(e.id))).map(o => '`' + o.id + '.cordel`');
    const marcas = [/^App:/.test(e.nome) ? 'app' : /^Site:/.test(e.nome) ? 'site' : null, e.codigo.includes('busque(') ? 'usa a internet' : null, e.codigo.includes('pergunte(') ? 'faz perguntas' : null].filter(Boolean);
    const oque = e.nome.replace(/^(App|Site|Módulo): (.)/, (m, tipo, l) => l.toUpperCase()).replace(/\s*\(internet\)$/, '') + (marcas.length ? ' (' + marcas.join(', ') + ')' : '');
    const como = usadoPor.length ? 'módulo: `use "' + e.id + '"` em ' + usadoPor.join(', ')
      : temTela(e.codigo) ? '`cordel app ' + arq + '`' : e.id === 'testes' ? '`cordel testar ' + arq + '`' : e.id === 'erros' ? '`cordel verificar ' + arq + '`'
      : '`cordel rodar ' + arq + '`';
    return '| `' + e.id + '.cordel` | ' + oque + ' | ' + como + ' |';
  }),
  '', 'As planilhas `vendas_exemplo.csv` e `extrato_exemplo.csv` ficam nesta mesma pasta, e os exemplos as acham sozinhos.', '',
].join('\n'), true);

// ───────── editor no navegador ─────────
const semScript = (nome, s) => { if (/<\/script/i.test(s)) throw new Error(nome + ' contém </script'); return s; };
const conteudo = le('web/conteudo.js') +
  '\nCONTEUDO.exemplos = ' + JSON.stringify(exemplos) + ';' +
  '\nCONTEUDO.arquivosExemplo = ' + JSON.stringify(['vendas_exemplo.csv', 'extrato_exemplo.csv'].map(name => ({ name, text: le('exemplos/' + name) }))) + ';' +
  '\nCONTEUDO.manualIA = ' + JSON.stringify(le('web/manual-ia.md')).replace(/</g, '\\u003c') + ';\n';
let pagina = le('web/modelo.html').replace(/(id="versao">)v[^<]*/, '$1v' + V);
for (const [marca, fonte, texto] of [
  ['/*@CORE@*/', 'lib/cordel.js'], ['/*@CONTENT@*/', 'web/conteudo.js', conteudo], ['/*@PLANILHA@*/', 'lib/planilha.js'],
  ['/*@APPJS@*/', 'lib/app.js'], ['/*@APPCSS@*/', 'lib/app.css'],
]) {
  if (!pagina.includes(marca)) throw new Error('web/modelo.html não tem a marca ' + marca);
  const s = semScript(fonte, texto || le(fonte));
  pagina = pagina.replace(marca, () => s);
}
// Documento completo, no mesmo formato do esqueleto que a publicação como Artifact usa: assim o arquivo
// funciona sozinho (aberto no computador ou num site) e, publicado, não fica com o esqueleto repetido.
const ESQUELETO = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>';
escreve('dist/cordel.html', ESQUELETO + '\n' + pagina.replace(/\s+$/, '') + '\n</body></html>', false);

// ───────── documentação ─────────
const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
function md(html) {
  return dec(String(html)
    .replace(/<ul[^>]*>\s*/g, '\n').replace(/\s*<\/ul>/g, '\n')
    .replace(/<li>\s*/g, '- ').replace(/\s*<\/li>\s*/g, '\n')
    .replace(/<p>\s*/g, '').replace(/\s*<\/p>\s*/g, '\n\n')
    .replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/g, '*$1*')
    .replace(/<code>([\s\S]*?)<\/code>/g, (m, c) => '`' + c + '`')
    .replace(/<[^>]+>/g, ''))
    .replace(/\n{3,}/g, '\n\n').trim();
}
const celulaMd = s => md(s).replace(/\|/g, '\\|').replace(/\n+/g, ' ');
const tabelaMd = (cab, linhas) => ['| ' + cab.join(' | ') + ' |', '|' + cab.map(() => '---').join('|') + '|', ...linhas.map(l => '| ' + l.map(celulaMd).join(' | ') + ' |')].join('\n');
const bloco = codigo => '```cordel\n' + C.formatar(codigo).replace(/\n$/, '') + '\n```';
const R = K.ref;
const tipos = {};
for (const [chave, [args, desc]] of Object.entries(K.docMetodos)) { const [t, nome] = chave.split(':'); (tipos[t] = tipos[t] || []).push(['<code>' + nome + (args || '') + '</code>', desc]); }
const NOMES_TIPO = { lista: 'Listas', texto: 'Textos', número: 'Números', data: 'Datas', registro: 'Registros' };
escreve('docs/referencia.md', [
  '# Referência da linguagem Cordel ' + V, '',
  'Arquivos `.cordel` são texto UTF-8. Esta referência descreve a linguagem implementada pelo interpretador de referência (`lib/cordel.js`), o mesmo usado no editor do navegador, na linha de comando e na extensão do VS Code.', '',
  '## Sumário', '',
  ...['Gramática', 'Precedência de operadores', 'Tipos', 'Nomes e escopo', 'Palavras', 'Funções prontas', 'Ações por tipo', 'Módulos', 'Telas', 'Planilhas', 'Origem dos valores', 'Conciliação', 'Internet', 'Índices e cotações', 'Diagnóstico', 'Limites']
    .map(t => '- [' + t + '](#' + t.toLowerCase().replace(/ /g, '-').replace(/[^\p{L}\p{N}-]/gu, '') + ')'), '',
  '## Gramática', '', 'Notação EBNF. Palavras entre aspas são literais; acentos e maiúsculas não importam em nomes nem em palavras.', '', '```ebnf', R.gramatica.replace(/\s+$/, ''), '```', '',
  '## Precedência de operadores', '', tabelaMd(['Nível', 'Operadores', 'Significado', 'Associatividade'], R.precedencia), '',
  '## Tipos', '', tabelaMd(['Tipo', 'Exemplos', 'Descrição'], R.tipos), '',
  '## Nomes e escopo', '', md(R.escopo), '',
  '## Palavras', '', 'Reservadas (' + K.palavras.length + '): ' + K.palavras.map(p => '`' + p + '`').join(' '), '',
  'De contexto (têm sentido especial só em certas posições e podem ser usadas como nomes): ' + K.contexto.map(p => '`' + p + '`').join(' '), '',
  '## Funções prontas', '', tabelaMd(['Função', 'Descrição'], Object.values(K.docFuncoes).map(([f, d]) => [f.split(' · ').map(x => '<code>' + x + '</code>').join(' · '), d])), '',
  '## Ações por tipo', '', 'Ações são chamadas com ponto: `lista.soma`, `texto.maiúsculas`, `vencimento.mais_meses(1)`. Sem argumentos, os parênteses são opcionais.', '',
  ...Object.entries(tipos).flatMap(([t, linhas]) => ['### ' + (NOMES_TIPO[t] || t), '', tabelaMd(['Ação', 'Descrição'], linhas), '']),
  '## Módulos', '', md(R.modulos), '',
  '## Telas', '', md(R.telas), '',
  '## Planilhas', '', md(R.planilhas), '',
  '## Origem dos valores', '', md(R.origem), '',
  '## Conciliação', '', md(R.conciliacao), '',
  '## Internet', '', md(R.internet), '',
  '## Índices e cotações', '', md(R.indices), '',
  '## Diagnóstico', '', '`cordel verificar` (e o editor, enquanto você digita) aponta estes problemas sem rodar o programa:', '', tabelaMd(['Nível', 'Problema', 'Detalhe'], R.diagnostico), '',
  '## Limites', '', tabelaMd(['Limite', 'Valor'], R.limites), '',
].join('\n'), true);
escreve('docs/guia.md', [
  '# Guia da linguagem Cordel', '',
  'Um passeio pela linguagem, do primeiro `mostre` a apps com páginas. Cada trecho roda como está: copie para um arquivo `.cordel` e rode com `cordel rodar arquivo.cordel`.', '',
  '## Por que Cordel', '', ...K.principios.map(([t, d]) => '- **' + md(t) + '.** ' + md(d)), '',
  ...K.guia.filter(g => g.id !== 'claude').flatMap(g => [
    '## ' + g.titulo, '', md(g.texto), '',
    ...(g.codigo ? [bloco(g.codigo), ''] : []),
    ...(g.acoes ? [tabelaMd(['Ação', 'O que faz'], g.acoes), ''] : []),
  ]),
].join('\n'), true);
escreve('docs/manual-para-ia.md', '<!-- Cole este texto como instrução para uma IA escrever programas em Cordel. É o mesmo manual usado pelo botão Descrever do editor. -->\n\n' + le('web/manual-ia.md'), true);

// ───────── gramática e extensão do VS Code ─────────
const reservadas = ['se', 'senão', 'fim', 'enquanto', 'para', 'repita', 'escolha', 'caso', 'devolva', 'pare', 'continue', 'tente', 'falhou', 'falhe', 'teste', 'confira', 'tela', 'mostre'];
const gramatica = gerarGramatica({
  controle: reservadas, funcao: ['função'], variavel: ['var'], logicas: ['e', 'ou', 'não'], constantes: ['verdadeiro', 'falso'],
  tela: ['título', 'subtítulo', 'botão', 'campo', 'marque', 'seletor', 'link', 'cartão', 'linha', 'cor', 'espaço', 'página', 'abas', 'gráfico', 'vá', 'volte'],
  contexto: ['de', 'até', 'passo', 'cada', 'em', 'vezes', 'então', 'faça', 'por', 'como'],
  funcoes: C.funcoes().map(f => f.nome), metodos: C.metodos().map(m => m.nome),
});
const destacadas = new Set([...reservadas, 'função', 'var', 'e', 'ou', 'não', 'verdadeiro', 'falso'].map(C.norm));
for (const k of C.KW) if (!destacadas.has(k)) throw new Error('palavra reservada sem destaque na gramática: ' + k);
escreve('editores/cordel.tmLanguage.json', json(gramatica), true);
const EXT = 'editores/vscode/';
escreve(EXT + 'syntaxes/cordel.tmLanguage.json', json(gramatica), false);
const docs = { funcoes: K.docFuncoes, metodos: K.docMetodos, palavras: {} };
for (const [p, d] of Object.entries(K.docPalavras)) docs.palavras[C.norm(p)] = [p, d];
for (const k of C.KW) if (!docs.palavras[k]) throw new Error('palavra reservada sem explicação em docPalavras: ' + k);
escreve(EXT + 'lib/docs.json', JSON.stringify(docs), false);
for (const f of ['cordel.js', 'terminal.js', 'arquivos.js', 'gerar-app.js', 'planilha.js', 'app.js', 'app.css', 'buscar.js']) copia('lib/' + f, EXT + 'lib/' + f);
copia('LICENSE', EXT + 'LICENSE');
copia('CHANGELOG.md', EXT + 'CHANGELOG.md');
const pacoteExt = JSON.parse(le(EXT + 'package.json'));
if (pacoteExt.version !== V) { pacoteExt.version = V; escreve(EXT + 'package.json', json(pacoteExt), true); }

if (desatualizados.length) {
  console.error('Arquivos gerados desatualizados (rode npm run construir e inclua no commit):\n  ' + desatualizados.join('\n  '));
  process.exit(1);
}
console.log(CHECAR ? 'arquivos gerados em dia (' + V + ')' : 'construído: dist/cordel.html (' + (pagina.length / 1024).toFixed(0) + ' KB), docs, gramática e extensão (' + V + ')');
