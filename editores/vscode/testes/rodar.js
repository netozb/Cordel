#!/usr/bin/env node
'use strict';
// Testes da extensão: a gramática de destaque (com o mesmo motor TextMate do VS Code)
// e a extensão rodando sobre uma imitação da API do VS Code.
//   npm install   (instala vscode-textmate e vscode-oniguruma)
//   npm test
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const RAIZ = path.join(__dirname, '..');
let falhas = 0, total = 0;
const cores = !!process.stdout.isTTY && !process.env.NO_COLOR;
const verde = t => (cores ? '\x1b[32m' + t + '\x1b[0m' : t), vermelho = t => (cores ? '\x1b[31m' + t + '\x1b[0m' : t);
function confira(nome, ok, detalhe) {
  total++;
  if (!ok) { falhas++; console.log(vermelho('  ✗ ' + nome) + (detalhe !== undefined ? '\n      ' + String(detalhe).split('\n').join('\n      ') : '')); }
}

// ───────── gramática ─────────
async function testarGramatica() {
  const vsctm = require('vscode-textmate');
  const onig = require('vscode-oniguruma');
  const wasm = fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'));
  await onig.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
  const arquivo = path.join(RAIZ, 'syntaxes', 'cordel.tmLanguage.json');
  const registro = new vsctm.Registry({
    onigLib: Promise.resolve({ createOnigScanner: p => new onig.OnigScanner(p), createOnigString: s => new onig.OnigString(s) }),
    loadGrammar: async escopo => (escopo === 'source.cordel' ? vsctm.parseRawGrammar(fs.readFileSync(arquivo, 'utf8'), arquivo) : null),
  });
  const g = await registro.loadGrammar('source.cordel');
  const fichas = texto => {
    let pilha = vsctm.INITIAL; const out = [];
    for (const linha of texto.split('\n')) {
      const r = g.tokenizeLine(linha, pilha);
      for (const t of r.tokens) out.push({ texto: linha.slice(t.startIndex, t.endIndex), escopos: t.scopes.join(' ') });
      pilha = r.ruleStack;
    }
    return out;
  };
  // [código, trecho, escopo esperado (ou !escopo para "não deve ter"), qual ocorrência]
  const casos = [
    ['se x > 1', 'se', 'keyword.control.cordel'],
    ['SENAO', 'SENAO', 'keyword.control.cordel'],
    ['senão se y', 'senão', 'keyword.control.cordel'],
    ['fim', 'fim', 'keyword.control.cordel'],
    ['função dobro(x) = x * 2', 'função', 'storage.type.function.cordel'],
    ['função dobro(x) = x * 2', 'dobro', 'entity.name.function.cordel'],
    ['funcao media(a, b)', 'media', 'entity.name.function.cordel'],
    ['var total = 0', 'var', 'storage.modifier.cordel'],
    ['var total = 0', '0', 'constant.numeric.cordel'],
    ['x = 1_000.50', '1_000.50', 'constant.numeric.cordel'],
    ['mostre "Olá, {nome}!"', 'Olá, ', 'string.quoted.double.cordel'],
    ['mostre "Olá, {nome}!"', 'nome', 'meta.interpolation.cordel'],
    ['mostre "Olá, {nome}!"', '{', 'punctuation.section.interpolation.begin.cordel'],
    ['mostre "a {"b"} c"', 'b', 'string.quoted.double.cordel'],
    ['mostre "a {"b"} c"', ' c', 'string.quoted.double.cordel'],
    ['mostre “curvas”', 'curvas', 'string.quoted.double.cordel'],
    ["mostre 'simples'", 'simples', 'string.quoted.single.cordel'],
    ['mostre "aspas \\" dentro"', '\\"', 'constant.character.escape.cordel'],
    ['# comentário com fim', '# comentário com fim', 'comment.line.number-sign.cordel'],
    ['x = 3  # fim', '# fim', 'comment.line.number-sign.cordel'],
    ['vendas.soma(v => v.total)', 'soma', 'support.function.method.cordel'],
    ['vendas.soma(v => v.total)', 'total', 'variable.other.property.cordel'],
    ['vendas.soma(v => v.total)', '=>', 'storage.type.function.arrow.cordel'],
    ['p.media', 'media', 'support.function.method.cordel'],
    ['16.raiz', '16', 'constant.numeric.cordel'],
    ['16.raiz', 'raiz', 'support.function.method.cordel'],
    ['n = número("12")', 'número', 'support.function.builtin.cordel'],
    ['n = NUMERO("12")', 'NUMERO', 'support.function.builtin.cordel'],
    ['minha_conta(1)', 'minha_conta', 'entity.name.function.call.cordel'],
    ['  título "Oi"', 'título', 'keyword.other.ui.cordel'],
    ['  botao "Salvar"', 'botao', 'keyword.other.ui.cordel'],
    ['titulo = "x"', 'titulo', '!keyword.other.ui.cordel'],
    ['linha.texto', 'linha', '!keyword.other.ui.cordel'],
    ['para i de 1 até 10 passo -1', 'de', 'keyword.other.context.cordel'],
    ['para i de 1 até 10 passo -1', 'até', 'keyword.other.context.cordel'],
    ['para i de 1 até 10 passo -1', 'passo', 'keyword.other.context.cordel'],
    ['para cada x em lista', 'cada', 'keyword.other.context.cordel'],
    ['se ok então', 'então', 'keyword.other.context.cordel'],
    ['pronto = verdadeiro', 'verdadeiro', 'constant.language.boolean.cordel'],
    ['a e não b', 'não', 'keyword.operator.logical.cordel'],
    ['x é 3', 'é', 'keyword.operator.comparison.word.cordel'],
    ['r = {nome: "Ana"}', 'nome', 'variable.other.property.key.cordel'],
    ['fimbria = 1', 'fimbria', '!keyword'],
    ['emprego = depois + senha', 'emprego', '!keyword'],
    ['emprego = depois + senha', 'depois', '!keyword'],
    ['emprego = depois + senha', 'senha', '!keyword'],
    ['ação = 5', 'ação', '!keyword'],
    ['e_mail = "x"', 'e_mail', '!keyword'],
    ['x += 1', '+=', 'keyword.operator.assignment.cordel'],
    ['x == 1', '==', 'keyword.operator.comparison.cordel'],
  ];
  // escopos das fichas que cobrem o trecho (pela posição na linha)
  const escoposDo = (codigo, trecho) => {
    const i = codigo.indexOf(trecho); if (i < 0) return null;
    const r = g.tokenizeLine(codigo, vsctm.INITIAL);
    return r.tokens.filter(t => t.startIndex < i + trecho.length && i < t.endIndex).map(t => t.scopes.join(' '));
  };
  for (const [codigo, trecho, esperado] of casos) {
    const e = escoposDo(codigo, trecho);
    const nao = esperado.startsWith('!');
    const ok = e && e.length && (nao ? e.every(x => !x.includes(esperado.slice(1))) : e[0].includes(esperado));
    confira('gramática: ' + JSON.stringify(trecho) + ' em ' + JSON.stringify(codigo) + (nao ? ' não é ' : ' é ') + esperado.replace('!', ''), ok, e ? e.join(' | ') : 'trecho não encontrado');
  }
  // texto sem aspas de fechamento não contamina a linha seguinte
  const f = fichas('mostre "sem fim\nse x');
  confira('gramática: texto aberto termina no fim da linha', f.find(t => t.texto === 'se' && t.escopos.includes('keyword.control')), JSON.stringify(f));
  // todos os exemplos são destacados sem erro e sem nenhum trecho perdido
  const exemplos = path.join(RAIZ, '..', '..', 'exemplos');
  if (fs.existsSync(exemplos)) for (const arq of fs.readdirSync(exemplos).filter(a => a.endsWith('.cordel'))) {
    const src = fs.readFileSync(path.join(exemplos, arq), 'utf8');
    const fs_ = fichas(src);
    confira('gramática: exemplo ' + arq + ' destacado por inteiro', fs_.map(t => t.texto).join('') === src.split('\n').join(''));
  }
}

