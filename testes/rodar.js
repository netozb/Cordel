#!/usr/bin/env node
'use strict';
// Suíte de testes da Cordel.
//
//   node testes/rodar.js                 roda tudo (o mesmo que npm test)
//   node testes/rodar.js formatador      só as seções cujo nome contém "formatador"
//   node testes/rodar.js --atualizar     regrava os arquivos .esperado com a saída atual
//                                        (use depois de uma mudança intencional e revise a diferença)
//
// Casos de execução, telas, diagnóstico e formatador ficam em pastas com pares
// nome.cordel (o programa) e nome.esperado (o resultado exato). As opções de cada
// caso (respostas, semente, planilhas, toques) ficam no casos.json da pasta.
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const Cordel = require('../lib/cordel.js');

const DIR = __dirname;
const RAIZ = path.join(DIR, '..');
const CLI = path.join(RAIZ, 'bin', 'cordel.js');
const HOJE = '2026-09-26'; // data fixa: hoje() e agora() não podem mudar o resultado dos testes
const agoraDe = caso => caso.agora || (caso.hoje || HOJE) + 'T10:00:00';
// Horas com fuso ("…Z") viram a hora local: os testes usam sempre o mesmo fuso.
process.env.TZ = 'America/Fortaleza';
const cores = !!process.stdout.isTTY && !process.env.NO_COLOR;
const c = (cod, t) => (cores ? '\x1b[' + cod + 'm' + t + '\x1b[0m' : t);
const verde = t => c('32', t), vermelho = t => c('31', t), cinza = t => c('90', t), negrito = t => c('1', t), amarelo = t => c('33', t);

// ───────── como descrever resultados em texto estável ─────────
const celula = x => (typeof x === 'string' ? x : x.dt !== undefined ? x.s : x.n !== undefined ? x.n : x.b ? 'verdadeiro' : 'falso');

function descreverSaidas(out) {
  const L = [];
  for (const o of out || []) {
    if (o.kind === 'out') L.push(o.text);
    else if (o.kind === 'titulo') L.push((o.nivel === 1 ? '# ' : '## ') + o.text);
    else if (o.kind === 'ask') L.push('? ' + o.text);
    else if (o.kind === 'answer') L.push('› ' + o.text);
    else if (o.kind === 'table') {
      L.push('[tabela ' + o.rows.length + ' de ' + o.total + '] ' + (o.cols || []).join(' | '));
      for (const r of o.rows) L.push('  ' + r.map(celula).join(' | '));
    } else if (o.kind === 'chart') {
      L.push('[gráfico ' + JSON.stringify(o.title || '') + (o.campo ? ' por ' + o.campo : '') + '] ' + o.labels.map((l, i) => l + '=' + o.values[i]).join(', ') + (o.total > o.labels.length ? ' (de ' + o.total + ')' : ''));
    } else if (o.kind === 'file') L.push('[arquivo ' + o.name + (o.rows != null ? ', ' + o.rows + ' linhas' : '') + ']');
    else L.push('[' + o.kind + '] ' + (o.text != null ? o.text : JSON.stringify(o)));
  }
  return L;
}
function descreverErro(err) {
  if (!err) return [];
  return ['[erro ' + (err.arquivo ? err.arquivo + ' ' : '') + err.line + ':' + err.col + '] ' + err.msg].concat(err.dica ? ['[dica] ' + err.dica] : []);
}
// Resultado de um programa sem tela (ou do início de um com tela).
function descreverExecucao(r) {
  const L = descreverSaidas(r.out);
  if (r.ask !== null && r.ask !== undefined) L.push('[pergunta sem resposta] ' + r.ask);
  L.push(...descreverErro(r.error));
  for (const t of r.tests || []) L.push('[teste ' + (t.ok ? '✓' : '✗') + '] ' + t.name + (t.ok ? '' : ' — ' + t.msg + ' (linha ' + t.line + ')'));
  for (const f of r.files || []) {
    if (f.ext === 'pdf') L.push('[conteúdo de ' + f.name + '] ' + f.blocos.map(b => b.tipo === 'tabela' ? 'tabela ' + (b.cols || []).join(' | ') + ' + ' + b.rows.length + ' linhas' + (b.origens && b.origens.some(Boolean) ? ', origem da primeira: ' + b.origens.find(Boolean).curto : '') : b.tipo + ' ' + JSON.stringify(b.texto)).join(' · '));
    else if (f.text != null) L.push('[conteúdo de ' + f.name + ']', ...f.text.replace(/\n$/, '').split('\n').map(l => '  ' + l));
    else L.push('[conteúdo de ' + f.name + '] ' + (f.cols || []).join(' | ') + ' + ' + (f.rows || []).length + ' linhas');
  }
  if (r.ui) L.push(...descreverTela(r.ui));
  return L.join('\n') + '\n';
}
// A árvore da tela: um elemento por linha, com todas as propriedades em ordem alfabética.
function descreverTela(n, nivel = 0) {
  const props = Object.keys(n).filter(k => k !== 't' && k !== 'kids').sort().map(k => k + '=' + JSON.stringify(n[k]));
  const L = ['  '.repeat(nivel) + '<' + n.t + '>' + (props.length ? ' ' + props.join(' ') : '')];
  for (const k of n.kids || []) L.push(...descreverTela(k, nivel + 1));
  return L;
}

