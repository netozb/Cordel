#!/usr/bin/env node
'use strict';
// Linha de comando da linguagem Cordel.
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Cordel = require('../lib/cordel.js');
const T = require('../lib/terminal.js');
const A = require('../lib/arquivos.js');
const { buscarSincrono, lembrarBuscas } = require('../lib/buscar.js');
const { gerarApp } = require('../lib/gerar-app.js');

const cores = !!process.stdout.isTTY && !process.env.NO_COLOR;
const e = T.estilo(cores);
const ee = T.estilo(!!process.stderr.isTTY && !process.env.NO_COLOR);

const AJUDA = `Cordel ${Cordel.version}: linguagem de programação em português

Uso:
  cordel                              modo interativo (digite instruções)
  cordel rodar <programa.cordel>      roda um programa
  cordel testar <programas…>          roda os testes (teste … confira …)
  cordel verificar <programas…>       aponta erros e avisos sem rodar
  cordel formatar <programas…>        mostra o código no formato oficial
  cordel app <programa.cordel>        gera um app em .html a partir da tela
  cordel ajuda | --versao

Opções de "rodar" e "testar":
  --arquivo <planilha>     deixa uma planilha disponível (repita para várias);
                           planilhas citadas em tabela("…") são achadas sozinhas
  --saida <pasta>          onde gravar os arquivos de salve(…) (padrão: pasta atual)
  --respostas <arquivo>    respostas para pergunte(…), uma por linha
  --semente <n>            sorteios de aleatório(…) repetíveis
  --hoje <aaaa-mm-dd>      data usada por hoje() e agora()
  --agora <data e hora>    momento usado por agora(), como "2026-09-26 14:30"
  --origens                mostra de onde veio cada valor (células das planilhas,
                           endereços da internet, índices do Banco Central)

Opções de "formatar":
  --escrever               grava o resultado nos próprios arquivos
  --checar                 só confere; termina com erro se algum arquivo mudaria

Opções de "app":
  -o, --para <arquivo.html>   nome do arquivo gerado
`;

function opcoes(args) {
  const o = { arquivos: [], planilhas: [], _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const val = () => { if (i + 1 >= args.length) falhar('A opção ' + a + ' precisa de um valor.'); return args[++i]; };
    if (a === '--arquivo') o.planilhas.push(val());
    else if (a === '--saida') o.saida = val();
    else if (a === '--respostas') o.respostas = val();
    else if (a === '--semente') o.semente = Number(val());
    else if (a === '--hoje') o.hoje = val();
    else if (a === '--agora') o.agora = val();
    else if (a === '--escrever') o.escrever = true;
    else if (a === '--origens') o.origens = true;
    else if (a === '--checar') o.checar = true;
    else if (a === '-o' || a === '--para') o.para = val();
    else if (a.startsWith('--')) falhar('Opção desconhecida: ' + a + '. Veja: cordel ajuda');
    else o._.push(a);
  }
  return o;
}
function falhar(msg) { process.stderr.write(ee.vermelho('erro') + ' ' + msg + '\n'); process.exit(2); }
function lerPrograma(arq) {
  if (!arq) falhar('Diga qual programa: cordel rodar programa.cordel');
  try { return fs.readFileSync(arq, 'utf8').replace(/^\ufeff/, ''); } catch (err) { falhar('Não consegui ler ' + arq + '.'); }
}