// ───────── imitação da API do VS Code ─────────
function imitacaoVSCode() {
  class Position { constructor(line, character) { this.line = line; this.character = character; } isBeforeOrEqual(o) { return this.line < o.line || (this.line === o.line && this.character <= o.character); } }
  class Range {
    constructor(a, b, c, d) { if (a instanceof Position) { this.start = a; this.end = b; } else { this.start = new Position(a, b); this.end = new Position(c, d); } }
    contains(r) { return this.start.isBeforeOrEqual(r.start) && r.end.isBeforeOrEqual(this.end); }
  }
  class Diagnostic { constructor(range, message, severity) { Object.assign(this, { range, message, severity }); } }
  class MarkdownString {
    constructor(v) { this.value = v || ''; }
    appendMarkdown(s) { this.value += s; return this; }
    appendCodeblock(c, l) { this.value += '\n```' + (l || '') + '\n' + c + '\n```\n'; return this; }
  }
  class Hover { constructor(contents, range) { this.contents = contents; this.range = range; } }
  class CompletionItem { constructor(label, kind) { this.label = label; this.kind = kind; } }
  class SnippetString { constructor(v) { this.value = v; } }
  class DocumentSymbol {
    constructor(name, detail, kind, range, selectionRange) {
      if (!name || !name.trim()) throw new Error('name must not be falsy');
      if (!range.contains(selectionRange)) throw new Error('selectionRange must be contained in fullRange');
      Object.assign(this, { name, detail, kind, range, selectionRange, children: [] });
    }
  }
  const Uri = { file: p => ({ scheme: 'file', fsPath: p, toString: () => 'file://' + p }) };
  const reg = { comandos: {}, provedores: {}, ouvintes: {}, mensagens: [], respostas: [], terminais: [], externos: [] };
  const disp = () => ({ dispose() {} });
  const ouvir = nome => fn => { (reg.ouvintes[nome] = reg.ouvintes[nome] || []).push(fn); return disp(); };
  const colecao = { mapa: new Map(), set(uri, d) { this.mapa.set(uri.toString(), d); }, delete(uri) { this.mapa.delete(uri.toString()); }, get(uri) { return this.mapa.get(uri.toString()); }, dispose() {} };
  const canal = { linhas: [], appendLine(s) { this.linhas.push(...String(s).split('\n')); }, clear() { this.linhas = []; }, show() {}, dispose() {} };
  const mensagem = tipo => async (msg, ...botoes) => { reg.mensagens.push({ tipo, msg, botoes }); return reg.respostas.length ? reg.respostas.shift() : undefined; };
  const vscode = {
    Position, Range, Diagnostic, MarkdownString, Hover, CompletionItem, SnippetString, DocumentSymbol, Uri,
    TextEdit: { replace: (range, newText) => ({ range, newText }) },
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
    CompletionItemKind: { Method: 1, Function: 2, Keyword: 13 },
    SymbolKind: { Module: 1, Class: 4, Function: 11, Variable: 12, Constant: 13, Event: 23 },
    languages: {
      createDiagnosticCollection: () => colecao,
      registerDocumentFormattingEditProvider: (s, p) => { reg.provedores.formatacao = p; return disp(); },
      registerHoverProvider: (s, p) => { reg.provedores.explicacao = p; return disp(); },
      registerCompletionItemProvider: (s, p, ...gatilhos) => { reg.provedores.sugestao = p; reg.gatilhos = gatilhos; return disp(); },
      registerDocumentSymbolProvider: (s, p) => { reg.provedores.estrutura = p; return disp(); },
    },
    workspace: {
      textDocuments: [],
      getConfiguration: () => ({ get: (k, padrao) => padrao }),
      onDidOpenTextDocument: ouvir('abrir'), onDidChangeTextDocument: ouvir('mudar'), onDidCloseTextDocument: ouvir('fechar'), onDidChangeConfiguration: ouvir('config'),
    },
    window: {
      activeTextEditor: null, terminals: [],
      createOutputChannel: () => canal,
      showInformationMessage: mensagem('info'), showWarningMessage: mensagem('aviso'), showErrorMessage: mensagem('erro'),
      showInputBox: async opcoes => { reg.mensagens.push({ tipo: 'pergunta', msg: opcoes.prompt }); return reg.respostas.shift(); },
      showSaveDialog: async () => reg.respostas.shift(),
      createTerminal: opcoes => { const t = { name: opcoes.name, opcoes, textos: [], show() {}, sendText(s) { this.textos.push(s); } }; reg.terminais.push(t); vscode.window.terminals.push(t); return t; },
    },
    commands: { registerCommand: (id, fn) => { reg.comandos[id] = fn; return disp(); } },
    env: { openExternal: async uri => { reg.externos.push(uri); return true; } },
  };
  return { vscode, reg, colecao, canal };
}
function documento(vscode, texto, arquivo) {
  const linhas = texto.split('\n');
  const offsetAt = pos => { let o = 0; for (let i = 0; i < pos.line; i++) o += linhas[i].length + 1; return o + pos.character; };
  return {
    languageId: 'cordel', uri: vscode.Uri.file(arquivo || path.join(os.tmpdir(), 'sem-titulo.cordel')), fileName: arquivo || 'Sem título-1', isUntitled: !arquivo, isDirty: false,
    lineCount: linhas.length,
    lineAt(i) { const t = linhas[i]; return { text: t, firstNonWhitespaceCharacterIndex: t.search(/\S|$/), range: new vscode.Range(i, 0, i, t.length) }; },
    positionAt(off) { const antes = texto.slice(0, Math.max(0, Math.min(off, texto.length))).split('\n'); return new vscode.Position(antes.length - 1, antes[antes.length - 1].length); },
    offsetAt,
    getText(r) { return r ? texto.slice(offsetAt(r.start), offsetAt(r.end)) : texto; },
    getWordRangeAtPosition(pos, re) {
      const g = new RegExp(re.source, 'g'); let m;
      while ((m = g.exec(linhas[pos.line]))) if (m.index <= pos.character && pos.character <= m.index + m[0].length) return new vscode.Range(pos.line, m.index, pos.line, m.index + m[0].length);
      return undefined;
    },
    save: async () => true,
  };
}