// ───────── casos ─────────
function lerPlanilhas(lista) {
  return (lista || []).map(a => {
    if (typeof a !== 'string') return a; // planilha já convertida em abas, escrita no próprio casos.json
    const p = path.join(DIR, 'planilhas', a);
    return /\.(xlsx|xls|xlsm|ods)$/i.test(a) ? null : { name: a, text: fs.readFileSync(p, 'utf8') };
  }).filter(Boolean);
}
// Módulos de um caso: todos os .cordel de testes/modulos/<pasta>, pelo nome do arquivo.
function lerModulos(pasta) {
  if (!pasta) return null;
  const dir = path.join(DIR, 'modulos', pasta), m = {};
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.cordel')).sort()) m[f.slice(0, -7)] = fs.readFileSync(path.join(dir, f), 'utf8');
  return m;
}
// Os exemplos também servem de módulos uns para os outros (use "regras").
lerModulos.exemplos = () => {
  const dir = path.join(RAIZ, 'exemplos'), m = {};
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.cordel'))) m[f.slice(0, -7)] = fs.readFileSync(path.join(dir, f), 'utf8');
  return m;
};
function lerCasos(pasta) {
  const f = path.join(DIR, pasta, 'casos.json');
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}
const programaDe = (pasta, caso) => fs.readFileSync(path.join(DIR, pasta, caso.arquivo), 'utf8');
const esperadoDe = (pasta, caso) => path.join(DIR, pasta, caso.arquivo.replace(/\.cordel$/, '.esperado'));

// Respostas da internet de um caso (sem rede de verdade): { endereço: { status, tipo, texto } }.
const buscarDoCaso = caso => (caso.rede ? (url => caso.rede[url] || { erro: 'rede', detalhe: 'endereço sem resposta no caso de teste' }) : null);
function executarPrograma(src, caso) {
  const r = Cordel.run(src, { buscar: buscarDoCaso(caso), answers: caso.respostas || [], seed: caso.semente || 42, files: lerPlanilhas(caso.planilhas), modulos: lerModulos(caso.modulos), hoje: caso.hoje || HOJE, agora: agoraDe(caso) });
  return descreverExecucao(r);
}
function executarTela(src, caso, memorias) {
  let storage;
  if (caso.memoria) {
    if (!memorias.has(caso.memoria)) memorias.set(caso.memoria, new Map());
    const m = memorias.get(caso.memoria);
    storage = { get: k => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, v) };
  }
  // Com rede, o teste faz o que o app faz no navegador: sem busca síncrona, cada busca pendente é
  // respondida e o início (ou o toque) é repetido; o toque desfeito não pode deixar rastro.
  const rede = {}, opcoes = () => ({ app: true, storage, rede, modulos: lerModulos(caso.modulos), maxSteps: caso.maxPassos, hoje: caso.hoje || HOJE, agora: agoraDe(caso), files: lerPlanilhas(caso.planilhas) });
  const responder = pedido => (caso.rede && caso.rede[pedido.url]) || { erro: 'rede', detalhe: 'endereço sem resposta no caso de teste' };
  let s = Cordel.start(src, opcoes()), buscas = [];
  while (s.res.busca) { buscas.push(s.res.busca.url); rede[s.res.busca.chave] = responder(s.res.busca); s = Cordel.start(src, opcoes()); }
  let txt = '== ao abrir\n' + buscas.map(u => '[buscou] ' + u + '\n').join('') + descreverExecucao(s.res);
  for (const [desc, id, valor] of caso.passos || []) {
    let r = s.event(id, valor); buscas = [];
    while (r.busca) { buscas.push(r.busca.url); s.lembrar(r.busca.chave, responder(r.busca)); r = s.event(id, valor); }
    txt += '== ' + desc + ' (' + id + (valor !== undefined ? ', ' + JSON.stringify(valor) : '') + ')' + (r.changed ? '' : ' [nada mudou]') + '\n';
    txt += buscas.map(u => '[buscou] ' + u + '\n').join('');
    txt += [...descreverSaidas(r.out), ...descreverErro(r.error), ...(r.ui ? descreverTela(r.ui) : [])].join('\n') + '\n';
  }
  return txt;
}
function diagnosticar(src, caso) {
  const ps = Cordel.verificar(src, { modulos: lerModulos(caso && caso.modulos) }).problemas;
  if (!ps.length) return '(nenhum problema)\n';
  return ps.map(p => p.nivel + ' ' + p.linha + ':' + p.col + ' ' + p.msg + (p.dica ? '\n  dica: ' + p.dica : '')).join('\n') + '\n';
}

// ───────── infraestrutura ─────────
const ATUALIZAR = process.argv.includes('--atualizar');
const FILTRO = process.argv.slice(2).filter(a => !a.startsWith('--'));
const secoes = [];
function secao(nome, fn) { secoes.push({ nome, fn }); }
let falhas = [];
let atualizados = 0;
function comparar(nomeCaso, arquivoEsperado, obtido) {
  if (ATUALIZAR) {
    if (!fs.existsSync(arquivoEsperado) || fs.readFileSync(arquivoEsperado, 'utf8') !== obtido) { fs.writeFileSync(arquivoEsperado, obtido); atualizados++; }
    return true;
  }
  const esperado = fs.existsSync(arquivoEsperado) ? fs.readFileSync(arquivoEsperado, 'utf8') : null;
  if (esperado === obtido) return true;
  falhas.push({ caso: nomeCaso, detalhe: esperado === null ? 'falta o arquivo ' + path.relative(RAIZ, arquivoEsperado) + ' (rode com --atualizar)' : diferenca(esperado, obtido) });
  return false;
}
function conferir(nomeCaso, ok, detalhe) {
  if (!ok) falhas.push({ caso: nomeCaso, detalhe: detalhe || '' });
  return !!ok;
}
function diferenca(a, b) {
  const x = a.split('\n'), y = b.split('\n');
  let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i++;
  const L = ['a partir da linha ' + (i + 1) + ':'];
  for (let k = i; k < Math.min(x.length, i + 6); k++) L.push(vermelho('  - ' + x[k]));
  for (let k = i; k < Math.min(y.length, i + 6); k++) L.push(verde('  + ' + y[k]));
  return L.join('\n');
}
function cli(args, opcoes = {}) {
  const r = cp.spawnSync(process.execPath, [CLI, ...args], { cwd: opcoes.cwd || RAIZ, input: opcoes.entrada || '', encoding: 'utf8', env: Object.assign({}, process.env, { NO_COLOR: '1' }), timeout: 60000 });
  return { codigo: r.status, saida: r.stdout || '', erro: r.stderr || '' };
}
// Servidor local (outro processo) para os testes de busque na linha de comando.
let SERVIDOR = null;
function subirServidor() {
  const proc = cp.spawn(process.execPath, [path.join(DIR, 'servidor.js')], { stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('o servidor de testes não subiu')), 10000);
    proc.stdout.once('data', d => { clearTimeout(t); res({ porta: parseInt(String(d), 10), parar: () => proc.kill() }); });
    proc.once('error', rej);
  });
}
const temXLSX = (() => { try { require.resolve('xlsx', { paths: [RAIZ] }); return true; } catch (e) { return false; } })();