// ── planilhas ──
let XLSX = null;
// Carrega o leitor de Excel (SheetJS), que é opcional; sem ele, CSV continua funcionando.
function carregarXLSX() {
  if (XLSX) return XLSX;
  try { XLSX = require('xlsx'); return XLSX; } catch (err) { throw new Error('para ler ou gravar Excel no computador, instale o leitor de planilhas: npm install xlsx (veja o README)'); }
}
function exigirXLSX() { try { return carregarXLSX(); } catch (err) { falhar(err.message.replace(/^./, c => c.toUpperCase()) + '.'); } }
// Grava os arquivos de salve(…) um a um: se um falhar, os outros ainda são gravados.
function gravar(files, pasta) {
  let falhou = false;
  for (const f of files || []) {
    try {
      const [p] = A.gravarSaidas([f], pasta, carregarXLSX);
      console.log(e.verde('✓ gravado ') + path.relative(process.cwd(), p));
    } catch (err) { falhou = true; console.error(ee.vermelho('erro') + ' não gravei ' + f.name + ': ' + err.message); }
  }
  return !falhou;
}
// As planilhas passadas com --arquivo mais as citadas no programa, já lidas.
function planilhasDo(src, arq, extras) {
  const caminhos = [];
  const add = p => { if (!caminhos.includes(p)) caminhos.push(p); };
  for (const x of extras) { if (!fs.existsSync(x)) falhar('Não achei a planilha ' + x + '.'); add(path.resolve(x)); }
  const dir = path.dirname(path.resolve(arq));
  // as planilhas citadas no programa e nos módulos que ele usa
  for (const fonte of [src, ...Object.values(Cordel.modulosUsados(src, modulosDe(arq)))]) for (const p of A.planilhasCitadas(fonte, dir)) add(p);
  return caminhos.map(p => A.lerArquivo(p, exigirXLSX));
}
const modulosDe = arq => A.resolvedorDeModulos(path.dirname(path.resolve(arq)));
const lerRespostas = arq => fs.readFileSync(arq, 'utf8').replace(/^\ufeff/, '').replace(/\r?\n$/, '').split(/\r?\n/);

// ── rodar ──
function criarLeitor() {
  // Respostas digitadas ou vindas de um arquivo/pipe (cordel rodar x.cordel < respostas.txt).
  const tty = !!process.stdin.isTTY;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: tty });
  const guardadas = [], esperando = []; let fechado = false;
  rl.on('line', l => { const f = esperando.shift(); if (f) f.res(l); else guardadas.push(l); });
  rl.on('close', () => { fechado = true; while (esperando.length) esperando.shift().rej(new Error('As respostas acabaram antes do programa terminar.')); });
  // Sem teclado, a resposta não aparece na tela: mostramos para a saída fazer sentido.
  const mostra = l => { if (!tty) process.stdout.write(e.cinza(l) + '\n'); return l; };
  return {
    perguntar(texto) {
      process.stdout.write(e.azul('? ') + (texto || 'Resposta') + ' ');
      if (guardadas.length) return Promise.resolve(mostra(guardadas.shift()));
      if (fechado) { process.stdout.write('\n'); return Promise.reject(new Error('As respostas acabaram antes do programa terminar.')); }
      return new Promise((res, rej) => esperando.push({ res: l => res(mostra(l)), rej: err => { process.stdout.write('\n'); rej(err); } }));
    },
    fechar() { rl.close(); },
  };
}
async function rodar(o) {
  const arq = o._[0], src = lerPrograma(arq);
  const files = planilhasDo(src, arq, o.planilhas);
  const respostas = o.respostas ? lerRespostas(o.respostas) : [];
  const doArquivo = respostas.length;
  const semente = Number.isFinite(o.semente) ? o.semente : (Date.now() % 2147483647) || 1;
  let impressas = 0, r, leitor = null;
  const buscarUmaVez = lembrarBuscas(); // cada endereço é buscado uma vez, mesmo quando o programa roda de novo depois de uma pergunta
  for (;;) {
    r = Cordel.run(src, { answers: respostas, seed: semente, files, modulos: modulosDe(arq), buscar: buscarUmaVez, hoje: o.hoje, agora: o.agora });
    let pergunta = -1;
    r.out.forEach((s, i) => {
      if (s.kind === 'ask') pergunta++;
      if (i < impressas) return;
      if (s.kind === 'ask' || s.kind === 'answer') {
        // Respostas vindas de --respostas aparecem na saída; as digitadas já estão na tela.
        if (pergunta < doArquivo) console.log(s.kind === 'ask' ? e.azul('? ') + s.text : e.cinza('› ') + s.text);
      } else console.log(T.saida(s, e, o.origens));
    });
    impressas = r.out.length;
    if (r.ask === null) break;
    if (!leitor) leitor = criarLeitor();
    respostas.push(await leitor.perguntar(r.ask));
  }
  if (leitor) leitor.fechar();
  if (r.ui) console.log(e.cinza('(este programa tem uma tela; para usá-la, gere o app: cordel app ' + arq + ')'));
  if (!gravar(r.files, o.saida)) process.exitCode = 1;
  if (r.tests) console.log(T.testes(r.tests, e));
  if (r.error) { console.error(T.erro(r.error, ee, arq)); process.exit(1); }
  if (r.tests && r.tests.some(t => !t.ok)) process.exit(1);
}