async function testarExtensao() {
  const { vscode, reg, colecao, canal } = imitacaoVSCode();
  const carregar = Module._load;
  Module._load = function (pedido) { return pedido === 'vscode' ? vscode : carregar.apply(this, arguments); };
  let ext;
  try { ext = require(path.join(RAIZ, 'extension.js')); } finally { Module._load = carregar; }
  ext.activate({ subscriptions: [] });
  for (const c of ['cordel.rodar', 'cordel.rodarNoTerminal', 'cordel.gerarApp']) confira('extensão: comando ' + c + ' registrado', typeof reg.comandos[c] === 'function');
  for (const p of ['formatacao', 'explicacao', 'sugestao', 'estrutura']) confira('extensão: provedor de ' + p + ' registrado', !!reg.provedores[p]);
  const pacote = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
  for (const c of pacote.contributes.commands) confira('extensão: ' + c.command + ' do package.json existe no código', typeof reg.comandos[c.command] === 'function');
  const abrir = doc => reg.ouvintes.abrir.forEach(f => f(doc));

  // erros e avisos
  const d1 = documento(vscode, 'idade = 20\nse idade > 18\n  fase = "adulto"\nfim\nmostre fase\n');
  abrir(d1);
  const diag = colecao.get(d1.uri) || [];
  const erro = diag.find(d => d.severity === 0);
  confira('diagnóstico: nome usado fora do bloco vira erro', erro && erro.range.start.line === 4 && erro.range.start.character === 7 && erro.range.end.character === 11, JSON.stringify(diag));
  confira('diagnóstico: mensagem sem crases', erro && !erro.message.includes('`'), erro && erro.message);
  const d2 = documento(vscode, 'nunca_usada = 1\nmostre 2\n');
  abrir(d2);
  confira('diagnóstico: aviso de nome nunca usado', (colecao.get(d2.uri) || []).some(d => d.severity === 1 && d.message.includes('nunca_usada')));
  const d3 = documento(vscode, 'x = (1 +\nmostre 2\n');
  abrir(d3);
  confira('diagnóstico: erro de sintaxe', (colecao.get(d3.uri) || []).some(d => d.severity === 0));
  reg.ouvintes.mudar.forEach(f => f({ document: d2 }));
  await new Promise(r => setTimeout(r, 350));
  confira('diagnóstico: refeito depois de uma mudança', (colecao.get(d2.uri) || []).length >= 1);
  reg.ouvintes.fechar.forEach(f => f(d2));
  confira('diagnóstico: some quando o arquivo fecha', colecao.get(d2.uri) === undefined);

  // formatação
  const fmt = reg.provedores.formatacao;
  const ed = fmt.provideDocumentFormattingEdits(documento(vscode, 'se 1<2 entao\nmostre   "sim"\nfim\n'));
  confira('formatação: aplica o formato oficial', ed.length === 1 && ed[0].newText === 'se 1 < 2 então\n  mostre "sim"\nfim\n', JSON.stringify(ed));
  confira('formatação: nada a fazer num arquivo já formatado', fmt.provideDocumentFormattingEdits(documento(vscode, 'mostre 1\n')).length === 0);
  const antes = reg.mensagens.length;
  confira('formatação: recusa com erro de sintaxe', fmt.provideDocumentFormattingEdits(documento(vscode, 'mostre (1 +\n')).length === 0 && reg.mensagens.length === antes + 1 && /linha \d/.test(reg.mensagens[antes].msg), JSON.stringify(reg.mensagens.slice(antes)));

  // explicações
  const exp = reg.provedores.explicacao;
  const dh = documento(vscode, 'vendas = [1, 2]\nmostre vendas.soma\nmostre número("3")\nenquanto falso\nfim\n# vendas.soma\n');
  const h1 = exp.provideHover(dh, new vscode.Position(1, 16));
  confira('explicação: ação soma', h1 && h1.contents.value.includes('Soma dos itens'), h1 && h1.contents.value);
  const h2 = exp.provideHover(dh, new vscode.Position(2, 9));
  confira('explicação: função pronta número', h2 && h2.contents.value.includes('número(texto)'), h2 && h2.contents.value);
  const h3 = exp.provideHover(dh, new vscode.Position(3, 3));
  confira('explicação: palavra enquanto', h3 && h3.contents.value.includes('enquanto'), h3 && h3.contents.value);
  confira('explicação: nada dentro de comentário', !exp.provideHover(dh, new vscode.Position(5, 11)));
  const dé = documento(vscode, 'x = 1\nmostre x é 1 e verdadeiro\n');
  const h4 = exp.provideHover(dé, new vscode.Position(1, 9)), h5 = exp.provideHover(dé, new vscode.Position(1, 13));
  confira('explicação: é (comparação) e e (lógico) são diferentes', h4 && h4.contents.value.includes('igualdade') && h5 && h5.contents.value.includes('dois lados'), [h4 && h4.contents.value, h5 && h5.contents.value].join(' | '));
  confira('explicação: nada para nomes comuns', !exp.provideHover(dh, new vscode.Position(0, 2)));

  // sugestões
  const sug = reg.provedores.sugestao;
  confira('sugestões: disparam com ponto', reg.gatilhos.includes('.'));
  const s1 = sug.provideCompletionItems(documento(vscode, 'lista.'), new vscode.Position(0, 6));
  confira('sugestões: ações depois do ponto', s1.some(i => i.label === 'soma' && i.kind === 1) && s1.some(i => i.label === 'maiúsculas') && !s1.some(i => i.label === 'mostre'), s1.map(i => i.label).join(' '));
  const s2 = sug.provideCompletionItems(documento(vscode, 'mo'), new vscode.Position(0, 2));
  confira('sugestões: palavras e funções prontas', s2.some(i => i.label === 'mostre' && i.kind === 13) && s2.some(i => i.label === 'número' && i.kind === 2));
  confira('sugestões: nada dentro de texto', sug.provideCompletionItems(documento(vscode, 'mostre "lis'), new vscode.Position(0, 11)).length === 0);
  confira('sugestões: funcionam dentro de {…} num texto', sug.provideCompletionItems(documento(vscode, 'mostre "{lista.'), new vscode.Position(0, 15)).some(i => i.label === 'soma'));

  // estrutura
  const est = reg.provedores.estrutura;
  const prog = 'var total = 0\ntaxa = 0.05\ntaxa_2 = 1\nfunção dobro(x) = x * 2\nfunção media(a, b)\n  devolva (a + b) / 2\nfim\ntela "Loja"\n  página "Produtos"\n    mostre 1\n  fim\n  página "Detalhes"\n    mostre 2\n  fim\nfim\nteste "dobro"\n  confira dobro(2) == 4\nfim\n';
  const de = documento(vscode, prog);
  const simbolos = est.provideDocumentSymbols(de);
  const nomes = simbolos.map(s => s.name + ':' + s.kind).join(' ');
  confira('estrutura: símbolos do arquivo', nomes === 'total:12 taxa:13 taxa_2:13 dobro:11 media:11 Loja:1 dobro:23', nomes);
  const tela = simbolos.find(s => s.name === 'Loja');
  confira('estrutura: páginas dentro da tela', tela && tela.children.map(c => c.name).join(',') === 'Produtos,Detalhes');
  confira('estrutura: o bloco vai até o fim', tela && tela.range.end.line === 14 && simbolos.find(s => s.name === 'media').range.end.line === 6, tela && JSON.stringify(tela.range));
  const quebrado = documento(vscode, prog + 'se (\n');
  quebrado.uri = de.uri;
  confira('estrutura: com erro de sintaxe, mantém a última boa', est.provideDocumentSymbols(quebrado).length === simbolos.length);

  // rodar
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cordel-ext-'));
  try {
    fs.writeFileSync(path.join(tmp, 'vendas.csv'), 'filial;total\nCrato;1500,50\nIguatu;980\n');
    const arq = path.join(tmp, 'programa.cordel');
    const texto = 'v = tabela("vendas")\nmostre v\nmostre "Total: {v.soma(x => x.total).dinheiro}"\nnome = pergunte("Seu nome?")\nmostre "Oi, {nome}"\nsalve("resumo.csv", v)\nsalve("resumo.xlsx", v)\nteste "soma"\n  confira v.soma(x => x.total) == 2480.5\nfim\n';
    fs.writeFileSync(arq, texto);
    vscode.window.activeTextEditor = { document: documento(vscode, texto, arq) };
    reg.respostas.push('Ana');
    const r = await reg.comandos['cordel.rodar']();
    const saida = canal.linhas.join('\n');
    confira('rodar: mostra tabela, texto e resposta', saida.includes('Crato') && saida.includes('R$ 2.480,50') && saida.includes('Oi, Ana'), saida);
    confira('rodar: pergunte abre uma caixa de resposta', reg.mensagens.some(m => m.tipo === 'pergunta' && m.msg === 'Seu nome?'));
    confira('rodar: grava o CSV ao lado do programa', fs.existsSync(path.join(tmp, 'resumo.csv')) && saida.includes('✓ gravado resumo.csv'), saida);
    confira('rodar: explica que Excel precisa do terminal', saida.includes('! resumo.xlsx') && !fs.existsSync(path.join(tmp, 'resumo.xlsx')), saida);
    confira('rodar: testes aparecem', saida.includes('1 de 1 teste passou'), saida);
    confira('rodar: termina com pronto', /■ pronto em \d+ ms/.test(saida) && r && !r.error, saida);
    reg.respostas.length = 0;
    await reg.comandos['cordel.rodar']();
    confira('rodar: pergunta sem resposta para com aviso', canal.linhas.join('\n').includes('(parado'), canal.linhas.join('\n'));
    vscode.window.activeTextEditor = { document: documento(vscode, 'mostre 1\nx = 1 / 0\n', path.join(tmp, 'erro.cordel')) };
    await reg.comandos['cordel.rodar']();
    const s2 = canal.linhas.join('\n');
    confira('rodar: erro com linha e seta', s2.includes('erro.cordel:2:') && s2.includes('^') && s2.includes('terminou com erro'), s2);
    vscode.window.activeTextEditor = null;
    const n0 = reg.mensagens.length;
    await reg.comandos['cordel.rodar']();
    confira('rodar: sem arquivo .cordel aberto, avisa', reg.mensagens.length === n0 + 1);

    // módulos: outro arquivo da pasta, e um arquivo aberto e não salvo vale como está no editor
    fs.writeFileSync(path.join(tmp, 'regras.cordel'), 'taxa = 0.1\nfunção com_taxa(v) = v * (1 + taxa)\n');
    const usaMod = 'use "regras"\nmostre com_taxa(100)\n';
    vscode.window.activeTextEditor = { document: documento(vscode, usaMod, path.join(tmp, 'usa.cordel')) };
    await reg.comandos['cordel.rodar']();
    confira('módulos: rodar usa o arquivo da mesma pasta', canal.linhas.includes('110'), canal.linhas.join('\n'));
    const aberto = documento(vscode, 'taxa = 0.5\nfunção com_taxa(v) = v * (1 + taxa)\n', path.join(tmp, 'regras.cordel'));
    vscode.workspace.textDocuments.push(aberto);
    await reg.comandos['cordel.rodar']();
    confira('módulos: vale o texto aberto no editor, mesmo sem salvar', canal.linhas.includes('150'), canal.linhas.join('\n'));
    vscode.workspace.textDocuments.pop();
    const dm = documento(vscode, 'use "regras"\nuse "sumido"\nmostre com_taxa(1)\n', path.join(tmp, 'diag.cordel'));
    abrir(dm);
    const pm = colecao.get(dm.uri) || [];
    confira('módulos: diagnóstico acha o módulo e aponta o que não existe', pm.length === 1 && pm[0].message.includes('sumido') && pm[0].range.start.line === 1, JSON.stringify(pm.map(d => d.message)));

    // busque: um servidor local faz o papel da API
    const srv = require('child_process').spawn(process.execPath, [path.join(RAIZ, '..', '..', 'testes', 'servidor.js')]);
    const porta = await new Promise((res, rej) => { srv.stdout.once('data', d => res(parseInt(String(d), 10))); srv.once('error', rej); setTimeout(() => rej(new Error('servidor não subiu')), 10000); }).catch(() => null);
    if (porta) {
      try {
        const rede = 'e1 = busque("http://127.0.0.1:' + porta + '/cnpj/11222333000181")\nmostre e1.razao_social\nmostre e1.capital_social\n';
        vscode.window.activeTextEditor = { document: documento(vscode, rede, path.join(tmp, 'rede.cordel')) };
        canal.clear();
        await reg.comandos['cordel.rodar']();
        confira('busque: rodar busca na internet (servidor local)', canal.linhas.includes('MÓVEIS MANDACARU LTDA') && canal.linhas.includes('12345678901234.56789'), canal.linhas.join('\n'));
      } finally { srv.kill(); }
    }

    // gerar app
    const app = path.join(tmp, 'tarefas.cordel');
    const fonte = 'var n = 0\ntela "Contador"\n  botão "Somar"\n    n += 1\n  fim\n  mostre n\nfim\n';
    fs.writeFileSync(app, fonte);
    vscode.window.activeTextEditor = { document: documento(vscode, fonte, app) };
    reg.respostas.push(vscode.Uri.file(path.join(tmp, 'contador.html')), 'Abrir no navegador');
    await reg.comandos['cordel.gerarApp']();
    const html = fs.existsSync(path.join(tmp, 'contador.html')) ? fs.readFileSync(path.join(tmp, 'contador.html'), 'utf8') : '';
    confira('gerar app: grava o .html', html.startsWith('<!doctype html>') && html.includes('CordelApp.iniciar') && html.includes('<title>Contador</title>'));
    confira('gerar app: abre no navegador', reg.externos.length === 1);
    vscode.window.activeTextEditor = { document: documento(vscode, 'mostre 1\n', path.join(tmp, 'x.cordel')) };
    const n1 = reg.mensagens.length;
    await reg.comandos['cordel.gerarApp']();
    confira('gerar app: programa sem tela avisa', reg.mensagens.length === n1 + 1 && reg.mensagens[n1].msg.includes('não tem uma tela'));

    // rodar no terminal
    vscode.window.activeTextEditor = { document: documento(vscode, 'mostre 1\n', path.join(tmp, 'meu programa.cordel')) };
    const temCordel = require('child_process').spawnSync(process.platform === 'win32' ? 'where' : 'which', ['cordel']).status === 0;
    if (!temCordel) reg.respostas.push('Tentar no terminal assim mesmo');
    await reg.comandos['cordel.rodarNoTerminal']();
    const t = reg.terminais[0];
    confira('terminal: manda cordel rodar com o caminho entre aspas', t && t.textos[0] === 'cordel rodar "' + path.join(tmp, 'meu programa.cordel') + '"', t && t.textos);
    if (!temCordel) {
      reg.respostas.push('Rodar aqui');
      canal.clear();
      await reg.comandos['cordel.rodarNoTerminal']();
      confira('terminal: sem o comando cordel, oferece rodar aqui', canal.linhas.join('\n').includes('■ pronto'), canal.linhas.join('\n'));
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  ext.deactivate();
}

(async () => {
  const t0 = Date.now();
  let semGramatica = false;
  try { require.resolve('vscode-textmate'); require.resolve('vscode-oniguruma'); } catch (e) { semGramatica = true; }
  if (semGramatica) console.log('  (pulado: testes da gramática; rode npm install nesta pasta)');
  else await testarGramatica();
  await testarExtensao();
  const seg = ((Date.now() - t0) / 1000).toFixed(1).replace('.', ',');
  if (falhas) { console.log(vermelho('  ' + falhas + ' de ' + total + ' verificações falharam') + ' (' + seg + ' s)'); process.exit(1); }
  console.log(verde('  ✓ extensão: ' + total + ' verificações passaram') + ' (' + seg + ' s)');
})().catch(e => { console.error(e); process.exit(1); });