// ───────── seções ─────────
secao('execução', () => {
  let n = 0;
  for (const caso of lerCasos('execucao')) {
    const obtido = executarPrograma(programaDe('execucao', caso), caso);
    comparar('execução › ' + caso.nome, esperadoDe('execucao', caso), obtido); n++;
  }
  return n + ' programas';
});

secao('telas', () => {
  let n = 0; const memorias = new Map();
  for (const caso of lerCasos('telas')) {
    const obtido = executarTela(programaDe('telas', caso), caso, memorias);
    comparar('telas › ' + caso.nome, esperadoDe('telas', caso), obtido); n++;
  }
  return n + ' apps';
});

secao('diagnóstico', () => {
  let n = 0;
  for (const caso of lerCasos('diagnostico')) {
    comparar('diagnóstico › ' + caso.nome, esperadoDe('diagnostico', caso), diagnosticar(programaDe('diagnostico', caso), caso)); n++;
  }
  return n + ' programas';
});

secao('formatador', () => {
  // 1. casos exatos
  let exatos = 0;
  for (const caso of lerCasos('formatador')) {
    comparar('formatador › ' + caso.nome, esperadoDe('formatador', caso), Cordel.formatar(programaDe('formatador', caso))); exatos++;
  }
  // 2. o formatador nunca muda o significado: mesma árvore, mesma saída, e formatar de novo não muda nada
  const semPos = no => JSON.stringify(no, (k, v) => (['s', 'e', 'pos', 'opPos', 'off'].includes(k) ? undefined : typeof v === 'bigint' ? v.toString() : v));
  const arvore = src => { try { return semPos(Cordel.__parse(src)); } catch (e) { return 'ERRO: ' + e.message; } };
  const saida = (src, caso) => {
    const app = /^[ \t]*tela\b/m.test(src);
    const mem = new Map();
    const r = Cordel.start(src, { seed: 3, app, hoje: HOJE, agora: agoraDe({}), modulos: caso.modulos ? lerModulos(caso.modulos) : lerModulos.exemplos(), files: lerPlanilhas(caso.planilhas || ['vendas_exemplo.csv']), answers: caso.respostas || ['Neto', '41', '10', '5', '15'], storage: { get: k => (mem.has(k) ? mem.get(k) : null), set: (k, v) => mem.set(k, v) } }).res;
    return JSON.stringify([r.out, r.error && r.error.msg, r.ui, r.tests]);
  };
  const programas = [];
  for (const pasta of ['execucao', 'telas', 'diagnostico', 'formatador']) for (const caso of lerCasos(pasta)) programas.push([pasta + '/' + caso.arquivo, programaDe(pasta, caso), caso]);
  for (const f of fs.readdirSync(path.join(RAIZ, 'exemplos')).filter(f => f.endsWith('.cordel'))) programas.push(['exemplos/' + f, fs.readFileSync(path.join(RAIZ, 'exemplos', f), 'utf8'), {}]);
  if (fs.existsSync(path.join(DIR, 'modulos'))) for (const d of fs.readdirSync(path.join(DIR, 'modulos'))) for (const f of fs.readdirSync(path.join(DIR, 'modulos', d)).filter(f => f.endsWith('.cordel'))) programas.push(['modulos/' + d + '/' + f, fs.readFileSync(path.join(DIR, 'modulos', d, f), 'utf8'), { modulos: d }]);
  let inv = 0;
  for (const [nome, src, caso] of programas) {
    const fmt = Cordel.formatar(src);
    const a1 = arvore(src), a2 = arvore(fmt);
    conferir('formatador › mesma árvore: ' + nome, a1 === a2, 'a árvore sintática mudou depois de formatar');
    conferir('formatador › idempotente: ' + nome, Cordel.formatar(fmt) === fmt, diferenca(fmt, Cordel.formatar(fmt)));
    if (!a1.startsWith('ERRO')) conferir('formatador › mesma saída: ' + nome, saida(src, caso) === saida(fmt, caso), 'o programa formatado se comporta diferente');
    inv++;
  }
  return exatos + ' casos exatos, ' + inv + ' programas sem mudança de sentido';
});