// ── testar ──
function testar(o) {
  if (!o._.length) falhar('Diga quais programas testar: cordel testar programa.cordel');
  let falhas = 0, total = 0;
  for (const arq of o._) {
    const src = lerPrograma(arq);
    const files = planilhasDo(src, arq, o.planilhas);
    const r = Cordel.run(src, { files, modulos: modulosDe(arq), buscar: buscarSincrono, seed: Number.isFinite(o.semente) ? o.semente : 1, hoje: o.hoje, agora: o.agora, answers: o.respostas ? lerRespostas(o.respostas) : [] });
    console.log(e.negrito(arq));
    if (r.error) { console.log(T.erro(r.error, e, arq)); falhas++; total++; continue; }
    if (!r.tests || !r.tests.length) { console.log(e.cinza('  nenhum teste neste arquivo')); continue; }
    console.log(T.testes(r.tests, e));
    total += r.tests.length; falhas += r.tests.filter(t => !t.ok).length;
  }
  if (o._.length > 1) console.log((falhas ? e.vermelho : e.verde)((total - falhas) + ' de ' + total + ' testes passaram'));
  process.exit(falhas ? 1 : 0);
}

// ── verificar ──
function verificar(o) {
  if (!o._.length) falhar('Diga quais programas verificar: cordel verificar programa.cordel');
  let erros = 0, avisos = 0;
  for (const arq of o._) {
    const src = lerPrograma(arq);
    for (const p of Cordel.verificar(src, { modulos: modulosDe(arq) }).problemas) {
      const cor = p.nivel === 'erro' ? e.vermelho : e.amarelo;
      console.log(arq + ':' + p.linha + ':' + p.col + ' ' + cor(p.nivel) + ' ' + p.msg.replace(/`/g, '') + (p.dica ? '\n    ' + e.cinza(p.dica.replace(/`/g, '')) : ''));
      if (p.nivel === 'erro') erros++; else avisos++;
    }
  }
  console.log((erros ? e.vermelho : avisos ? e.amarelo : e.verde)(erros + (erros === 1 ? ' erro' : ' erros') + ', ' + avisos + (avisos === 1 ? ' aviso' : ' avisos')));
  process.exit(erros ? 1 : 0);
}

// ── formatar ──
function formatar(o) {
  if (!o._.length) falhar('Diga quais programas formatar: cordel formatar programa.cordel');
  let mudariam = 0;
  for (const arq of o._) {
    const src = lerPrograma(arq);
    if (Cordel.verificar(src).problemas.some(p => p.sintaxe)) { console.error(ee.vermelho('erro') + ' ' + arq + ' tem erros de sintaxe; corrija antes de formatar (cordel verificar ' + arq + ').'); process.exitCode = 1; continue; }
    const novo = Cordel.formatar(src);
    if (o.checar) { if (novo !== src) { mudariam++; console.log(e.amarelo('fora do formato: ') + arq); } }
    else if (o.escrever) { if (novo !== src) { fs.writeFileSync(arq, novo); console.log(e.verde('formatado: ') + arq); } else console.log(e.cinza('já estava no formato: ') + arq); }
    else process.stdout.write(novo);
  }
  if (o.checar) { console.log(mudariam ? e.amarelo(mudariam + ' arquivo(s) fora do formato') : e.verde('todos no formato oficial')); process.exit(mudariam ? 1 : 0); }
}

// ── app ──
function app(o) {
  const arq = o._[0], src = lerPrograma(arq);
  const g = gerarApp(src, planilhasDo(src, arq, o.planilhas), modulosDe(arq), buscarSincrono);
  if (g.erro) { console.error(T.erro(g.erro, ee, arq)); process.exit(1); }
  if (g.semTela) falhar('Esse programa não tem uma tela. Um app precisa de um bloco tela "Nome" … fim.');
  const destino = o.para || path.join(path.dirname(arq), g.slug + '.html');
  fs.writeFileSync(destino, g.html);
  console.log(e.verde('✓ app gerado: ') + destino + e.cinza(' (' + Math.round(g.html.length / 1024) + ' KB, funciona sem internet)'));
}

