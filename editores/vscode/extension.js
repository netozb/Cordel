'use strict';
// Extensão da linguagem Cordel para o VS Code.
// Erros e avisos enquanto você digita, formatação oficial, explicações ao passar o mouse,
// sugestões de funções e ações, estrutura do arquivo e três comandos:
// rodar aqui (painel Saída), rodar no terminal e gerar o app em .html.
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const vscode = require('vscode');
const Cordel = require('./lib/cordel.js');
const T = require('./lib/terminal.js');
const A = require('./lib/arquivos.js');
const { gerarApp: montarApp } = require('./lib/gerar-app.js');
const { buscarSincrono, lembrarBuscas } = require('./lib/buscar.js');
const DOCS = require('./lib/docs.json');

const LETRA = 'A-Za-zÀ-ÖØ-öø-ÿ';
const PALAVRA = new RegExp('[' + LETRA + '_][' + LETRA + '0-9_]*');
const semCrases = t => String(t).replace(/`/g, '');
const norm = Cordel.norm;

let colecao = null; // erros e avisos por arquivo
let canal = null; // painel de saída "Cordel"
const agendados = new Map();
const ultimaEstrutura = new Map();

// ───────── erros e avisos enquanto digita ─────────
function conferir(doc) {
  if (!doc || doc.languageId !== 'cordel') return;
  if (!vscode.workspace.getConfiguration('cordel', doc.uri).get('diagnostico.ativo', true)) { colecao.delete(doc.uri); return; }
  let problemas;
  try { problemas = Cordel.verificar(doc.getText(), { modulos: modulosDe(doc) }).problemas; } catch (err) { return; }
  colecao.set(doc.uri, problemas.map(p => {
    const linha = Math.min(Math.max(0, p.linha - 1), Math.max(0, doc.lineCount - 1));
    const texto = doc.lineAt(linha).text;
    const col = Math.min(Math.max(0, p.col - 1), texto.length);
    const palavra = PALAVRA.exec(texto.slice(col));
    const fim = palavra && palavra.index === 0 ? col + palavra[0].length : Math.min(texto.length, col + 1);
    const d = new vscode.Diagnostic(new vscode.Range(linha, col, linha, Math.max(col, fim)), semCrases(p.msg) + (p.dica ? '\n' + semCrases(p.dica) : ''),
      p.nivel === 'erro' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning);
    d.source = 'cordel';
    return d;
  }));
}
function agendar(doc) {
  if (!doc || doc.languageId !== 'cordel') return;
  const k = doc.uri.toString();
  clearTimeout(agendados.get(k));
  agendados.set(k, setTimeout(() => { agendados.delete(k); conferir(doc); }, 250));
}

// ───────── formatação oficial ─────────
const formatador = {
  provideDocumentFormattingEdits(doc) {
    const src = doc.getText();
    const sintaxe = Cordel.verificar(src).problemas.filter(p => p.sintaxe);
    if (sintaxe.length) {
      vscode.window.showWarningMessage('Cordel: corrija o erro de sintaxe da linha ' + sintaxe[0].linha + ' antes de formatar.');
      return [];
    }
    const novo = Cordel.formatar(src);
    if (novo === src.replace(/\r\n/g, '\n')) return [];
    return [vscode.TextEdit.replace(new vscode.Range(doc.positionAt(0), doc.positionAt(src.length)), novo)];
  },
};

// ───────── explicações ao passar o mouse ─────────
function metodosChamados(k) { return Object.keys(DOCS.metodos).filter(chave => norm(chave.split(':')[1]) === k); }
function funcaoPronta(k) { return Object.keys(DOCS.funcoes).find(nome => norm(nome) === k); }
const explicacoes = {
  provideHover(doc, pos) {
    const r = doc.getWordRangeAtPosition(pos, PALAVRA);
    if (!r) return null;
    const linha = doc.lineAt(pos.line).text;
    const k = norm(doc.getText(r));
    const antes = linha.slice(0, r.start.character), depois = linha.slice(r.end.character);
    if (/#/.test(antes.replace(/"[^"]*"/g, ''))) return null;
    const md = new vscode.MarkdownString();
    if (/\.\s*$/.test(antes)) {
      const chaves = metodosChamados(k);
      if (!chaves.length) return null;
      for (const chave of chaves) {
        const [tipo, nome] = chave.split(':'); const [args, desc] = DOCS.metodos[chave];
        md.appendCodeblock(tipo + '.' + nome + (args || ''), 'cordel');
        md.appendMarkdown(desc + '\n\n');
      }
      return new vscode.Hover(md, r);
    }
    const f = funcaoPronta(k);
    if (f && /^\s*\(/.test(depois)) {
      const [assinatura, desc] = DOCS.funcoes[f];
      md.appendCodeblock(assinatura, 'cordel');
      md.appendMarkdown(desc);
      return new vscode.Hover(md, r);
    }
    // "é" com acento é comparação; sem acento, "e" é o conectivo lógico
    const bruta = doc.getText(r);
    if (bruta === 'é' || bruta === 'É') { md.appendMarkdown('**é** — Comparação de igualdade: `x é 3` é o mesmo que `x == 3`.'); return new vscode.Hover(md, r); }
    const p = DOCS.palavras[k];
    if (p && !/\.\s*$/.test(antes)) { md.appendMarkdown('**' + p[0] + '** — ' + p[1]); return new vscode.Hover(md, r); }
    return null;
  },
};

// ───────── sugestões ─────────
const sugestoes = {
  provideCompletionItems(doc, pos) {
    const antes = doc.lineAt(pos.line).text.slice(0, pos.character);
    if (/^\s*#/.test(antes) || (antes.split('"').length % 2 === 0 && !/\{[^}]*$/.test(antes))) return [];
    const itens = [];
    if (new RegExp('\\.[' + LETRA + '0-9_]*$').test(antes)) {
      const porNome = new Map();
      for (const chave of Object.keys(DOCS.metodos)) {
        const [tipo, nome] = chave.split(':');
        if (!porNome.has(nome)) porNome.set(nome, []);
        porNome.get(nome).push([tipo, ...DOCS.metodos[chave]]);
      }
      for (const [nome, usos] of porNome) {
        const it = new vscode.CompletionItem(nome, vscode.CompletionItemKind.Method);
        it.detail = usos.map(u => u[0]).join(', ');
        it.documentation = new vscode.MarkdownString(usos.map(u => '`' + u[0] + '.' + nome + (u[1] || '') + '` — ' + u[2]).join('\n\n'));
        if (usos.every(u => u[1] && u[1].startsWith('('))) { it.insertText = new vscode.SnippetString(nome + '($1)'); it.command = { command: 'editor.action.triggerParameterHints', title: '' }; }
        itens.push(it);
      }
      return itens;
    }
    for (const nome of Object.keys(DOCS.funcoes)) {
      const [assinatura, desc] = DOCS.funcoes[nome];
      const it = new vscode.CompletionItem(nome, vscode.CompletionItemKind.Function);
      it.detail = assinatura;
      it.documentation = new vscode.MarkdownString(desc);
      it.insertText = new vscode.SnippetString(nome + (/\(\)$/.test(assinatura) ? '()' : '($1)'));
      itens.push(it);
    }
    for (const k of Object.keys(DOCS.palavras)) {
      const it = new vscode.CompletionItem(DOCS.palavras[k][0], vscode.CompletionItemKind.Keyword);
      it.documentation = new vscode.MarkdownString(DOCS.palavras[k][1]);
      itens.push(it);
    }
    return itens;
  },
};

// ───────── estrutura do arquivo (Estrutura, trilha e Ctrl+Shift+O) ─────────
function fimDoBloco(doc, linhaInicio, offsetFim) {
  const recuo = doc.lineAt(linhaInicio).firstNonWhitespaceCharacterIndex;
  for (let i = doc.positionAt(offsetFim).line; i < doc.lineCount; i++) {
    const l = doc.lineAt(i);
    if (i > linhaInicio && l.firstNonWhitespaceCharacterIndex <= recuo && /^\s*fim\b/i.test(l.text)) return l.range.end;
  }
  return doc.lineAt(doc.positionAt(offsetFim).line).range.end;
}
function simbolo(doc, no, nome, tipo, detalhe) {
  const ini = doc.positionAt(no.s);
  const faixa = new vscode.Range(ini, no.body ? fimDoBloco(doc, ini.line, no.e) : doc.positionAt(no.e));
  const s = new vscode.DocumentSymbol(nome, detalhe || '', tipo, faixa, new vscode.Range(ini, doc.positionAt(no.e > no.s ? Math.min(no.e, doc.offsetAt(doc.lineAt(ini.line).range.end)) : no.s)));
  return s;
}
const estrutura = {
  provideDocumentSymbols(doc) {
    let arvore;
    try { arvore = Cordel.__parse(doc.getText()); } catch (err) { return ultimaEstrutura.get(doc.uri.toString()) || []; }
    const lista = [], vars = new Set(), fixos = new Set();
    const titulo = n => (n && n.type === 'Lit' && typeof n.v === 'string' && n.v.trim() ? n.v : '…');
    for (const no of arvore.body) {
      if (no.type === 'Func') lista.push(simbolo(doc, no, no.name, vscode.SymbolKind.Function, '(' + no.params.map(p => p.name).join(', ') + ')'));
      else if (no.type === 'Var') { vars.add(no.k); lista.push(simbolo(doc, no, no.name, vscode.SymbolKind.Variable, 'var')); }
      else if (no.type === 'Assign' && no.op === '=' && no.target.type === 'Ident' && !vars.has(no.target.k) && !fixos.has(no.target.k)) { fixos.add(no.target.k); lista.push(simbolo(doc, no, no.target.name, vscode.SymbolKind.Constant, 'fixo')); }
      else if (no.type === 'Test') lista.push(simbolo(doc, no, titulo(no.name), vscode.SymbolKind.Event, 'teste'));
      else if (no.type === 'Tela') {
        const t = simbolo(doc, no, titulo(no.title), vscode.SymbolKind.Module, 'tela');
        for (const f of no.body || []) if (f.type === 'UIPage') t.children.push(simbolo(doc, f, titulo(f.name), vscode.SymbolKind.Class, 'página'));
        lista.push(t);
      }
    }
    ultimaEstrutura.set(doc.uri.toString(), lista);
    return lista;
  },
};

// ───────── rodar ─────────
function semExcel() { throw new Error('arquivos do Excel ainda não funcionam pela extensão; use CSV ou o comando "Cordel: Rodar no terminal".'); }
function planilhasDe(src, pasta) {
  const arquivos = [], avisos = [];
  if (!pasta) return { arquivos, avisos };
  for (const p of A.planilhasCitadas(src, pasta)) {
    try { arquivos.push(A.lerArquivo(p, semExcel)); } catch (err) { avisos.push(path.basename(p) + ': ' + err.message); }
  }
  return { arquivos, avisos };
}
function documentoAtivo() {
  const ed = vscode.window.activeTextEditor;
  if (!ed || ed.document.languageId !== 'cordel') { vscode.window.showInformationMessage('Abra um programa .cordel primeiro.'); return null; }
  return ed.document;
}
const pastaDe = doc => (doc.uri.scheme === 'file' && !doc.isUntitled ? path.dirname(doc.uri.fsPath) : null);
// Módulos: outros arquivos .cordel da mesma pasta; um arquivo aberto e não salvo vale como está no editor.
function modulosDe(doc) {
  const pasta = pastaDe(doc); if (!pasta) return null;
  const abertos = new Map(vscode.workspace.textDocuments.filter(d => d.uri.scheme === 'file').map(d => [path.resolve(d.uri.fsPath), d]));
  return A.resolvedorDeModulos(pasta, caminho => { const d = abertos.get(path.resolve(caminho)); return d ? d.getText() : null; });
}

async function rodar() {
  const doc = documentoAtivo(); if (!doc) return;
  const src = doc.getText();
  const nome = doc.isUntitled ? 'sem título' : path.basename(doc.fileName);
  const pasta = pastaDe(doc);
  const e = T.estilo(false);
  canal.clear();
  canal.show(true);
  canal.appendLine('▶ ' + nome + '  ·  Cordel ' + Cordel.version);
  canal.appendLine('');
  const { arquivos, avisos } = planilhasDe(src, pasta);
  for (const a of avisos) canal.appendLine('! ' + a);
  const respostas = [], buscar = lembrarBuscas();
  const semente = (Date.now() % 2147483647) || 1;
  let r, parado = false;
  for (;;) {
    r = Cordel.run(src, { answers: respostas, seed: semente, files: arquivos, modulos: modulosDe(doc), buscar });
    if (r.ask === null) break;
    const resposta = await vscode.window.showInputBox({ title: nome, prompt: r.ask || 'Resposta', ignoreFocusOut: true });
    if (resposta === undefined) { parado = true; break; }
    respostas.push(resposta);
  }
  const origens = vscode.workspace.getConfiguration('cordel', doc.uri).get('origens', false);
  for (const s of r.out) canal.appendLine(s.kind === 'ask' ? '? ' + s.text : s.kind === 'answer' ? '› ' + s.text : T.saida(s, e, origens));
  if (parado) canal.appendLine('(parado: a pergunta ficou sem resposta)');
  if (r.ui) canal.appendLine('(este programa tem uma tela: use "Cordel: Gerar app (.html)" para abri-la no navegador)');
  if (r.files && r.files.length) {
    if (!pasta) canal.appendLine('(salve o programa num arquivo .cordel para gravar os resultados de salve)');
    else for (const f of r.files) {
      try { A.gravarSaidas([f], pasta, semExcel); canal.appendLine('✓ gravado ' + path.basename(f.name)); } catch (err) { canal.appendLine('! ' + f.name + ': ' + err.message); }
    }
  }
  if (r.tests) canal.appendLine(T.testes(r.tests, e));
  if (r.error) canal.appendLine(T.erro(r.error, e, nome));
  canal.appendLine('');
  canal.appendLine('■ ' + (r.error ? 'terminou com erro' : parado ? 'parado' : 'pronto') + ' em ' + r.ms + ' ms');
  return r;
}

function comandoExiste(nome) {
  try { return cp.spawnSync(process.platform === 'win32' ? 'where' : 'which', [nome], { encoding: 'utf8' }).status === 0; } catch (err) { return false; }
}
async function rodarNoTerminal() {
  const doc = documentoAtivo(); if (!doc) return;
  if (doc.isUntitled || doc.uri.scheme !== 'file') { vscode.window.showInformationMessage('Salve o programa num arquivo .cordel antes de rodar no terminal.'); return; }
  if (doc.isDirty) await doc.save();
  if (!comandoExiste('cordel')) {
    const escolha = await vscode.window.showWarningMessage('Não achei o comando cordel neste computador. Instale o pacote Cordel para computador (veja o README) ou rode aqui mesmo.', 'Rodar aqui', 'Tentar no terminal assim mesmo');
    if (escolha === 'Rodar aqui') return rodar();
    if (escolha !== 'Tentar no terminal assim mesmo') return;
  }
  let t = vscode.window.terminals.find(x => x.name === 'Cordel');
  if (!t) t = vscode.window.createTerminal({ name: 'Cordel', cwd: path.dirname(doc.uri.fsPath) });
  t.show(true);
  t.sendText('cordel rodar "' + doc.uri.fsPath.replace(/"/g, '\\"') + '"');
}

async function gerarApp() {
  const doc = documentoAtivo(); if (!doc) return;
  const src = doc.getText();
  const pasta = pastaDe(doc);
  const g = montarApp(src, planilhasDe(src, pasta).arquivos, modulosDe(doc), buscarSincrono);
  if (g.erro) { vscode.window.showErrorMessage('Cordel: erro ' + (g.erro.arquivo ? 'no módulo ' + g.erro.arquivo + ', ' : 'na ') + 'linha ' + g.erro.line + ': ' + semCrases(g.erro.msg)); return; }
  if (g.semTela) { vscode.window.showWarningMessage('Esse programa não tem uma tela. Um app precisa de um bloco tela "Nome" … fim.'); return; }
  const destino = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(path.join(pasta || os.homedir(), g.slug + '.html')), filters: { 'Página HTML': ['html'] } });
  if (!destino) return;
  fs.writeFileSync(destino.fsPath, g.html);
  const escolha = await vscode.window.showInformationMessage('App gerado: ' + path.basename(destino.fsPath) + ' (funciona sem internet).', 'Abrir no navegador');
  if (escolha === 'Abrir no navegador') vscode.env.openExternal(destino);
  return destino;
}

// ───────── ativação ─────────
function activate(context) {
  colecao = vscode.languages.createDiagnosticCollection('cordel');
  canal = vscode.window.createOutputChannel('Cordel');
  const seletor = { language: 'cordel' };
  context.subscriptions.push(
    colecao, canal,
    vscode.workspace.onDidOpenTextDocument(conferir),
    // um módulo mudou: os programas abertos que o usam são conferidos de novo
    vscode.workspace.onDidChangeTextDocument(ev => { if (ev.document.languageId === 'cordel') vscode.workspace.textDocuments.forEach(agendar); }),
    vscode.workspace.onDidCloseTextDocument(doc => { colecao.delete(doc.uri); ultimaEstrutura.delete(doc.uri.toString()); }),
    vscode.workspace.onDidChangeConfiguration(ev => { if (ev.affectsConfiguration('cordel')) vscode.workspace.textDocuments.forEach(conferir); }),
    vscode.languages.registerDocumentFormattingEditProvider(seletor, formatador),
    vscode.languages.registerHoverProvider(seletor, explicacoes),
    vscode.languages.registerCompletionItemProvider(seletor, sugestoes, '.'),
    vscode.languages.registerDocumentSymbolProvider(seletor, estrutura),
    vscode.commands.registerCommand('cordel.rodar', rodar),
    vscode.commands.registerCommand('cordel.rodarNoTerminal', rodarNoTerminal),
    vscode.commands.registerCommand('cordel.gerarApp', gerarApp),
  );
  vscode.workspace.textDocuments.forEach(conferir);
}
function deactivate() { for (const t of agendados.values()) clearTimeout(t); agendados.clear(); }

module.exports = { activate, deactivate };
