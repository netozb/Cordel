'use strict';
// Transforma o resultado de uma execução da Cordel em texto para o terminal.

function estilo(ativo) {
  const c = (cod, t) => (ativo ? '\x1b[' + cod + 'm' + t + '\x1b[0m' : t);
  return {
    vermelho: t => c('31', t), amarelo: t => c('33', t), verde: t => c('32', t),
    cinza: t => c('90', t), negrito: t => c('1', t), azul: t => c('34', t),
  };
}

const larg = s => [...String(s)].length;
const pad = (s, n, dir) => { const f = ' '.repeat(Math.max(0, n - larg(s))); return dir ? f + s : s + f; };
const cel = c => typeof c === 'string' ? c : c.dt !== undefined ? c.s : c.n !== undefined ? c.n : c.b ? 'verdadeiro' : 'falso';
const ehNum = c => c && typeof c === 'object' && c.n !== undefined;

function tabela(o, e) {
  const cols = o.cols || (o.rows[0] || []).map((_, i) => 'coluna_' + (i + 1));
  const linhas = o.rows.map(r => r.map(cel));
  const numerica = cols.map((_, i) => o.rows.every(r => r[i] === '' || ehNum(r[i])) && o.rows.some(r => ehNum(r[i])));
  const w = cols.map((h, i) => Math.min(40, Math.max(larg(h), ...linhas.map(l => larg(l[i] || '')))));
  const corta = (s, n) => (larg(s) > n ? [...s].slice(0, n - 1).join('') + '…' : s);
  const fmt = (vals, cab) => '  ' + vals.map((v, i) => pad(corta(v || '', w[i]), w[i], numerica[i] && !cab)).join('  ');
  const out = [e.negrito(fmt(cols, true)), e.cinza('  ' + w.map(n => '─'.repeat(n)).join('  '))];
  for (const l of linhas) out.push(fmt(l, false));
  out.push(e.cinza('  ' + (o.rows.length < o.total ? 'mostrando ' + o.rows.length + ' de ' + o.total + ' linhas' : o.total + (o.total === 1 ? ' linha' : ' linhas'))));
  return out.join('\n');
}

const numBR = x => Number(x).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
function grafico(o, e) {
  const vals = o.values.map(Number), LARG = 30;
  const min = Math.min(0, ...vals), max = Math.max(0, ...vals), span = (max - min) || 1;
  const zero = Math.round((-min / span) * LARG);
  const wr = Math.min(24, Math.max(...o.labels.map(larg)));
  const out = [];
  if (o.title || o.campo) out.push(e.negrito('  ' + (o.title || o.campo)));
  o.labels.forEach((rot, i) => {
    const v = vals[i], n = Math.round(Math.abs(v) / span * LARG);
    const barra = v < 0 ? ' '.repeat(Math.max(0, zero - n)) + '█'.repeat(n) + '│' : ' '.repeat(zero) + (min < 0 ? '│' : '') + '█'.repeat(Math.max(n, v ? 1 : 0));
    const r = larg(rot) > wr ? [...rot].slice(0, wr - 1).join('') + '…' : rot;
    out.push('  ' + pad(r, wr) + '  ' + e.azul(barra) + ' ' + e.cinza(numBR(o.values[i])));
  });
  if (o.total > o.labels.length) out.push(e.cinza('  mostrando ' + o.labels.length + ' de ' + o.total));
  return out.join('\n');
}

function erro(err, e, arquivo) {
  const out = [];
  if (err.arquivo) arquivo = err.arquivo + '.cordel';
  const onde = (arquivo ? arquivo + ':' : '') + (err.line ? err.line + ':' + err.col : '');
  out.push(e.vermelho(e.negrito('erro')) + (onde ? e.cinza(' ' + onde) : '') + ' ' + e.negrito(err.msg.replace(/`/g, '')));
  if (err.line && err.lineText != null) {
    const n = String(err.line);
    out.push(e.cinza('  ' + n + ' │ ') + err.lineText);
    out.push(e.cinza('  ' + ' '.repeat(n.length) + ' │ ') + ' '.repeat(Math.max(0, err.col - 1)) + e.vermelho('^'));
  }
  if (err.dica) out.push(e.amarelo('  dica: ') + err.dica.replace(/`/g, ''));
  return out.join('\n');
}

function testes(ts, e) {
  const ok = ts.filter(t => t.ok).length;
  const out = [];
  for (const t of ts) out.push('  ' + (t.ok ? e.verde('✓') : e.vermelho('✗')) + ' ' + t.name + (t.ok ? '' : e.cinza(' (linha ' + t.line + ')') + '\n      ' + e.vermelho(t.msg.replace(/`/g, ''))));
  out.push((ok === ts.length ? e.verde : e.vermelho)('  ' + ok + ' de ' + ts.length + (ts.length === 1 ? ' teste passou' : ' testes passaram')));
  return out.join('\n');
}

// Uma saída (linha de mostre, tabela, gráfico, arquivo) em texto. Com origens, diz de onde veio cada valor.
function saida(o, e, origens) {
  if (o.kind === 'titulo') return o.nivel === 1 ? '\n' + e.negrito(o.text.toLocaleUpperCase('pt-BR')) : e.negrito(o.text);
  if (o.kind === 'out') {
    if (!origens || !o.origens) return o.text;
    const vistos = new Set(), notas = [];
    for (const g of o.origens) if (!vistos.has(g.texto)) { vistos.add(g.texto); notas.push(e.cinza('  ↳ ' + (o.origens.length > 1 ? o.text.slice(g.ini, g.fim) + ': ' : '') + g.texto)); }
    return [o.text].concat(notas).join('\n');
  }
  if (o.kind === 'table') {
    if (!origens || !o.origens) return tabela(o, e);
    return tabela(Object.assign({}, o, { cols: (o.cols || (o.rows[0] || []).map((_, i) => 'coluna_' + (i + 1))).concat(['de onde veio']), rows: o.rows.map((r, i) => r.concat([o.origens[i] ? o.origens[i].curto : ''])) }), e);
  }
  if (o.kind === 'chart') return grafico(o, e);
  if (o.kind === 'file') return e.cinza('→ arquivo ' + o.name + (o.rows != null ? ' (' + o.rows + (o.rows === 1 ? ' linha' : ' linhas') + ')' : ''));
  return '';
}

module.exports = { estilo, saida, erro, testes, tabela, grafico };