// ── modo interativo ──
function interativo() {
  // Com o teclado, mostra a apresentação e o prompt; com a entrada vinda de um arquivo ou pipe, só os resultados.
  const tty = !!process.stdin.isTTY;
  if (tty) console.log(e.negrito('Cordel ' + Cordel.version) + e.cinza('  ·  digite instruções; .ajuda para comandos, .sair para sair'));
  const PROMPT = tty ? 'cordel> ' : '', CONTINUA = tty ? '   ...> ' : '';
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: PROMPT, terminal: tty });
  let programa = '', pendente = '', impressas = 0;
  const semente = (Date.now() % 2147483647) || 1;
  const respostas = [];
  const modulosAqui = A.resolvedorDeModulos(process.cwd());
  const continua = src => Cordel.verificar(src, { modulos: modulosAqui }).problemas.some(p => p.sintaxe && /não foi fechad|fim do programa|Faltou fechar/.test(p.msg));
  rl.prompt();
  rl.on('line', linha => {
    const t = linha.trim();
    if (!pendente && t === '.sair') { rl.close(); return; }
    if (!pendente && t === '.ajuda') { console.log('  .sair        sai\n  .limpar      esquece tudo o que foi digitado\n  .programa    mostra o programa digitado até agora\n  Uma expressão sozinha (como 2 + 3) mostra o resultado.'); rl.prompt(); return; }
    if (!pendente && t === '.limpar') { programa = ''; impressas = 0; console.log(e.cinza('  (tudo esquecido)')); rl.prompt(); return; }
    if (!pendente && t === '.programa') { console.log(programa ? Cordel.formatar(programa).replace(/^/gm, '  ') : e.cinza('  (vazio)')); rl.prompt(); return; }
    let trecho = pendente + linha + '\n';
    if (continua(trecho)) { pendente = trecho; rl.setPrompt(CONTINUA); rl.prompt(); return; }
    pendente = ''; rl.setPrompt(PROMPT);
    if (!t) { rl.prompt(); return; }
    // Uma expressão sozinha mostra o valor.
    try {
      const arv = Cordel.__parse(trecho);
      if (arv.body.length === 1 && arv.body[0].type === 'ExprStmt' && arv.body[0].expr.type !== 'Call') trecho = 'mostre ' + trecho;
    } catch (err) { /* o erro aparece ao rodar */ }
    const tentativa = programa + trecho;
    const r = Cordel.run(tentativa, { seed: semente, answers: respostas, modulos: modulosAqui, buscar: buscarSincrono });
    if (r.ask !== null) { console.log(e.cinza('  (pergunte não funciona no modo interativo; rode um arquivo com cordel rodar)')); rl.prompt(); return; }
    if (r.error) {
      for (const s of r.out.slice(impressas)) console.log(T.saida(s, e));
      console.log(T.erro(r.error, e));
    } else {
      for (const s of r.out.slice(impressas)) console.log(T.saida(s, e));
      if (r.tests) console.log(T.testes(r.tests, e));
      programa = tentativa; impressas = r.out.length;
    }
    rl.prompt();
  });
  rl.on('close', () => { if (tty) process.stdout.write('\n'); process.exit(0); });
}

// ── principal ──
const [cmd, ...resto] = process.argv.slice(2);
if (!cmd) interativo();
else if (cmd === '--versao' || cmd === '-v' || cmd === 'versao' || cmd === 'versão') console.log(Cordel.version);
else if (cmd === 'ajuda' || cmd === '--ajuda' || cmd === '-h' || cmd === '--help') process.stdout.write(AJUDA);
else if (cmd === 'rodar') rodar(opcoes(resto)).catch(err => falhar(err.message));
else if (cmd === 'testar') testar(opcoes(resto));
else if (cmd === 'verificar') verificar(opcoes(resto));
else if (cmd === 'formatar') formatar(opcoes(resto));
else if (cmd === 'app') app(opcoes(resto));
else if (/\.(cordel|txt)$/i.test(cmd)) rodar(opcoes([cmd, ...resto])).catch(err => falhar(err.message));
else falhar('Comando desconhecido: ' + cmd + '. Veja: cordel ajuda');