// Respostas do Banco Central para os exemplos e o guia que usam índices (sem internet de verdade).
const REDE_BC = (() => { const r = JSON.parse(fs.readFileSync(path.join(DIR, 'rede', 'banco-central.json'), 'utf8')); delete r._nota; return r; })();
// respostas para os exemplos que perguntam: o jogo de adivinhação chuta de 1 a 20 até acertar
const RESPOSTAS = { 'pergunte.cordel': ['Maria', '40'], 'adivinha.cordel': Array.from({ length: 20 }, (_, i) => String(i + 1)) };
secao('exemplos', () => {
  const pasta = path.join(RAIZ, 'exemplos');
  const arquivos = fs.readdirSync(pasta).filter(f => f.endsWith('.cordel'));
  const planilhas = fs.readdirSync(pasta).filter(f => /\.(csv|txt|xml|ofx)$/i.test(f)).map(f => ({ name: f, text: fs.readFileSync(path.join(pasta, f), 'utf8') }));
  for (const f of arquivos) {
    const src = fs.readFileSync(path.join(pasta, f), 'utf8');
    const ps = Cordel.verificar(src, { modulos: lerModulos.exemplos() }).problemas;
    if (f === 'erros.cordel') { conferir('exemplos › ' + f + ' aponta os erros de propósito', ps.some(p => p.nivel === 'erro')); continue; }
    conferir('exemplos › ' + f + ' sem erros nem avisos', ps.length === 0, ps.map(p => p.linha + ':' + p.col + ' ' + p.msg).join('\n'));
    conferir('exemplos › ' + f + ' no formato oficial', Cordel.formatar(src) === src, diferenca(src, Cordel.formatar(src)));
    const mem = new Map();
    const r = Cordel.run(src, { app: /^[ \t]*tela\b/m.test(src), seed: 7, hoje: HOJE, agora: agoraDe({}), files: planilhas, rede: REDE_BC, modulos: lerModulos.exemplos(), answers: RESPOSTAS[f] || [], storage: { get: k => (mem.has(k) ? mem.get(k) : null), set: (k, v) => mem.set(k, v) } });
    conferir('exemplos › ' + f + ' roda até o fim sem erro', !r.error && r.ask === null, r.error ? r.error.line + ':' + r.error.col + ' ' + r.error.msg : 'parou na pergunta: ' + r.ask);
    if (r.tests) conferir('exemplos › ' + f + ' testes passam', r.tests.every(t => t.ok), r.tests.filter(t => !t.ok).map(t => t.name + ': ' + t.msg).join('\n'));
  }
  // os trechos do guia (quando o código-fonte da página está junto): formato oficial, sem problemas e rodam sem erro
  let trechos = 0;
  const conteudo = path.join(RAIZ, 'web', 'conteudo.js');
  if (fs.existsSync(conteudo)) {
    const K = require(conteudo), mods = lerModulos.exemplos();
    for (const g of K.guia.filter(g => g.codigo)) {
      const nome = 'guia › ' + g.titulo;
      conferir(nome + ' no formato oficial', Cordel.formatar(g.codigo) === g.codigo.replace(/\s+$/, '') + '\n', diferenca(g.codigo + '\n', Cordel.formatar(g.codigo)));
      const ps = Cordel.verificar(g.codigo, { modulos: mods }).problemas;
      conferir(nome + ' sem erros nem avisos', ps.length === 0, ps.map(p => p.linha + ':' + p.col + ' ' + p.msg).join('\n'));
      const mem = new Map();
      const r = Cordel.run(g.codigo, { app: /^[ \t]*tela\b/m.test(g.codigo), seed: 7, hoje: HOJE, agora: agoraDe({}), files: planilhas, rede: REDE_BC, modulos: mods, storage: { get: k => (mem.has(k) ? mem.get(k) : null), set: (k, v) => mem.set(k, v) } });
      conferir(nome + ' roda sem erro', !r.error, r.error && r.error.line + ':' + r.error.col + ' ' + r.error.msg);
      // só o trecho de busque depende de um site de fora; os demais rodam até o fim (índices com as respostas gravadas)
      if (!/busque\(/.test(g.codigo)) conferir(nome + ' não fica esperando a internet', !r.busca, r.busca && r.busca.url);
      trechos++;
    }
  }
  return arquivos.length + ' exemplos' + (trechos ? ', ' + trechos + ' trechos do guia' : '');
});

// A saída do editor leva a origem de cada valor mostrado: posição no texto, resumo e amostra das linhas.
secao('origem na saída', () => {
  let n = 0;
  const caso = (nome, ok, detalhe) => { conferir('origem na saída › ' + nome, ok, detalhe); n++; };
  const files = lerPlanilhas(['vendas_exemplo.csv']);
  const r = Cordel.run([
    'vendas = tabela("vendas_exemplo.csv")', 'total = vendas.soma(v => v.total)',
    'mostre "Total: {total.dinheiro}"', 'mostre "a", total, "b"', 'mostre 1 + 1', 'mostre vendas.pegue(2)',
    'mostre vendas.transforme(v => {nota: v.nota, total: v.total}).pegue(2)', 'mostre [{a: 1}]',
  ].join('\n'), { files });
  const [o1, o2, o3, t1, t2, t3] = r.out, j = JSON.stringify;
  caso('texto com número que virou texto', o1.origens && o1.origens.length === 1 && o1.origens[0].ini === 0 && o1.origens[0].fim === o1.text.length && o1.origens[0].texto === '42 células de vendas_exemplo.csv (coluna Total; linhas 2 a 43)', j(o1));
  caso('amostra: 20 linhas, com onde e colunas', o1.origens[0].total === 42 && o1.origens[0].rows.length === 20 && o1.origens[0].onde[0] === 'linha 2' && o1.origens[0].cols.includes('Total'), j(o1.origens[0].onde));
  caso('só o valor com origem vira trecho', o2.origens.length === 1 && o2.text.slice(o2.origens[0].ini, o2.origens[0].fim) === '106358.33', j(o2));
  caso('sem origem, nada a mais na saída', o3.origens === undefined, j(o3));
  caso('tabela da planilha: cada linha com a sua', t1.origens.length === 2 && t1.origens[0].curto === 'vendas_exemplo.csv, linha 2' && t1.origens[1].curto === 'vendas_exemplo.csv, linha 3', j(t1.origens));
  caso('tabela de registros montados: a linha de onde vieram', t2.origens[1].texto === 'vendas_exemplo.csv, linha 3 (coluna Total)', j(t2.origens[1]));
  caso('tabela sem origem', t3.origens === undefined, j(t3));
  // desempenho: somar uma planilha grande guarda um nó só, e o laço cresce uma vez por linha
  let csv = 'filial;total\n'; for (let i = 0; i < 20000; i++) csv += 'F' + (i % 7) + ';' + (i % 100) + ',50\n';
  const t0 = Date.now(), g = Cordel.run('v = tabela("g.csv")\nvar s = 0\npara cada x em v\n  s = s + x.total\nfim\nmostre s.origem', { files: [{ name: 'g.csv', text: csv }] });
  caso('laço de 20 mil linhas com origem', !g.error && g.out[0].text === '20.000 células de g.csv (coluna total; linhas 2 a 20.001)' && Date.now() - t0 < 5000, (g.error && g.error.msg) || g.out[0].text);
  return n + ' verificações';
});

// O relatório em PDF: estrutura válida (cada objeto onde o índice diz), páginas, textos e tabelas.
secao('relatório em PDF', () => {
  let n = 0;
  const caso = (nome, ok, detalhe) => { conferir('relatório › ' + nome, ok, detalhe); n++; };
  const R = require(path.join(RAIZ, 'lib', 'relatorio.js'));
  const lerPDF = bytes => {
    const s = Buffer.from(bytes).toString('latin1');
    const xref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(s)[1]);
    const linhas = s.slice(xref).split('\n'), qtd = Number(linhas[1].split(' ')[1]);
    const offsets = linhas.slice(3, 2 + qtd).map(l => Number(l.slice(0, 10)));
    const objetosOk = offsets.every((o, i) => s.startsWith((i + 1) + ' 0 obj', o));
    const comprimentosOk = [...s.matchAll(/<< \/Length (\d+) >>\nstream\n/g)].every(m => s.slice(m.index + m[0].length + Number(m[1]), m.index + m[0].length + Number(m[1]) + 10) === '\nendstream');
    const paginas = Number(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/.exec(s)[1]);
    // os textos desenhados, já sem os escapes do PDF
    const textos = [...s.matchAll(/\((.*?)\) Tj/g)].map(m => m[1].replace(/\\([0-7]{3})/g, (x, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\([()\\])/g, '$1'));
    return { s, objetosOk, comprimentosOk, paginas, textos, ascii: /^[\x00-\x7f]*$/.test(s.slice(15)) };
  };
  const files = lerPlanilhas(['vendas_exemplo.csv']);
  const r = Cordel.run([
    'título "Auditoria de setembro"', 'vendas = tabela("vendas_exemplo.csv")', 'mostre "Total: {vendas.soma(v => v.total).dinheiro} → conferido"',
    'subtítulo "Todas as notas"', 'mostre vendas', 'gráfico "Por filial" de vendas.agrupe(v => v.filial).transforme(g => {filial: g.chave, total: g.itens.soma(v => v.total)}) por total',
    'x = 1 / 0',
  ].join('\n'), { files });
  const pdf = lerPDF(R.daSaida(r, { titulo: 'auditoria', programa: 'auditoria.cordel', versao: Cordel.version, quando: new Date(2026, 9, 1, 9, 30) }));
  caso('começa e termina como PDF 1.4, só com ASCII depois do cabeçalho', pdf.s.startsWith('%PDF-1.4\n') && pdf.s.endsWith('%%EOF\n') && pdf.ascii);
  caso('índice de objetos e tamanhos dos conteúdos corretos', pdf.objetosOk && pdf.comprimentosOk);
  caso('tabela longa vira mais de uma página, com rodapé numerado', pdf.paginas >= 2 && pdf.textos.includes('Página 1 de ' + pdf.paginas) && pdf.textos.includes('Página ' + pdf.paginas + ' de ' + pdf.paginas), pdf.paginas);
  caso('o primeiro título vira o título do relatório, com data e versão', pdf.textos[0] === 'Auditoria de setembro' && pdf.textos[1] === 'Programa auditoria.cordel · Gerado pela Cordel ' + Cordel.version + ' em 01/10/2026 às 09:30', pdf.textos.slice(0, 2).join(' | '));
  caso('acentos em WinAnsi e símbolos sem equivalente trocados', pdf.textos.includes('Total: R$ 106.358,33 -> conferido'), pdf.textos.find(t => t.startsWith('Total')));
  caso('a origem de cada valor vai junto (planilha única: o nome na nota, a linha na coluna)', pdf.textos.includes('Origem: 42 células de vendas_exemplo.csv (coluna Total; linhas 2 a 43)') && pdf.textos.includes('linha 2') && pdf.textos.includes('42 linhas · origem: vendas_exemplo.csv'));
  caso('dinheiro com duas casas e milhar (também na coluna Valor só com 1 casa)', pdf.textos.includes('2.249,91') && pdf.textos.includes('249,99') && pdf.textos.includes('0,00') && pdf.textos.includes('2.499,90') && pdf.textos.includes('30.695,40'));
  const longa = lerPDF(R.gerar({ titulo: 'Longa', blocos: [{ tipo: 'tabela', cols: ['Item', 'Peso'], rows: Array.from({ length: 150 }, (_, i) => ['item ' + (i + 1), { n: (i + 0.5) + '' }]), total: 150,
    origens: Array.from({ length: 150 }, (_, i) => ({ curto: (i % 2 ? 'a.csv' : 'b.csv') + ', linha ' + (i + 2) })) }] }));
  const cabecalhos = longa.textos.filter(t => t === 'Peso').length;
  caso('cabeçalho da tabela repetido em cada página', longa.paginas >= 3 && cabecalhos === longa.paginas, cabecalhos + ' cabeçalhos, ' + longa.paginas + ' páginas');
  caso('origens de planilhas diferentes ficam inteiras na coluna; número comum sem casas a mais', longa.textos.includes('b.csv, linha 2') && longa.textos.includes('a.csv, linha 3') && longa.textos.includes('150 linhas') && longa.textos.includes('0,5'));
  caso('gráfico e erro do programa no relatório', pdf.textos.includes('Por filial') && pdf.textos.includes('O programa parou com erro na linha 7.') && pdf.textos.includes('Divisão por zero.'));
  const curto = lerPDF(R.gerar({ titulo: 'Só texto', blocos: [{ tipo: 'texto', texto: 'linha' }] }));
  caso('relatório pequeno: uma página válida', curto.paginas === 1 && curto.objetosOk && curto.comprimentosOk);
  return n + ' verificações';
});

secao('linha de comando', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cordel-teste-'));
  const escreve = (nome, txt) => { const p = path.join(tmp, nome); fs.writeFileSync(p, txt); return p; };
  const ex = n => path.join(RAIZ, 'exemplos', n);
  let n = 0;
  const caso = (nome, ok, detalhe) => { conferir('linha de comando › ' + nome, ok, detalhe); n++; };
  const mostra = r => 'código ' + r.codigo + '\n' + r.saida + r.erro;
  try {
    let r = cli(['--versao']);
    caso('--versao', r.codigo === 0 && r.saida.trim() === Cordel.version, mostra(r));
    r = cli(['ajuda']);
    caso('ajuda', r.codigo === 0 && r.saida.includes('Uso:') && r.saida.includes('cordel rodar'), mostra(r));
    r = cli(['voar']);
    caso('comando desconhecido termina com código 2', r.codigo === 2 && r.erro.includes('Comando desconhecido'), mostra(r));

    r = cli(['rodar', ex('dinheiro.cordel')]);
    caso('rodar um exemplo', r.codigo === 0 && r.saida.trim().length > 0 && !r.erro, mostra(r));
    const pdf = path.join(tmp, 'auditoria.pdf');
    r = cli(['rodar', ex('auditoria.cordel'), '--pdf', pdf, '--saida', tmp]);
    caso('--pdf grava o relatório da execução', r.codigo === 0 && fs.existsSync(pdf) && fs.readFileSync(pdf, 'latin1').startsWith('%PDF-1.4') && r.saida.includes('relatório'), mostra(r));
    r = cli(['rodar', ex('notas.cordel')]);
    caso('acha sozinho o XML da nota citado em nota_fiscal', r.codigo === 0 && r.saida.includes('NF-e 4180 de MÓVEIS MANDACARU LTDA') && r.saida.includes('Vencimento: 16/09/2026'), mostra(r));
    r = cli(['rodar', ex('conciliacao.cordel'), '--origens']);
    caso('--origens: a origem abaixo das linhas e numa coluna das tabelas', r.codigo === 0 && r.saida.includes('Falta receber: R$ 2.239,99\n  ↳ 2 células de vendas_exemplo.csv (coluna Total; linhas 21 e 29)') && r.saida.includes('de onde veio') && r.saida.includes('extrato_exemplo.csv, linha 22'), mostra(r));
    r = cli([ex('dinheiro.cordel')]);
    caso('rodar sem a palavra rodar', r.codigo === 0 && r.saida.trim().length > 0, mostra(r));

    const resp = escreve('respostas.txt', 'Maria\n40\n');
    r = cli(['rodar', ex('pergunte.cordel'), '--respostas', resp]);
    caso('rodar com --respostas', r.codigo === 0 && r.saida.includes('Maria, você está na vida adulta.'), mostra(r));
    r = cli(['rodar', ex('pergunte.cordel')], { entrada: 'Ana\n15\n' });
    caso('pergunte lê da entrada padrão e mostra a resposta', r.codigo === 0 && r.saida.includes('? Como você se chama? Ana\n') && r.saida.includes('Ana, você está na adolescência.'), mostra(r));
    r = cli(['rodar', ex('pergunte.cordel')], { entrada: 'Ana\n' });
    caso('respostas que acabam antes do fim: mensagem clara', r.codigo === 2 && r.erro.includes('respostas acabaram'), mostra(r));

    const quebra = escreve('quebra.cordel', 'mostre "antes"\nx = 10 / 0\n');
    r = cli(['rodar', quebra]);
    caso('erro na execução: código 1, linha e seta', r.codigo === 1 && r.saida.includes('antes') && /quebra\.cordel:2:\d+/.test(r.erro) && r.erro.includes('^'), mostra(r));

    r = cli(['testar', ex('testes.cordel')]);
    caso('testar: testes que passam', r.codigo === 0 && r.saida.includes('passaram'), mostra(r));
    const falha = escreve('falha.cordel', 'função dobro(x) = x * 3\nteste "dobro"\n  confira dobro(2) == 4\nfim\n');
    r = cli(['testar', falha]);
    caso('testar: teste que falha termina com código 1', r.codigo === 1 && r.saida.includes('✗') && r.saida.includes('0 de 1'), mostra(r));

    r = cli(['verificar', ex('erros.cordel')]);
    caso('verificar: aponta arquivo:linha:coluna', r.codigo === 1 && /erros\.cordel:\d+:\d+ erro/.test(r.saida), mostra(r));
    r = cli(['verificar', ex('tour.cordel'), ex('tarefas.cordel')]);
    caso('verificar: programas limpos', r.codigo === 0 && r.saida.includes('0 erros, 0 avisos'), mostra(r));

    const limpos = fs.readdirSync(path.join(RAIZ, 'exemplos')).filter(f => f.endsWith('.cordel') && f !== 'erros.cordel').map(ex);
    r = cli(['formatar', '--checar', ...limpos]);
    caso('formatar --checar nos exemplos', r.codigo === 0 && r.saida.includes('todos no formato oficial'), mostra(r));
    const baguncado = 'se 1<2 entao\nmostre   "sim"\nfim\n';
    const bag = escreve('baguncado.cordel', baguncado);
    r = cli(['formatar', bag]);
    caso('formatar mostra o resultado', r.codigo === 0 && r.saida === Cordel.formatar(baguncado), mostra(r));
    r = cli(['formatar', '--checar', bag]);
    caso('formatar --checar acusa arquivo fora do formato', r.codigo === 1, mostra(r));
    r = cli(['formatar', '--escrever', bag]);
    caso('formatar --escrever grava', r.codigo === 0 && fs.readFileSync(bag, 'utf8') === 'se 1 < 2 então\n  mostre "sim"\nfim\n', mostra(r));
    const quebrado = escreve('quebrado.cordel', 'se 1 < 2\n  mostre (1 + \n');
    r = cli(['formatar', '--escrever', quebrado]);
    caso('formatar recusa erro de sintaxe e não mexe no arquivo', r.codigo === 1 && fs.readFileSync(quebrado, 'utf8') === 'se 1 < 2\n  mostre (1 + \n', mostra(r));

    fs.copyFileSync(ex('vendas_exemplo.csv'), path.join(tmp, 'vendas_exemplo.csv'));
    const planilha = escreve('planilha.cordel', 'v = tabela("VENDAS_EXEMPLO")\nmostre v.tamanho\nsalve("resumo.csv", v.pegue(2))\n');
    r = cli(['rodar', planilha, '--saida', tmp]);
    const resumo = path.join(tmp, 'resumo.csv');
    caso('acha a planilha sem extensão e grava salve(…)', r.codigo === 0 && /^\d+$/m.test(r.saida) && fs.existsSync(resumo) && fs.readFileSync(resumo, 'utf8').startsWith('\ufeff'), mostra(r));

    // módulos: outro arquivo .cordel na mesma pasta, sem ligar para acentos e maiúsculas
    escreve('Regras de Preço.cordel', 'taxa = 0.1\nfunção com_taxa(v) = v * (1 + taxa)\nfunção falha(v) = v / 0\n');
    const usa = escreve('usa.cordel', 'use "regras de preco"\nmostre com_taxa(200)\n');
    r = cli(['rodar', usa]);
    caso('módulos: use acha o arquivo na mesma pasta', r.codigo === 0 && r.saida.trim() === '220', mostra(r));
    r = cli(['verificar', usa]);
    caso('módulos: verificar conhece os nomes do módulo', r.codigo === 0 && r.saida.includes('0 erros'), mostra(r));
    const falhaMod = escreve('falha.cordel', 'use "regras de preço"\nmostre falha(1)\n');
    r = cli(['rodar', falhaMod]);
    caso('módulos: erro aponta o arquivo e a linha do módulo', r.codigo === 1 && r.erro.includes('Regras de Preço.cordel:3:'), mostra(r));
    const appMod = escreve('loja.cordel', 'use "regras de preço"\ntela "Loja"\n  mostre com_taxa(10)\nfim\n');
    r = cli(['app', appMod, '-o', path.join(tmp, 'loja.html')]);
    const lojaHtml = fs.existsSync(path.join(tmp, 'loja.html')) ? fs.readFileSync(path.join(tmp, 'loja.html'), 'utf8') : '';
    caso('módulos: o app gerado leva o módulo', r.codigo === 0 && lojaHtml.includes('function com_taxa') === false && lojaHtml.includes('com_taxa(v) = v * (1 + taxa)'), mostra(r));

    const html = path.join(tmp, 'tarefas.html');
    r = cli(['app', ex('tarefas.cordel'), '-o', html]);
    const conteudo = fs.existsSync(html) ? fs.readFileSync(html, 'utf8') : '';
    caso('app gera um .html que funciona sozinho', r.codigo === 0 && conteudo.startsWith('<!doctype html>') && conteudo.includes('CordelApp.iniciar') && conteudo.includes('<meta charset="utf-8">'), mostra(r));
    r = cli(['app', ex('dinheiro.cordel'), '-o', path.join(tmp, 'x.html')]);
    caso('app recusa programa sem tela', r.codigo === 2 && r.erro.includes('não tem uma tela'), mostra(r));

    r = cli([], { entrada: 'x = 2\nx * 21\nse x > 1\n  mostre "sim"\nfim\n.sair\n' });
    caso('modo interativo: expressão sozinha e bloco em várias linhas', r.codigo === 0 && r.saida === '42\nsim\n', mostra(r));

    // sem o leitor de Excel (uma cópia do pacote fora de qualquer node_modules): avisa e grava o resto
    const copia = path.join(tmp, 'sem-excel');
    for (const d of ['bin', 'lib']) fs.cpSync(path.join(RAIZ, d), path.join(copia, d), { recursive: true });
    const misto = escreve('misto.cordel', 'dados = [{a: 1}, {a: 2}]\nsalve("dados.xlsx", dados)\nsalve("dados.csv", dados)\nmostre "fim"\n');
    const semExcel = cp.spawnSync(process.execPath, [path.join(copia, 'bin', 'cordel.js'), 'rodar', misto, '--saida', tmp], { encoding: 'utf8', env: Object.assign({}, process.env, { NO_COLOR: '1', NODE_PATH: '' }) });
    r = { codigo: semExcel.status, saida: semExcel.stdout, erro: semExcel.stderr };
    caso('sem o leitor de Excel: explica como instalar e grava os outros arquivos', r.codigo === 1 && r.saida.includes('fim') && r.erro.includes('npm install xlsx') && fs.existsSync(path.join(tmp, 'dados.csv')) && !fs.existsSync(path.join(tmp, 'dados.xlsx')), mostra(r));

    // busque: um servidor local responde como uma API de verdade
    if (SERVIDOR) {
      const base = 'http://127.0.0.1:' + SERVIDOR.porta;
      const rede = escreve('rede.cordel', [
        'empresa = busque("' + base + '/cnpj/11222333000181")',
        'mostre empresa.razao_social, empresa.capital_social',
        'mostre tabela("' + base + '/vendas.csv").soma(v => v.total)',
        'mostre busque("' + base + '/eco", {cabeçalhos: {"X-Token": "segredo"}}).token',
      ].join('\n') + '\n');
      r = cli(['rodar', rede]);
      caso('busque: JSON com números exatos, CSV da internet e cabeçalhos', r.codigo === 0 && r.saida === 'MÓVEIS MANDACARU LTDA 12345678901234.56789\n2480.5\nsegredo\n', mostra(r));
      const naoAchou = escreve('nao-achou.cordel', 'mostre busque("' + base + '/cnpj/00000000000000")\n');
      r = cli(['rodar', naoAchou]);
      caso('busque: erro 404 com mensagem clara', r.codigo === 1 && r.erro.includes('erro 404 (não encontrado)'), mostra(r));
      const lento = escreve('lento.cordel', 'mostre busque("' + base + '/lento")\n');
      const t0 = Date.now();
      const rl = cp.spawnSync(process.execPath, [CLI, 'rodar', lento], { encoding: 'utf8', env: Object.assign({}, process.env, { NO_COLOR: '1', CORDEL_TEMPO_BUSCA: '800' }) });
      caso('busque: tempo limite', rl.status === 1 && rl.stderr.includes('demorou demais') && rl.stderr.includes('0,8 segundos') && Date.now() - t0 < 2800, 'código ' + rl.status + '\n' + rl.stderr);
      const semRede = escreve('sem-rede.cordel', 'mostre busque("http://127.0.0.1:1/x")\n');
      r = cli(['rodar', semRede]);
      caso('busque: sem conexão', r.codigo === 1 && r.erro.includes('Não consegui acessar 127.0.0.1:1'), mostra(r));
      const appRede = escreve('consulta.cordel', 'empresa = busque("' + base + '/cnpj/11222333000181")\ntela "Consulta"\n  mostre empresa.razao_social\nfim\n');
      r = cli(['app', appRede, '-o', path.join(tmp, 'consulta.html')]);
      caso('busque: app que busca ao abrir é gerado', r.codigo === 0 && fs.existsSync(path.join(tmp, 'consulta.html')), mostra(r));
    }

    if (temXLSX) {
      fs.copyFileSync(path.join(DIR, 'planilhas', 'estoque_teste.xlsx'), path.join(tmp, 'estoque_teste.xlsx'));
      const excel = escreve('excel.cordel', 'estoque = tabela("estoque_teste.xlsx")\nmostre estoque.tamanho > 0\nsalve("copia.xlsx", estoque)\n');
      r = cli(['rodar', excel, '--saida', tmp]);
      caso('Excel: lê .xlsx e grava .xlsx', r.codigo === 0 && r.saida.includes('verdadeiro') && fs.existsSync(path.join(tmp, 'copia.xlsx')), mostra(r));
      const relido = escreve('relido.cordel', 'mostre tabela("copia.xlsx").tamanho == tabela("estoque_teste.xlsx").tamanho\n');
      r = cli(['rodar', relido]);
      caso('Excel: o arquivo gravado abre de novo igual', r.codigo === 0 && r.saida.includes('verdadeiro'), mostra(r));
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  return n + ' comandos' + (temXLSX ? '' : amarelo(' · Excel pulado (rode npm install para testar)'));
});

// ───────── principal ─────────
if (require.main === module) (async () => {
  const t0 = Date.now();
  try { SERVIDOR = await subirServidor(); } catch (e) { console.log(amarelo('  (sem servidor local: os testes de busque na linha de comando ficam de fora)')); }
  console.log(negrito('Cordel ' + Cordel.version) + cinza(' · suíte de testes' + (ATUALIZAR ? ' (atualizando os resultados esperados)' : '')) + '\n');
  let total = 0;
  for (const s of secoes) {
    if (FILTRO.length && !FILTRO.some(f => Cordel.norm(s.nome).includes(Cordel.norm(f)))) continue;
    const antes = falhas.length;
    let resumo;
    try { resumo = s.fn(); } catch (e) { falhas.push({ caso: s.nome, detalhe: e.stack }); resumo = 'interrompida'; }
    const novas = falhas.length - antes;
    const pontos = '.'.repeat(Math.max(2, 22 - s.nome.length));
    console.log('  ' + s.nome + ' ' + cinza(pontos) + ' ' + (novas ? vermelho(novas + (novas === 1 ? ' falha' : ' falhas')) + cinza(' · ' + resumo) : verde('ok') + cinza(' · ' + resumo)));
    total++;
  }
  const seg = ((Date.now() - t0) / 1000).toFixed(1).replace('.', ',');
  if (ATUALIZAR) console.log('\n  ' + atualizados + (atualizados === 1 ? ' arquivo .esperado atualizado' : ' arquivos .esperado atualizados') + '. Revise a diferença antes de guardar.');
  if (falhas.length) {
    console.log('');
    for (const f of falhas.slice(0, 30)) console.log(vermelho('  ✗ ') + f.caso + (f.detalhe ? '\n' + f.detalhe.split('\n').map(l => '      ' + l).join('\n') : ''));
    if (falhas.length > 30) console.log(cinza('  … e mais ' + (falhas.length - 30)));
    console.log('\n' + vermelho(negrito('  ' + falhas.length + (falhas.length === 1 ? ' falha' : ' falhas'))) + cinza(' (' + seg + ' s)'));
    if (SERVIDOR) SERVIDOR.parar();
    process.exit(1);
  }
  console.log('\n' + verde(negrito('  ✓ tudo certo')) + cinza(' em ' + total + (total === 1 ? ' seção' : ' seções') + ' (' + seg + ' s)'));
  if (SERVIDOR) SERVIDOR.parar();
})();

module.exports = { descreverExecucao, descreverTela, executarPrograma, executarTela, diagnosticar, HOJE };
