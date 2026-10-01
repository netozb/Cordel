/* Cordel — interpretador de referência */
(function (root) {
'use strict';

// ───────── utilidades ─────────
function norm(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function suggest(name, cands) {
  const k = norm(name); let best = null, bd = Infinity;
  const lim = k.length <= 3 ? 1 : 2;
  for (const c of cands) { const d = lev(k, norm(c)); if (d < bd && d <= lim && d > 0) { bd = d; best = c; } }
  return best;
}

// ───────── números exatos (racionais) ─────────
const P30 = 10n ** 30n, DMAX = 10n ** 40n;
function bgcd(a, b) { if (a < 0n) a = -a; if (b < 0n) b = -b; while (b) { const t = a % b; a = b; b = t; } return a; }
class Num {
  constructor(n, d) { this.n = n; this.d = d; this.o = null; } // o: de onde o valor veio (veja "origem dos valores")
  static make(n, d) {
    if (d < 0n) { n = -n; d = -d; }
    if (d !== 1n) { const g = bgcd(n, d); if (g > 1n) { n /= g; d /= g; } }
    if (d > DMAX) {
      // Dízima gigante (ex.: juros compostos por muitos períodos): guarda 30 casas decimais.
      let q = (n * P30) / d; const r = (n * P30) % d;
      if (2n * (r < 0n ? -r : r) >= d) q += n < 0n ? -1n : 1n;
      n = q; d = P30; const g = bgcd(n, d); if (g > 1n) { n /= g; d /= g; }
    }
    return new Num(n, d);
  }
  static int(i) { return new Num(BigInt(i), 1n); }
  static parse(str) {
    str = str.replace(/_/g, '');
    const m = /^([-+]?)(\d*)(?:\.(\d+))?$/.exec(str);
    if (!m || (!m[2] && !m[3])) return null;
    const frac = m[3] || '';
    let n = BigInt((m[2] || '0') + frac);
    if (m[1] === '-') n = -n;
    return Num.make(n, 10n ** BigInt(frac.length));
  }
  static fromFloat(f) {
    if (!isFinite(f)) return null;
    const s = f.toPrecision(15);
    if (/e/i.test(s)) {
      const [mant, exp] = s.split(/e/i); const e = parseInt(exp, 10); const r = Num.parse(mant);
      const p = 10n ** BigInt(Math.abs(e));
      return e >= 0 ? Num.make(r.n * p, r.d) : Num.make(r.n, r.d * p);
    }
    return Num.parse(s);
  }
  add(o) { return this.d === 1n && o.d === 1n ? new Num(this.n + o.n, 1n) : Num.make(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return this.d === 1n && o.d === 1n ? new Num(this.n - o.n, 1n) : Num.make(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return this.d === 1n && o.d === 1n ? new Num(this.n * o.n, 1n) : Num.make(this.n * o.n, this.d * o.d); }
  div(o) { return Num.make(this.n * o.d, this.d * o.n); }
  neg() { return new Num(-this.n, this.d); }
  cmp(o) { const a = this.n * o.d, b = o.n * this.d; return a < b ? -1 : a > b ? 1 : 0; }
  isZero() { return this.n === 0n; }
  isInt() { return this.d === 1n; }
  floor() { let q = this.n / this.d; if (this.n % this.d !== 0n && this.n < 0n) q -= 1n; return q; }
  trunc() { return this.n / this.d; }
  mod(o) { const q = this.div(o).floor(); return this.sub(o.mul(new Num(q, 1n))); }
  abs() { return this.n < 0n ? this.neg() : this; }
  round(places) {
    const p = 10n ** BigInt(places); const scaled = this.n * p;
    let q = scaled / this.d; let r = scaled % this.d; if (r < 0n) r = -r;
    if (2n * r >= this.d) q += this.n < 0n ? -1n : 1n;
    return Num.make(q, p);
  }
  toFloat() { return this.d === 1n ? Number(this.n) : parseFloat(fixed(this.round(17), 17)); }
  toString() {
    if (this.d === 1n) return this.n.toString();
    let d = this.d, t = 0, f = 0;
    while (d % 2n === 0n) { d /= 2n; t++; }
    while (d % 5n === 0n) { d /= 5n; f++; }
    const places = Math.max(t, f);
    if (d === 1n && places <= 10) return fixed(this, places);
    let s = fixed(this.round(10), 10).replace(/0+$/, '').replace(/\.$/, '');
    if (s === '0' || s === '-0') s = fixed(this.round(20), 20).replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
}
function fixed(num, k) {
  const p = 10n ** BigInt(k); const scaled = (num.n * p) / num.d;
  const neg = scaled < 0n; const s = (neg ? -scaled : scaled).toString().padStart(k + 1, '0');
  return (neg ? '-' : '') + (k ? s.slice(0, s.length - k) + '.' + s.slice(s.length - k) : s);
}
function isqrt(n) { if (n < 2n) return n; let x = BigInt(Math.floor(Math.sqrt(Number(n)))); while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x; }

// ───────── datas ─────────
const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dois = n => String(n).padStart(2, '0');
class Data {
  constructor(dias) { this.dias = dias; this.o = null; } // dias desde 01/01/1970; o: origem
  static de(a, m, d) {
    if (!Number.isInteger(a) || !Number.isInteger(m) || !Number.isInteger(d) || a < 1 || a > 9999) return null;
    const dt = new Date(0); dt.setUTCFullYear(a, m - 1, d); dt.setUTCHours(0, 0, 0, 0);
    if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return new Data(Math.round(dt.getTime() / 86400000));
  }
  get js() { return new Date(this.dias * 86400000); }
  get ano() { return this.js.getUTCFullYear(); }
  get mes() { return this.js.getUTCMonth() + 1; }
  get dia() { return this.js.getUTCDate(); }
  get semana() { return this.js.getUTCDay(); }
  iso() { return String(this.ano).padStart(4, '0') + '-' + dois(this.mes) + '-' + dois(this.dia); }
  toString() { return dois(this.dia) + '/' + dois(this.mes) + '/' + this.ano; }
  mais(n) { return new Data(this.dias + n); }
  maisMeses(n) {
    let a = this.ano, m = this.mes - 1 + n; a += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return Data.de(a, m + 1, Math.min(this.dia, diasNoMes(a, m + 1)));
  }
  get seg() { return 0; } // segundos desde a meia-noite
  get temHora() { return false; }
  get instante() { return this.dias * 86400 + this.seg; } // segundos desde 01/01/1970 00:00
  semHora() { return this; }
}
// Data com hora do relógio (sem fuso horário: 14:30 é 14:30 onde o programa roda).
class DataHora extends Data {
  constructor(dias, seg) { super(dias); this.s = seg; }
  static doInstante(t) { const dias = Math.floor(t / 86400); const d = new DataHora(dias, t - dias * 86400); return d.ano >= 1 && d.ano <= 9999 ? d : null; }
  get seg() { return this.s; }
  get temHora() { return true; }
  iso() { return super.iso() + 'T' + horarioDe(this.s, true); }
  toString() { return super.toString() + ' ' + horarioDe(this.s); }
  mais(n) { return new DataHora(this.dias + n, this.s); }
  maisMeses(n) { const d = super.maisMeses(n); return d && new DataHora(d.dias, this.s); }
  semHora() { return new Data(this.dias); }
}
// "14:30", ou "14:30:15" quando há segundos (completo: sempre com segundos)
function horarioDe(seg, completo) {
  const h = Math.floor(seg / 3600), m = Math.floor(seg / 60) % 60, s = seg % 60;
  return dois(h) + ':' + dois(m) + (completo || s ? ':' + dois(s) : '');
}
function diasNoMes(a, m) { const dt = new Date(0); dt.setUTCFullYear(a, m, 0); return dt.getUTCDate(); }
function parseSoData(s) {
  let m;
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) return Data.de(+m[3], +m[2], +m[1]);
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(s))) return Data.de(2000 + +m[3], +m[2], +m[1]);
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) return Data.de(+m[1], +m[2], +m[3]);
  return null;
}
// "14:30", "14:30:15", "9:05", "14h30", "14h" → segundos desde a meia-noite
function parseHora(t) {
  const m = /^(\d{1,2})(?:(?::|h)(\d{2})(?::(\d{2})(?:[.,]\d+)?)?|h)$/i.exec(String(t).trim());
  if (!m) return null;
  const h = +m[1], mi = +(m[2] || 0), se = +(m[3] || 0);
  return h > 23 || mi > 59 || se > 59 ? null : h * 3600 + mi * 60 + se;
}
function comHora(base, seg) { return base && seg !== null ? new DataHora(base.dias, seg) : null; }
// Datas com ou sem hora: "26/09/2026", "26/09/2026 14:30", "26/09/2026 às 14h30", "2026-09-26T14:30:00".
// Com fuso horário ("…Z", "…-03:00"), a hora é convertida para a hora deste aparelho.
function parseData(s) {
  s = String(s).trim(); let m;
  const d = parseSoData(s); if (d) return d;
  if ((m = /^(\d{4}-\d{1,2}-\d{1,2})[T ](\d{1,2}:\d{2}(?::\d{2}(?:[.,]\d+)?)?)\s*(z|[+-]\d{2}:?\d{2})?$/i.exec(s))) {
    if (!m[3]) return comHora(parseSoData(m[1]), parseHora(m[2]));
    const js = new Date(m[1] + 'T' + m[2].replace(',', '.') + m[3].toUpperCase().replace(/^([+-]\d{2})(\d{2})$/, '$1:$2'));
    if (isNaN(js.getTime())) return null;
    return comHora(Data.de(js.getFullYear(), js.getMonth() + 1, js.getDate()), js.getHours() * 3600 + js.getMinutes() * 60 + js.getSeconds());
  }
  if ((m = /^(\S+?),?\s+(?:[àa]s\s+)?(\S+)$/i.exec(s))) return comHora(parseSoData(m[1]), parseHora(m[2]));
  return null;
}
const PARECE_DATA = /^\d{1,2}\/\d{1,2}\/\d{2,4}(?:,?\s+(?:[àa]s\s+)?\d{1,2}(?:(?::|h)\d{2}(?::\d{2})?|h))?$|^\d{4}-\d{1,2}-\d{1,2}(?:[T ]\d{1,2}:\d{2}(?::\d{2}(?:[.,]\d+)?)?\s*(?:z|[+-]\d{2}:?\d{2})?)?$/i;

// ───────── valores ─────────
class Reg {
  constructor(m, o) { this.m = m || new Map(); this.o = o || null; }
  get(k) { const e = this.m.get(k); return e ? e.v : undefined; }
  with(k, name, v) { const m = new Map(this.m); const old = m.get(k); m.set(k, { name: old ? old.name : name, v }); return new Reg(m); }
  names() { return [...this.m.values()].map(e => e.name); }
}
class Fn { constructor(o) { Object.assign(this, o); } }
class Builtin { constructor(name, min, max, fn) { this.name = name; this.min = min; this.max = max; this.fn = fn; } }
const VAZIO = { vazio: true };

function typeName(v) {
  if (v instanceof Num) return 'número';
  if (v instanceof Data) return 'data';
  if (typeof v === 'string') return 'texto';
  if (typeof v === 'boolean') return 'lógico';
  if (Array.isArray(v)) return 'lista';
  if (v instanceof Reg) return 'registro';
  if (v instanceof Fn || v instanceof Builtin) return 'função';
  return 'vazio';
}
const ARTIGO = { 'data': 'uma data', 'número': 'um número', 'texto': 'um texto', 'lógico': 'um valor lógico (verdadeiro/falso)', 'lista': 'uma lista', 'registro': 'um registro', 'função': 'uma função', 'vazio': 'nada' };
function display(v, nested) {
  if (v instanceof Num) { if (COLETOR !== null && v.o) COLETOR.push(v.o); return v.toString(); }
  if (v instanceof Data) { if (COLETOR !== null && v.o) COLETOR.push(v.o); return v.toString(); }
  if (typeof v === 'string') return nested ? '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"' : v;
  if (typeof v === 'boolean') return v ? 'verdadeiro' : 'falso';
  if (Array.isArray(v)) return '[' + v.map(x => display(x, true)).join(', ') + ']';
  if (v instanceof Reg) return '{' + [...v.m.values()].map(e => e.name + ': ' + display(e.v, true)).join(', ') + '}';
  if (v instanceof Fn || v instanceof Builtin) return '<função ' + v.name + '>';
  return '(nada)';
}
function equals(a, b) {
  if (a instanceof Num && b instanceof Num) return a.cmp(b) === 0;
  if (a instanceof Data && b instanceof Data) return a.instante === b.instante;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => equals(x, b[i]));
  if (a instanceof Reg && b instanceof Reg) {
    if (a.m.size !== b.m.size) return false;
    for (const [k, e] of a.m) { const o = b.m.get(k); if (!o || !equals(e.v, o.v)) return false; }
    return true;
  }
  return a === b;
}

// ───────── origem dos valores ─────────
// Números, datas e linhas lidos de planilhas (e da internet) guardam de onde vieram, e as contas juntam as
// origens: total.origem diz quais células formaram o total. A origem é um grafo pequeno:
//   folhas  { f: fonte, r: linha (índice na tabela), c: coluna } · { f, r } (a linha inteira) · { f, c } (sem linhas)
//   nós     { a, b } (dois valores) · { l: lista de valores } · { p: lista de origens }
// Os nós de lista só são percorridos quando alguém pede a origem: somar uma planilha inteira custa um objeto só.
let COLETOR = null; // enquanto um `mostre` avalia o que vai mostrar, junta a origem de tudo o que vira texto
function junta(a, b) { return !a ? (b || null) : !b || a === b ? a : { a, b }; }
function anota(v) { if (COLETOR !== null && v && v.o) COLETOR.push(v.o); }
function origemDe(v) {
  if (v === null || typeof v !== 'object') return null;
  if (v.o) return v.o;
  if (Array.isArray(v)) return v.length ? { l: v } : null;
  if (v instanceof Reg) return v.m.size ? { l: [...v.m.values()].map(e => e.v) } : null;
  return null;
}
function folhasDe(o) {
  const vistos = new Set(), folhas = [], pilha = o ? [o] : [];
  const valor = v => {
    if (v === null || typeof v !== 'object') return;
    if (v.o) pilha.push(v.o);
    else if (Array.isArray(v)) pilha.push({ l: v });
    else if (v instanceof Reg && !vistos.has(v)) { vistos.add(v); pilha.push({ l: [...v.m.values()].map(e => e.v) }); }
  };
  while (pilha.length) {
    const x = pilha.pop();
    if (vistos.has(x)) continue; vistos.add(x);
    if (x.f) folhas.push(x);
    else if (x.a) pilha.push(x.b, x.a);
    else if (x.p) { for (let i = x.p.length - 1; i >= 0; i--) if (x.p[i]) pilha.push(x.p[i]); }
    else if (x.l && !vistos.has(x.l)) { vistos.add(x.l); for (let i = x.l.length - 1; i >= 0; i--) valor(x.l[i]); }
  }
  return folhas;
}
const milhar = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function listaE(l) { return l.length <= 1 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]; }
function listaCurta(l, max) { return l.length > max ? l.slice(0, max).join(', ') + ' e mais ' + (l.length - max) : listaE(l); }
// 2, 3, 4, 7, 9, 10 → "2 a 4, 7 e 9 a 10"
function faixas(nums) {
  const seg = []; let i = 0;
  while (i < nums.length) {
    let j = i; while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    if (j - i >= 2) seg.push(milhar(nums[i]) + ' a ' + milhar(nums[j])); else for (let k = i; k <= j; k++) seg.push(milhar(nums[k]));
    i = j + 1;
  }
  return seg.length > 6 ? seg.slice(0, 5).join(', ') + ' e outros ' + (seg.length - 5) + ' trechos' : listaE(seg);
}
const nomeDaFonte = f => f.nome + (f.aba ? ' › ' + f.aba : '');
const numeroDaLinha = (f, r) => f.linhas ? f.linhas[r] : r + 1;
function porFonte(folhas) {
  const fontes = new Map();
  for (const x of folhas) {
    let g = fontes.get(x.f); if (!g) fontes.set(x.f, g = { f: x.f, celulas: 0, inteiras: 0, linhas: new Set(), cols: [] });
    if (x.c !== undefined) { g.celulas++; if (!g.cols.includes(x.c)) g.cols.push(x.c); } else g.inteiras++;
    if (x.r !== undefined) g.linhas.add(x.r);
  }
  return [...fontes.values()];
}
// "42 células de vendas.csv (coluna Total; linhas 2 a 43)"
function textoDaOrigem(folhas) {
  if (!folhas.length) return 'do programa';
  return porFonte(folhas).map(g => {
    const f = g.f, nome = nomeDaFonte(f);
    if (f.tipo === 'internet' || f.tipo === 'bc' || f.tipo === 'xml') return nome + (g.cols.length ? ': ' + listaCurta(g.cols, 4) : '');
    const lista = f.tipo === 'lista', item = lista ? 'item' : 'linha', itens = lista ? 'itens' : 'linhas';
    const nums = [...g.linhas].map(r => numeroDaLinha(f, r)).sort((a, b) => a - b);
    const col = !g.cols.length ? '' : (g.cols.length === 1 ? (lista ? 'campo ' : 'coluna ') : (lista ? 'campos ' : 'colunas ')) + listaCurta(g.cols, 4);
    if (!g.celulas) return nums.length === 1 ? nome + ', ' + item + ' ' + milhar(nums[0]) : milhar(nums.length) + ' ' + itens + ' de ' + nome + ' (' + faixas(nums) + ')';
    // linhas inteiras (um registro montado a partir delas) e algumas colunas usadas
    if (g.inteiras) return nums.length === 1 ? nome + ', ' + item + ' ' + milhar(nums[0]) + ' (' + col + ')' : milhar(nums.length) + ' ' + itens + ' de ' + nome + ' (' + col + '; ' + itens + ' ' + faixas(nums) + ')';
    if (g.celulas === 1 && nums.length === 1) return nome + ', ' + item + ' ' + milhar(nums[0]) + ', ' + col;
    return milhar(g.celulas) + ' ' + (g.celulas === 1 ? (lista ? 'valor' : 'célula') : (lista ? 'valores' : 'células')) + ' de ' + nome + ' (' + col + (nums.length ? '; ' + (nums.length === 1 ? item + ' ' : itens + ' ') + faixas(nums) : '') + ')';
  }).join(' + ');
}
// Versão curta, para caber numa coluna: "vendas.csv, linha 9"
function textoCurtoDaOrigem(folhas) {
  return porFonte(folhas).map(g => {
    const f = g.f, nome = nomeDaFonte(f);
    if (f.tipo === 'internet' || f.tipo === 'bc' || f.tipo === 'xml' || !g.linhas.size) return nome + (g.cols.length ? ': ' + listaCurta(g.cols, 2) : '');
    const nums = [...g.linhas].map(r => numeroDaLinha(f, r)).sort((a, b) => a - b), lista = f.tipo === 'lista';
    return nome + ', ' + (nums.length === 1 ? (lista ? 'item ' : 'linha ') : (lista ? 'itens ' : 'linhas ')) + faixas(nums);
  }).join(' + ');
}
// As linhas das planilhas de onde o valor saiu, na ordem das planilhas: [{ f, r }]
function linhasDasFolhas(folhas) {
  const out = [];
  for (const g of porFonte(folhas)) if (g.f.rows) for (const r of [...g.linhas].sort((a, b) => a - b)) out.push({ f: g.f, r });
  return out;
}
// Resumo para a saída do editor: o texto e até 20 linhas de onde o valor saiu.
function resumirOrigem(o) {
  if (!o) return null;
  const folhas = folhasDe(o); if (!folhas.length) return null;
  const res = { texto: textoDaOrigem(folhas), curto: textoCurtoDaOrigem(folhas) };
  const linhas = linhasDasFolhas(folhas);
  if (linhas.length) {
    const amostra = linhas.slice(0, 20), varias = porFonte(folhas).filter(g => g.f.rows).length > 1;
    const t = asTable(amostra.map(x => x.f.rows[x.r]), null, '`mostre`');
    res.total = linhas.length; res.cols = t.cols; res.rows = t.rows;
    res.onde = amostra.map(x => (varias ? nomeDaFonte(x.f) + ' · ' : '') + (x.f.tipo === 'lista' ? 'item ' : 'linha ') + milhar(numeroDaLinha(x.f, x.r)));
  }
  return res;
}
// Liga cada linha (e cada número ou data dela) à planilha de onde veio.
function marcarTabela(t, f) {
  f.rows = t;
  for (let r = 0; r < t.length; r++) {
    const row = t[r]; if (!(row instanceof Reg)) continue;
    row.o = { f, r };
    for (const e of row.m.values()) if (e.v instanceof Num || e.v instanceof Data) e.v.o = { f, r, c: e.name };
  }
  return t;
}

// ───────── erros e sinais ─────────
class CordelError extends Error { constructor(msg, pos, dica, fatal) { super(msg); this.pos = pos; this.dica = dica; this.fatal = !!fatal; } }
class Ret { constructor(v) { this.v = v; } }
const BRK = { brk: true }, CNT = { cnt: true };
class AskSig { constructor(p) { this.prompt = p; } }
// busque(…) sem resposta ainda: o anfitrião busca sem travar a tela e roda de novo (como pergunte).
class BuscaSig { constructor(pedido) { this.pedido = pedido; } }
class TestFail { constructor(msg, pos) { this.msg = msg; this.pos = pos; } }

// ───────── léxico ─────────
const KW = new Set(['se', 'senao', 'fim', 'enquanto', 'para', 'repita', 'funcao', 'devolva', 'mostre', 'var', 'e', 'ou', 'nao', 'verdadeiro', 'falso', 'escolha', 'caso', 'teste', 'confira', 'tente', 'falhou', 'falhe', 'pare', 'continue', 'tela']);
const UI_WORDS = new Set(['titulo', 'subtitulo', 'botao', 'campo', 'marque', 'seletor', 'link', 'cartao', 'linha', 'cor', 'espaco', 'pagina', 'abas', 'grafico']);
const UI_NOME = { titulo: 'título', subtitulo: 'subtítulo', botao: 'botão', campo: 'campo', marque: 'marque', seletor: 'seletor', link: 'link', cartao: 'cartão', linha: 'linha', cor: 'cor', espaco: 'espaço', pagina: 'página', abas: 'abas', grafico: 'gráfico' };
const PRETTY = { senao: 'senão', funcao: 'função', nao: 'não', ate: 'até', entao: 'então', faca: 'faça' };
const pretty = k => PRETTY[k] || k;
const DQ = new Set(['"', '\u201c', '\u201d', '\u201e']);
const SQ = new Set(["'", '\u2018', '\u2019']);
const idStart = c => /[\p{L}_]/u.test(c);
const idPart = c => /[\p{L}\p{N}\p{M}_]/u.test(c);
const OPMAP = { '≠': '!=', '≤': '<=', '≥': '>=', '×': '*', '÷': '/', '−': '-', '–': '-' };

const INICIO_INSTRUCAO = /^[ \t]*(?:(?:se|senão|senao|fim|enquanto|repita|função|funcao|devolva|mostre|var|escolha|caso|teste|confira|tente|falhou|falhe|pare|continue|tela)(?![\p{L}\p{N}_])|[\p{L}_][\p{L}\p{N}_]*[ \t]*(?:=(?![=>])|[-+*/]=))/iu;
function lex(src, base) {
  base = base || 0;
  const toks = []; let i = 0, depth = 0; const n = src.length;
  const push = (t, v, s, e, x) => toks.push(Object.assign({ t, v, s: s + base, e: e + base }, x || {}));
  while (i < n) {
    const c = src[i];
    if (c === '\n') {
      // Parêntese ou colchete aberto que nunca fechou: se a próxima linha começa claramente
      // uma instrução nova, encerra a conta aqui (o parser aponta o erro no lugar certo).
      if (depth > 0) { const resto = src.slice(i + 1, i + 200); if (INICIO_INSTRUCAO.test(resto)) depth = 0; }
      if (depth === 0 && toks.length && toks[toks.length - 1].t !== 'nl') push('nl', '\n', i, i + 1); i++; continue;
    }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\u00a0' || c === '\ufeff') { i++; continue; }
    if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c >= '0' && c <= '9') {
      let j = i; while (j < n && /[0-9_]/.test(src[j])) j++;
      if (src[j] === '.' && /[0-9]/.test(src[j + 1] || '')) { j++; while (j < n && /[0-9_]/.test(src[j])) j++; }
      push('num', Num.parse(src.slice(i, j)), i, j); i = j; continue;
    }
    if (idStart(c)) {
      let j = i; while (j < n && idPart(src[j])) j++;
      const text = src.slice(i, j); const k = norm(text);
      if (text === 'é' || text === 'É') { push('op', '==', i, j); i = j; continue; }
      push(KW.has(k) ? 'kw' : 'id', text, i, j, { k }); i = j; continue;
    }
    if (DQ.has(c) || SQ.has(c)) {
      const close = DQ.has(c) ? DQ : SQ;
      let j = i + 1; const parts = []; let buf = '';
      for (;;) {
        if (j >= n || src[j] === '\n') throw new CordelError('Esse texto não foi fechado: faltam as aspas do final.', i + base, 'Todo texto começa e termina com aspas: "assim".');
        const ch = src[j];
        if (close.has(ch)) { j++; break; }
        if (ch === '\\') { const nx = src[j + 1]; buf += nx === 'n' ? '\n' : nx === 't' ? '\t' : (nx || ''); j += 2; continue; }
        if (ch === '{') {
          let k = j + 1, d = 1;
          while (k < n && src[k] !== '\n') { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (d === 0) break; } k++; }
          if (d !== 0) throw new CordelError('Faltou fechar a chave } dentro do texto.', j + base, 'Dentro de um texto, {x} mostra o valor de x. Para escrever uma chave de verdade, use \\{');
          if (buf) { parts.push(buf); buf = ''; }
          parts.push({ src: src.slice(j + 1, k), off: j + 1 + base });
          j = k + 1; continue;
        }
        buf += ch; j++;
      }
      if (buf || !parts.length) parts.push(buf);
      push('str', parts, i, j); i = j; continue;
    }
    const two = src.substr(i, 2);
    if (['==', '!=', '<=', '>=', '=>', '+=', '-=', '*=', '/='].includes(two)) { push('op', two, i, i + 2); i += 2; continue; }
    if (OPMAP[c]) { push('op', OPMAP[c], i, i + 1); i++; continue; }
    if ('+-*/%^=<>()[]{},.:'.includes(c)) {
      if ('([{'.includes(c)) depth++;
      if (')]}'.includes(c)) depth = Math.max(0, depth - 1);
      push('op', c, i, i + 1); i++; continue;
    }
    if (c === ';') { push('nl', ';', i, i + 1); i++; continue; }
    throw new CordelError('Não reconheço o símbolo "' + c + '".', i + base);
  }
  push('eof', '', n, n);
  return toks;
}

// ───────── sintaxe ─────────
const BLOCK_END = new Set(['fim', 'senao', 'caso', 'falhou']);
function describe(t) {
  if (t.t === 'eof') return 'o fim do programa';
  if (t.t === 'nl') return 'o fim da linha';
  if (t.t === 'str') return 'um texto';
  if (t.t === 'num') return 'o número ' + t.v.toString();
  return '`' + t.v + '`';
}
class Parser {
  constructor(toks) { this.toks = toks; this.p = 0; this.last = null; }
  peek(o) { return this.toks[Math.min(this.p + (o || 0), this.toks.length - 1)]; }
  next() { const t = this.toks[this.p]; if (this.p < this.toks.length - 1) this.p++; this.last = t; return t; }
  atOp(v) { const t = this.peek(); return t.t === 'op' && t.v === v; }
  atKw(k) { const t = this.peek(); return t.t === 'kw' && t.k === k; }
  atCtx(k) { const t = this.peek(); return t.t === 'id' && t.k === k; }
  skipNL() { while (this.peek().t === 'nl') this.next(); }
  err(msg, t, dica) { throw new CordelError(msg, (t || this.peek()).s, dica); }
  expectOp(v, msg, dica) { if (!this.atOp(v)) this.err(msg || 'Esperava `' + v + '`, mas encontrei ' + describe(this.peek()) + '.', null, dica); return this.next(); }
  expectId(msg, dica) {
    const t = this.peek();
    if (t.t === 'kw') this.err('`' + t.v + '` é uma palavra reservada do Cordel e não pode ser usada como nome.', t, 'Escolha outro nome, como `' + t.v + '2` ou `meu_' + t.v + '`.');
    if (t.t !== 'id') this.err(msg, t, dica);
    return this.next();
  }
  expectCtx(k, msg, dica) { if (!this.atCtx(k)) this.err(msg, null, dica); return this.next(); }
  node(type, start, o) { return Object.assign({ type, s: start.s, e: this.last ? this.last.e : start.e }, o); }
  atEndOfStmt() { const t = this.peek(); return t.t === 'nl' || t.t === 'eof' || (t.t === 'kw' && BLOCK_END.has(t.k)); }
  endStmt(stmt) {
    if (this.atEndOfStmt()) { if (this.peek().t === 'nl') this.next(); return; }
    const t = this.peek();
    let dica;
    if (stmt && stmt.type === 'ExprStmt' && stmt.expr.type === 'Ident') {
      const s = suggest(stmt.expr.name, [...KW].map(pretty));
      if (s) dica = 'Você quis dizer `' + s + '`?';
    }
    if (!dica && t.t === 'op' && t.v === '=' ) dica = 'Para comparar valores, use `==`.';
    if (!dica && t.t === 'op' && t.v === ',' && this.last && this.last.t === 'num' && this.peek(1).t === 'num') dica = 'Números com casas decimais usam ponto: 3.5 (e não 3,5).';
    this.err('Não esperava ' + describe(t) + ' aqui.', t, dica || 'Cada instrução fica em sua própria linha.');
  }
  unclosed(open) {
    const name = open.t === 'kw' ? pretty(open.k) : open.v;
    return new CordelError('O bloco `' + name + '` aberto aqui não foi fechado.', open.s, 'Todo bloco termina com a palavra `fim`.');
  }
  parseProgram() {
    try { const body = this.parseBlock(null, ['eof']); return { type: 'Program', body }; }
    catch (e) { if (this.erros && e instanceof CordelError && e.semFim) return { type: 'Program', body: [] }; throw e; }
  }
  // Recuperação de erros (modo verificação): anota o erro e continua da próxima linha,
  // ou do `fim` do bloco cuja primeira linha falhou.
  abreBlocoEm(i) {
    const t = this.toks[i], nx = this.toks[i + 1] || { t: 'eof' };
    if (t.t === 'kw') {
      if (['se', 'enquanto', 'para', 'repita', 'escolha', 'teste', 'tente', 'tela'].includes(t.k)) return true;
      if (t.k === 'funcao') { let j = i, parens = 0; while (j < this.toks.length && this.toks[j].t !== 'nl' && this.toks[j].t !== 'eof') { const x = this.toks[j]; if (x.t === 'op' && x.v === '(') parens++; if (x.t === 'op' && x.v === ')') { parens--; if (parens === 0) { const y = this.toks[j + 1]; return !(y && y.t === 'op' && y.v === '='); } } j++; } return true; }
      return false;
    }
    if (t.t === 'id') {
      if (t.k === 'cartao' || t.k === 'linha') return nx.t === 'nl' || nx.t === 'eof';
      if (t.k === 'botao' || t.k === 'pagina') return !(nx.t === 'op' && ['=', '.', '(', '+=', '-=', '*=', '/='].includes(nx.v)) && nx.t !== 'nl';
    }
    return false;
  }
  sincronizar(inicio) {
    if (!this.abreBlocoEm(inicio)) { while (this.peek().t !== 'nl' && this.peek().t !== 'eof') this.next(); return; }
    this.p = inicio; let prof = 0, inicioLinha = true;
    while (this.peek().t !== 'eof') {
      const i = this.p, t = this.next();
      if (t.t === 'nl') { inicioLinha = true; continue; }
      if (inicioLinha) { if (this.abreBlocoEm(i)) prof++; else if (t.t === 'kw' && t.k === 'fim' && --prof === 0) return; }
      inicioLinha = false;
    }
  }
  parseBlock(open, enders) {
    const out = [];
    for (;;) {
      this.skipNL();
      const t = this.peek();
      if (t.t === 'eof') { if (enders.includes('eof')) break; const e = this.unclosed(open); e.semFim = true; if (this.erros && !this.erros.includes(e)) this.erros.push(e); throw e; }
      const reservada = t.t === 'kw' && this.peek(1).t === 'op' && ['=', '+=', '-=', '*=', '/='].includes(this.peek(1).v);
      if (t.t === 'kw' && enders.includes(t.k) && !reservada) break;
      const inicio = this.p;
      try {
        if (reservada) this.err('`' + t.v + '` é uma palavra reservada do Cordel e não pode ser usada como nome.', t, 'Escolha outro nome, como `' + t.v + '2` ou `meu_' + t.v + '`.');
        if (t.t === 'kw' && BLOCK_END.has(t.k)) {
          const msgs = {
            fim: ['Esse `fim` não fecha nenhum bloco.', 'Talvez sobrou um `fim`, ou falta abrir o bloco (se, para, enquanto…).'],
            senao: ['Esse `senão` não pertence a nenhum `se`.', 'Use assim: se cond … senão … fim'],
            caso: ['`caso` só aparece dentro de um `escolha`.', 'Use assim: escolha x / caso 1 … / fim'],
            falhou: ['`falhou` só aparece depois de um `tente`.', 'Use assim: tente … falhou erro … fim'],
          }[t.k];
          this.err(msgs[0], t, msgs[1]);
        }
        out.push(this.parseStmt());
      } catch (e) {
        if (!this.erros || !(e instanceof CordelError) || e.semFim) throw e;
        this.erros.push(e);
        if (this.erros.length >= 30) { e.semFim = true; throw e; }
        this.sincronizar(inicio);
      }
    }
    return out;
  }
  parseCond() {
    const c = this.parseExpr();
    if (this.atOp('=')) this.err('Para comparar, use `==` (dois sinais de igual).', null, 'Um `=` sozinho guarda um valor (x = 5). Para perguntar se é igual: se x == 5');
    if (this.atCtx('entao') || this.atCtx('faca')) this.next();
    return c;
  }
  parseStmt() {
    const t = this.peek();
    if (t.t === 'kw') {
      switch (t.k) {
        case 'mostre': {
          this.next(); const args = [];
          if (!this.atEndOfStmt()) { args.push(this.parseExpr()); while (this.atOp(',')) { this.next(); args.push(this.parseExpr()); } }
          const nd = this.node('Mostre', t, { args }); this.endStmt(); return nd;
        }
        case 'var': {
          this.next(); const id = this.expectId('Depois de `var` vem o nome da variável.', 'Exemplo: var total = 0');
          this.expectOp('=', 'Toda variável começa com um valor: var ' + id.v + ' = …');
          const value = this.parseExpr(); const nd = this.node('Var', t, { name: id.v, k: id.k, value }); this.endStmt(); return nd;
        }
        case 'se': { this.next(); const nd = this.parseIfCore(t); this.expectEnd(t); return nd; }
        case 'enquanto': {
          this.next(); const cond = this.parseCond(); const body = this.parseBlock(t, ['fim']);
          const nd = this.node('While', t, { cond, body }); this.expectEnd(t); return nd;
        }
        case 'para': return this.parseFor(t);
        case 'repita': {
          this.next(); const count = this.parseExpr();
          this.expectCtx('vezes', 'Faltou a palavra `vezes`.', 'Exemplo: repita 3 vezes … fim');
          const body = this.parseBlock(t, ['fim']); const nd = this.node('Repeat', t, { count, body }); this.expectEnd(t); return nd;
        }
        case 'funcao': return this.parseFunc(t);
        case 'devolva': {
          this.next(); const value = this.atEndOfStmt() ? null : this.parseExpr();
          const nd = this.node('Return', t, { value }); this.endStmt(); return nd;
        }
        case 'escolha': return this.parseSwitch(t);
        case 'teste': {
          this.next(); const name = this.parseExpr(); const body = this.parseBlock(t, ['fim']);
          const nd = this.node('Test', t, { name, body }); this.expectEnd(t); return nd;
        }
        case 'confira': {
          this.next(); const expr = this.parseExpr(); const nd = this.node('Check', t, { expr }); this.endStmt(); return nd;
        }
        case 'tente': {
          this.next(); const body = this.parseBlock(t, ['falhou']);
          this.next();
          let name = null; if (this.peek().t === 'id') name = this.next();
          else if (this.peek().t === 'kw' && ['nl', 'eof'].includes(this.peek(1).t)) { const kt = this.peek(); this.err('`' + kt.v + '` é uma palavra reservada e não pode ser o nome do erro.', kt, 'Use outro nome, como: falhou erro'); }
          const handler = this.parseBlock(t, ['fim']);
          const nd = this.node('Try', t, { body, name: name && name.v, k: name && name.k, handler }); this.expectEnd(t); return nd;
        }
        case 'falhe': { this.next(); const value = this.parseExpr(); const nd = this.node('Throw', t, { value }); this.endStmt(); return nd; }
        case 'pare': { this.next(); const nd = this.node('Break', t, {}); this.endStmt(); return nd; }
        case 'continue': { this.next(); const nd = this.node('Continue', t, {}); this.endStmt(); return nd; }
        case 'tela': {
          this.next(); const title = this.atEndOfStmt() ? null : this.parseExpr();
          const body = this.parseBlock(t, ['fim']);
          const nd = this.node('Tela', t, { title, body }); this.expectEnd(t); return nd;
        }
      }
    }
    if (t.t === 'id' && t.k === 'use' && this.peek(1).t === 'str') {
      this.next(); const nt = this.next();
      if (nt.v.length !== 1 || typeof nt.v[0] !== 'string' || !nt.v[0].trim()) this.err('O nome do módulo é um texto simples, sem {…}.', nt, 'Exemplo: use "regras da auditoria"');
      let alias = null;
      if (this.atCtx('como')) { this.next(); const a = this.expectId('Depois de `como` vem o nome que o módulo terá aqui.', 'Exemplo: use "regras" como regras'); alias = { name: a.v, k: a.k }; }
      const nd = this.node('Use', t, { nome: nt.v[0].trim(), alias, nomePos: nt.s }); this.endStmt(); return nd;
    }
    if (t.t === 'id' && t.k === 'va' && this.peek(1).t === 'kw' && this.peek(1).k === 'para') {
      this.next(); this.next(); const alvo = this.parseExpr(); const nd = this.node('Nav', t, { alvo }); this.endStmt(); return nd;
    }
    if (t.t === 'id' && t.k === 'volte' && ['nl', 'eof'].includes(this.peek(1).t)) { this.next(); const nd = this.node('Back', t, {}); this.endStmt(); return nd; }
    if (this.isUIStart()) return this.parseUI();
    const expr = this.parseExpr();
    const op = this.peek();
    if (op.t === 'op' && ['=', '+=', '-=', '*=', '/='].includes(op.v)) {
      if (!['Ident', 'Member', 'Index'].includes(expr.type)) this.err('Não dá para guardar um valor aí.', op, 'À esquerda do `=` vai um nome, como: total = 10');
      this.next(); const value = this.parseExpr();
      const nd = this.node('Assign', t, { target: expr, op: op.v, value }); this.endStmt(); return nd;
    }
    const nd = this.node('ExprStmt', t, { expr }); this.endStmt(nd); return nd;
  }
  isUIStart() {
    const t = this.peek(), nx = this.peek(1);
    if (t.t !== 'id' || !UI_WORDS.has(t.k)) return false;
    if (t.k === 'cartao' || t.k === 'linha' || t.k === 'espaco' || t.k === 'abas') return nx.t === 'nl' || nx.t === 'eof';
    if (nx.t === 'str' || nx.t === 'num' || nx.t === 'id') return true;
    if (nx.t === 'kw' && ['verdadeiro', 'falso', 'nao'].includes(nx.k)) return true;
    return nx.t === 'op' && (nx.v === '[' || nx.v === '{' || nx.v === '-');
  }
  parseUI() {
    const t = this.next(), k = t.k;
    if (k === 'cartao' || k === 'linha') { const body = this.parseBlock(t, ['fim']); const nd = this.node('UIBox', t, { kind: k, body }); this.expectEnd(t); return nd; }
    if (k === 'espaco' || k === 'abas') { const nd = this.node('UI', t, { kind: k, args: [] }); this.endStmt(); return nd; }
    if (k === 'grafico') {
      let title = null;
      if (!this.atCtx('de')) title = this.parseExpr();
      this.expectCtx('de', 'Faltou dizer de onde vêm os dados do gráfico.', 'Exemplo: gráfico "Vendas por filial" de resumo por total');
      const dados = this.parseExpr(); let campo = null;
      if (this.atCtx('por')) { this.next(); campo = this.expectId('Depois de `por` vem o nome do campo com os valores.', 'Exemplo: gráfico "Vendas" de resumo por total'); }
      const nd = this.node('Chart', t, { title, dados, campo: campo && { name: campo.v, k: campo.k } }); this.endStmt(); return nd;
    }
    if (k === 'pagina') { const name = this.parseExpr(); const body = this.parseBlock(t, ['fim']); const nd = this.node('UIPage', t, { name, body }); this.expectEnd(t); return nd; }
    const label = this.parseExpr();
    if (k === 'botao') {
      if (this.peek().t !== 'nl' && this.peek().t !== 'eof') this.err('Depois do texto do botão, pule uma linha e escreva o que ele faz, terminando com `fim`.', null, 'Exemplo: botão "Somar" / total += 1 / fim');
      const body = this.parseBlock(t, ['fim']); const nd = this.node('UIButton', t, { label, body }); this.expectEnd(t); return nd;
    }
    if (k === 'campo' || k === 'marque' || k === 'seletor') {
      this.expectCtx('em', 'Faltou dizer em qual variável guardar o valor.', 'Exemplo: ' + UI_NOME[k] + ' "Nome" em nome (com var nome = "" criada antes da tela)');
      const target = this.parsePostfix();
      if (!['Ident', 'Member', 'Index'].includes(target.type)) this.err('Depois de `em` vem o nome de uma variável.', null);
      let options = null;
      if (k === 'seletor') { this.expectCtx('de', 'Faltou a lista de opções.', 'Exemplo: seletor "Filial" em filial de ["Crato", "Iguatu"]'); options = this.parseExpr(); }
      const nd = this.node('UIBind', t, { kind: k, label, target, options }); this.endStmt(); return nd;
    }
    if (k === 'link') {
      if (!this.atKw('para')) this.err('Faltou o endereço do link.', null, 'Exemplo: link "Nosso site" para "https://exemplo.com.br"');
      this.next(); const href = this.parseExpr();
      const nd = this.node('UI', t, { kind: 'link', args: [label, href] }); this.endStmt(); return nd;
    }
    const nd = this.node('UI', t, { kind: k, args: [label] }); this.endStmt(); return nd;
  }
  expectEnd(open) { if (!this.atKw('fim')) throw this.unclosed(open); this.next(); this.endStmt(); }
  parseIfCore(open) {
    const cond = this.parseCond(); const cons = this.parseBlock(open, ['senao', 'fim']); let alt = null;
    if (this.atKw('senao')) {
      const st = this.next();
      if (this.atKw('se')) { const s2 = this.next(); alt = [this.parseIfCore(s2)]; }
      else alt = this.parseBlock(st, ['fim']);
    }
    return this.node('If', open, { cond, cons, alt });
  }
  parseFor(t) {
    this.next(); if (this.atCtx('cada')) this.next();
    const id = this.expectId('Depois de `para` vem o nome de uma variável.', 'Exemplos: para i de 1 até 10 · para cada item em lista');
    if (this.atCtx('em')) {
      this.next(); const iter = this.parseExpr(); if (this.atCtx('faca')) this.next();
      const body = this.parseBlock(t, ['fim']);
      const nd = this.node('ForIn', t, { name: id.v, k: id.k, iter, body }); this.expectEnd(t); return nd;
    }
    if (this.atCtx('de')) {
      this.next(); const from = this.parseExpr();
      this.expectCtx('ate', 'Faltou o `até`.', 'Exemplo: para i de 1 até 10');
      const to = this.parseExpr(); let step = null;
      if (this.atCtx('passo')) { this.next(); step = this.parseExpr(); }
      const lit = x => x.type === 'Lit' && x.v instanceof Num ? x.v : x.type === 'Neg' && x.x.type === 'Lit' && x.x.v instanceof Num ? x.x.v.neg() : null;
      if (!step && lit(from) && lit(to) && lit(from).cmp(lit(to)) > 0) this.err('Esse laço não roda nenhuma vez: ' + lit(from).toString() + ' é maior que ' + lit(to).toString() + '.', from, 'Para contar para trás, use: para ' + id.v + ' de ' + lit(from).toString() + ' até ' + lit(to).toString() + ' passo -1');
      if (this.atCtx('faca')) this.next();
      const body = this.parseBlock(t, ['fim']);
      const nd = this.node('ForRange', t, { name: id.v, k: id.k, from, to, step, body }); this.expectEnd(t); return nd;
    }
    this.err('Depois de `para ' + id.v + '` vem `de` (para contar) ou `em` (para percorrer).', null, 'Exemplos: para i de 1 até 10 · para cada item em lista');
  }
  parseFunc(t) {
    this.next(); const id = this.expectId('Depois de `função` vem o nome dela.', 'Exemplo: função dobro(x) = x * 2');
    this.expectOp('(', 'Depois do nome da função vêm os parênteses com o que ela recebe: função ' + id.v + '(x)');
    const params = this.parseParams();
    if (this.atOp('=')) {
      this.next(); const expr = this.parseExpr();
      const nd = this.node('Func', t, { name: id.v, k: id.k, params, expr }); this.endStmt(); return nd;
    }
    const body = this.parseBlock(t, ['fim']);
    const nd = this.node('Func', t, { name: id.v, k: id.k, params, body }); this.expectEnd(t); return nd;
  }
  parseParams() {
    const ps = [];
    if (!this.atOp(')')) {
      for (;;) {
        const p = this.expectId('Esperava o nome de um parâmetro.');
        if (ps.some(q => q.k === p.k)) this.err('O parâmetro `' + p.v + '` aparece duas vezes.', p);
        ps.push({ name: p.v, k: p.k });
        if (this.atOp(',')) { this.next(); continue; } break;
      }
    }
    this.expectOp(')', 'Faltou fechar o parêntese `)`.');
    return ps;
  }
  parseSwitch(t) {
    this.next(); const subject = this.parseExpr(); const cases = []; let other = null;
    for (;;) {
      this.skipNL();
      if (this.atKw('caso')) {
        const ct = this.next(); const pats = [this.parsePattern()];
        while (this.atOp(',')) { this.next(); pats.push(this.parsePattern()); }
        if (this.atOp(':') || this.atCtx('entao')) this.next();
        const body = this.parseBlock(ct, ['caso', 'senao', 'fim']); cases.push({ pats, body }); continue;
      }
      if (this.atKw('senao')) { const st = this.next(); if (this.atOp(':')) this.next(); other = this.parseBlock(st, ['fim']); break; }
      if (this.atKw('fim')) break;
      if (this.peek().t === 'eof') throw this.unclosed(t);
      this.err('Dentro de `escolha`, cada opção começa com `caso`.', null, 'Exemplo: escolha nota / caso 10 … / senão … / fim');
    }
    const nd = this.node('Switch', t, { subject, cases, other }); this.expectEnd(t); return nd;
  }
  parsePattern() {
    const lo = this.parseExpr();
    if (this.atCtx('ate')) { this.next(); const hi = this.parseExpr(); return { range: true, lo, hi }; }
    return { lo };
  }
  // expressões
  parseExpr() {
    const t = this.peek();
    if (t.t === 'kw' && this.peek(1).t === 'op' && this.peek(1).v === '=>') this.err('`' + t.v + '` é uma palavra reservada e não pode ser nome de parâmetro.', t, 'Use outro nome, como: x => x * 2');
    if (t.t === 'id' && this.peek(1).t === 'op' && this.peek(1).v === '=>') {
      this.next(); this.next(); const body = this.parseExpr();
      return this.node('Lambda', t, { params: [{ name: t.v, k: t.k }], body });
    }
    if (t.t === 'op' && t.v === '(') {
      let j = this.p + 1, d = 1;
      while (j < this.toks.length && d > 0) { const x = this.toks[j]; if (x.t === 'op' && x.v === '(') d++; if (x.t === 'op' && x.v === ')') d--; if (x.t === 'eof') break; j++; }
      const after = this.toks[j];
      if (d === 0 && after && after.t === 'op' && after.v === '=>') {
        this.next(); const params = this.parseParams(); this.next(); const body = this.parseExpr();
        return this.node('Lambda', t, { params, body });
      }
    }
    return this.parseOr();
  }
  parseOr() { let l = this.parseAnd(); while (this.atKw('ou')) { const t = this.next(); const r = this.parseAnd(); l = { type: 'Logic', op: 'ou', l, r, s: l.s, e: r.e, opPos: t.s }; } return l; }
  parseAnd() { let l = this.parseNot(); while (this.atKw('e')) { const t = this.next(); const r = this.parseNot(); l = { type: 'Logic', op: 'e', l, r, s: l.s, e: r.e, opPos: t.s }; } return l; }
  parseNot() { if (this.atKw('nao')) { const t = this.next(); const x = this.parseNot(); return { type: 'Not', x, s: t.s, e: x.e }; } return this.parseCmp(); }
  parseCmp() {
    const first = this.parseAdd(); const ops = [], items = [first];
    while (this.peek().t === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(this.peek().v)) { ops.push(this.next()); items.push(this.parseAdd()); }
    if (!ops.length) return first;
    if (ops.length === 1) return { type: 'Bin', op: ops[0].v, l: first, r: items[1], s: first.s, e: items[1].e, opPos: ops[0].s };
    return { type: 'Chain', ops: ops.map(o => o.v), opPos: ops.map(o => o.s), items, s: first.s, e: items[items.length - 1].e };
  }
  parseAdd() { let l = this.parseMul(); while (this.peek().t === 'op' && (this.peek().v === '+' || this.peek().v === '-')) { const o = this.next(); const r = this.parseMul(); l = { type: 'Bin', op: o.v, l, r, s: l.s, e: r.e, opPos: o.s }; } return l; }
  parseMul() { let l = this.parseUnary(); while (this.peek().t === 'op' && ['*', '/', '%'].includes(this.peek().v)) { const o = this.next(); const r = this.parseUnary(); l = { type: 'Bin', op: o.v, l, r, s: l.s, e: r.e, opPos: o.s }; } return l; }
  parseUnary() { if (this.atOp('-')) { const t = this.next(); const x = this.parseUnary(); return { type: 'Neg', x, s: t.s, e: x.e }; } if (this.atOp('+')) { this.next(); return this.parseUnary(); } return this.parsePow(); }
  parsePow() { const b = this.parsePostfix(); if (this.atOp('^')) { const o = this.next(); const x = this.parseUnary(); return { type: 'Bin', op: '^', l: b, r: x, s: b.s, e: x.e, opPos: o.s }; } return b; }
  parsePostfix() {
    let e = this.parsePrimary();
    for (;;) {
      if (this.atOp('(')) {
        const t = this.next(); const args = [];
        if (!this.atOp(')')) { for (;;) { args.push(this.parseExpr()); if (this.atOp(',')) { this.next(); if (this.atOp(')')) break; continue; } break; } }
        this.expectOp(')', 'Faltou fechar o parêntese `)` da chamada.');
        e = { type: 'Call', callee: e, args, s: e.s, e: this.last.e, pos: t.s };
      } else if (this.atOp('.')) {
        this.next(); const t = this.peek();
        if (t.t !== 'id' && t.t !== 'kw') this.err('Depois do ponto vem o nome de um campo ou ação.', t, 'Exemplos: pessoa.nome · lista.tamanho');
        this.next(); e = { type: 'Member', obj: e, name: t.v, k: t.k, s: e.s, e: t.e, pos: t.s };
      } else if (this.atOp('[')) {
        const t = this.next(); const idx = this.parseExpr(); this.expectOp(']', 'Faltou fechar o colchete `]`.');
        e = { type: 'Index', obj: e, idx, s: e.s, e: this.last.e, pos: t.s };
      } else break;
    }
    return e;
  }
  parsePrimary() {
    const t = this.peek();
    if (t.t === 'num') { this.next(); return { type: 'Lit', v: t.v, s: t.s, e: t.e }; }
    if (t.t === 'str') {
      this.next();
      if (t.v.length === 1 && typeof t.v[0] === 'string') return { type: 'Lit', v: t.v[0], s: t.s, e: t.e };
      const parts = t.v.map(p => {
        if (typeof p === 'string') return p;
        if (!p.src.trim()) throw new CordelError('Chaves vazias {} dentro do texto.', p.off, 'Coloque um valor dentro delas: "Olá, {nome}"');
        const sub = new Parser(lex(p.src, p.off)); const ex = sub.parseExpr();
        if (sub.peek().t !== 'eof') throw new CordelError('Não entendi o que está dentro das chaves.', sub.peek().s);
        return ex;
      });
      return { type: 'Tpl', parts, s: t.s, e: t.e };
    }
    if (t.t === 'kw' && (t.k === 'verdadeiro' || t.k === 'falso')) { this.next(); return { type: 'Lit', v: t.k === 'verdadeiro', s: t.s, e: t.e }; }
    if (t.t === 'id') { this.next(); return { type: 'Ident', name: t.v, k: t.k, s: t.s, e: t.e }; }
    if (t.t === 'op' && t.v === '(') {
      this.next(); const x = this.parseExpr(); this.expectOp(')', 'Faltou fechar o parêntese `)`.');
      return x;
    }
    if (t.t === 'op' && t.v === '[') {
      this.next(); const items = [];
      while (!this.atOp(']')) {
        if (this.peek().t === 'eof') this.err('Essa lista não foi fechada com `]`.', t);
        items.push(this.parseExpr());
        if (this.atOp(',')) { this.next(); continue; }
        if (!this.atOp(']')) this.err('Entre os itens de uma lista vai uma vírgula.', null, 'Exemplo: [1, 2, 3]');
      }
      this.next(); return { type: 'List', items, s: t.s, e: this.last.e };
    }
    if (t.t === 'op' && t.v === '{') {
      this.next(); const entries = [];
      while (!this.atOp('}')) {
        const kt = this.peek();
        if (kt.t === 'eof') this.err('Esse registro não foi fechado com `}`.', t);
        let name;
        if (kt.t === 'id' || kt.t === 'kw') { this.next(); name = kt.v; }
        else if (kt.t === 'str' && kt.v.length === 1 && typeof kt.v[0] === 'string') { this.next(); name = kt.v[0]; }
        else this.err('Esperava o nome de um campo.', kt, 'Exemplo: {nome: "Ana", idade: 30}');
        this.expectOp(':', 'Depois do nome do campo vem `:` e o valor. Exemplo: {' + name + ': 10}');
        const value = this.parseExpr();
        if (entries.some(x => norm(x.name) === norm(name))) this.err('O campo `' + name + '` aparece duas vezes.', kt);
        entries.push({ name, value, pos: kt.s });
        if (this.atOp(',')) { this.next(); continue; }
        if (!this.atOp('}')) this.err('Entre os campos de um registro vai uma vírgula.', null, 'Exemplo: {nome: "Ana", idade: 30}');
      }
      this.next(); return { type: 'Rec', entries, s: t.s, e: this.last.e };
    }
    if (t.t === 'op' && t.v === '=') this.err('Esse `=` apareceu sem um nome antes.', t);
    if (t.t === 'kw') this.err('Esperava um valor, mas encontrei a palavra `' + t.v + '`.', t);
    this.err('Esperava um valor, mas encontrei ' + describe(t) + '.', t);
  }
}

// ───────── métodos embutidos ─────────
function M(name, min, max, fn, mut) { return { name, min, max, fn, mut: !!mut }; }
// Um número calculado a partir de uma lista (soma, média, quantidade) tem a origem dos itens dela.
function comLista(n, lista) { if (lista.length) n.o = { l: lista }; return n; }
function textoDeOrigem(v) { return textoDaOrigem(folhasDe(origemDe(v))); }
function linhasDeOrigem(v) { return linhasDasFolhas(folhasDe(origemDe(v))).map(x => x.f.rows[x.r]); }
const METODOS_DE_ORIGEM = [
  ['origem', M('origem', 0, 0, (I, s) => textoDeOrigem(s))],
  ['linhas_de_origem', M('linhas_de_origem', 0, 0, (I, s) => linhasDeOrigem(s))],
];
function methodTable(list) { const m = new Map(); for (const [aliases, def] of list) for (const a of aliases.split('|')) m.set(norm(a), def); return m; }
const needFn = (I, f, where, pos) => { if (!(f instanceof Fn || f instanceof Builtin)) throw new CordelError('`' + where + '` precisa receber uma função.', pos, 'Exemplo: lista.' + where + '(x => x * 2)'); return f; };
const needNum = (v, what, pos) => { if (!(v instanceof Num)) throw new CordelError(what + ' precisa ser um número, mas é ' + ARTIGO[typeName(v)] + '.', pos); return v; };
const needNums = (arr, what, pos) => { arr.forEach(v => { if (v === '') throw new CordelError('Para calcular ' + what + ', todos os itens precisam ser números — encontrei um texto vazio (""), que costuma ser uma célula vazia da planilha.', pos, 'Filtre as linhas vazias antes, por exemplo: lista.filtre(v => v.valor != "")'); if (!(v instanceof Num)) throw new CordelError('Para calcular ' + what + ', todos os itens precisam ser números — encontrei ' + ARTIGO[typeName(v)] + ' (' + display(v, true) + ').', pos); }); };
const needNotEmpty = (arr, what, pos) => { if (!arr.length) throw new CordelError('A lista está vazia, então não tem ' + what + '.', pos, 'Confira antes com lista.vazia'); };
const needInt = (v, what, pos) => { needNum(v, what, pos); if (!v.isInt()) throw new CordelError(what + ' precisa ser um número inteiro.', pos); return Number(v.n); };
function cmpVals(a, b, pos) {
  if (a instanceof Num && b instanceof Num) return a.cmp(b);
  if (a instanceof Data && b instanceof Data) return a.instante - b.instante;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'pt-BR');
  const vazio = a === '' || b === '';
  throw new CordelError('Não dá para comparar ' + ARTIGO[typeName(a)] + (a === '' ? ' vazio' : '') + ' com ' + ARTIGO[typeName(b)] + (b === '' ? ' vazio' : '') + '.', pos,
    vazio ? 'Texto vazio costuma ser uma célula vazia da planilha. Filtre antes: lista.filtre(v => v.campo != "")' : undefined);
}
function groupKey(v) {
  if (v instanceof Num) return 'n' + v.n + '/' + v.d;
  if (v instanceof Data) return 'd' + v.instante;
  if (typeof v === 'string') return 's' + v;
  return typeName(v) + display(v, true);
}
function money(n) {
  const r = n.round(2); const s = fixed(r, 2); const neg = s.startsWith('-');
  const [i, f] = (neg ? s.slice(1) : s).split('.');
  return (neg ? '-' : '') + 'R$ ' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + f;
}
const LIST_METHODS = methodTable([
  ['tamanho', M('tamanho', 0, 0, (I, s) => comLista(Num.int(s.length), s))],
  ['vazia|vazio', M('vazia', 0, 0, (I, s) => s.length === 0)],
  ['primeiro|primeira', M('primeiro', 0, 0, (I, s, a, p) => { needNotEmpty(s, 'primeiro item', p); return s[0]; })],
  ['último|última', M('último', 0, 0, (I, s, a, p) => { needNotEmpty(s, 'último item', p); return s[s.length - 1]; })],
  ['soma', M('soma', 0, 1, (I, s, a, p) => { const v = a.length ? s.map(x => I.cb(needFn(I, a[0], 'soma', p), [x], p)) : s; needNums(v, 'a soma', p); return comLista(v.reduce((x, y) => x.add(y), Num.int(0)), v); })],
  ['média', M('média', 0, 1, (I, s, a, p) => { needNotEmpty(s, 'média', p); const v = a.length ? s.map(x => I.cb(needFn(I, a[0], 'média', p), [x], p)) : s; needNums(v, 'a média', p); return comLista(v.reduce((x, y) => x.add(y), Num.int(0)).div(Num.int(v.length)), v); })],
  ['maior', M('maior', 0, 0, (I, s, a, p) => { needNotEmpty(s, 'maior item', p); return s.reduce((x, y) => cmpVals(y, x, p) > 0 ? y : x); })],
  ['menor', M('menor', 0, 0, (I, s, a, p) => { needNotEmpty(s, 'menor item', p); return s.reduce((x, y) => cmpVals(y, x, p) < 0 ? y : x); })],
  ['ordenada|ordenado', M('ordenada', 0, 1, (I, s, a, p) => {
    const f = a.length ? needFn(I, a[0], 'ordenada', p) : null;
    const keyed = s.map((x, i) => ({ x, i, k: f ? I.cb(f, [x], p) : x }));
    keyed.sort((u, v) => cmpVals(u.k, v.k, p) || u.i - v.i); return keyed.map(o => o.x);
  })],
  ['invertida|invertido', M('invertida', 0, 0, (I, s) => s.slice().reverse())],
  ['contém', M('contém', 1, 1, (I, s, a) => s.some(x => equals(x, a[0])))],
  ['posição', M('posição', 1, 1, (I, s, a) => Num.int(s.findIndex(x => equals(x, a[0])) + 1))],
  ['filtre', M('filtre', 1, 1, (I, s, a, p) => { const f = needFn(I, a[0], 'filtre', p); return s.filter(x => { const r = I.cb(f, [x], p); if (typeof r !== 'boolean') throw new CordelError('A função do `filtre` precisa devolver verdadeiro ou falso, mas devolveu ' + ARTIGO[typeName(r)] + '.', p, 'Exemplo: lista.filtre(x => x > 10)'); return r; }); })],
  ['transforme', M('transforme', 1, 1, (I, s, a, p) => { const f = needFn(I, a[0], 'transforme', p); return s.map(x => I.use(I.cb(f, [x], p), p)); })],
  ['conte', M('conte', 1, 1, (I, s, a, p) => { const f = needFn(I, a[0], 'conte', p); const v = s.filter(x => I.cb(f, [x], p) === true); return comLista(Num.int(v.length), v); })],
  ['algum|alguma', M('algum', 1, 1, (I, s, a, p) => { const f = needFn(I, a[0], 'algum', p); return s.some(x => I.cb(f, [x], p) === true); })],
  ['todos|todas', M('todos', 1, 1, (I, s, a, p) => { const f = needFn(I, a[0], 'todos', p); return s.every(x => I.cb(f, [x], p) === true); })],
  ['junte', M('junte', 0, 1, (I, s, a, p) => { const sep = a.length ? a[0] : ', '; if (typeof sep !== 'string') throw new CordelError('O separador do `junte` precisa ser um texto.', p); return s.map(x => display(x, false)).join(sep); })],
  ['pegue', M('pegue', 1, 1, (I, s, a, p) => s.slice(0, Math.max(0, needInt(a[0], 'A quantidade', p))))],
  ['pule', M('pule', 1, 1, (I, s, a, p) => s.slice(Math.max(0, needInt(a[0], 'A quantidade', p))))],
  ['única|único|únicos|únicas', M('única', 0, 0, (I, s) => s.filter((x, i) => s.findIndex(y => equals(x, y)) === i))],
  ['agrupe|agrupada|agrupado', M('agrupe', 1, 1, (I, s, a, p) => {
    const f = needFn(I, a[0], 'agrupe', p); const groups = new Map();
    for (const x of s) {
      const k = I.use(I.cb(f, [x], p), p); const gk = groupKey(k);
      let g = groups.get(gk); if (!g) { g = { k, itens: [] }; groups.set(gk, g); } g.itens.push(x);
    }
    return [...groups.values()].map(g => new Reg(new Map([['chave', { name: 'chave', v: g.k }], ['quantidade', { name: 'quantidade', v: comLista(Num.int(g.itens.length), g.itens) }], ['itens', { name: 'itens', v: g.itens }]])));
  })],
  ['adicione', M('adicione', 1, 1, (I, s, a) => s.concat([a[0]]), true)],
  ['remova', M('remova', 1, 1, (I, s, a, p) => { const i = s.findIndex(x => equals(x, a[0])); if (i < 0) throw new CordelError(display(a[0], true) + ' não está na lista.', p, 'Confira antes com lista.contém(x)'); const c = s.slice(); c.splice(i, 1); return c; }, true)],
  ['limpe', M('limpe', 0, 0, () => [], true)],
  ...METODOS_DE_ORIGEM,
]);
const TEXT_METHODS = methodTable([
  ['tamanho', M('tamanho', 0, 0, (I, s) => Num.int([...s].length))],
  ['vazio|vazia', M('vazio', 0, 0, (I, s) => s.length === 0)],
  ['maiúsculas|maiúsculo|maiúscula', M('maiúsculas', 0, 0, (I, s) => s.toLocaleUpperCase('pt-BR'))],
  ['minúsculas|minúsculo|minúscula', M('minúsculas', 0, 0, (I, s) => s.toLocaleLowerCase('pt-BR'))],
  ['aparado|aparada', M('aparado', 0, 0, (I, s) => s.trim())],
  ['invertido|invertida', M('invertido', 0, 0, (I, s) => [...s].reverse().join(''))],
  ['letras', M('letras', 0, 0, (I, s) => [...s])],
  ['palavras', M('palavras', 0, 0, (I, s) => s.trim() ? s.trim().split(/\s+/) : [])],
  ['contém', M('contém', 1, 1, (I, s, a, p) => { if (typeof a[0] !== 'string') throw new CordelError('`contém` em um texto procura outro texto.', p); return s.includes(a[0]); })],
  ['começa_com', M('começa_com', 1, 1, (I, s, a, p) => { if (typeof a[0] !== 'string') throw new CordelError('`começa_com` recebe um texto.', p); return s.startsWith(a[0]); })],
  ['termina_com', M('termina_com', 1, 1, (I, s, a, p) => { if (typeof a[0] !== 'string') throw new CordelError('`termina_com` recebe um texto.', p); return s.endsWith(a[0]); })],
  ['divida', M('divida', 1, 1, (I, s, a, p) => { if (typeof a[0] !== 'string' || !a[0]) throw new CordelError('`divida` recebe o texto separador, como ",".', p); return s.split(a[0]); })],
  ['só_números|so_numeros', M('só_números', 0, 0, (I, s) => s.replace(/\D/g, ''))],
  ['troque', M('troque', 2, 2, (I, s, a, p) => { if (typeof a[0] !== 'string' || typeof a[1] !== 'string' || !a[0]) throw new CordelError('`troque` recebe dois textos: o que procurar e o que colocar.', p); return s.split(a[0]).join(a[1]); })],
]);
const NUM_METHODS = methodTable([
  ['arredondado|arredondada', M('arredondado', 0, 1, (I, s, a, p) => s.round(a.length ? Math.max(0, needInt(a[0], 'O número de casas', p)) : 0))],
  ['absoluto', M('absoluto', 0, 0, (I, s) => s.abs())],
  ['inteiro', M('inteiro', 0, 0, (I, s) => new Num(s.trunc(), 1n))],
  ['raiz', M('raiz', 0, 0, (I, s, a, p) => {
    if (s.n < 0n) throw new CordelError('Não existe raiz quadrada de número negativo.', p);
    const rn = isqrt(s.n), rd = isqrt(s.d);
    if (rn * rn === s.n && rd * rd === s.d) return Num.make(rn, rd);
    return Num.fromFloat(Math.sqrt(s.toFloat())).round(12);
  })],
  ['dinheiro', M('dinheiro', 0, 0, (I, s) => money(s))],
  ['par', M('par', 0, 0, (I, s) => s.isInt() && s.n % 2n === 0n)],
  ['ímpar', M('ímpar', 0, 0, (I, s) => s.isInt() && s.n % 2n !== 0n)],
  ['reparta', M('reparta', 1, 2, (I, s, a, p) => repartir(s, a, p))],
  ['corrigido|corrigida', M('corrigido', 3, 3, (I, s, a, p) => corrigirValor(I, s, a, p))],
  ...METODOS_DE_ORIGEM,
]);
const DATE_METHODS = methodTable([
  ['dia', M('dia', 0, 0, (I, s) => Num.int(s.dia))],
  ['mês|mes', M('mês', 0, 0, (I, s) => Num.int(s.mes))],
  ['ano', M('ano', 0, 0, (I, s) => Num.int(s.ano))],
  ['dia_da_semana', M('dia_da_semana', 0, 0, (I, s) => DIAS_SEMANA[s.semana])],
  ['nome_do_mês|nome_do_mes', M('nome_do_mês', 0, 0, (I, s) => MESES[s.mes - 1])],
  ['trimestre', M('trimestre', 0, 0, (I, s) => Num.int(Math.floor((s.mes - 1) / 3) + 1))],
  ['mês_ano|mes_ano', M('mês_ano', 0, 0, (I, s) => String(s.ano).padStart(4, '0') + '-' + dois(s.mes))],
  ['formatada|formatado', M('formatada', 0, 0, (I, s) => s.toString())],
  ['por_extenso', M('por_extenso', 0, 0, (I, s) => s.dia + ' de ' + MESES[s.mes - 1] + ' de ' + s.ano + (s.temHora ? ' às ' + horarioDe(s.seg) : ''))],
  ['hora|horas', M('hora', 0, 0, (I, s) => Num.int(Math.floor(s.seg / 3600)))],
  ['minuto|minutos', M('minuto', 0, 0, (I, s) => Num.int(Math.floor(s.seg / 60) % 60))],
  ['segundo|segundos', M('segundo', 0, 0, (I, s) => Num.int(s.seg % 60))],
  ['horário|horario', M('horário', 0, 0, (I, s) => horarioDe(s.seg))],
  ['sem_hora', M('sem_hora', 0, 0, (I, s) => s.semHora())],
  ['mais_horas', M('mais_horas', 1, 1, (I, s, a, p) => somarTempo(s, needNum(a[0], 'A quantidade de horas', p), 3600, p))],
  ['mais_minutos', M('mais_minutos', 1, 1, (I, s, a, p) => somarTempo(s, needNum(a[0], 'A quantidade de minutos', p), 60, p))],
  ['minutos_até|minutos_ate', M('minutos_até', 1, 1, (I, s, a, p) => tempoAte(s, a[0], 60, 'minutos_até', p))],
  ['horas_até|horas_ate', M('horas_até', 1, 1, (I, s, a, p) => tempoAte(s, a[0], 3600, 'horas_até', p))],
  ['dias_até|dias_ate', M('dias_até', 1, 1, (I, s, a, p) => tempoAte(s, a[0], 86400, 'dias_até', p))],
  ['início_do_mês|inicio_do_mes', M('início_do_mês', 0, 0, (I, s) => Data.de(s.ano, s.mes, 1))],
  ['fim_do_mês|fim_do_mes', M('fim_do_mês', 0, 0, (I, s) => Data.de(s.ano, s.mes, diasNoMes(s.ano, s.mes)))],
  ['mais_meses', M('mais_meses', 1, 1, (I, s, a, p) => { const r = s.maisMeses(needInt(a[0], 'A quantidade de meses', p)); if (!r) throw new CordelError('A data ficou fora do calendário.', p); return r; })],
  ['útil|util', M('útil', 0, 1, (I, s, a, p) => ehUtil(s.semHora(), feriadosLocais(a[0], 'útil', p)))],
  ['feriado', M('feriado', 0, 0, (I, s) => feriadoEm(s.semHora()))],
  ['próximo_dia_útil|proximo_dia_util', M('próximo_dia_útil', 0, 1, (I, s, a, p) => { const l = feriadosLocais(a[0], 'próximo_dia_útil', p); let d = s.semHora(); while (!ehUtil(d, l)) d = d.mais(1); return comHoraDe(s, d.dias); })],
  ['mais_dias_úteis|mais_dias_uteis', M('mais_dias_úteis', 1, 2, (I, s, a, p) => maisDiasUteis(s, needInt(a[0], 'A quantidade de dias úteis', p), feriadosLocais(a[1], 'mais_dias_úteis', p), p))],
  ['dias_úteis_até|dias_uteis_ate', M('dias_úteis_até', 1, 2, (I, s, a, p) => diasUteisAte(s, a[0], feriadosLocais(a[1], 'dias_úteis_até', p), p))],
  ...METODOS_DE_ORIGEM,
]);
// Soma n unidades (horas, minutos) a uma data, arredondando ao segundo.
function somarTempo(d, n, unidade, p) {
  const seg = Number(n.mul(Num.int(unidade)).round(0).n);
  const r = DataHora.doInstante(d.instante + seg);
  if (!r) throw new CordelError('A data ficou fora do calendário.', p);
  return r;
}
// Quanto tempo falta de uma data até outra, em dias, horas ou minutos (exato; negativo se a outra vem antes).
function tempoAte(d, outra, unidade, nome, p) {
  if (!(outra instanceof Data)) throw new CordelError('`' + nome + '` recebe outra data, mas recebeu ' + ARTIGO[typeName(outra)] + '.', p, 'Exemplo: chegada.' + nome + '(saída)');
  return Num.make(BigInt(outra.instante - d.instante), BigInt(unidade));
}
const REC_METHODS = methodTable([
  ['campos', M('campos', 0, 0, (I, s) => s.names())],
  ['tem', M('tem', 1, 1, (I, s, a, p) => { if (typeof a[0] !== 'string') throw new CordelError('`tem` recebe o nome do campo como texto: pessoa.tem("email")', p); return s.m.has(norm(a[0])); })],
  ...METODOS_DE_ORIGEM,
]);
function methodsFor(v) {
  if (Array.isArray(v)) return [LIST_METHODS, 'Listas'];
  if (typeof v === 'string') return [TEXT_METHODS, 'Textos'];
  if (v instanceof Num) return [NUM_METHODS, 'Números'];
  if (v instanceof Reg) return [REC_METHODS, 'Registros'];
  if (v instanceof Data) return [DATE_METHODS, 'Datas'];
  return [new Map(), typeName(v) === 'lógico' ? 'Valores lógicos' : 'Funções'];
}
const methodNames = tbl => [...new Set([...tbl.values()].map(m => m.name))];

// ───────── interpretador ─────────
class Scope {
  constructor(parent) { this.vars = new Map(); this.parent = parent; }
  lookup(k) { let s = this; while (s) { const b = s.vars.get(k); if (b) return b; s = s.parent; } return null; }
  names() { const out = []; let s = this; while (s) { for (const b of s.vars.values()) out.push(b.name); s = s.parent; } return out; }
}
class Sorteio {
  constructor(a) { this.a = a | 0; }
  proximo() { let a = this.a = (this.a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
}

// ───────── planilhas e arquivos ─────────
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  let first = ''; for (const ln of text.split(/\r?\n/)) { if (ln.trim()) { first = ln; break; } }
  const counts = { ';': 0, ',': 0, '\t': 0 }; let q = false;
  for (const ch of first) { if (ch === '"') q = !q; else if (!q && ch in counts) counts[ch]++; }
  let delim = ','; let best = 0;
  for (const d of [';', '\t', ',']) if (counts[d] > best) { best = counts[d]; delim = d; }
  // linhas[i]: a linha do arquivo onde o registro i começa (um campo entre aspas pode ocupar várias)
  const rows = [], linhas = []; let row = [], field = '', inQ = false, i = 0, lin = 1, ini = 1; const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      if (ch === '\n') lin++;
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { inQ = true; i++; continue; }
    if (ch === delim) { row.push(field); field = ''; i++; continue; }
    if (ch === '\r' || ch === '\n') { row.push(field); rows.push(row); linhas.push(ini); row = []; field = ''; if (ch === '\r' && text[i + 1] === '\n') i++; i++; ini = ++lin; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); linhas.push(ini); }
  return { rows, delim, linhas };
}
function fieldName(h, i) {
  let s = String(h == null ? '' : h).trim().replace(/[^\p{L}\p{N}_]+/gu, '_').replace(/^_+|_+$/g, '');
  if (!s) s = 'coluna_' + (i + 1);
  if (/^\p{N}/u.test(s)) s = 'c_' + s;
  return s;
}
const BR_NUM = /^(-)?\s*(?:R\$\s*)?(-)?\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?$/i;
const DOT_NUM = /^(-)?\s*(?:R\$\s*)?(-)?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?$/i;
function parseNumWith(re, thou, s) {
  const m = re.exec(s); if (!m || (m[1] && m[2])) return null;
  return Num.parse((m[1] || m[2] ? '-' : '') + m[3].split(thou).join('') + (m[4] ? '.' + m[4] : ''));
}
const LOOKS_BR_DECIMAL = /^-?\s*(R\$\s*)?-?\d[\d.]*,\d+$/;
function convertColumn(vals, preferBR) {
  const out = vals.map(v => {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return Num.fromFloat(v) || String(v);
    return String(v).trim();
  });
  const strs = out.filter(v => typeof v === 'string' && v !== '');
  if (!strs.length) return out;
  if (strs.every(s => PARECE_DATA.test(s)) && strs.every(s => parseData(s))) return out.map(v => typeof v === 'string' && v !== '' ? parseData(v) : v);
  if (strs.some(s => /^-?0\d/.test(s) || /^\d{12,}$/.test(s))) return out; // códigos, CPF, CNPJ, chaves
  const br = strs.every(s => parseNumWith(BR_NUM, '.', s));
  const dot = strs.every(s => parseNumWith(DOT_NUM, ',', s));
  const mode = br && dot ? (preferBR ? 'br' : 'dot') : br ? 'br' : dot ? 'dot' : null;
  if (!mode) return out;
  return out.map(v => typeof v === 'string' && v !== '' ? (mode === 'br' ? parseNumWith(BR_NUM, '.', v) : parseNumWith(DOT_NUM, ',', v)) : v);
}
// numeros: a linha do arquivo de cada item de rows (para a origem); fonte: de onde a tabela veio.
function tableFromRows(rows, preferBR, numeros, fonte) {
  const filled = r => r.reduce((n, c) => n + (c !== '' && c !== null && c !== undefined ? 1 : 0), 0);
  numeros = numeros || rows.map((r, i) => i + 1);
  const cheias = []; rows.forEach((r, i) => { if (r && filled(r) > 0) cheias.push(i); });
  numeros = cheias.map(i => numeros[i]); rows = cheias.map(i => rows[i]);
  if (!rows.length) return [];
  // Linhas de título acima do cabeçalho: o cabeçalho é a primeira linha pelo menos meio preenchida.
  let most = 0; for (const r of rows.slice(0, 30)) most = Math.max(most, filled(r));
  const need = most <= 1 ? 1 : Math.max(2, Math.ceil(most / 2));
  const h = rows.findIndex(r => filled(r) >= need);
  if (h > 0) { rows = rows.slice(h); numeros = numeros.slice(h); }
  let width = 0; for (const r of rows) if (r.length > width) width = r.length;
  const head = [], used = new Set();
  for (let i = 0; i < width; i++) {
    const base = fieldName(rows[0][i], i); let name = base, j = 2;
    while (used.has(norm(name))) name = base + '_' + j++;
    used.add(norm(name)); head.push(name);
  }
  const body = rows.slice(1);
  const cols = head.map((_, ci) => convertColumn(body.map(r => r[ci]), preferBR));
  const t = body.map((r, ri) => { const m = new Map(); head.forEach((h, ci) => m.set(norm(h), { name: h, v: cols[ci][ri] })); return new Reg(m); });
  if (fonte) { fonte.linhas = numeros.slice(1); marcarTabela(t, fonte); }
  return t;
}
function asTable(v, p, what) {
  if (!Array.isArray(v)) throw new CordelError(what + ' precisa de uma lista, mas recebeu ' + ARTIGO[typeName(v)] + '.', p, 'Exemplo: salve("resultado.csv", lista_de_registros)');
  const cell = x => x instanceof Data ? { dt: x.iso(), s: x.toString() } : x instanceof Num ? { n: x.toString() } : typeof x === 'boolean' ? { b: x } : typeof x === 'string' ? x : Array.isArray(x) ? '(' + x.length + (x.length === 1 ? ' item)' : ' itens)') : display(x, true);
  if (v.length && v.every(x => x instanceof Reg)) {
    const cols = [], seen = new Set();
    for (const r of v) for (const [k, e] of r.m) if (!seen.has(k)) { seen.add(k); cols.push({ k, name: e.name }); }
    return { cols: cols.map(c => c.name), rows: v.map(r => cols.map(c => { const e = r.m.get(c.k); return e ? cell(e.v) : ''; })) };
  }
  if (v.length && v.every(x => Array.isArray(x))) return { cols: null, rows: v.map(r => r.map(cell)) };
  if (v.some(x => x instanceof Reg || Array.isArray(x))) throw new CordelError(what + ' precisa de itens do mesmo tipo: só registros, só listas ou só valores simples.', p);
  return { cols: ['valor'], rows: v.map(x => [cell(x)]) };
}
function csvCell(c) {
  let s = typeof c === 'string' ? c : c.dt !== undefined ? c.s : c.n !== undefined ? c.n.replace('.', ',') : c.b ? 'verdadeiro' : 'falso';
  if (/[;"\n\r]/.test(s) || /^\s|\s$/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function toCSV(t) {
  const lines = []; if (t.cols) lines.push(t.cols.map(csvCell).join(';'));
  for (const r of t.rows) lines.push(r.map(csvCell).join(';'));
  return lines.join('\r\n') + '\r\n';
}
function toJSONValue(v) {
  if (v instanceof Data) return v.iso();
  if (v instanceof Num) return v.isInt() && v.n <= BigInt(Number.MAX_SAFE_INTEGER) && v.n >= -BigInt(Number.MAX_SAFE_INTEGER) ? Number(v.n) : Number(v.toString());
  if (Array.isArray(v)) return v.map(toJSONValue);
  if (v instanceof Reg) { const o = {}; for (const e of v.m.values()) o[e.name] = toJSONValue(e.v); return o; }
  if (v instanceof Fn || v instanceof Builtin) return display(v, false);
  return v;
}
const SAVE_EXT = ['csv', 'xlsx', 'txt', 'md', 'json', 'pdf'];

function serializar(v, p) {
  const enc = x => {
    if (x instanceof Num) return { '#': x.n.toString() + '/' + x.d.toString() };
    if (x instanceof Data) return { '@': x.iso() };
    if (Array.isArray(x)) return x.map(enc);
    if (x instanceof Reg) return { '{}': [...x.m.values()].map(e => [e.name, enc(e.v)]) };
    if (typeof x === 'string' || typeof x === 'boolean') return x;
    throw new CordelError('Não dá para guardar ' + ARTIGO[typeName(x)] + '.', p, 'Guarde números, textos, listas e registros.');
  };
  return JSON.stringify(enc(v));
}
function desserializar(raw) {
  const dec = x => {
    if (Array.isArray(x)) return x.map(dec);
    if (x && typeof x === 'object') {
      if ('@' in x) return parseData(x['@']);
      if ('#' in x) { const [n, d] = x['#'].split('/'); return Num.make(BigInt(n), BigInt(d)); }
      if ('{}' in x) { const m = new Map(); for (const [name, v] of x['{}']) m.set(norm(name), { name, v: dec(v) }); return new Reg(m); }
      throw new Error('formato');
    }
    return x;
  };
  return dec(JSON.parse(raw));
}
const CORES = { azul: '#2458C6', anil: '#2B3A92', verde: '#1E7A4C', caatinga: '#4E6B2E', vermelho: '#B8322A', urucum: '#B23A1E', laranja: '#C8621A', amarelo: '#A87A00', roxo: '#6A3FA0', rosa: '#B8336A', preto: '#1C1A16', cinza: '#5B5F66', marrom: '#7A4A22' };
function corDe(v, p) {
  if (typeof v !== 'string') throw new CordelError('`cor` recebe um texto, como "verde" ou "#1E7A4C".', p);
  const k = norm(v.trim());
  if (CORES[k]) return CORES[k];
  if (/^#[0-9a-f]{6}$/i.test(v.trim())) return v.trim();
  throw new CordelError('Não conheço a cor "' + v + '".', p, 'Cores: ' + Object.keys(CORES).join(', ') + ', ou um código como "#1E7A4C".');
}
function numeroDeCampo(s) {
  s = String(s).trim(); if (!s) return null;
  return parseNumWith(BR_NUM, '.', s) || parseNumWith(DOT_NUM, ',', s) || null;
}
// ───────── Brasil: feriados, CPF e CNPJ, NF-e e OFX ─────────
// Páscoa pelo algoritmo de Meeus/Jones/Butcher (calendário gregoriano).
function pascoa(a) {
  const A = a % 19, B = Math.floor(a / 100), C = a % 100, D = Math.floor(B / 4), E = B % 4, F = Math.floor((B + 8) / 25), G = Math.floor((B - F + 1) / 3);
  const H = (19 * A + B - D - G + 15) % 30, I = Math.floor(C / 4), K = C % 4, L = (32 + 2 * E + 2 * I - H - K) % 7, M = Math.floor((A + 11 * H + 22 * L) / 451);
  return Data.de(a, Math.floor((H + L - 7 * M + 114) / 31), ((H + L - 7 * M + 114) % 31) + 1);
}
// Feriados nacionais do calendário da Anbima (o dos bancos). Carnaval e Corpus Christi são ponto facultativo
// no governo, mas os bancos fecham: ficam com tipo "bancário". O 20 de novembro é nacional desde 2024.
const FERIADOS = new Map();
function feriadosDoAno(a) {
  if (FERIADOS.has(a)) return FERIADOS.get(a);
  const p = pascoa(a), l = [];
  const fixo = (m, d, nome, desde) => { if (!desde || a >= desde) l.push({ data: Data.de(a, m, d), nome, tipo: 'nacional' }); };
  const movel = (n, nome, tipo) => l.push({ data: p.mais(n), nome, tipo });
  fixo(1, 1, 'Confraternização Universal');
  movel(-48, 'Carnaval', 'bancário'); movel(-47, 'Carnaval', 'bancário'); movel(-2, 'Paixão de Cristo', 'nacional');
  fixo(4, 21, 'Tiradentes'); fixo(5, 1, 'Dia do Trabalho'); movel(60, 'Corpus Christi', 'bancário');
  fixo(9, 7, 'Independência do Brasil'); fixo(10, 12, 'Nossa Senhora Aparecida', 1980); fixo(11, 2, 'Finados');
  fixo(11, 15, 'Proclamação da República'); fixo(11, 20, 'Dia Nacional de Zumbi e da Consciência Negra', 2024); fixo(12, 25, 'Natal');
  l.sort((x, y) => x.data.dias - y.data.dias);
  FERIADOS.set(a, l); return l;
}
function feriadoEm(d) { const f = feriadosDoAno(d.ano).find(x => x.data.dias === d.dias); return f ? f.nome : ''; }
// Feriados da cidade ou do estado, passados como lista de datas: [data("19/03/2026"), …]
function feriadosLocais(v, nome, p) {
  if (v === undefined) return null;
  if (!Array.isArray(v) || v.some(x => !(x instanceof Data))) throw new CordelError('Os feriados locais de `' + nome + '` são uma lista de datas.', p, 'Exemplo: locais = [data("19/03/2026"), data("25/03/2026")] e depois vencimento.' + nome + '(5, locais)');
  return new Set(v.map(x => x.dias));
}
function ehUtil(d, locais) { const w = d.semana; return w >= 1 && w <= 5 && !feriadoEm(d) && !(locais && locais.has(d.dias)); }
function comHoraDe(orig, dias) { return orig.temHora ? new DataHora(dias, orig.seg) : new Data(dias); }
function maisDiasUteis(s, n, locais, p) {
  if (Math.abs(n) > 100000) throw new CordelError('Dias úteis demais (mais de 100.000).', p);
  let d = s.semHora(); const passo = n < 0 ? -1 : 1;
  for (let falta = Math.abs(n); falta > 0;) { d = d.mais(passo); if (ehUtil(d, locais)) falta--; }
  return comHoraDe(s, d.dias);
}
function diasUteisAte(s, outra, locais, p) {
  if (!(outra instanceof Data)) throw new CordelError('`dias_úteis_até` recebe outra data, mas recebeu ' + ARTIGO[typeName(outra)] + '.', p, 'Exemplo: emissão.dias_úteis_até(pagamento)');
  const a = s.semHora().dias, b = outra.semHora().dias, ini = Math.min(a, b), fim = Math.max(a, b);
  if (fim - ini > 400000) throw new CordelError('Período grande demais para contar dias úteis.', p);
  let n = 0; for (let d = ini + 1; d <= fim; d++) if (ehUtil(new Data(d), locais)) n++;
  return Num.int(b < a ? -n : n);
}
// CPF e CNPJ: aceitam pontuação; números da planilha ganham os zeros à esquerda. O CNPJ alfanumérico
// (a partir de julho de 2026) usa letras nas 12 primeiras posições, cada caractere valendo o código ASCII − 48.
function documentoDe(v, tam) {
  if (v instanceof Num) return v.isInt() && v.n >= 0n ? v.n.toString().padStart(tam, '0') : null;
  if (typeof v !== 'string') return null;
  return v.trim().replace(/[.\-\/\s]/g, '').toUpperCase();
}
function cpfValido(v) {
  const s = documentoDe(v, 11);
  if (!s || !/^\d{11}$/.test(s) || /^(\d)\1{10}$/.test(s)) return false;
  const dv = k => { let soma = 0; for (let i = 0; i < k; i++) soma += +s[i] * (k + 1 - i); const r = soma * 10 % 11; return r === 10 ? 0 : r; };
  return dv(9) === +s[9] && dv(10) === +s[10];
}
function cnpjValido(v) {
  const s = documentoDe(v, 14);
  if (!s || !/^[0-9A-Z]{12}\d{2}$/.test(s) || /^(\d)\1{13}$/.test(s)) return false;
  const dv = k => { let soma = 0, peso = 2; for (let i = k - 1; i >= 0; i--) { soma += (s.charCodeAt(i) - 48) * peso; peso = peso === 9 ? 2 : peso + 1; } const r = soma % 11; return r < 2 ? 0 : 11 - r; };
  return dv(12) === +s[12] && dv(13) === +s[13];
}
// Leitor de XML pequeno e tolerante: elementos { nome (sem prefixo), attrs, filhos, texto }.
function lerXML(t, falha) {
  const raiz = { nome: '#doc', attrs: {}, filhos: [], texto: '' }, pilha = [raiz];
  const ent = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e.toLowerCase()]);
  const semPrefixo = n => n.replace(/^[^:]*:/, '');
  let i = 0; const n = t.length;
  while (i < n) {
    const lt = t.indexOf('<', i), topo = pilha[pilha.length - 1];
    topo.texto += ent(t.slice(i, lt < 0 ? n : lt));
    if (lt < 0) break;
    if (t.startsWith('<!--', lt)) { const f = t.indexOf('-->', lt); i = f < 0 ? n : f + 3; continue; }
    if (t.startsWith('<![CDATA[', lt)) { const f = t.indexOf(']]>', lt); if (f < 0) falha(); topo.texto += t.slice(lt + 9, f); i = f + 3; continue; }
    if (t[lt + 1] === '?' || t[lt + 1] === '!') { const f = t.indexOf('>', lt); i = f < 0 ? n : f + 1; continue; }
    let gt = lt + 1, aspas = null;
    for (; gt < n; gt++) { const c = t[gt]; if (aspas) { if (c === aspas) aspas = null; } else if (c === '"' || c === "'") aspas = c; else if (c === '>') break; }
    if (gt >= n) falha();
    const corpo = t.slice(lt + 1, gt); i = gt + 1;
    if (corpo[0] === '/') {
      const nome = semPrefixo(corpo.slice(1).trim());
      let k = pilha.length - 1; while (k > 0 && pilha[k].nome !== nome) k--;
      if (k > 0) pilha.length = k;
      continue;
    }
    const fecha = corpo.endsWith('/'), m = /^([^\s/>]+)([\s\S]*?)\/?$/.exec(corpo);
    if (!m) falha();
    const el = { nome: semPrefixo(m[1]), attrs: {}, filhos: [], texto: '' };
    for (const a of m[2].matchAll(/([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) el.attrs[semPrefixo(a[1])] = ent(a[3] !== undefined ? a[3] : a[4]);
    topo.filhos.push(el);
    if (!fecha) pilha.push(el);
  }
  return raiz;
}
function xmlAchar(el, nome) { if (!el) return null; for (const f of el.filhos) { if (f.nome === nome) return f; const r = xmlAchar(f, nome); if (r) return r; } return null; }
function xmlFilho(el, nome) { return el ? el.filhos.find(f => f.nome === nome) || null : null; }
function xmlTexto(el, ...caminho) { for (const n of caminho) el = xmlFilho(el, n); return el ? el.texto.trim() : ''; }
// A NF-e (ou NFC-e) de um arquivo XML, como registro.
function notaFiscalDe(texto, arquivo, p) {
  const falha = () => { throw new CordelError('"' + arquivo + '" não é um XML válido.', p, 'Confira se é o arquivo .xml da nota, como baixado do sistema ou do portal da NF-e.'); };
  const doc = lerXML(String(texto).replace(/^﻿/, ''), falha);
  const inf = xmlAchar(doc, 'infNFe');
  if (!inf) {
    if (xmlAchar(doc, 'infEvento')) throw new CordelError('"' + arquivo + '" é um evento da nota (cancelamento ou carta de correção), não a NF-e.', p, 'Use o XML da própria nota (o que tem o grupo infNFe).');
    throw new CordelError('"' + arquivo + '" não é uma NF-e: não achei o grupo infNFe.', p, 'nota_fiscal lê o XML de NF-e e NFC-e.');
  }
  const fonte = { tipo: 'xml', nome: arquivo };
  const num = (el, campo, onde) => { const t = xmlTexto(el, campo); const v = t ? Num.parse(t) : Num.int(0); const r = v || Num.int(0); r.o = { f: fonte, c: onde }; return r; };
  const reg = pares => new Reg(new Map(pares.map(([n, v]) => [norm(n), { name: n, v }])));
  const ide = xmlFilho(inf, 'ide'), emit = xmlFilho(inf, 'emit'), dest = xmlFilho(inf, 'dest'), tot = xmlAchar(xmlFilho(inf, 'total'), 'ICMSTot');
  const prot = xmlAchar(doc, 'infProt');
  const emissao = (() => { const t = xmlTexto(ide, 'dhEmi') || xmlTexto(ide, 'dEmi'); const d = t ? parseData(t.slice(0, 19)) : null; if (d) d.o = { f: fonte, c: 'emissão' }; return d || ''; })();
  const itens = inf.filhos.filter(f => f.nome === 'det').map((det, i) => {
    const pr = xmlFilho(det, 'prod');
    return reg([['item', Num.int(+(det.attrs.nItem || i + 1))], ['código', xmlTexto(pr, 'cProd')], ['descrição', xmlTexto(pr, 'xProd')], ['ncm', xmlTexto(pr, 'NCM')], ['cfop', xmlTexto(pr, 'CFOP')],
      ['unidade', xmlTexto(pr, 'uCom')], ['quantidade', num(pr, 'qCom')], ['valor_unitário', num(pr, 'vUnCom')], ['valor', num(pr, 'vProd')], ['desconto', num(pr, 'vDesc')]]);
  });
  marcarTabela(itens, { tipo: 'lista', nome: arquivo + ' › itens' });
  const doc_dest = xmlTexto(dest, 'CNPJ') || xmlTexto(dest, 'CPF') || xmlTexto(dest, 'idEstrangeiro');
  const cStat = xmlTexto(prot, 'cStat');
  return reg([
    ['chave', xmlTexto(prot, 'chNFe') || String(inf.attrs.Id || '').replace(/^NFe/, '')], ['número', xmlTexto(ide, 'nNF')], ['série', xmlTexto(ide, 'serie')],
    ['modelo', xmlTexto(ide, 'mod') === '65' ? 'NFC-e' : 'NF-e'], ['emissão', emissao], ['natureza', xmlTexto(ide, 'natOp')], ['tipo', xmlTexto(ide, 'tpNF') === '0' ? 'entrada' : 'saída'],
    ['emitente', reg([['cnpj', xmlTexto(emit, 'CNPJ') || xmlTexto(emit, 'CPF')], ['nome', xmlTexto(emit, 'xNome')], ['fantasia', xmlTexto(emit, 'xFant')], ['município', xmlTexto(emit, 'enderEmit', 'xMun')], ['uf', xmlTexto(emit, 'enderEmit', 'UF')]])],
    ['destinatário', reg([['documento', doc_dest], ['nome', xmlTexto(dest, 'xNome')], ['município', xmlTexto(dest, 'enderDest', 'xMun')], ['uf', xmlTexto(dest, 'enderDest', 'UF')]])],
    ['valor_produtos', num(tot, 'vProd', 'valor_produtos')], ['desconto', num(tot, 'vDesc', 'desconto')], ['frete', num(tot, 'vFrete', 'frete')],
    ['icms', num(tot, 'vICMS', 'icms')], ['ipi', num(tot, 'vIPI', 'ipi')], ['valor_total', num(tot, 'vNF', 'valor_total')],
    ['autorizada', cStat === '100' || cStat === '150'], ['protocolo', xmlTexto(prot, 'nProt')], ['situação', xmlTexto(prot, 'xMotivo') || (prot ? '' : 'sem protocolo de autorização no arquivo')],
    ['itens', itens],
  ]);
}
// Extrato OFX (SGML ou XML): um registro por lançamento, com a linha do arquivo onde ele começa.
function extratoOFX(texto, p, nome) {
  const t = String(texto), rows = [], linhas = [];
  const re = /<STMTTRN>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|$)/gi;
  for (const m of t.matchAll(re)) {
    const campos = {};
    for (const c of m[1].matchAll(/<([A-Z0-9.]+)>([^<\r\n]*)/gi)) campos[c[1].toUpperCase()] = c[2].trim().replace(/&(amp|lt|gt|quot|apos);/g, (x, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[e]);
    const dt = /^(\d{4})(\d{2})(\d{2})/.exec(campos.DTPOSTED || '');
    const data = dt ? Data.de(+dt[1], +dt[2], +dt[3]) : null;
    let bruto = (campos.TRNAMT || '').replace(/\s/g, '').replace(/^\+/, '');
    if (bruto.includes(',')) bruto = bruto.replace(/\./g, '').replace(',', '.'); // alguns bancos usam 1.234,56
    const valor = bruto ? Num.parse(bruto) : null;
    if (!data || !valor) throw new CordelError('Um lançamento do extrato "' + nome + '" não tem data ou valor válidos.', p, 'Confira se o arquivo .ofx veio inteiro do banco.');
    const tipo = (campos.TRNTYPE || '').toUpperCase();
    rows.push(new Reg(new Map([
      ['data', { name: 'data', v: data }], ['valor', { name: 'valor', v: valor }],
      ['tipo', { name: 'tipo', v: tipo === 'CREDIT' || tipo === 'DEP' ? 'crédito' : tipo === 'DEBIT' || tipo === 'PAYMENT' || tipo === 'POS' || tipo === 'ATM' || tipo === 'FEE' ? 'débito' : valor.n < 0n ? 'débito' : 'crédito' }],
      ['historico', { name: 'histórico', v: campos.MEMO || campos.NAME || '' }],
      ['documento', { name: 'documento', v: campos.CHECKNUM || campos.REFNUM || '' }],
      ['id', { name: 'id', v: campos.FITID || '' }],
    ])));
    linhas.push(t.slice(0, m.index).split('\n').length);
  }
  if (!rows.length && !/<OFX>/i.test(t)) throw new CordelError('"' + nome + '" não parece um extrato OFX.', p, 'O arquivo .ofx é o "extrato para programas financeiros" que o banco oferece para baixar.');
  return { rows, linhas };
}

// ───────── dinheiro: reparta sem perder centavo ─────────
// Divide o valor em partes iguais (n) ou proporcionais a pesos, arredondando a `casas` decimais pelo método
// do maior resto: a soma das partes é sempre o valor (arredondado), e os centavos que sobram vão para as
// partes que mais perderam no arredondamento (empate: a primeira).
function repartir(s, a, p) {
  const casas = a.length > 1 ? needInt(a[1], 'O número de casas', p) : 2;
  if (casas < 0 || casas > 10) throw new CordelError('O número de casas do `reparta` vai de 0 a 10.', p);
  let pesos;
  if (Array.isArray(a[0])) {
    if (!a[0].length) throw new CordelError('A lista de pesos do `reparta` está vazia.', p, 'Exemplo: frete.reparta([3, 1, 1]) divide em 3/5, 1/5 e 1/5.');
    needNums(a[0], 'o rateio', p);
    if (a[0].some(w => w.n < 0n)) throw new CordelError('Os pesos do `reparta` não podem ser negativos.', p);
    pesos = a[0];
  } else {
    if (!(a[0] instanceof Num)) throw new CordelError('`reparta` recebe o número de partes ou uma lista de pesos, mas recebeu ' + ARTIGO[typeName(a[0])] + '.', p, 'Exemplos: 100.reparta(3) · frete.reparta([3, 1, 1])');
    const n = needInt(a[0], 'O número de partes', p);
    if (n < 1) throw new CordelError('O número de partes do `reparta` precisa ser pelo menos 1.', p);
    if (n > 100000) throw new CordelError('Partes demais no `reparta` (mais de 100.000).', p);
    pesos = Array.from({ length: n }, () => Num.int(1));
  }
  const W = pesos.reduce((x, y) => x.add(y), Num.int(0));
  if (W.isZero()) throw new CordelError('A soma dos pesos do `reparta` é zero.', p, 'Pelo menos um peso precisa ser maior que zero.');
  const unid = 10n ** BigInt(casas), T = s.abs().round(casas), Tu = T.n * unid / T.d;
  const cotas = pesos.map((w, i) => { const q = Num.make(Tu * w.n * W.d, w.d * W.n), f = q.floor(); return { i, f, resto: q.sub(new Num(f, 1n)) }; });
  let falta = Tu - cotas.reduce((x, c) => x + c.f, 0n);
  const ordem = cotas.slice().sort((x, y) => y.resto.cmp(x.resto) || x.i - y.i);
  for (let k = 0; falta > 0n; k++, falta--) ordem[k].f += 1n;
  return cotas.map((c, i) => { const v = Num.make(s.n < 0n ? -c.f : c.f, unid); v.o = junta(s.o, pesos[i].o); return v; });
}

// ───────── conciliação ─────────
// concilie(a, b, {por, folga_de_dias, folga_de_valor, compare}): casa cada registro de a com no máximo um de b.
// Os campos de `por` precisam bater; números podem diferir até folga_de_valor e datas até folga_de_dias.
// Entre vários candidatos, fica o mais próximo (menor diferença de valor, depois de dias); os pares exatos vêm primeiro.
function conciliar(I, A, B, regras, p) {
  const ex = 'Exemplo: concilie(extrato, lançamentos, {por: ["valor", "data"], folga_de_dias: 2})';
  if (!Array.isArray(A) || !Array.isArray(B)) throw new CordelError('`concilie` recebe duas listas de registros (como duas tabelas) e as regras.', p, ex);
  for (const [lista, qual] of [[A, 'primeira'], [B, 'segunda']]) {
    const i = lista.findIndex(x => !(x instanceof Reg));
    if (i >= 0) throw new CordelError('A ' + qual + ' lista do `concilie` precisa ter só registros, mas o item ' + (i + 1) + ' é ' + ARTIGO[typeName(lista[i])] + '.', p, ex);
  }
  if (!(regras instanceof Reg)) throw new CordelError('O terceiro valor de `concilie` são as regras, num registro como {por: ["valor", "data"]}.', p, ex);
  const CONHECIDAS = ['por', 'folga_de_dias', 'folga_de_valor', 'compare'];
  for (const e of regras.m.values()) if (!CONHECIDAS.includes(norm(e.name))) {
    const sug = suggest(e.name, CONHECIDAS);
    throw new CordelError('`concilie` não conhece a regra `' + e.name + '`.', p, sug ? 'Você quis dizer `' + sug + '`?' : 'Regras: por, folga_de_dias, folga_de_valor e compare.');
  }
  const campos = (nome, obrig) => {
    const v = regras.get(nome), dica = 'Use um nome de campo, uma lista (["valor", "data"]) ou, quando os nomes mudam, um registro ({valor: "total", data: "crédito"}).';
    if (v === undefined) { if (obrig) throw new CordelError('Falta dizer em `por` quais campos precisam bater.', p, ex); return []; }
    let pares;
    if (typeof v === 'string') pares = [[v, v]];
    else if (Array.isArray(v)) pares = v.map(x => [x, x]);
    else if (v instanceof Reg) pares = [...v.m.values()].map(e => [e.name, e.v]);
    else throw new CordelError('`' + nome + '` do `concilie` recebeu ' + ARTIGO[typeName(v)] + '.', p, dica);
    if (!pares.length) throw new CordelError('`' + nome + '` do `concilie` está vazio.', p, dica);
    for (const [x, y] of pares) if (typeof x !== 'string' || typeof y !== 'string' || !x.trim() || !y.trim()) throw new CordelError('Os campos de `' + nome + '` são nomes entre aspas, como "valor".', p, dica);
    return pares.map(([x, y]) => ({ a: x.trim(), b: y.trim(), ka: norm(x.trim()), kb: norm(y.trim()) }));
  };
  const folga = nome => {
    const v = regras.get(nome); if (v === undefined) return Num.int(0);
    needNum(v, '`' + nome + '`', p);
    if (v.n < 0n) throw new CordelError('`' + nome + '` não pode ser negativa.', p);
    return v;
  };
  const por = campos('por', true), comparar = campos('compare', false);
  const folgaDias = folga('folga_de_dias'), folgaValor = folga('folga_de_valor');
  const confere = (lista, k, nome, qual) => {
    for (let i = 0; i < lista.length; i++) if (!lista[i].m.has(k)) {
      const s = suggest(nome, lista[i].names());
      throw new CordelError((i === 0 ? 'Os registros da ' + qual + ' lista' : 'O item ' + (i + 1) + ' da ' + qual + ' lista') + ' não ' + (i === 0 ? 'têm' : 'tem') + ' o campo `' + nome + '`.', p, s ? 'Você quis dizer `' + s + '`?' : 'Campos: ' + (lista[i].names().join(', ') || '(nenhum)'));
    }
  };
  for (const c of por.concat(comparar)) { confere(A, c.ka, c.a, 'primeira'); confere(B, c.kb, c.b, 'segunda'); }
  const tolerante = v => (v instanceof Num && folgaValor.n > 0n) || (v instanceof Data && folgaDias.n > 0n);
  const chave = v => v instanceof Num ? 'n' + v.n + '/' + v.d : v instanceof Data ? 'd' + v.instante : typeof v === 'string' ? 's' + norm(v.trim()) : typeName(v) + display(v, true);
  const chaveDe = (r, lado) => {
    const partes = [];
    for (const c of por) {
      const v = r.m.get(lado === 'a' ? c.ka : c.kb).v;
      if (v === '') return null; // célula vazia não casa com nada
      partes.push(tolerante(v) ? (v instanceof Num ? '~n' : '~d') : chave(v));
    }
    return partes.join('\u0001');
  };
  // candidatos: só os de mesma chave (campos exatos); com folga, confere e mede a distância
  const grupos = new Map();
  B.forEach((r, j) => { const k = chaveDe(r, 'b'); if (k === null) return; let g = grupos.get(k); if (!g) grupos.set(k, g = []); g.push(j); });
  const diasEntre = (x, y) => Num.make(BigInt(y.instante - x.instante), 86400n);
  // grupos grandes com folga: ordena pelo primeiro campo com folga e olha só a janela em volta do valor
  const janelas = new Map();
  const janela = (k, g, c, va) => {
    const id = k + '\u0002' + c.kb; let ordem = janelas.get(id);
    if (!ordem) {
      ordem = [];
      for (const j of g) { const v = B[j].m.get(c.kb).v; if (v instanceof Num) ordem.push({ j, x: v.toFloat() }); else if (v instanceof Data) ordem.push({ j, x: v.instante }); }
      ordem.sort((u, w) => u.x - w.x); janelas.set(id, ordem);
    }
    const x = va instanceof Num ? va.toFloat() : va.instante;
    const larg = va instanceof Num ? folgaValor.toFloat() * 1.000001 + Math.abs(x) * 1e-9 + 1e-9 : folgaDias.toFloat() * 86400 + 1;
    let lo = 0, hi = ordem.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ordem[m].x < x - larg) lo = m + 1; else hi = m; }
    const out = []; for (let t = lo; t < ordem.length && ordem[t].x <= x + larg; t++) out.push(ordem[t].j);
    return out;
  };
  const candidatos = [];
  A.forEach((ra, i) => {
    const k = chaveDe(ra, 'a'); if (k === null) return;
    const g = grupos.get(k); if (!g) return;
    const tol = por.filter(c => tolerante(ra.m.get(c.ka).v));
    for (const j of (tol.length && g.length > 64 ? janela(k, g, tol[0], ra.m.get(tol[0].ka).v) : g)) {
      I.tick(p);
      const rb = B[j]; let dv = Num.int(0), dd = Num.int(0), ok = true;
      for (const c of tol) {
        const va = ra.m.get(c.ka).v, vb = rb.m.get(c.kb).v;
        if (va instanceof Num) { const d = vb.sub(va).abs(); if (d.cmp(folgaValor) > 0) { ok = false; break; } dv = dv.add(d); }
        else { const d = diasEntre(va, vb).abs(); if (d.cmp(folgaDias) > 0) { ok = false; break; } dd = dd.add(d); }
      }
      if (ok) candidatos.push({ i, j, dv, dd });
    }
  });
  candidatos.sort((x, y) => x.dv.cmp(y.dv) || x.dd.cmp(y.dd) || x.i - y.i || x.j - y.j);
  // 1) do par mais próximo para o mais distante; 2) caminhos de aumento (Kuhn): um registro sem par pode pegar
  // o candidato de outro se esse outro tiver alternativa. Assim nenhum par possível se perde por uma escolha gulosa.
  const parDeA = new Map(), parDeB = new Map(), adj = new Map();
  for (const c of candidatos) {
    let l = adj.get(c.i); if (!l) adj.set(c.i, l = []); l.push(c.j);
    if (!parDeA.has(c.i) && !parDeB.has(c.j)) { parDeA.set(c.i, c.j); parDeB.set(c.j, c.i); }
  }
  for (const raiz of adj.keys()) {
    if (parDeA.has(raiz)) continue;
    const visto = new Set(), pilha = [{ i: raiz, k: 0, j: -1 }];
    while (pilha.length) {
      const t = pilha[pilha.length - 1], l = adj.get(t.i);
      if (t.k >= l.length) { pilha.pop(); continue; }
      const j = l[t.k++]; if (visto.has(j)) continue;
      visto.add(j); I.tick(p); t.j = j;
      const dono = parDeB.get(j);
      if (dono === undefined) { for (const e of pilha) { parDeA.set(e.i, e.j); parDeB.set(e.j, e.i); } break; }
      pilha.push({ i: dono, k: 0, j: -1 });
    }
  }
  const usadoB = new Set(parDeB.keys());
  const iguais = (x, y) => typeof x === 'string' && typeof y === 'string' ? norm(x.trim()) === norm(y.trim()) : equals(x, y);
  const nomeDe = c => c.a === c.b || norm(c.a) === norm(c.b) ? c.a : c.a + '/' + c.b;
  const pares = [];
  for (const [i, j] of [...parDeA].sort((x, y) => x[0] - y[0])) {
    const ra = A[i], rb = B[j], difs = [], m = new Map();
    let dias = null, dvalor = null, difere = false;
    for (const c of por) {
      const va = ra.m.get(c.ka).v, vb = rb.m.get(c.kb).v;
      if (va instanceof Data && vb instanceof Data) {
        const d = diasEntre(va, vb); if (dias === null) dias = d;
        if (!d.isZero()) { const n = d.abs(); difs.push(nomeDe(c) + ': ' + va + ' × ' + vb + ' (' + display(n) + (n.cmp(Num.int(1)) === 0 ? ' dia ' : ' dias ') + (d.n > 0n ? 'depois' : 'antes') + ')'); }
      } else if (va instanceof Num && vb instanceof Num) {
        const d = vb.sub(va); d.o = junta(va.o, vb.o); if (dvalor === null) dvalor = d;
        if (!d.isZero()) { difere = true; difs.push(nomeDe(c) + ': ' + display(va) + ' × ' + display(vb) + ' (diferença de ' + display(d) + ')'); }
      }
    }
    for (const c of comparar) {
      const va = ra.m.get(c.ka).v, vb = rb.m.get(c.kb).v;
      if (!iguais(va, vb)) { difere = true; difs.push(nomeDe(c) + ': ' + display(va) + ' × ' + display(vb)); }
    }
    m.set('primeiro', { name: 'primeiro', v: ra }); m.set('segundo', { name: 'segundo', v: rb });
    m.set('diferenca', { name: 'diferença', v: difs.join('; ') });
    if (dias !== null) m.set('dias', { name: 'dias', v: dias });
    if (dvalor !== null) m.set('diferenca_de_valor', { name: 'diferença_de_valor', v: dvalor });
    const par = new Reg(m); par.difere = difere; pares.push(par);
  }
  const soA = A.filter((r, i) => !parDeA.has(i)), soB = B.filter((r, j) => !usadoB.has(j));
  const comDif = pares.filter(x => x.difere);
  const plural = (n, um, varios) => milhar(n) + ' ' + (n === 1 ? um : varios);
  const resumo = plural(pares.length, 'par', 'pares') + (comDif.length ? ' (' + milhar(comDif.length) + ' com diferença)' : '') + ', ' + milhar(soA.length) + ' só no primeiro e ' + milhar(soB.length) + ' só no segundo';
  return new Reg(new Map([
    ['resumo', { name: 'resumo', v: resumo }], ['pares', { name: 'pares', v: pares }], ['com_diferenca', { name: 'com_diferença', v: comDif }],
    ['so_no_primeiro', { name: 'só_no_primeiro', v: soA }], ['so_no_segundo', { name: 'só_no_segundo', v: soB }],
  ]));
}

// ───────── índices oficiais (Banco Central) ─────────
// Séries do SGS do Banco Central: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{código}/dados
const BC_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.';
const INDICES = {
  ipca: { nome: 'IPCA', serie: 433, mensal: true, descricao: 'IPCA (IBGE), a inflação oficial: variação mensal em %' },
  igpm: { nome: 'IGP-M', serie: 189, mensal: true, descricao: 'IGP-M (FGV), usado em aluguéis e contratos: variação mensal em %' },
  inpc: { nome: 'INPC', serie: 188, mensal: true, descricao: 'INPC (IBGE), usado em salários e benefícios: variação mensal em %' },
  selic: { nome: 'Selic', serie: 11, mensal: false, descricao: 'Selic: taxa de cada dia útil, em % ao dia' },
  cdi: { nome: 'CDI', serie: 12, mensal: false, descricao: 'CDI: taxa de cada dia útil, em % ao dia' },
};
const MOEDAS = { dolar: { nome: 'dólar', serie: 1 }, usd: { nome: 'dólar', serie: 1 }, euro: { nome: 'euro', serie: 21619 }, eur: { nome: 'euro', serie: 21619 } };
const chaveDeIndice = s => norm(String(s)).replace(/[^a-z0-9]/g, '');
const mesAno = d => dois(d.mes) + '/' + d.ano;
function indiceDe(v, p) {
  if (v instanceof Reg && v.get('nome') !== undefined) v = v.get('nome');
  const def = typeof v === 'string' ? INDICES[chaveDeIndice(v)] : null;
  if (!def) throw new CordelError(typeof v === 'string' ? 'Não conheço o índice "' + v + '".' : 'O índice é um nome entre aspas, como "IPCA".', p, 'Índices: ' + Object.values(INDICES).map(x => x.nome).join(', ') + '.');
  return def;
}
function periodo(de, ate, nome, p) {
  const ex = 'Exemplo: ' + nome + '(data("01/01/2025"), data("31/12/2025"))';
  if (!(de instanceof Data) || !(ate instanceof Data)) throw new CordelError('O período vai de uma data até outra.', p, ex);
  de = de.semHora(); ate = ate.semHora();
  if (ate.dias < de.dias) throw new CordelError('O fim do período (' + ate + ') vem antes do início (' + de + ').', p, ex);
  return [de, ate];
}
// Acumulado de um índice no período: meses do início ao fim, inclusive (mensais); dias úteis do início até a véspera do fim (diários, como juros).
function fatorDoIndice(I, def, de, ate, p) {
  let linhas, desc;
  if (def.mensal) {
    const ini = Data.de(de.ano, de.mes, 1), fim = Data.de(ate.ano, ate.mes, diasNoMes(ate.ano, ate.mes));
    linhas = I.serieBC(def.serie, ini, fim, p);
    const porMes = new Map(linhas.map(x => [mesAno(x.data), x]));
    const usadas = [];
    for (let d = ini; d.dias <= fim.dias; d = d.maisMeses(1)) {
      const x = porMes.get(mesAno(d));
      if (!x) throw new CordelError('O Banco Central ainda não tem o ' + def.nome + ' de ' + mesAno(d) + '.', p, 'Cada mês sai só no mês seguinte. Use um período até o último mês publicado.');
      usadas.push(x);
    }
    linhas = usadas; desc = def.nome + ' de ' + mesAno(ini) + (ini.mes === fim.mes && ini.ano === fim.ano ? '' : ' a ' + mesAno(fim));
  } else {
    if (ate.dias === de.dias) return { fator: Num.int(1), desc: def.nome + ' (período sem dias)', linhas: [] };
    const fim = new Data(ate.dias - 1);
    linhas = I.serieBC(def.serie, de, fim, p).filter(x => x.data.dias >= de.dias && x.data.dias <= fim.dias);
    let uteis = false; for (let d = de.dias; d <= fim.dias && !uteis; d++) { const w = new Data(d).semana; uteis = w >= 1 && w <= 5; }
    if (!linhas.length && uteis) throw new CordelError('O Banco Central não tem a ' + def.nome + ' de ' + de + ' a ' + fim + '.', p, 'A taxa de cada dia sai no dia útil seguinte. Confira o período.');
    desc = def.nome + ' de ' + de + ' a ' + fim;
  }
  const cem = Num.int(100), um = Num.int(1);
  const fator = linhas.reduce((f, x) => f.mul(um.add(x.valor.div(cem))), um);
  return { fator, desc, linhas };
}
function corrigirValor(I, s, a, p) {
  if (a.length !== 3) throw new CordelError('`corrigido` recebe o índice e o período.', p, 'Exemplo: aluguel.corrigido("IGP-M", data("01/10/2024"), data("30/09/2025"))');
  const def = indiceDe(a[0], p), [de, ate] = periodo(a[1], a[2], 'corrigido', p);
  const r = fatorDoIndice(I, def, de, ate, p);
  const v = s.mul(r.fator); v.o = junta(s.o, { f: I.fonteBC, c: r.desc }); return v;
}

const MAX_STEPS = 20000000, MAX_DEPTH = 700, MAX_RASTRO = 3000;
const PASSO_DEPOIS = new Set(['Mostre', 'Var', 'Assign', 'ExprStmt', 'Check']);
function curto(v, lim) {
  lim = lim || 90;
  if (Array.isArray(v) || v instanceof Reg) {
    const lista = Array.isArray(v); const itens = lista ? v : [...v.m.values()];
    const partes = []; let tam = 2;
    for (const x of itens) {
      const s = lista ? curto(x, 40) : x.name + ': ' + curto(x.v, 40);
      if (tam + s.length > lim) { partes.push('…' + (lista ? ' ' + v.length + ' itens' : '')); break; }
      partes.push(s); tam += s.length + 2;
    }
    return lista ? '[' + partes.join(', ') + ']' : '{' + partes.join(', ') + '}';
  }
  const s = display(v, true); return s.length > lim ? s.slice(0, lim - 1) + '…' : s;
}
function fotografar(sc) {
  const cadeia = []; for (let x = sc; x; x = x.parent) cadeia.push(x);
  const m = new Map();
  for (let i = cadeia.length - 1; i >= 0; i--) for (const [k, b] of cadeia[i].vars) {
    if (b.value instanceof Fn || b.value instanceof Builtin) continue;
    m.delete(k); m.set(k, [b.name, curto(b.value)]);
  }
  return [...m.values()];
}
class Interp {
  constructor(src, opts) {
    this.src = src; this.out = []; this.steps = 0; this.depth = 0; this.loops = 0; this.fnDepth = 0;
    this.answers = opts.answers || []; this.ai = 0; this.sorteio = new Sorteio(opts.seed || 1); this.rng = () => this.sorteio.proximo(); this.tests = []; this.inTest = false;
    this.files = opts.files || []; this.saved = []; this.tabCache = new Map();
    this.hoje = opts.hoje ? parseData(opts.hoje) : null;
    this.agoraFixo = opts.agora ? parseData(opts.agora) : null;
    this.maxSteps = opts.maxSteps || MAX_STEPS; this.storage = opts.storage || null; this.appMode = !!opts.app;
    this.telaDef = null; this.ui = null; this.handlers = new Map();
    this.pagina = null; this.historico = []; this.paginas = [];
    this.rastro = opts.trace ? [] : null; this.rastroCortado = false;
    this.global = new Scope(null); this.global.raiz = true; this.builtins = this.makeBuiltins();
    this.buscar = typeof opts.buscar === 'function' ? opts.buscar : null; this.rede = new Map(Object.entries(opts.rede || {})); this.buscas = 0; this.pendentes = null;
    this.achaModulo = criarResolvedor(opts.modulos); this.modCache = new Map(); this.modPilha = []; this.fontes = []; this.carregando = 0;
    this.fontesRede = new Map(); this.fonteBC = { tipo: 'bc', nome: 'Banco Central' };
  }
  findFile(name, p) {
    if (typeof name !== 'string') throw new CordelError('O nome do arquivo precisa ser um texto entre aspas, como "vendas.csv".', p);
    const k = norm(name.trim());
    const f = this.files.find(f => norm(f.name) === k) || this.files.find(f => norm(f.name.replace(/\.[^.]+$/, '')) === k);
    if (f) return f;
    const names = this.files.map(f => f.name);
    const s = suggest(name, names.concat(names.map(n => n.replace(/\.[^.]+$/, ''))));
    const real = s && (names.find(n => n === s) || names.find(n => n.replace(/\.[^.]+$/, '') === s));
    throw new CordelError('Não encontrei o arquivo "' + name + '".', p,
      !names.length ? 'Adicione o arquivo no painel Arquivos, acima do editor.' : real ? 'Você quis dizer "' + real + '"?' : 'Arquivos disponíveis: ' + names.join(', '));
  }
  makeBuiltins() {
    const I = this; const b = new Map();
    const def = (names, min, max, fn) => { const bi = new Builtin(names.split('|')[0], min, max, fn); for (const n of names.split('|')) b.set(norm(n), bi); };
    def('número', 1, 1, (a, p) => {
      const v = a[0]; if (v instanceof Num) return v;
      if (typeof v !== 'string') throw new CordelError('`número` transforma textos em números, mas recebeu ' + ARTIGO[typeName(v)] + '.', p);
      let s = v.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
      if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
      else if (/^[-+]?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
      const n = Num.parse(s);
      if (!n) throw new CordelError('Não consegui transformar ' + display(v, true) + ' em número.', p, 'Textos como "42", "3.5" ou "1.234,56" funcionam.');
      return n;
    });
    def('texto', 1, 1, a => display(I.use(a[0]), false));
    def('hoje', 0, 0, () => I.agoraAqui().semHora());
    def('agora', 0, 0, () => I.agoraAqui());
    def('data', 1, 6, (a, p) => {
      const dica = 'Exemplos: data("26/09/2026") · data("26/09/2026 14:30") · data(2026, 9, 26) · data(2026, 9, 26, 14, 30)';
      const lerTexto = v => {
        if (v instanceof Data) return v;
        if (typeof v !== 'string') throw new CordelError('`data` recebe um texto como "26/09/2026" ou números: ano, mês, dia (e, se quiser, hora e minuto).', p, dica);
        const d = parseData(v); if (!d) throw new CordelError('Não entendi a data ' + display(v, true) + '.', p, 'Use dia/mês/ano, como "26/09/2026", ou com hora: "26/09/2026 14:30". Confira também se o dia existe naquele mês.');
        return d;
      };
      if (a.length === 1) return lerTexto(a[0]);
      if (a.length === 2) {
        const base = lerTexto(a[0]).semHora();
        const seg = typeof a[1] === 'string' ? parseHora(a[1]) : null;
        if (seg === null) throw new CordelError('O segundo valor de `data` é a hora, como "14:30".', p, 'Exemplo: data(v.dia, v.hora) junta uma data e uma hora.');
        return new DataHora(base.dias, seg);
      }
      if (a.length !== 3 && a.length !== 5 && a.length !== 6) throw new CordelError('`data` recebe um texto, uma data e uma hora, ou números: ano, mês e dia, e também hora e minuto.', p, dica);
      const d = Data.de(needInt(a[0], 'O ano', p), needInt(a[1], 'O mês', p), needInt(a[2], 'O dia', p));
      if (!d) throw new CordelError('Essa data não existe no calendário.', p, 'Confira o dia e o mês: data(ano, mês, dia).');
      if (a.length === 3) return d;
      const h = needInt(a[3], 'A hora', p), mi = needInt(a[4], 'O minuto', p), se = a.length === 6 ? needInt(a[5], 'O segundo', p) : 0;
      if (h < 0 || h > 23 || mi < 0 || mi > 59 || se < 0 || se > 59) throw new CordelError('Essa hora não existe: use hora de 0 a 23 e minuto de 0 a 59.', p);
      return new DataHora(d.dias, h * 3600 + mi * 60 + se);
    });
    def('tipo', 1, 1, a => typeName(a[0]));
    def('aleatório', 2, 2, (a, p) => {
      const lo = needInt(a[0], 'O início', p), hi = needInt(a[1], 'O fim', p);
      if (hi < lo) throw new CordelError('Em aleatório(a, b), o `a` precisa ser menor ou igual ao `b`.', p);
      return Num.int(lo + Math.floor(I.rng() * (hi - lo + 1)));
    });
    def('intervalo', 2, 2, (a, p) => {
      const lo = needNum(a[0], 'O início', p), hi = needNum(a[1], 'O fim', p);
      const out = []; const st = Num.int(1);
      for (let x = lo; st.n > 0n ? x.cmp(hi) <= 0 : x.cmp(hi) >= 0; x = x.add(st)) { out.push(x); if (out.length > 1000000) throw new CordelError('Intervalo grande demais (mais de um milhão de números).', p); }
      return out;
    });
    def('pergunte', 0, 1, (a, p) => {
      const q = a.length ? display(a[0], false) : '';
      if (I.inTest) throw new CordelError('Testes não podem usar `pergunte`.', p);
      if (I.carregando) throw new CordelError('Um módulo não pode usar `pergunte` enquanto é carregado.', p, 'Deixe as perguntas no programa principal, ou dentro de funções do módulo.');
      if (I.appMode) throw new CordelError('Programas com tela não usam `pergunte`.', p, 'Use um campo: var nome = "" e, dentro da tela, campo "Seu nome" em nome');
      if (I.ai < I.answers.length) { const ans = I.answers[I.ai++]; I.out.push({ kind: 'ask', text: q }); I.out.push({ kind: 'answer', text: ans }); return ans; }
      throw new AskSig(q);
    });
    const semMemoria = p => new CordelError('`guarde` e `guardado` só funcionam em programas com tela.', p, 'Eles lembram valores entre uma visita e outra do app, neste aparelho.');
    def('guarde', 2, 2, (a, p) => {
      if (!I.storage) throw semMemoria(p);
      if (typeof a[0] !== 'string' || !a[0]) throw new CordelError('O primeiro valor de `guarde` é o nome da memória, como "tarefas".', p);
      const v = serializar(I.use(a[1], p), p);
      if (I.pendentes) I.pendentes.set(a[0], v); else I.storage.set(a[0], v);
      return VAZIO;
    });
    def('guardado', 2, 2, (a, p) => {
      if (!I.storage) throw semMemoria(p);
      if (typeof a[0] !== 'string' || !a[0]) throw new CordelError('O primeiro valor de `guardado` é o nome da memória, como "tarefas".', p);
      let raw = null;
      if (I.pendentes && I.pendentes.has(a[0])) raw = I.pendentes.get(a[0]);
      else { try { raw = I.storage.get(a[0]); } catch (e) { raw = null; } }
      if (raw === null || raw === undefined) return a[1];
      try { return desserializar(raw); } catch (e) { return a[1]; }
    });
    def('busque', 1, 2, (a, p) => {
      const r = I.obterDaRede(a[0], a[1], p), url = a[0].trim();
      let fonte = I.fontesRede.get(url); if (!fonte) I.fontesRede.set(url, fonte = { tipo: 'internet', nome: enderecoCurto(url) });
      return respostaParaValor(r, p, fonte);
    });
    def('concilie', 3, 3, (a, p) => conciliar(I, a[0], a[1], a[2], p));
    def('feriados', 1, 1, (a, p) => {
      const ano = needInt(a[0], 'O ano', p);
      if (ano < 1900 || ano > 2199) throw new CordelError('Os feriados são calculados de 1900 a 2199.', p);
      return feriadosDoAno(ano).map(f => new Reg(new Map([['data', { name: 'data', v: f.data }], ['nome', { name: 'nome', v: f.nome }], ['tipo', { name: 'tipo', v: f.tipo }]])));
    });
    def('cpf_válido|cpf_valido', 1, 1, a => cpfValido(a[0]));
    def('cnpj_válido|cnpj_valido', 1, 1, a => cnpjValido(a[0]));
    def('nota_fiscal', 1, 1, (a, p) => {
      const f = I.findFile(a[0], p);
      if (f.sheets) throw new CordelError('"' + f.name + '" é uma planilha, não o XML de uma nota.', p, 'nota_fiscal lê arquivos .xml de NF-e e NFC-e.');
      const k = '\u0001nfe\u0000' + f.name; if (I.tabCache.has(k)) return I.tabCache.get(k);
      const nf = notaFiscalDe(f.text, f.name, p); I.tabCache.set(k, nf); return nf;
    });
    def('índice|indice', 1, 1, (a, p) => {
      const def = indiceDe(a[0], p), fonte = I.fonteBC;
      const fn = (nome, f) => new Builtin(nome, 2, 2, (b, q) => f(...periodo(b[0], b[1], nome, q), q));
      const acumulado = fn('acumulado', (de, ate, q) => { const r = fatorDoIndice(I, def, de, ate, q); const v = r.fator.sub(Num.int(1)).mul(Num.int(100)); v.o = { f: fonte, c: r.desc }; return v; });
      const fator = fn('fator', (de, ate, q) => { const r = fatorDoIndice(I, def, de, ate, q); const v = r.fator; v.o = { f: fonte, c: r.desc }; return v; });
      const serie = fn('série', (de, ate, q) => {
        if (def.mensal) { de = Data.de(de.ano, de.mes, 1); ate = Data.de(ate.ano, ate.mes, diasNoMes(ate.ano, ate.mes)); }
        return I.serieBC(def.serie, de, ate, q).filter(x => x.data.dias >= de.dias && x.data.dias <= ate.dias).map(x => {
          x.valor.o = { f: fonte, c: def.nome + ' de ' + (def.mensal ? mesAno(x.data) : String(x.data)) };
          return new Reg(new Map([['data', { name: 'data', v: x.data }], ['valor', { name: 'valor', v: x.valor }]]));
        });
      });
      return new Reg(new Map([
        ['nome', { name: 'nome', v: def.nome }], ['descricao', { name: 'descrição', v: def.descricao }],
        ['acumulado', { name: 'acumulado', v: acumulado }], ['fator', { name: 'fator', v: fator }], ['serie', { name: 'série', v: serie }],
      ]));
    });
    def('cotação|cotacao', 2, 2, (a, p) => {
      const m = typeof a[0] === 'string' ? MOEDAS[chaveDeIndice(a[0])] : null;
      if (!m) throw new CordelError(typeof a[0] === 'string' ? 'Não conheço a moeda "' + a[0] + '".' : 'A moeda é um nome entre aspas, como "dólar".', p, 'Moedas: dólar e euro. Exemplo: cotação("dólar", data("01/09/2025"))');
      if (!(a[1] instanceof Data)) throw new CordelError('O segundo valor de `cotação` é o dia.', p, 'Exemplo: cotação("dólar", data("01/09/2025")) · cotação("euro", hoje())');
      const dia = a[1].semHora(), ini = new Data(dia.dias - 10);
      const linhas = I.serieBC(m.serie, ini, dia, p).filter(x => x.data.dias <= dia.dias);
      if (!linhas.length) throw new CordelError('O Banco Central não tem a cotação do ' + m.nome + ' em ' + dia + ' nem nos dez dias antes.', p, 'A cotação de cada dia útil sai no fim da tarde; datas futuras ainda não têm cotação.');
      const x = linhas[linhas.length - 1], v = x.valor;
      v.o = { f: I.fonteBC, c: m.nome + ' (venda) de ' + x.data + (x.data.dias !== dia.dias ? ', o último dia útil até ' + dia : '') };
      return v;
    });
    def('arquivos', 0, 0, () => I.files.map(f => f.name));
    def('abas', 1, 1, (a, p) => { const f = I.findFile(a[0], p); return f.sheets ? f.sheets.map(s => s.name) : [f.name]; });
    def('leia', 1, 1, (a, p) => {
      const f = I.findFile(a[0], p);
      if (f.sheets) throw new CordelError('"' + f.name + '" é uma planilha do Excel.', p, 'Para ler as linhas como registros, use tabela("' + f.name + '").');
      return f.text.charCodeAt(0) === 0xFEFF ? f.text.slice(1) : f.text;
    });
    def('tabela', 1, 2, (a, p) => {
      if (typeof a[0] === 'string' && /^https?:\/\//i.test(a[0].trim())) {
        const r = I.obterDaRede(a[0], a[1], p), url = a[0].trim();
        if (I.tabCache.has(url)) return I.tabCache.get(url);
        const v = pareceJSON(r) ? jsonParaValor(r.texto, p) : null;
        let t;
        if (Array.isArray(v)) t = marcarTabela(v, { tipo: 'lista', nome: enderecoCurto(url) });
        else if (v !== null) throw new CordelError('O endereço devolveu um JSON que não é uma lista de registros.', p, 'Para ler outros formatos de JSON, use busque(endereço).');
        else { const c = parseCSV(r.texto); t = tableFromRows(c.rows, c.delim !== ',' || c.rows.some(row => row.some(x => LOOKS_BR_DECIMAL.test(String(x).trim()))), c.linhas, { tipo: 'planilha', nome: enderecoCurto(url) }); }
        I.tabCache.set(url, t); return t;
      }
      const f = I.findFile(a[0], p);
      let key = f.name, rows, preferBR = true, numeros = null;
      const fonte = { tipo: 'planilha', nome: f.name, aba: null };
      if (f.sheets) {
        let sh = f.sheets[0];
        if (a.length > 1) {
          if (typeof a[1] !== 'string') throw new CordelError('O nome da aba precisa ser um texto, como "Plan1".', p);
          sh = f.sheets.find(s => norm(s.name) === norm(a[1]));
          if (!sh) throw new CordelError('A planilha "' + f.name + '" não tem a aba "' + a[1] + '".', p, 'Abas disponíveis: ' + f.sheets.map(s => s.name).join(', '));
        }
        if (!sh) return [];
        key += '\u0000' + sh.name; rows = sh.rows; numeros = sh.linhas || null;
        if (f.sheets.length > 1) fonte.aba = sh.name;
      } else {
        if (a.length > 1) throw new CordelError('Arquivos CSV têm uma aba só.', p, 'Use apenas tabela("' + f.name + '").');
        if (I.tabCache.has(key)) return I.tabCache.get(key);
        if (/\.ofx$/i.test(f.name) || /^\s*(OFXHEADER|<\?OFX|<OFX>)/i.test(f.text)) {
          const x = extratoOFX(f.text, p, f.name); fonte.linhas = x.linhas;
          const t = marcarTabela(x.rows, fonte); I.tabCache.set(key, t); return t;
        }
        if (/\.xml$/i.test(f.name) || /^\s*<\?xml/.test(f.text)) throw new CordelError('"' + f.name + '" é um XML, não uma planilha.', p, 'Para notas fiscais, use nota_fiscal("' + f.name + '"); a lista de produtos fica em .itens.');
        const c = parseCSV(f.text); rows = c.rows; numeros = c.linhas;
        preferBR = c.delim !== ',' || rows.some(r => r.some(x => LOOKS_BR_DECIMAL.test(String(x).trim())));
      }
      if (I.tabCache.has(key)) return I.tabCache.get(key);
      const t = tableFromRows(rows, preferBR, numeros, fonte); I.tabCache.set(key, t); return t;
    });
    def('salve', 2, 2, (a, p) => {
      if (I.inTest) throw new CordelError('Testes não podem usar `salve`.', p);
      if (I.carregando) throw new CordelError('Um módulo não pode usar `salve` enquanto é carregado.', p, 'Deixe o salve no programa principal, ou dentro de funções do módulo.');
      const name = a[0];
      if (typeof name !== 'string' || !name.trim()) throw new CordelError('O nome do arquivo precisa ser um texto, como "resultado.csv".', p);
      const m = /\.([a-z0-9]+)$/i.exec(name.trim()); const ext = m && m[1].toLowerCase();
      if (!SAVE_EXT.includes(ext)) throw new CordelError('Não sei salvar arquivos ' + (ext ? '.' + ext : 'sem extensão') + '.', p, 'Use .csv ou .xlsx para tabelas, .pdf para um relatório, .txt ou .md para textos, .json para dados.');
      const v = I.use(a[1], p);
      let file;
      if (ext === 'csv' || ext === 'xlsx') { const t = asTable(v, p, '`salve` em .' + ext); file = { name: name.trim(), ext, cols: t.cols, rows: t.rows }; if (ext === 'csv') file.text = toCSV(t); }
      else if (ext === 'pdf') {
        // o PDF é montado por quem roda o programa (lib/relatorio.js); aqui ficam os blocos dele
        const tabela = Array.isArray(v) && v.length && v.every(x => x instanceof Reg);
        let blocos;
        if (tabela) { const t = asTable(v, p, '`salve` em .pdf'); blocos = [{ tipo: 'tabela', cols: t.cols, rows: t.rows, total: v.length, origens: v.map(r => resumirOrigem(origemDe(r))) }]; }
        else blocos = (Array.isArray(v) ? v : [v]).map(x => ({ tipo: 'texto', texto: display(x, false) }));
        file = { name: name.trim(), ext, blocos, rows: tabela ? v.length : null };
      }
      else if (ext === 'json') file = { name: name.trim(), ext, text: JSON.stringify(toJSONValue(v), null, 2) };
      else file = { name: name.trim(), ext, text: Array.isArray(v) ? v.map(x => display(x, false)).join('\n') : display(v, false) };
      I.saved = I.saved.filter(f => f.name !== file.name); I.saved.push(file);
      I.out.push({ kind: 'file', name: file.name, ext, rows: ext === 'pdf' ? file.rows : file.rows ? file.rows.length : null });
      return VAZIO;
    });
    return b;
  }
  // Busca na rede (ou na lembrança desta execução): devolve { status, tipo, texto } ou lança um erro claro.
  obterDaRede(endereco, opcoes, p) {
    if (typeof endereco !== 'string' || !/^https?:\/\/[^\s/?#]+/i.test(endereco.trim())) throw new CordelError('O endereço precisa ser um texto começando com https:// (ou http://).', p, 'Exemplo: busque("https://brasilapi.com.br/api/cep/v1/63500000")');
    const url = endereco.trim();
    const cab = {};
    if (opcoes !== undefined) {
      if (!(opcoes instanceof Reg)) throw new CordelError('O segundo valor de `busque` é um registro de opções, como {cabeçalhos: {Authorization: "…"}}.', p);
      for (const [k, e] of opcoes.m) {
        if (k !== 'cabecalhos') throw new CordelError('`busque` não conhece a opção `' + e.name + '`.', p, 'Por enquanto a única opção é cabeçalhos.');
        if (!(e.v instanceof Reg)) throw new CordelError('`cabeçalhos` é um registro, como {Authorization: "Bearer …"}.', p);
        for (const h of e.v.m.values()) { if (typeof h.v !== 'string') throw new CordelError('O cabeçalho `' + h.name + '` precisa ser um texto.', p); cab[h.name] = h.v; }
      }
    }
    const chave = url + (Object.keys(cab).length ? '\u0000' + JSON.stringify(Object.entries(cab).sort()) : '');
    let r = this.rede.get(chave);
    if (!r) {
      if (this.inTest && !this.buscar && !this.rede.size) { /* testes também podem buscar */ }
      if (++this.buscas > 1000) throw new CordelError('Buscas demais numa execução (mais de 1.000).', p, 'Guarde o resultado de busque num nome e reaproveite.');
      if (this.buscar) r = this.buscar(url, cab);
      else throw new BuscaSig({ url, cabecalhos: cab, chave });
      this.rede.set(chave, r);
    }
    const host = url.replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
    if (r.erro === 'tempo') throw new CordelError('O endereço ' + host + ' demorou demais para responder (mais de ' + (r.segundos || 15).toLocaleString('pt-BR') + ' segundos).', p, 'Tente de novo daqui a pouco.');
    if (r.erro === 'grande') throw new CordelError('A resposta de ' + host + ' é grande demais (mais de 10 MB).', p);
    if (r.erro) throw new CordelError('Não consegui acessar ' + host + '.', p, 'Confira o endereço e a internet. No navegador, só dá para buscar em sites que permitem acesso de outras páginas (CORS); no computador, com cordel rodar, qualquer endereço funciona.' + (r.detalhe ? ' Detalhe: ' + r.detalhe : ''));
    if (r.status < 200 || r.status > 299) {
      const nomes = { 400: 'pedido inválido', 401: 'precisa de autorização', 403: 'acesso negado', 404: 'não encontrado', 429: 'pedidos demais', 500: 'erro no servidor', 502: 'servidor indisponível', 503: 'serviço indisponível', 504: 'servidor demorou demais' };
      const e = new CordelError('O endereço respondeu com erro ' + r.status + (nomes[r.status] ? ' (' + nomes[r.status] + ')' : '') + '.', p, r.status === 404 ? 'Confira o endereço: talvez o código (CNPJ, CEP…) não exista.' : r.status === 429 ? 'O site limita quantos pedidos você faz; espere um pouco.' : undefined);
      e.status = r.status; throw e;
    }
    return r;
  }
  // Uma série do Banco Central entre duas datas: [{ data, valor }]. Séries diárias vão em pedaços de até
  // 5 anos (o Banco Central recusa janelas maiores que 10 anos); sem dados no período, devolve [].
  serieBC(codigo, ini, fim, p) {
    const out = [];
    for (let a = ini.dias; a <= fim.dias; a += 1826) {
      const b = Math.min(fim.dias, a + 1825);
      const url = BC_URL + codigo + '/dados?formato=json&dataInicial=' + new Data(a) + '&dataFinal=' + new Data(b);
      let r;
      try { r = this.obterDaRede(url, undefined, p); } catch (e) { if (e instanceof CordelError && e.status === 404) continue; throw e; }
      let v = null; try { v = pareceJSON(r) ? jsonParaValor(r.texto, p) : null; } catch (e) { v = null; }
      if (!Array.isArray(v)) throw new CordelError('O Banco Central respondeu num formato que eu não esperava.', p, 'Tente de novo mais tarde.');
      for (const x of v) {
        if (!(x instanceof Reg)) continue;
        const d = parseSoData(String(x.get('data') || '')), n = Num.parse(String(x.get('valor') === undefined ? '' : x.get('valor')).trim());
        if (d && n) out.push({ data: d, valor: n });
      }
    }
    return out.sort((x, y) => x.data.dias - y.data.dias);
  }
  // Tudo o que um toque pode mudar, para desfazer se ele precisar esperar uma busca e ser repetido.
  fotografar() {
    const valores = new Map();
    const guardar = esc => { for (const b of esc.vars.values()) valores.set(b, b.value); };
    guardar(this.global); for (const m of this.modCache.values()) if (m.escopo) guardar(m.escopo);
    return { valores, pagina: this.pagina, historico: this.historico.slice(), saved: this.saved.slice(), sorteio: this.sorteio.a, out: this.out.length };
  }
  restaurar(f) {
    for (const [b, v] of f.valores) b.value = v;
    this.pagina = f.pagina; this.historico = f.historico; this.saved = f.saved; this.sorteio.a = f.sorteio; this.out.length = f.out;
  }
  // agora(): fixo nos testes (opção agora), na data fixa com a hora do relógio (opção hoje), ou o relógio do aparelho
  agoraAqui() {
    if (this.agoraFixo) return this.agoraFixo instanceof DataHora ? this.agoraFixo : new DataHora(this.agoraFixo.dias, 0);
    const n = new Date(), seg = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
    if (this.hoje) return new DataHora(this.hoje.dias, seg);
    return new DataHora(Data.de(n.getFullYear(), n.getMonth() + 1, n.getDate()).dias, seg);
  }
  tick(p) { if (++this.steps > this.maxSteps) throw new CordelError('O programa rodou demais e foi interrompido.', p, 'Talvez um `enquanto` nunca termine. Confira se a condição muda dentro do laço.', true); }
  use(v, p, what) {
    if (v === VAZIO) throw new CordelError((what ? '`' + what + '`' : 'Essa função') + ' não devolve nenhum valor — ela só faz ações.', p, 'Se quiser um resultado, use `devolva` dentro da função. Ações como lista.adicione(x) já alteram a lista sozinhas.');
    return v;
  }
  ev(e, sc) { const v = this.eval(e, sc); if (v === VAZIO) this.use(v, e.s, e.type === 'Call' ? this.calleeName(e) : null); return v; }
  calleeName(e) { const c = e.callee; return c.type === 'Ident' ? c.name : c.type === 'Member' ? c.name : null; }

  runProgram(prog) { this.execBlock(prog.body, this.global); }
  runTests() {
    const results = [];
    for (const t of this.tests) {
      this.inTest = true;
      try { this.execBlock(t.body, new Scope(t.scope)); results.push({ name: t.name, ok: true }); }
      catch (e) {
        if (e instanceof TestFail) results.push({ name: t.name, ok: false, msg: e.msg, pos: e.pos });
        else if (e instanceof CordelError) { if (e.fatal) throw e; results.push({ name: t.name, ok: false, msg: 'deu erro: ' + e.message, pos: e.pos }); }
        else throw e;
      }
      this.inTest = false;
    }
    return results;
  }
  execBlock(stmts, sc) {
    for (const st of stmts) if (st.type === 'Func') {
      if (sc.vars.has(st.k)) throw new CordelError('Já existe algo chamado `' + st.name + '` aqui.', st.s, 'Cada função precisa de um nome diferente.');
      sc.vars.set(st.k, { name: st.name, value: new Fn({ name: st.name, params: st.params, body: st.body, expr: st.expr, closure: sc, pos: st.s }), mutable: false });
    }
    for (let i = 0; i < stmts.length; i++) { const r = this.exec(stmts[i], sc); if (r !== undefined) return r; }
    return undefined;
  }
  uiNeed(st) {
    if (!this.ui) {
      const nome = st.type === 'UIButton' ? 'botão' : st.type === 'UIPage' ? 'página' : UI_NOME[st.kind];
      throw new CordelError('`' + nome + '` só funciona dentro de uma tela.', st.s, 'Coloque dentro de um bloco: tela "Meu app" … fim');
    }
  }
  uiAdd(node) {
    const s = this.ui.stack; s[s.length - 1].kids.push(node);
    if (++this.ui.count > 5000) throw new CordelError('A tela ficou grande demais (mais de 5000 elementos).', null, 'Mostre menos itens de cada vez, por exemplo com lista.pegue(50).', true);
  }
  checkMutable(t, sc) {
    let base = t; while (base.type === 'Member' || base.type === 'Index') base = base.obj;
    if (base.type !== 'Ident') throw new CordelError('Depois de `em` vem o nome de uma variável.', t.s);
    const b = sc.lookup(base.k);
    if (!b) throw this.unknown(base, sc);
    if (!b.mutable) throw new CordelError('`' + b.name + '` precisa ser criada com var para a tela poder mudar o valor.', base.s, 'Troque por: var ' + b.name + ' = …');
  }
  voltar() { if (this.historico.length) this.pagina = this.historico.pop(); }
  irPara(nome) {
    const alvo = this.paginas.find(x => norm(x) === norm(String(nome)));
    if (alvo && norm(alvo) !== norm(this.pagina || '')) { this.historico = []; this.pagina = alvo; }
  }
  montarGrafico(st, sc) {
    const v = this.ev(st.dados, sc), p = st.dados.s;
    const title = st.title ? display(this.ev(st.title, sc), false) : '';
    let labels = [], values = [], campo = st.campo ? st.campo.name : '';
    const numero = (x, onde) => { if (!(x instanceof Num)) throw new CordelError('O gráfico precisa de números, mas ' + onde + ' há ' + ARTIGO[typeName(x)] + (x === '' ? ' vazio' : '') + '.', p, x === '' ? 'Filtre as linhas vazias antes: lista.filtre(v => v.campo != "")' : undefined); return x; };
    if (v instanceof Reg) {
      if (st.campo) throw new CordelError('Com um registro, cada campo vira uma barra; não use `por`.', p);
      for (const e of v.m.values()) { labels.push(e.name); values.push(numero(e.v, 'no campo ' + e.name)); }
    } else if (Array.isArray(v) && v.length && v.every(x => x instanceof Reg)) {
      const nomes = []; for (const [k, e] of v[0].m) nomes.push({ k, name: e.name });
      let alvo;
      if (st.campo) {
        alvo = nomes.find(n => n.k === st.campo.k);
        if (!alvo) { const sug = suggest(st.campo.name, nomes.map(n => n.name)); throw new CordelError('Os itens não têm o campo `' + st.campo.name + '`.', p, sug ? 'Você quis dizer `' + sug + '`?' : 'Campos: ' + nomes.map(n => n.name).join(', ')); }
      } else {
        alvo = nomes.find(n => v.every(r => r.get(n.k) instanceof Num));
        if (!alvo) throw new CordelError('Não achei um campo com números em todos os itens.', p, 'Diga qual usar: gráfico "…" de lista por campo');
      }
      campo = alvo.name;
      const rot = nomes.find(n => n.k !== alvo.k && v.every(r => !(r.get(n.k) instanceof Num)));
      v.forEach((r, i) => { labels.push(rot ? display(r.get(rot.k), false) : String(i + 1)); values.push(numero(r.get(alvo.k), 'no campo ' + alvo.name + ' do item ' + (i + 1))); });
    } else if (Array.isArray(v) && v.length && v.every(x => x instanceof Num)) {
      if (st.campo) throw new CordelError('Uma lista de números não tem campos; tire o `por`.', p);
      v.forEach((x, i) => { labels.push(String(i + 1)); values.push(x); });
    } else if (Array.isArray(v) && !v.length) {
      throw new CordelError('A lista do gráfico está vazia.', p);
    } else throw new CordelError('O gráfico precisa de uma lista de registros, uma lista de números ou um registro.', p, 'Exemplo: gráfico "Vendas por filial" de resumo por total');
    const total = labels.length;
    return { title, campo, total, labels: labels.slice(0, 60), values: values.slice(0, 60).map(x => x.toString()) };
  }
  renderTela() {
    const def = this.telaDef; if (!def) return null;
    const root = { t: 'tela', title: '', cor: null, kids: [] };
    this.ui = { root, stack: [root], handlers: new Map(), next: 0, count: 0, paginas: [], achou: false };
    try {
      if (def.st.title) root.title = display(this.ev(def.st.title, def.scope), false);
      this.execBlock(def.st.body, new Scope(def.scope));
      const ps = this.ui.paginas; this.paginas = ps.slice();
      if (ps.length && !this.ui.achou) {
        // a página atual sumiu (ex.: o programa mudou): volta para a primeira
        this.pagina = null; this.historico = [];
        return this.renderTela();
      }
      root.paginas = ps; root.pagina = ps.length ? this.pagina : null;
      root.voltar = this.historico.length > 0;
      root.barra = ps.length && norm(this.pagina) !== norm(ps[0]) ? this.pagina : root.title;
      this.handlers = this.ui.handlers;
      return root;
    } finally { this.ui = null; }
  }
  event(id, value) {
    const h = this.handlers.get(id); if (!h) return false;
    if (h.kind === 'botao') { this.execBlock(h.body, new Scope(h.scope)); return true; }
    let v;
    if (h.tipo === 'logico') v = !!value;
    else if (h.tipo === 'opcao') { v = h.opcoes[Number(value)]; if (v === undefined) return false; }
    else if (h.tipo === 'numero') { v = numeroDeCampo(value); if (v === null) return false; }
    else if (h.tipo === 'data') { v = parseData(value); if (!v) return false; v = v.semHora(); }
    else if (h.tipo === 'datahora') { v = parseData(value); if (!v) return false; if (!v.temHora) v = new DataHora(v.dias, 0); }
    else v = String(value);
    this.assignTo(h.target, v, h.scope);
    return true;
  }
  // Laços: devolve undefined para continuar, BRK para sair, ou um Ret para propagar.
  loopSig(r) { if (r === undefined || r === CNT) return 0; if (r === BRK) return 1; return 2; }
  exec(st, sc) {
    if (this.rastro === null) return this.execCore(st, sc);
    const r = this.execCore(st, sc);
    if (PASSO_DEPOIS.has(st.type)) this.passo(st.s, sc, null);
    return r;
  }
  passo(pos, sc, nota) {
    if (this.rastro === null || this.inTest || this.ui || this.carregando || (pos != null && pos >= MOD_BASE)) return;
    if (this.rastro.length >= MAX_RASTRO) { this.rastroCortado = true; return; }
    this.rastro.push({ pos, nota, vars: fotografar(sc), out: this.out.length });
  }
  execCore(st, sc) {
    this.tick(st.s);
    switch (st.type) {
      case 'Func': return;
      case 'Mostre': {
        if (this.carregando) return;
        // Fora das telas, cada valor mostrado leva junto a origem do que o formou (inclusive números que viraram texto).
        const coletas = [], antes = COLETOR;
        let vals;
        try { vals = st.args.map(a => { COLETOR = this.ui ? null : []; const v = this.ev(a, sc); coletas.push(COLETOR); return v; }); }
        finally { COLETOR = antes; }
        const ehTabela = vals.length === 1 && Array.isArray(vals[0]) && vals[0].length && vals[0].every(x => x instanceof Reg);
        if (this.ui) {
          if (ehTabela) { const t = asTable(vals[0].slice(0, 500), st.s, '`mostre`'); this.uiAdd({ t: 'tabela', cols: t.cols, rows: t.rows, total: vals[0].length }); }
          else this.uiAdd({ t: 'texto', text: vals.map(v => display(v, false)).join(' ') });
          return;
        }
        if (ehTabela) {
          const t = asTable(vals[0].slice(0, 500), st.s, '`mostre`'), o = { kind: 'table', cols: t.cols, rows: t.rows, total: vals[0].length };
          const origens = vals[0].slice(0, 500).map(r => resumirOrigem(origemDe(r)));
          if (origens.some(x => x)) o.origens = origens;
          this.out.push(o);
        } else {
          const partes = vals.map((v, i) => { const o = junta(origemDe(v), coletas[i].length ? { p: coletas[i] } : null); return { texto: display(v, false), o }; });
          const o = { kind: 'out', text: partes.map(x => x.texto).join(' ') }, origens = [];
          let ini = 0;
          for (const x of partes) { const r = resumirOrigem(x.o); if (r) origens.push(Object.assign({ ini, fim: ini + x.texto.length }, r)); ini += x.texto.length + 1; }
          if (origens.length) o.origens = origens;
          this.out.push(o);
        }
        if (this.out.length > 5000) throw new CordelError('Saída grande demais (mais de 5000 linhas).', st.s, 'Talvez um laço nunca termine. Confira se a condição do `enquanto` muda lá dentro.', true); return; }
      case 'Var': {
        if (sc.vars.has(st.k)) throw new CordelError('`' + st.name + '` já foi criada neste bloco.', st.s, 'Para mudar o valor, escreva só: ' + st.name + ' = …');
        const v = this.ev(st.value, sc); sc.vars.set(st.k, { name: st.name, value: v, mutable: true }); return;
      }
      case 'Assign': {
        const t = st.target;
        if (t.type === 'Ident' && st.op === '=') {
          const b = sc.lookup(t.k);
          if (!b) { const v = this.ev(st.value, sc); sc.vars.set(t.k, { name: t.name, value: v, mutable: false }); return; }
          if (!b.mutable) throw this.fixedErr(b, t);
          b.value = this.ev(st.value, sc); return;
        }
        let nv = this.ev(st.value, sc);
        if (st.op !== '=') { const cur = this.ev(t, sc); nv = this.arith(st.op[0], cur, nv, st.s); }
        this.assignTo(t, nv, sc); return;
      }
      case 'ExprStmt': this.eval(st.expr, sc); return;
      case 'If': {
        const c = this.cond(st.cond, sc, 'se');
        if (this.rastro) this.passo(st.s, sc, 'se: ' + (c ? 'verdadeiro' : 'falso'));
        if (c) return this.execBlock(st.cons, new Scope(sc));
        if (st.alt) return this.execBlock(st.alt, new Scope(sc));
        return;
      }
      case 'While': {
        this.loops++;
        try {
          for (;;) {
            const c = this.cond(st.cond, sc, 'enquanto');
            if (this.rastro) this.passo(st.s, sc, 'enquanto: ' + (c ? 'verdadeiro' : 'falso, sai do laço'));
            if (!c) break;
            const r = this.execBlock(st.body, new Scope(sc)); const k = this.loopSig(r);
            if (k === 1) break; if (k === 2) return r;
          }
        } finally { this.loops--; }
        return;
      }
      case 'Repeat': {
        const n = needInt(this.ev(st.count, sc), 'A quantidade de vezes', st.count.s);
        this.loops++;
        try {
          for (let i = 0; i < n; i++) {
            if (this.rastro) this.passo(st.s, sc, 'repita: volta ' + (i + 1) + ' de ' + n);
            const r = this.execBlock(st.body, new Scope(sc)); const k = this.loopSig(r);
            if (k === 1) break; if (k === 2) return r;
          }
        } finally { this.loops--; }
        return;
      }
      case 'ForIn': {
        let it = this.ev(st.iter, sc);
        if (typeof it === 'string') it = [...it];
        if (it instanceof Reg) throw new CordelError('Não dá para percorrer um registro diretamente.', st.iter.s, 'Percorra os nomes dos campos: para cada c em registro.campos');
        if (!Array.isArray(it)) throw new CordelError('`para cada` percorre listas ou textos, mas recebeu ' + ARTIGO[typeName(it)] + '.', st.iter.s);
        this.loops++;
        try {
          for (const x of it) {
            const s2 = new Scope(sc); s2.vars.set(st.k, { name: st.name, value: x, mutable: false });
            if (this.rastro) this.passo(st.s, s2, 'para cada: ' + st.name + ' = ' + curto(x, 50));
            const r = this.execBlock(st.body, s2); const k = this.loopSig(r);
            if (k === 1) break; if (k === 2) return r;
          }
        } finally { this.loops--; }
        return;
      }
      case 'ForRange': {
        const a = needNum(this.ev(st.from, sc), 'O início', st.from.s), b = needNum(this.ev(st.to, sc), 'O fim', st.to.s);
        let step = st.step ? needNum(this.ev(st.step, sc), 'O passo', st.step.s) : Num.int(1);
        if (step.isZero()) throw new CordelError('O passo não pode ser zero.', st.step.s);
        this.loops++;
        try {
          for (let x = a; step.n > 0n ? x.cmp(b) <= 0 : x.cmp(b) >= 0; x = x.add(step)) {
            const s2 = new Scope(sc); s2.vars.set(st.k, { name: st.name, value: x, mutable: false });
            if (this.rastro) this.passo(st.s, s2, 'para: ' + st.name + ' = ' + x.toString());
            const r = this.execBlock(st.body, s2); const k = this.loopSig(r);
            if (k === 1) break; if (k === 2) return r;
          }
        } finally { this.loops--; }
        return;
      }
      case 'Return': {
        if (!this.fnDepth) throw new CordelError('`devolva` só funciona dentro de uma função.', st.s);
        const v = st.value ? this.ev(st.value, sc) : VAZIO;
        if (this.rastro) this.passo(st.s, sc, v === VAZIO ? 'devolve (nada)' : 'devolve ' + curto(v, 60));
        return new Ret(v);
      }
      case 'Break': if (!this.loops) throw new CordelError('`pare` só funciona dentro de um laço (para, enquanto, repita).', st.s); return BRK;
      case 'Continue': if (!this.loops) throw new CordelError('`continue` só funciona dentro de um laço (para, enquanto, repita).', st.s); return CNT;
      case 'Switch': {
        const v = this.ev(st.subject, sc);
        for (const c of st.cases) {
          for (const p of c.pats) {
            let hit;
            if (p.range) { const lo = this.ev(p.lo, sc), hi = this.ev(p.hi, sc); hit = typeName(v) === typeName(lo) && (v instanceof Num || typeof v === 'string') && cmpVals(v, lo, p.lo.s) >= 0 && cmpVals(v, hi, p.hi.s) <= 0; }
            else hit = equals(v, this.ev(p.lo, sc));
            if (hit) { if (this.rastro) this.passo(st.s, sc, 'escolha: caso ' + (p.range ? curto(this.ev(p.lo, sc), 20) + ' até ' + curto(this.ev(p.hi, sc), 20) : curto(this.ev(p.lo, sc), 30))); return this.execBlock(c.body, new Scope(sc)); }
          }
        }
        if (this.rastro) this.passo(st.s, sc, st.other ? 'escolha: nenhum caso, vai para o senão' : 'escolha: nenhum caso');
        if (st.other) return this.execBlock(st.other, new Scope(sc));
        return;
      }
      case 'Test': {
        if (this.carregando) return;
        const name = this.ev(st.name, sc);
        this.tests.push({ name: display(name, false), body: st.body, scope: sc }); return;
      }
      case 'Check': {
        const ex = st.expr; let ok, detail = '';
        if (ex.type === 'Bin' && ['==', '!=', '<', '>', '<=', '>='].includes(ex.op)) {
          const l = this.ev(ex.l, sc), r = this.ev(ex.r, sc); ok = this.compare(ex.op, l, r, ex.opPos);
          if (!ok) detail = ' — à esquerda deu ' + display(l, true) + ', à direita ' + display(r, true);
        } else {
          ok = this.ev(ex, sc);
          if (typeof ok !== 'boolean') throw new CordelError('`confira` espera algo verdadeiro ou falso, como: confira x == 10', ex.s);
        }
        if (!ok) {
          const msg = 'confira falhou: ' + this.trecho(ex.s, ex.e) + detail;
          if (this.inTest) throw new TestFail(msg, st.s);
          throw new CordelError(msg.charAt(0).toUpperCase() + msg.slice(1), st.s);
        }
        return;
      }
      case 'Try': {
        const depth = this.depth, fnDepth = this.fnDepth, loops = this.loops;
        try { return this.execBlock(st.body, new Scope(sc)); }
        catch (e) {
          if (!(e instanceof CordelError) || e.fatal) throw e;
          this.depth = depth; this.fnDepth = fnDepth; this.loops = loops;
          const s2 = new Scope(sc); if (st.k) s2.vars.set(st.k, { name: st.name, value: e.message, mutable: false });
          return this.execBlock(st.handler, s2);
        }
      }
      case 'Throw': { const v = this.ev(st.value, sc); throw new CordelError(display(v, false), st.s); }
      case 'Use': {
        if (!sc.raiz) throw new CordelError('`use` fica no nível principal do programa, fora de blocos e funções.', st.s, 'Coloque os use no começo do programa.');
        const mod = this.carregarModulo(st.nome, st.nomePos);
        if (st.alias) {
          if (sc.vars.has(st.alias.k)) throw new CordelError('Já existe `' + st.alias.name + '` aqui.', st.s, 'Escolha outro nome depois de `como`.');
          const m = new Map(); for (const [k, b] of mod.exports) m.set(k, { name: b.name, v: b.value });
          sc.vars.set(st.alias.k, { name: st.alias.name, value: new Reg(m), mutable: false, origem: mod.nome });
          return;
        }
        for (const [k, b] of mod.exports) {
          const ja = sc.vars.get(k);
          if (ja && ja.origem !== mod.nome) throw new CordelError('`' + b.name + '` já existe neste programa, e o módulo "' + mod.nome + '" também tem um.', st.s, 'Para usar os dois, dê um nome ao módulo: use "' + mod.nome + '" como ' + nomeDeModulo(mod.nome) + ' (e depois ' + nomeDeModulo(mod.nome) + '.' + b.name + ').');
          sc.vars.set(k, { name: b.name, value: b.value, mutable: false, origem: mod.nome });
        }
        return;
      }
      case 'Tela': {
        if (this.carregando) return;
        if (this.ui) throw new CordelError('Uma tela não pode ficar dentro de outra.', st.s);
        if (this.telaDef) throw new CordelError('Este programa já tem uma tela.', st.s, 'Cada programa tem uma tela só. Para ter várias telas, crie páginas dentro dela: página "Detalhes" … fim, e num botão use vá para "Detalhes".');
        this.telaDef = { st, scope: sc }; return;
      }
      case 'UI': {
        const k = st.kind;
        // fora da tela, título e subtítulo organizam a saída (e o relatório em PDF) em seções
        if (!this.ui && (k === 'titulo' || k === 'subtitulo')) {
          if (this.carregando) return;
          this.out.push({ kind: 'titulo', nivel: k === 'titulo' ? 1 : 2, text: display(this.ev(st.args[0], sc), false) });
          return;
        }
        this.uiNeed(st);
        if (k === 'cor') { this.ui.root.cor = corDe(this.ev(st.args[0], sc), st.args[0].s); return; }
        if (k === 'espaco') { this.uiAdd({ t: 'espaco' }); return; }
        if (k === 'abas') { this.ui.root.abas = true; return; }
        if (k === 'link') {
          const text = display(this.ev(st.args[0], sc), false), href = this.ev(st.args[1], sc);
          if (typeof href !== 'string' || !/^(https?:\/\/|mailto:|tel:)/i.test(href.trim())) throw new CordelError('O endereço do link precisa começar com https://', st.args[1].s, 'Exemplo: link "Site" para "https://exemplo.com.br"');
          this.uiAdd({ t: 'link', text, href: href.trim() }); return;
        }
        this.uiAdd({ t: k, text: display(this.ev(st.args[0], sc), false) }); return;
      }
      case 'UIPage': {
        this.uiNeed(st);
        const nome = display(this.ev(st.name, sc), false);
        if (this.ui.stack.length > 1) throw new CordelError('Uma `página` fica direto dentro da tela, não dentro de outro bloco.', st.s);
        if (this.ui.paginas.some(x => norm(x) === norm(nome))) throw new CordelError('Já existe uma página chamada "' + nome + '".', st.s);
        this.ui.paginas.push(nome);
        if (this.pagina === null) this.pagina = nome;
        if (norm(nome) !== norm(this.pagina)) return;
        this.ui.achou = true;
        return this.execBlock(st.body, new Scope(sc));
      }
      case 'Nav': {
        if (!this.telaDef) throw new CordelError('`vá para` só funciona em programas com tela.', st.s);
        if (this.ui) throw new CordelError('`vá para` só funciona dentro de um botão.', st.s, 'Exemplo: botão "Detalhes" / vá para "Detalhes" / fim');
        const nome = display(this.ev(st.alvo, sc), false);
        const alvo = this.paginas.find(x => norm(x) === norm(nome));
        if (!alvo) { const sug = suggest(nome, this.paginas); throw new CordelError('Não existe a página "' + nome + '".', st.alvo.s, sug ? 'Você quis dizer "' + sug + '"?' : (this.paginas.length ? 'Páginas: ' + this.paginas.join(', ') : 'Crie páginas dentro da tela: página "' + nome + '" … fim')); }
        if (norm(alvo) !== norm(this.pagina || '')) { this.historico.push(this.pagina); this.pagina = alvo; }
        return;
      }
      case 'Back': {
        if (!this.telaDef) throw new CordelError('`volte` só funciona em programas com tela.', st.s);
        if (this.ui) throw new CordelError('`volte` só funciona dentro de um botão.', st.s);
        this.voltar(); return;
      }
      case 'Chart': {
        if (this.carregando && !this.ui) return;
        const g = this.montarGrafico(st, sc);
        if (this.ui) this.uiAdd(Object.assign({ t: 'grafico' }, g));
        else this.out.push(Object.assign({ kind: 'chart' }, g));
        return;
      }
      case 'UIBox': {
        this.uiNeed(st);
        const node = { t: st.kind, kids: [] }; this.uiAdd(node); this.ui.stack.push(node);
        try { return this.execBlock(st.body, new Scope(sc)); } finally { this.ui.stack.pop(); }
      }
      case 'UIButton': {
        this.uiNeed(st);
        const id = this.ui.next++; this.ui.handlers.set(id, { kind: 'botao', body: st.body, scope: sc });
        this.uiAdd({ t: 'botao', text: display(this.ev(st.label, sc), false), id }); return;
      }
      case 'UIBind': {
        this.uiNeed(st);
        const label = display(this.ev(st.label, sc), false);
        const cur = this.ev(st.target, sc);
        this.checkMutable(st.target, sc);
        const id = this.ui.next++;
        if (st.kind === 'marque') {
          if (typeof cur !== 'boolean') throw new CordelError('`marque` guarda verdadeiro ou falso, mas aqui há ' + ARTIGO[typeName(cur)] + '.', st.target.s, 'Crie assim, antes da tela: var aceito = falso');
          this.ui.handlers.set(id, { kind: 'bind', target: st.target, scope: sc, tipo: 'logico' });
          this.uiAdd({ t: 'marque', label, value: cur, id }); return;
        }
        if (st.kind === 'seletor') {
          const ops = this.ev(st.options, sc);
          if (!Array.isArray(ops) || !ops.length) throw new CordelError('As opções do `seletor` precisam ser uma lista com pelo menos um item.', st.options.s, 'Exemplo: seletor "Filial" em filial de ["Crato", "Iguatu"]');
          this.ui.handlers.set(id, { kind: 'bind', target: st.target, scope: sc, tipo: 'opcao', opcoes: ops });
          this.uiAdd({ t: 'seletor', label, value: ops.findIndex(o => equals(o, cur)), options: ops.map(o => display(o, false)), id }); return;
        }
        if (cur instanceof Data) {
          const tipo = cur.temHora ? 'datahora' : 'data';
          this.ui.handlers.set(id, { kind: 'bind', target: st.target, scope: sc, tipo });
          this.uiAdd({ t: 'campo', label, value: cur.temHora ? cur.iso().slice(0, cur.seg % 60 ? 19 : 16) : cur.iso(), tipo, id }); return;
        }
        if (!(cur instanceof Num) && typeof cur !== 'string') throw new CordelError('`campo` guarda um texto, um número ou uma data, mas aqui há ' + ARTIGO[typeName(cur)] + '.', st.target.s, 'Crie assim, antes da tela: var nome = "", var preço = 0 ou var dia = hoje()');
        const num = cur instanceof Num;
        this.ui.handlers.set(id, { kind: 'bind', target: st.target, scope: sc, tipo: num ? 'numero' : 'texto' });
        this.uiAdd({ t: 'campo', label, value: num ? cur.toString() : cur, num, id }); return;
      }
    }
  }
  cond(e, sc, where) {
    const v = this.ev(e, sc);
    if (typeof v !== 'boolean') throw new CordelError('A condição do `' + where + '` precisa ser verdadeira ou falsa, mas é ' + ARTIGO[typeName(v)] + ' (' + display(v, true) + ').', e.s, 'Exemplos de condição: x > 10 · nome == "Ana" · lista.vazia');
    return v;
  }
  fixedErr(b, t) {
    if (b.origem) return new CordelError('`' + b.name + '` vem do módulo "' + b.origem + '" e não pode mudar aqui.', t.s, 'Crie um nome seu com o valor: var meu_' + b.name + ' = ' + b.name);
    return new CordelError('`' + b.name + '` é fixo e não pode mudar.', t.s, 'Se precisa que ele mude, crie com var: var ' + b.name + ' = …');
  }
  // o texto do programa (ou do módulo) entre duas posições
  trecho(a, b) {
    if (a >= MOD_BASE) { const i = Math.floor(a / MOD_BASE) - 1, f = this.fontes[i]; return f ? f.src.slice(a - MOD_BASE * (i + 1), b - MOD_BASE * (i + 1)) : ''; }
    return this.src.slice(a, b);
  }
  carregarModulo(nome, pos) {
    const achado = this.achaModulo && this.achaModulo(nome);
    if (!achado) throw new CordelError('Não achei o módulo "' + nome + '".', pos, this.achaModulo ? 'No editor, um módulo é outro programa seu em Meus programas; no computador, outro arquivo .cordel na mesma pasta.' : 'Módulos precisam de outros programas: no editor, em Meus programas; no computador, arquivos .cordel na mesma pasta.');
    const chave = norm(achado.nome);
    if (this.modCache.has(chave)) return this.modCache.get(chave);
    if (this.modPilha.some(m => m.chave === chave)) throw new CordelError('Os módulos se usam em círculo: ' + this.modPilha.map(m => m.nome).concat([achado.nome]).join(' → ') + '.', pos, 'Mova o que os dois precisam para um terceiro módulo, que ambos usam.');
    if (this.fontes.length >= 500) throw new CordelError('Módulos demais (mais de 500).', pos);
    const i = this.fontes.length; this.fontes.push({ nome: achado.nome, src: achado.src });
    const prog = new Parser(lex(achado.src, MOD_BASE * (i + 1))).parseProgram();
    const escopo = new Scope(null); escopo.raiz = true;
    this.modPilha.push({ chave, nome: achado.nome }); this.carregando++;
    const fn = this.fnDepth, lp = this.loops; this.fnDepth = 0; this.loops = 0;
    try { this.execBlock(prog.body, escopo); } finally { this.carregando--; this.modPilha.pop(); this.fnDepth = fn; this.loops = lp; }
    const exports = new Map(), privados = new Set();
    for (const [k, b] of escopo.vars) { if (b.origem) continue; if (b.name.startsWith('_')) privados.add(k); else exports.set(k, b); }
    const mod = { nome: achado.nome, exports, privados, escopo };
    this.modCache.set(chave, mod);
    return mod;
  }
  assignTo(t, v, sc) {
    if (t.type === 'Ident') {
      const b = sc.lookup(t.k);
      if (!b) throw this.unknown(t, sc);
      if (!b.mutable) throw this.fixedErr(b, t);
      b.value = v; return;
    }
    if (t.type === 'Member') {
      const base = this.ev(t.obj, sc);
      if (!(base instanceof Reg)) throw new CordelError('Só registros têm campos para alterar, e isso é ' + ARTIGO[typeName(base)] + '.', t.pos);
      return this.assignTo(t.obj, base.with(t.k, t.name, v), sc);
    }
    if (t.type === 'Index') {
      const base = this.ev(t.obj, sc); const idx = this.ev(t.idx, sc);
      if (Array.isArray(base)) { const i = this.listIndex(base, idx, t.idx.s); const c = base.slice(); c[i] = v; return this.assignTo(t.obj, c, sc); }
      if (base instanceof Reg && typeof idx === 'string') return this.assignTo(t.obj, base.with(norm(idx), idx, v), sc);
      throw new CordelError('Não dá para alterar uma posição de ' + ARTIGO[typeName(base)] + '.', t.pos);
    }
    throw new CordelError('Não dá para guardar um valor aí.', t.s);
  }
  listIndex(list, idx, p) {
    const i = needInt(idx, 'A posição', p);
    if (i === 0) throw new CordelError('No Cordel, as posições começam em 1.', p, 'O primeiro item é lista[1] (ou lista.primeiro).');
    if (i < 1 || i > list.length) throw new CordelError(list.length ? 'A lista tem ' + list.length + (list.length === 1 ? ' item' : ' itens') + '; não existe a posição ' + i + '.' : 'A lista está vazia; não existe a posição ' + i + '.', p);
    return i - 1;
  }
  unknown(t, sc) {
    const dono = [...this.modCache.values()].find(m => m.privados.has(t.k));
    if (dono) return new CordelError('`' + t.name + '` é privado do módulo "' + dono.nome + '".', t.s, 'Nomes que começam com _ só existem dentro do módulo que os criou. Tire o _ do nome lá no módulo para usar aqui.');
    const cands = [...sc.names(), ...[...this.builtins.values()].map(b => b.name), ...[...KW].map(pretty)];
    const s = suggest(t.name, cands);
    return new CordelError('`' + t.name + '` não existe aqui.', t.s, s ? 'Você quis dizer `' + s + '`?' : 'Crie antes de usar: ' + t.name + ' = … Lembre que o que é criado dentro de um bloco (se, para…) só existe até o `fim` dele.');
  }
  // Contas: o resultado guarda a origem dos dois lados.
  arith(op, l, r, p) {
    const v = this.contas(op, l, r, p);
    if ((v instanceof Num || v instanceof Data) && ((l && l.o) || (r && r.o))) v.o = junta(l.o, r.o);
    return v;
  }
  contas(op, l, r, p) {
    if (l instanceof Data || r instanceof Data) {
      const dias = (n, lado) => { if (!(n instanceof Num) || !n.isInt()) throw new CordelError('Com datas, some ou subtraia um número inteiro de dias' + (n instanceof Num ? '' : ', mas aqui há ' + ARTIGO[typeName(n)]) + '.', p, 'Exemplos: vencimento + 30 · hoje() - data("01/09/2026") dá os dias entre as duas · para horas, use momento.mais_horas(2)'); return Number(n.n); };
      if (op === '+' && l instanceof Data && !(r instanceof Data)) return l.mais(dias(r));
      if (op === '+' && r instanceof Data && !(l instanceof Data)) return r.mais(dias(l));
      if (op === '-' && l instanceof Data && r instanceof Data) return l.temHora || r.temHora ? Num.make(BigInt(l.instante - r.instante), 86400n) : Num.int(l.dias - r.dias);
      if (op === '-' && l instanceof Data) return l.mais(-dias(r));
      throw new CordelError('Com datas dá para somar ou subtrair dias, ou subtrair uma data de outra.', p, 'Exemplos: vencimento + 30 · hoje() - vencimento');
    }
    if (op === '+') {
      if (l instanceof Num && r instanceof Num) return l.add(r);
      if (typeof l === 'string' && typeof r === 'string') return l + r;
      if (Array.isArray(l) && Array.isArray(r)) return l.concat(r);
      if (typeof l === 'string' || typeof r === 'string') throw new CordelError('Não dá para somar ' + ARTIGO[typeName(l)] + ' com ' + ARTIGO[typeName(r)] + '.', p, 'Para montar um texto com valores, use chaves: "Total: {x}"');
      throw new CordelError('Não dá para somar ' + ARTIGO[typeName(l)] + ' com ' + ARTIGO[typeName(r)] + '.', p);
    }
    const names = { '-': 'subtrair', '*': 'multiplicar', '/': 'dividir', '%': 'calcular o resto com', '^': 'calcular a potência com' };
    if (!(l instanceof Num) || !(r instanceof Num)) throw new CordelError('Só dá para ' + names[op] + ' números, mas aqui há ' + ARTIGO[typeName(l instanceof Num ? r : l)] + '.', p, typeof l === 'string' || typeof r === 'string' ? 'Se o texto contém um número, converta antes: número("42")' : undefined);
    switch (op) {
      case '-': return l.sub(r);
      case '*': return l.mul(r);
      case '/': if (r.isZero()) throw new CordelError('Divisão por zero.', p, 'Confira se o divisor é zero antes de dividir.'); return l.div(r);
      case '%': if (r.isZero()) throw new CordelError('Resto de divisão por zero.', p); return l.mod(r);
      case '^': {
        if (r.isInt() && (r.n > 100000n || r.n < -100000n)) throw new CordelError('Expoente grande demais.', p);
        if (r.isInt()) { if (r.n < 0n && l.isZero()) throw new CordelError('Divisão por zero.', p); const e = r.n < 0n ? -r.n : r.n; return r.n >= 0n ? Num.make(l.n ** e, l.d ** e) : Num.make(l.d ** e, l.n ** e); }
        if (l.n < 0n) throw new CordelError('Potência fracionária de número negativo não é um número real.', p);
        return Num.fromFloat(Math.pow(l.toFloat(), r.toFloat())).round(12);
      }
    }
  }
  compare(op, l, r, p) {
    if (op === '==') return equals(l, r);
    if (op === '!=') return !equals(l, r);
    const c = cmpVals(l, r, p);
    return op === '<' ? c < 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : c >= 0;
  }
  eval(e, sc) {
    this.tick(e.s);
    switch (e.type) {
      case 'Lit': return e.v;
      case 'Tpl': return e.parts.map(p => typeof p === 'string' ? p : display(this.ev(p, sc), false)).join('');
      case 'Ident': {
        const b = sc.lookup(e.k); if (b) return b.value;
        const bi = this.builtins.get(e.k); if (bi) return bi;
        throw this.unknown(e, sc);
      }
      case 'List': return e.items.map(x => this.ev(x, sc));
      case 'Rec': {
        // Um registro montado a partir de outros guarda a origem de tudo o que entrou nele, até de textos.
        const m = new Map(), antes = COLETOR, col = []; COLETOR = col;
        try { for (const en of e.entries) m.set(norm(en.name), { name: en.name, v: this.ev(en.value, sc) }); }
        finally { COLETOR = antes; }
        const r = new Reg(m);
        if (col.length) { r.o = junta({ p: col }, { l: [...m.values()].map(x => x.v) }); if (antes !== null) antes.push(r.o); }
        return r;
      }
      case 'Lambda': return new Fn({ name: '(anônima)', params: e.params, expr: e.body, closure: sc });
      case 'Neg': { const v = this.ev(e.x, sc); if (!(v instanceof Num)) throw new CordelError('O sinal de menos só funciona com números.', e.s); const r = v.neg(); r.o = v.o; return r; }
      case 'Not': { const v = this.ev(e.x, sc); if (typeof v !== 'boolean') throw new CordelError('`não` funciona com verdadeiro ou falso, mas recebeu ' + ARTIGO[typeName(v)] + '.', e.s); return !v; }
      case 'Logic': {
        const l = this.ev(e.l, sc);
        if (typeof l !== 'boolean') throw new CordelError('`' + e.op + '` junta condições (verdadeiro/falso), mas à esquerda há ' + ARTIGO[typeName(l)] + '.', e.l.s, 'Exemplo: idade >= 18 e idade < 65');
        if (e.op === 'e' && !l) return false; if (e.op === 'ou' && l) return true;
        const r = this.ev(e.r, sc);
        if (typeof r !== 'boolean') throw new CordelError('`' + e.op + '` junta condições (verdadeiro/falso), mas à direita há ' + ARTIGO[typeName(r)] + '.', e.r.s, 'Exemplo: idade >= 18 e idade < 65');
        return r;
      }
      case 'Bin': {
        const l = this.ev(e.l, sc), r = this.ev(e.r, sc);
        if (['==', '!=', '<', '>', '<=', '>='].includes(e.op)) return this.compare(e.op, l, r, e.opPos);
        return this.arith(e.op, l, r, e.opPos);
      }
      case 'Chain': {
        let l = this.ev(e.items[0], sc);
        for (let i = 0; i < e.ops.length; i++) { const r = this.ev(e.items[i + 1], sc); if (!this.compare(e.ops[i], l, r, e.opPos[i])) return false; l = r; }
        return true;
      }
      case 'Member': {
        const obj = this.ev(e.obj, sc);
        if (obj instanceof Reg) { const v = obj.get(e.k); if (v !== undefined) { if (COLETOR !== null && obj.o) COLETOR.push(obj.o); return v; } }
        return this.callMethod(e, obj, [], sc, true);
      }
      case 'Index': {
        const obj = this.ev(e.obj, sc), idx = this.ev(e.idx, sc);
        if (Array.isArray(obj)) return obj[this.listIndex(obj, idx, e.idx.s)];
        if (typeof obj === 'string') { const ch = [...obj]; return ch[this.listIndex(ch, idx, e.idx.s)]; }
        if (obj instanceof Reg && typeof idx === 'string') { const v = obj.get(norm(idx)); if (v === undefined) throw this.noField(obj, idx, e.idx.s); if (COLETOR !== null && obj.o) COLETOR.push(obj.o); return v; }
        throw new CordelError('Não dá para pegar uma posição de ' + ARTIGO[typeName(obj)] + '.', e.pos);
      }
      case 'Call': {
        if (e.callee.type === 'Member') {
          const obj = this.ev(e.callee.obj, sc);
          if (obj instanceof Reg) { const f = obj.get(e.callee.k); if (f !== undefined) return this.call(f, e.args.map(a => this.ev(a, sc)), e.pos, e.callee.name); }
          return this.callMethod(e.callee, obj, e.args.map(a => this.ev(a, sc)), sc, false);
        }
        const f = this.ev(e.callee, sc);
        if (!(f instanceof Fn || f instanceof Builtin)) {
          let dica;
          if (e.callee.type === 'Ident' && this.builtins.has(e.callee.k)) dica = 'Você criou uma variável com o mesmo nome da função `' + this.builtins.get(e.callee.k).name + '`. Dê outro nome à variável.';
          throw new CordelError((e.callee.type === 'Ident' ? '`' + e.callee.name + '`' : 'Isso') + ' é ' + ARTIGO[typeName(f)] + ', não uma função.', e.callee.s, dica);
        }
        return this.call(f, e.args.map(a => this.ev(a, sc)), e.pos, e.callee.type === 'Ident' ? e.callee.name : null);
      }
    }
    throw new Error('nó desconhecido ' + e.type);
  }
  noField(obj, name, p) {
    const s = suggest(name, obj.names());
    return new CordelError('Esse registro não tem o campo `' + name + '`.', p, s ? 'Você quis dizer `' + s + '`?' : 'Campos disponíveis: ' + (obj.names().join(', ') || '(nenhum)'));
  }
  callMethod(m, obj, args, sc, bare) {
    const [tbl, label] = methodsFor(obj);
    const def = tbl.get(m.k);
    if (!def) {
      if (obj instanceof Reg) throw this.noField(obj, m.name, m.pos);
      const s = suggest(m.name, methodNames(tbl));
      throw new CordelError(label + ' não têm `' + m.name + '`.', m.pos, s ? 'Você quis dizer `' + s + '`?' : (tbl.size ? 'Disponíveis: ' + methodNames(tbl).join(', ') : undefined));
    }
    if (bare && def.min > 0) throw new CordelError('`' + def.name + '` precisa de valores entre parênteses.', m.pos, 'Exemplo: .' + def.name + '(…)');
    if (args.length < def.min || args.length > def.max) throw new CordelError('`' + def.name + '` espera ' + (def.min === def.max ? def.min : def.min + ' a ' + def.max) + (def.max === 1 ? ' valor' : ' valores') + ', mas recebeu ' + args.length + '.', m.pos);
    const r = def.fn(this, obj, args, m.pos);
    if (def.mut) { this.assignTo(m.obj, r, sc); return VAZIO; }
    // Números e datas: o resultado de uma ação guarda a origem (um texto, como .dinheiro, entra na origem do mostre).
    if ((obj instanceof Num || obj instanceof Data) && r !== obj) {
      if ((r instanceof Num || r instanceof Data) && !r.o) { let o = obj.o; for (const x of args) if (x && x.o) o = junta(o, x.o); r.o = o; }
      else if (typeof r === 'string') anota(obj);
    }
    return r;
  }
  // Funções chamadas por ações de lista (filtre, soma…): o que elas leem não entra na origem do que está
  // sendo mostrado; conta só o resultado (a soma guarda a origem dos itens somados).
  cb(f, args, p) {
    const c = COLETOR; if (c === null) return this.call(f, args, p);
    COLETOR = null; try { return this.call(f, args, p); } finally { COLETOR = c; }
  }
  call(f, args, p, name) {
    if (f instanceof Builtin) {
      if (args.length < f.min || args.length > f.max) throw new CordelError('`' + f.name + '` espera ' + (f.min === f.max ? f.min : f.min + ' a ' + f.max) + (f.max === 1 ? ' valor' : ' valores') + ', mas recebeu ' + args.length + '.', p);
      return f.fn(args, p);
    }
    if (!(f instanceof Fn)) throw new CordelError((name ? '`' + name + '`' : 'Isso') + ' não é uma função.', p);
    if (args.length !== f.params.length) {
      const fn = f.name === '(anônima)' ? 'A função' : '`' + f.name + '`';
      throw new CordelError(fn + ' espera ' + f.params.length + (f.params.length === 1 ? ' valor' : ' valores') + ', mas recebeu ' + args.length + '.', p);
    }
    if (this.depth >= MAX_DEPTH) throw new CordelError('A função `' + f.name + '` chamou a si mesma vezes demais.', p, 'Confira se a recursão tem um caso de parada.', true);
    const sc = new Scope(f.closure);
    f.params.forEach((q, i) => sc.vars.set(q.k, { name: q.name, value: args[i], mutable: false }));
    this.depth++; const savedLoops = this.loops; this.loops = 0;
    try {
      const rastrear = this.rastro !== null && f.pos !== undefined;
      const chamada = rastrear ? f.name + '(' + f.params.map((q, i) => curto(args[i], 25)).join(', ') + ')' : '';
      if (f.expr) {
        const v = this.ev(f.expr, sc);
        if (rastrear) this.passo(f.pos, sc, chamada + ' = ' + curto(v, 50));
        return v;
      }
      if (rastrear) this.passo(f.pos, sc, 'entra em ' + chamada);
      this.fnDepth++;
      let r;
      try { r = this.execBlock(f.body, sc); } finally { this.fnDepth--; }
      return r instanceof Ret ? r.v : VAZIO;
    } finally { this.depth--; this.loops = savedLoops; }
  }
}

function lineCol(src, pos) {
  pos = Math.max(0, Math.min(pos == null ? 0 : pos, src.length));
  const before = src.slice(0, pos); const line = before.split('\n').length;
  const ls = before.lastIndexOf('\n') + 1; let le = src.indexOf('\n', pos); if (le < 0) le = src.length;
  return { line, col: pos - ls + 1, lineText: src.slice(ls, le) };
}
// Onde está uma posição: no programa ou num dos módulos (cada módulo tem sua faixa de posições).
function ondeEsta(pos, src, fontes) {
  if (pos != null && pos >= MOD_BASE && fontes) {
    const i = Math.floor(pos / MOD_BASE) - 1, f = fontes[i];
    if (f) return Object.assign(lineCol(f.src, pos - MOD_BASE * (i + 1)), { arquivo: f.nome });
  }
  return lineCol(src, pos);
}
function errInfo(e, src, fontes) {
  if (e instanceof CordelError) return Object.assign({ msg: e.message, dica: e.dica || null }, ondeEsta(e.pos, src, fontes));
  if (e instanceof RangeError) return Object.assign({ msg: 'O programa se aprofundou demais (recursão muito funda).', dica: 'Confira se a função recursiva tem um caso de parada.' }, lineCol(src, 0));
  return { msg: 'Erro interno do interpretador: ' + (e && e.message), line: 1, col: 1, lineText: '' };
}
// ───────── internet ─────────
const pareceJSON = r => /json/i.test(r.tipo || '') || /^\s*[[{]/.test(r.texto || '');
// Converte a resposta de busque: JSON vira registros, listas, números exatos e textos; o resto vira texto.
function respostaParaValor(r, p, fonte) { return pareceJSON(r) ? jsonParaValor(r.texto, p, fonte) : r.texto; }
// "https://brasilapi.com.br/api/cnpj/v1/…?x=1" → "brasilapi.com.br/api/cnpj/v1/…" (para mostrar de onde veio)
function enderecoCurto(url) { const s = url.replace(/^https?:\/\//i, '').replace(/[?#].*$/, ''); return s.length > 60 ? s.slice(0, 59) + '…' : s; }
// Leitor de JSON que guarda os números exatamente como vieram (sem arredondar em ponto flutuante).
// Com uma fonte, cada número guarda o caminho de onde veio, como qsa[2].valor.
function jsonParaValor(texto, p, fonte) {
  let i = 0; const n = texto.length;
  const falha = () => { throw new CordelError('A resposta não é um JSON válido (perto da posição ' + (i + 1) + ').', p, 'Se o site devolve texto, busque devolve o texto como está.'); };
  const espaco = () => { while (i < n && ' \t\r\n'.includes(texto[i])) i++; };
  function valor(prof, cam) {
    if (prof > 200) falha();
    espaco(); const c = texto[i];
    if (c === '{') {
      i++; const m = new Map(); espaco();
      if (texto[i] === '}') { i++; return new Reg(m); }
      for (;;) {
        espaco(); if (texto[i] !== '"') falha();
        const nome = cadeia(); espaco(); if (texto[i] !== ':') falha(); i++;
        const v = valor(prof + 1, fonte ? (cam ? cam + '.' : '') + nome : '');
        let k = norm(nome); if (m.has(k)) { let j = 2; while (m.has(k + '_' + j)) j++; k = k + '_' + j; }
        m.set(k, { name: nome, v }); espaco();
        if (texto[i] === ',') { i++; continue; } if (texto[i] === '}') { i++; return new Reg(m); } falha();
      }
    }
    if (c === '[') {
      i++; const l = []; espaco();
      if (texto[i] === ']') { i++; return l; }
      for (;;) { l.push(valor(prof + 1, fonte ? cam + '[' + (l.length + 1) + ']' : '')); espaco(); if (texto[i] === ',') { i++; continue; } if (texto[i] === ']') { i++; return l; } falha(); }
    }
    if (c === '"') return cadeia();
    if (texto.startsWith('true', i)) { i += 4; return true; }
    if (texto.startsWith('false', i)) { i += 5; return false; }
    if (texto.startsWith('null', i)) { i += 4; return ''; }
    const m = /^-?(\d+)(\.\d+)?([eE][-+]?\d+)?/.exec(texto.slice(i, i + 400));
    if (!m) falha();
    i += m[0].length;
    const [mant, exp] = m[0].split(/[eE]/); let v = Num.parse(mant);
    if (exp) { const e = parseInt(exp, 10); if (Math.abs(e) > 400) falha(); const pot = 10n ** BigInt(Math.abs(e)); v = e >= 0 ? Num.make(v.n * pot, v.d) : Num.make(v.n, v.d * pot); }
    if (fonte) v.o = { f: fonte, c: cam || 'valor' };
    return v;
  }
  function cadeia() {
    i++; let out = '';
    for (;;) {
      if (i >= n) falha();
      const c = texto[i++];
      if (c === '"') return out;
      if (c === '\\') {
        const e = texto[i++];
        if (e === 'u') { out += String.fromCharCode(parseInt(texto.slice(i, i + 4), 16)); i += 4; }
        else out += { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f' }[e] || e;
      } else out += c;
    }
  }
  const v = valor(0, ''); espaco(); if (i < n) falha();
  return v;
}

// ───────── módulos ─────────
const MOD_BASE = 1e9; // posições no código de um módulo começam em MOD_BASE × (número do módulo)
// modulos pode ser um objeto { "regras": "código…" } ou uma função nome → código (ou { nome, src }) ou null.
function criarResolvedor(m) {
  if (!m) return null;
  const tira = n => String(n).trim().replace(/\.cordel$/i, '');
  if (typeof m === 'function') return nome => { const r = m(nome); if (r == null) return null; return typeof r === 'string' ? { nome: tira(nome), src: r } : { nome: tira(r.nome || nome), src: r.src }; };
  const entradas = Object.entries(m);
  return nome => { const k = norm(tira(nome)); const e = entradas.find(([n]) => norm(tira(n)) === k); return e ? { nome: tira(e[0]), src: e[1] } : null; };
}
// Um nome de variável a partir do nome de um módulo: "Regras da auditoria" → regras_da_auditoria
function nomeDeModulo(n) { return (norm(n).replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'modulo').replace(/^(\d)/, 'm_$1'); }
// Os use "…" de um programa (só os do nível principal), sem rodar nada.
function usosDe(src) {
  let prog; try { prog = new Parser(lex(src)).parseProgram(); } catch (e) { return []; }
  return prog.body.filter(st => st.type === 'Use');
}
// Todos os módulos que um programa usa, direta ou indiretamente: { nome: código }.
function modulosUsados(src, modulos) {
  const achar = criarResolvedor(modulos), out = {}, vistos = new Set();
  const visitar = s => {
    for (const u of usosDe(s)) {
      const a = achar && achar(u.nome); if (!a) continue;
      const k = norm(a.nome); if (vistos.has(k)) continue;
      vistos.add(k); out[a.nome] = a.src; visitar(a.src);
    }
  };
  visitar(src);
  return out;
}
// start: roda o programa e, se ele tiver tela, mantém o estado vivo para os eventos.
function start(src, opts) {
  opts = opts || {};
  const I = new Interp(src, opts);
  const res = { out: I.out, error: null, ask: null, tests: null, files: I.saved, ui: null };
  const t0 = Date.now();
  try {
    const prog = new Parser(lex(src)).parseProgram();
    I.runProgram(prog);
    if (I.tests.length) res.tests = I.runTests();
    res.ui = I.renderTela();
  } catch (e) {
    if (e instanceof AskSig) res.ask = e.prompt; else if (e instanceof BuscaSig) res.busca = e.pedido; else res.error = errInfo(e, src, I.fontes);
  }
  if (res.tests) res.tests.forEach(t => { if (t.pos != null) { const o = ondeEsta(t.pos, src, I.fontes); t.line = o.line; if (o.arquivo) t.arquivo = o.arquivo; } });
  res.out = I.out; res.files = I.saved; res.ms = Date.now() - t0;
  if (I.rastro) {
    const inicios = [0]; for (let i = 0; i < src.length; i++) if (src[i] === '\n') inicios.push(i + 1);
    const linhaDe = pos => { let lo = 0, hi = inicios.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (inicios[m] <= pos) lo = m; else hi = m - 1; } return lo + 1; };
    const ult = I.rastro.length ? I.rastro[I.rastro.length - 1].vars : [];
    if (res.error) I.rastro.push({ pos: null, linha: res.error.line, nota: 'erro: ' + res.error.msg, vars: ult, out: I.out.length, erro: true });
    else if (res.ask !== null) I.rastro.push({ pos: null, linha: null, nota: 'esperando a resposta de pergunte', vars: ult, out: I.out.length });
    else I.rastro.push({ pos: null, linha: null, nota: 'fim do programa', vars: ult, out: I.out.length });
    res.rastro = I.rastro.map(p => ({ linha: p.linha !== undefined ? p.linha : p.pos == null ? null : linhaDe(p.pos), nota: p.nota, vars: p.vars, out: p.out, erro: !!p.erro }));
    res.rastroCortado = I.rastroCortado;
  }
  return {
    res,
    temTela: !!I.telaDef,
    event(id, value) {
      const t1 = Date.now();
      I.out = []; I.steps = 0;
      const r = { out: null, error: null, ui: null, files: null, changed: false };
      const foto = I.fotografar(), handlers = I.handlers, paginas = I.paginas;
      I.pendentes = I.storage ? new Map() : null;
      try {
        try {
          if (id === 'voltar') { I.voltar(); r.changed = true; }
          else if (id === 'ir') { I.irPara(value); r.changed = true; }
          else r.changed = I.event(id, value);
        } catch (e) { if (e instanceof BuscaSig) throw e; r.error = errInfo(e, src, I.fontes); }
        try { r.ui = I.renderTela(); } catch (e) { if (e instanceof BuscaSig) throw e; if (!r.error) r.error = errInfo(e, src, I.fontes); }
      } catch (e) {
        if (!(e instanceof BuscaSig)) throw e;
        // O toque precisa de uma resposta da internet: tudo o que ele mudou é desfeito, e o anfitrião
        // repete o mesmo toque quando a resposta chegar (com lembrar), sem travar a tela.
        I.restaurar(foto); I.handlers = handlers; I.paginas = paginas; I.pendentes = null;
        return { out: [], error: null, ui: null, files: I.saved, changed: false, busca: e.pedido, ms: Date.now() - t1 };
      }
      if (I.pendentes) { for (const [k, v] of I.pendentes) { try { I.storage.set(k, v); } catch (e) { /* sem memória */ } } I.pendentes = null; }
      r.out = I.out; r.files = I.saved; r.ms = Date.now() - t1;
      return r;
    },
    // Guarda a resposta de uma busca feita pelo anfitrião, para repetir o toque que a pediu.
    lembrar(chave, resposta) { I.rede.set(chave, resposta); },
  };
}
function run(src, opts) { return start(src, opts).res; }

// ───────── formatador oficial ─────────
const FORMA_OFICIAL = { senao: 'senão', funcao: 'função', nao: 'não' };
const ABRE_KW = new Set(['se', 'enquanto', 'para', 'repita', 'escolha', 'teste', 'tente', 'tela']);
const OPS_BIN = new Set(['=', '==', '!=', '<', '>', '<=', '>=', '+=', '-=', '*=', '/=', '=>', '+', '-', '*', '/', '%', '^']);
const CTX_EXPR = new Set(['de', 'ate', 'passo', 'em', 'entao', 'faca', 'para', 'por', 'va']);
const CTX_OFICIAL = { entao: 'então', faca: 'faça', ate: 'até', va: 'vá' };
const ABRE_P = ['(', '[', '{'], FECHA_P = [')', ']', '}'];
function fichasDaLinha(linha) {
  const out = []; let i = 0; const n = linha.length;
  while (i < n) {
    const c = linha[i];
    if (c === ' ' || c === '\t' || c === '\r' || c === '\u00a0') { i++; continue; }
    if (c === '#') { out.push({ t: 'com', v: linha.slice(i).replace(/\s+$/, '') }); break; }
    if (DQ.has(c) || SQ.has(c)) {
      const fecha = DQ.has(c) ? DQ : SQ; let j = i + 1, fechou = false;
      while (j < n) {
        const ch = linha[j];
        if (ch === '\\') { j += 2; continue; }
        if (ch === '{') { let k = j + 1, d = 1; while (k < n) { if (linha[k] === '{') d++; else if (linha[k] === '}') { d--; if (!d) break; } k++; } j = k + 1; continue; }
        j++; if (fecha.has(ch)) { fechou = true; break; }
      }
      let v = linha.slice(i, j);
      if (fechou && !DQ.has('"') === false && (c !== '"' || v[v.length - 1] !== '"')) {
        const miolo = v.slice(1, -1);
        if (!miolo.includes('"') && DQ.has(c)) v = '"' + miolo + '"';
      }
      out.push({ t: 'str', v }); i = j; continue;
    }
    if (c >= '0' && c <= '9') { let j = i; while (j < n && (/[0-9_]/.test(linha[j]) || (linha[j] === '.' && /[0-9]/.test(linha[j + 1] || '')))) j++; out.push({ t: 'num', v: linha.slice(i, j) }); i = j; continue; }
    if (idStart(c)) {
      let j = i; while (j < n && idPart(linha[j])) j++;
      const v = linha.slice(i, j), k = norm(v);
      if (v === 'é' || v === 'É') out.push({ t: 'op', v: 'é' });
      else if (KW.has(k)) out.push({ t: 'kw', v: FORMA_OFICIAL[k] || k, k });
      else out.push({ t: 'id', v, k });
      i = j; continue;
    }
    const dois = linha.substr(i, 2);
    if (['==', '!=', '<=', '>=', '=>', '+=', '-=', '*=', '/='].includes(dois)) { out.push({ t: 'op', v: dois }); i += 2; continue; }
    out.push({ t: 'op', v: OPMAP[c] || c }); i++;
  }
  return out;
}
function juntarFichas(f) {
  // fim de expressão: o que pode vir logo antes de uma palavra de contexto (de, em, até, passo, por…)
  const fimExpr = x => !!x && ((x.t === 'id' && !CTX_EXPR.has(x.k)) || x.t === 'num' || x.t === 'str' || (x.t === 'kw' && (x.k === 'verdadeiro' || x.k === 'falso')) || (x.t === 'op' && FECHA_P.includes(x.v)));
  // a palavra está sendo usada como contexto (e não como nome de variável)?
  const ehCtx = j => {
    const x = f[j]; if (!x || x.t !== 'id' || !CTX_EXPR.has(x.k)) return false;
    if (x.k === 'va') return !!f[j + 1] && f[j + 1].t === 'kw' && f[j + 1].k === 'para';
    return j > 0 && fimExpr(f[j - 1]);
  };
  // depois disto, + e - são sinais (unários): -1, [1, -2], passo -1
  const pedeOperando = j => { const x = f[j]; if (!x) return true; return (x.t === 'op' && x.v !== '.' && !FECHA_P.includes(x.v)) || (x.t === 'kw' && x.k !== 'verdadeiro' && x.k !== 'falso') || ehCtx(j); };
  const valor = j => (f[j].t === 'id' && CTX_OFICIAL[f[j].k] && ehCtx(j) ? CTX_OFICIAL[f[j].k] : f[j].v);
  let s = '';
  for (let i = 0; i < f.length; i++) {
    const t = f[i], a = f[i - 1];
    if (!a) { s += valor(i); continue; }
    let esp = ' ';
    if (t.t === 'com') esp = '  ';
    else if (a.t === 'op' && a.v === '.') esp = '';
    else if (t.t === 'op' && t.v === '.') esp = '';
    else if (t.t === 'op' && [',', ':', ';'].includes(t.v)) esp = '';
    else if (t.t === 'op' && FECHA_P.includes(t.v)) esp = '';
    else if (a.t === 'op' && ABRE_P.includes(a.v)) esp = '';
    else if (t.t === 'op' && (t.v === '(' || t.v === '[') && (a.t === 'id' ? !ehCtx(i - 1) : a.t === 'str' || (a.t === 'op' && (a.v === ')' || a.v === ']')))) esp = '';
    else if (a.t === 'op' && (a.v === '-' || a.v === '+') && pedeOperando(i - 2)) esp = '';
    s += esp + valor(i);
  }
  return s;
}
function formatar(src) {
  const linhas = src.replace(/\r\n?/g, '\n').split('\n');
  const out = []; // { texto, com }: o código já recuado e o comentário no fim da linha
  const pilha = []; // blocos abertos
  const abertos = []; // parênteses, colchetes e chaves abertos: o recuo da linha que abriu cada um
  let brancos = 0;
  for (const bruta of linhas) {
    const f = fichasDaLinha(bruta);
    if (!f.length) { if (!abertos.length) { brancos++; continue; } out.push({ texto: '', com: null }); continue; }
    if (!abertos.length && brancos && out.length) out.push({ texto: '', com: null });
    brancos = 0;
    const com = f.length > 1 && f[f.length - 1].t === 'com' ? f.pop().v : null;
    let recuo;
    if (abertos.length) {
      // continuação: um nível além da linha que abriu; quem começa fechando volta ao nível dela
      const fechaPrimeiro = f[0].t === 'op' && FECHA_P.includes(f[0].v);
      recuo = abertos[abertos.length - 1] + (fechaPrimeiro ? 0 : 1);
    } else {
      const p0 = f[0], k0 = p0.t === 'kw' ? p0.k : p0.t === 'id' ? p0.k : '';
      const topo = () => pilha[pilha.length - 1];
      const ultimo = f[f.length - 1];
      const umaLinha = f.length > 1 && ultimo.t === 'kw' && ultimo.k === 'fim';
      if (p0.t === 'kw' && k0 === 'fim') { if (topo() === 'caso') pilha.pop(); pilha.pop(); recuo = pilha.length; }
      else if (p0.t === 'kw' && (k0 === 'senao' || k0 === 'falhou')) {
        if (topo() === 'caso') { pilha.pop(); recuo = pilha.length; pilha.push('caso'); }
        else recuo = Math.max(0, pilha.length - 1);
      } else if (p0.t === 'kw' && k0 === 'caso') { if (topo() === 'caso') pilha.pop(); recuo = pilha.length; pilha.push('caso'); }
      else {
        recuo = pilha.length;
        let abreBloco = false;
        const nx = f[1];
        if (p0.t === 'kw' && ABRE_KW.has(k0)) abreBloco = true;
        else if (p0.t === 'kw' && k0 === 'funcao') { let d = 0, fimParams = -1; for (let j = 0; j < f.length; j++) { if (f[j].v === '(') d++; if (f[j].v === ')') { d--; if (d === 0) { fimParams = j; break; } } } abreBloco = !(fimParams >= 0 && f[fimParams + 1] && f[fimParams + 1].v === '='); }
        else if (p0.t === 'id' && (k0 === 'cartao' || k0 === 'linha') && f.length === 1) abreBloco = true;
        else if (p0.t === 'id' && (k0 === 'botao' || k0 === 'pagina') && nx && !(nx.t === 'op' && ['=', '.', '(', '+=', '-=', '*=', '/='].includes(nx.v))) abreBloco = true;
        if (abreBloco && !umaLinha) pilha.push(k0 === 'escolha' ? 'escolha' : 'bloco');
      }
    }
    out.push({ texto: '  '.repeat(recuo) + juntarFichas(f), com });
    for (const t of f) if (t.t === 'op') { if (ABRE_P.includes(t.v)) abertos.push(recuo); else if (FECHA_P.includes(t.v) && abertos.length) abertos.pop(); }
  }
  while (out.length && out[out.length - 1].texto === '' && !out[out.length - 1].com) out.pop();
  // comentários no fim de linhas vizinhas ficam alinhados numa coluna, dois espaços depois do código mais longo
  const larg = s => [...s].length;
  for (let i = 0; i < out.length;) {
    if (!out[i].com) { i++; continue; }
    let j = i; while (j < out.length && out[j].com) j++;
    const col = Math.max(...out.slice(i, j).map(l => larg(l.texto))) + 2;
    for (let k = i; k < j; k++) out[k].texto += ' '.repeat(col - larg(out[k].texto)) + out[k].com;
    i = j;
  }
  return out.map(l => l.texto).join('\n') + '\n';
}

// ───────── verificação estática (erros e avisos sem rodar) ─────────
const MUTANTES = new Set(['adicione', 'remova', 'limpe']);
function verificar(src, opts) {
  const problemas = [];
  const add = (nivel, pos, msg, dica) => { const lc = lineCol(src, pos); problemas.push({ nivel, linha: lc.line, col: lc.col, msg, dica: dica || null }); };
  const fim = () => ({ problemas: problemas.sort((a, b) => a.linha - b.linha || (a.nivel === b.nivel ? a.col - b.col : a.nivel === 'erro' ? -1 : 1)) });
  let toks;
  try { toks = lex(src); } catch (e) { if (e instanceof CordelError) { add('erro', e.pos, e.message, e.dica); problemas[problemas.length - 1].sintaxe = true; return fim(); } throw e; }
  const P = new Parser(toks); P.erros = [];
  let prog = null;
  try { prog = P.parseProgram(); } catch (e) { if (!(e instanceof CordelError)) throw e; if (!P.erros.includes(e)) P.erros.push(e); }
  const vistos = new Set();
  for (const e of P.erros) { const k = e.pos + '|' + e.message; if (vistos.has(k)) continue; vistos.add(k); add('erro', e.pos, e.message, e.dica); problemas[problemas.length - 1].sintaxe = true; }
  if (P.erros.length || !prog) return fim();
  analisar(prog, src, add, criarResolvedor(opts && opts.modulos));
  return fim();
}
// Os nomes que um módulo oferece (funções e nomes do nível principal que não começam com _), sem rodar nada.
function exportsDe(src) {
  const prog = new Parser(lex(src)).parseProgram();
  const nomes = new Map();
  for (const st of prog.body) {
    const n = st.type === 'Func' || st.type === 'Var' ? { name: st.name, k: st.k, tipo: st.type === 'Func' ? 'função' : 'fixo' }
      : st.type === 'Assign' && st.op === '=' && st.target.type === 'Ident' ? { name: st.target.name, k: st.target.k, tipo: 'fixo' } : null;
    if (n && !n.name.startsWith('_') && !nomes.has(n.k)) nomes.set(n.k, n);
  }
  return nomes;
}
function analisar(prog, src, add, achaModulo) {
  const PRONTAS = new Map(funcoes().map(f => [norm(f.nome), f.nome]));
  const todas = [], porNome = new Map(), adiadas = [], naoAchadas = [];
  class Esc { constructor(pai) { this.pai = pai; this.m = new Map(); } busca(k) { for (let x = this; x; x = x.pai) { const b = x.m.get(k); if (b) return b; } return null; } }
  const global = new Esc(null);
  function definir(esc, k, name, pos, tipo) {
    const b = { k, name, pos, tipo, esc, leituras: 0, escritas: 0 };
    esc.m.set(k, b); todas.push(b);
    if (!porNome.has(k)) porNome.set(k, []); porNome.get(k).push(b);
    if (PRONTAS.has(k)) add('aviso', pos, '`' + name + '` esconde a função pronta ' + PRONTAS.get(k) + '().', 'Enquanto esse nome existir, ' + PRONTAS.get(k) + '(…) não funciona aqui. Use outro nome, como ' + name + '_1.');
    return b;
  }
  function ler(id, esc) {
    const b = esc.busca(id.k);
    if (b) { b.leituras++; return b; }
    if (!PRONTAS.has(id.k)) naoAchadas.push({ id, esc });
    return null;
  }
  function escrever(id, esc, onde) {
    const b = esc.busca(id.k);
    if (!b) { if (!PRONTAS.has(id.k)) naoAchadas.push({ id, esc }); return; }
    b.leituras++; b.escritas++;
    if (b.tipo !== 'var') add('erro', id.s, '`' + b.name + '` é ' + (b.tipo === 'função' ? 'uma função' : 'fixo') + ' e não pode mudar' + (onde ? ' ' + onde : '') + '.', b.tipo === 'função' ? undefined : 'Crie com var na linha ' + lineCol(src, b.pos).line + ': var ' + b.name + ' = …');
  }
  const baseDe = t => { while (t.type === 'Member' || t.type === 'Index') t = t.obj; return t.type === 'Ident' ? t : null; };
  const adiar = f => adiadas.push(f);
  function temSaida(stmts) {
    for (const st of stmts) {
      if (st.type === 'Break' || st.type === 'Return' || st.type === 'Throw') return true;
      for (const k of ['cons', 'alt', 'body', 'handler', 'other']) if (Array.isArray(st[k]) && st.type !== 'Func' && temSaida(st[k])) return true;
      if (st.cases && st.cases.some(c => temSaida(c.body))) return true;
    }
    return false;
  }
  function bloco(stmts, esc) {
    for (const st of stmts) if (st.type === 'Func') {
      if (esc.m.has(st.k)) add('erro', st.s, 'Já existe algo chamado `' + st.name + '` aqui.', 'Cada função precisa de um nome diferente.');
      definir(esc, st.k, st.name, st.s, 'função');
    }
    let morto = null, avisado = false;
    for (const st of stmts) {
      if (morto && !avisado) { add('aviso', st.s, 'Esta linha nunca roda: ela vem depois de ' + morto + '.', 'Apague a linha ou mova para antes.'); avisado = true; }
      instr(st, esc);
      if (!morto) morto = { Return: '`devolva`', Break: '`pare`', Continue: '`continue`', Throw: '`falhe`' }[st.type] || null;
    }
  }
  const fixa = (c, onde) => { if (c.type === 'Lit' && typeof c.v === 'boolean') add('aviso', c.s, 'A condição do `' + onde + '` é sempre ' + (c.v ? 'verdadeira' : 'falsa') + '.', c.v ? undefined : 'O bloco nunca roda.'); };
  function instr(st, esc) {
    switch (st.type) {
      case 'Func': {
        const e2 = new Esc(esc); st.params.forEach(q => definir(e2, q.k, q.name, st.s, 'parâmetro'));
        adiar(() => { if (st.expr) expr(st.expr, e2); else bloco(st.body, e2); }); return;
      }
      case 'Mostre': st.args.forEach(a => expr(a, esc)); return;
      case 'Var':
        expr(st.value, esc);
        if (esc.m.has(st.k)) add('erro', st.s, '`' + st.name + '` já foi criada neste bloco.', 'Para mudar o valor, escreva só: ' + st.name + ' = …');
        else definir(esc, st.k, st.name, st.s, 'var');
        return;
      case 'Assign': {
        expr(st.value, esc); const t = st.target;
        if (t.type === 'Ident' && st.op === '=') { const b = esc.busca(t.k); if (!b) definir(esc, t.k, t.name, st.s, 'fixo'); else escrever(t, esc); return; }
        if (t.type === 'Ident') { escrever(t, esc); return; }
        exprAlvo(t, esc); const base = baseDe(t); if (base) escrever(base, esc); return;
      }
      case 'ExprStmt': expr(st.expr, esc); return;
      case 'If': expr(st.cond, esc); fixa(st.cond, 'se'); bloco(st.cons, new Esc(esc)); if (st.alt) bloco(st.alt, new Esc(esc)); return;
      case 'While':
        expr(st.cond, esc);
        if (st.cond.type === 'Lit' && st.cond.v === true) { if (!temSaida(st.body)) add('aviso', st.s, 'Este laço nunca termina: não tem `pare`, `devolva` nem `falhe`.', 'Coloque um `pare` quando o trabalho acabar, ou use uma condição que mude.'); }
        else fixa(st.cond, 'enquanto');
        bloco(st.body, new Esc(esc)); return;
      case 'Repeat': expr(st.count, esc); bloco(st.body, new Esc(esc)); return;
      case 'ForIn': case 'ForRange': {
        if (st.type === 'ForIn') expr(st.iter, esc); else { expr(st.from, esc); expr(st.to, esc); if (st.step) expr(st.step, esc); }
        const e2 = new Esc(esc); definir(e2, st.k, st.name, st.s, 'laço'); bloco(st.body, e2); return;
      }
      case 'Return': case 'Throw': if (st.value) expr(st.value, esc); return;
      case 'Switch': expr(st.subject, esc); for (const c of st.cases) { c.pats.forEach(p => { expr(p.lo, esc); if (p.hi) expr(p.hi, esc); }); bloco(c.body, new Esc(esc)); } if (st.other) bloco(st.other, new Esc(esc)); return;
      case 'Test': expr(st.name, esc); adiar(() => bloco(st.body, new Esc(esc))); return;
      case 'Check': expr(st.expr, esc); return;
      case 'Try': { bloco(st.body, new Esc(esc)); const e2 = new Esc(esc); if (st.k) definir(e2, st.k, st.name, st.s, 'erro'); bloco(st.handler, e2); return; }
      case 'Tela': if (st.title) expr(st.title, esc); adiar(() => bloco(st.body, new Esc(esc))); return;
      case 'UI': st.args.forEach(a => expr(a, esc)); return;
      case 'UIBox': bloco(st.body, new Esc(esc)); return;
      case 'UIPage': expr(st.name, esc); bloco(st.body, new Esc(esc)); return;
      case 'UIButton': { expr(st.label, esc); const e2 = new Esc(esc); adiar(() => bloco(st.body, e2)); return; }
      case 'UIBind': { expr(st.label, esc); exprAlvo(st.target, esc); const base = baseDe(st.target); if (base) escrever(base, esc, 'pela tela'); if (st.options) expr(st.options, esc); return; }
      case 'Nav': expr(st.alvo, esc); return;
      case 'Chart': if (st.title) expr(st.title, esc); expr(st.dados, esc); return;
      case 'Use': {
        if (esc !== global) { add('erro', st.s, '`use` fica no nível principal do programa, fora de blocos e funções.', 'Coloque os use no começo do programa.'); return; }
        const a = achaModulo && achaModulo(st.nome);
        if (!a) { add('erro', st.nomePos, 'Não achei o módulo "' + st.nome + '".', achaModulo ? 'Um módulo é outro programa seu (no editor, em Meus programas; no computador, um arquivo .cordel na mesma pasta).' : 'Módulos precisam de outros programas: no editor, em Meus programas; no computador, arquivos .cordel na mesma pasta.'); return; }
        let nomes;
        try { nomes = exportsDe(a.src); } catch (e) {
          if (!(e instanceof CordelError)) throw e;
          add('erro', st.nomePos, 'O módulo "' + a.nome + '" tem um erro na linha ' + lineCol(a.src, e.pos).line + ': ' + e.message, 'Abra o módulo e corrija; depois volte aqui.'); return;
        }
        if (st.alias) { if (esc.m.has(st.alias.k)) add('erro', st.s, 'Já existe `' + st.alias.name + '` aqui.'); else definir(esc, st.alias.k, st.alias.name, st.s, 'fixo'); return; }
        for (const n of nomes.values()) {
          const ja = esc.m.get(n.k);
          if (ja && !ja.importado) add('erro', st.s, '`' + n.name + '` já existe neste programa, e o módulo "' + a.nome + '" também tem um.', 'Para usar os dois, dê um nome ao módulo: use "' + a.nome + '" como ' + nomeDeModulo(a.nome) + '.');
          else { const b = definir(esc, n.k, n.name, st.s, n.tipo === 'função' ? 'função' : 'fixo'); b.importado = a.nome; }
        }
        return;
      }
    }
  }
  function exprAlvo(t, esc) { if (t.type === 'Member') exprAlvo(t.obj, esc); else if (t.type === 'Index') { exprAlvo(t.obj, esc); expr(t.idx, esc); } }
  function expr(e, esc) {
    if (!e) return;
    switch (e.type) {
      case 'Ident': ler(e, esc); return;
      case 'Lit': return;
      case 'Tpl': e.parts.forEach(p => { if (typeof p !== 'string') expr(p, esc); }); return;
      case 'List': e.items.forEach(x => expr(x, esc)); return;
      case 'Rec': e.entries.forEach(x => expr(x.value, esc)); return;
      case 'Neg': case 'Not': expr(e.x, esc); return;
      case 'Logic': expr(e.l, esc); expr(e.r, esc); return;
      case 'Bin':
        expr(e.l, esc); expr(e.r, esc);
        if (['==', '!=', '<=', '>=', '<', '>'].includes(e.op) && src.slice(e.l.s, e.l.e).trim() === src.slice(e.r.s, e.r.e).trim() && e.l.type !== 'Lit')
          add('aviso', e.s, 'Isso compara um valor com ele mesmo: o resultado é sempre ' + (['==', '<=', '>='].includes(e.op) ? 'verdadeiro' : 'falso') + '.');
        return;
      case 'Chain': e.items.forEach(x => expr(x, esc)); return;
      case 'Member': expr(e.obj, esc); return;
      case 'Index': expr(e.obj, esc); expr(e.idx, esc); return;
      case 'Call':
        if (e.callee.type === 'Member') {
          expr(e.callee.obj, esc);
          if (MUTANTES.has(e.callee.k)) { const base = baseDe(e.callee.obj); if (base) escrever(base, esc, 'com ' + e.callee.name + '()'); }
        } else expr(e.callee, esc);
        e.args.forEach(a => expr(a, esc)); return;
      case 'Lambda': { const e2 = new Esc(esc); e.params.forEach(q => definir(e2, q.k, q.name, e.s, 'parâmetro')); expr(e.body, e2); return; }
    }
  }
  bloco(prog.body, global);
  while (adiadas.length) adiadas.shift()();
  for (const { id, esc } of naoAchadas) {
    const cands = porNome.get(id.k) || [];
    cands.forEach(b => b.leituras++);
    const naCadeia = cands.find(b => { for (let x = esc; x; x = x.pai) if (x === b.esc) return true; return false; });
    if (naCadeia) add('erro', id.s, '`' + id.name + '` é usada antes de ser criada (linha ' + lineCol(src, naCadeia.pos).line + ').', 'Crie antes de usar.');
    else if (cands.length) add('erro', id.s, '`' + id.name + '` foi criada dentro de um bloco (linha ' + lineCol(src, cands[0].pos).line + ') e não existe aqui.', 'Crie antes do bloco com var ' + id.name + ' = … e, dentro dele, só atribua o valor.');
    else {
      const sug = suggest(id.name, [...new Set([...todas.map(b => b.name), ...PRONTAS.values()])]);
      if (sug) (porNome.get(norm(sug)) || []).forEach(b => b.leituras++);
      add('erro', id.s, '`' + id.name + '` não existe.', sug ? 'Você quis dizer `' + sug + '`?' : 'Crie antes de usar: ' + id.name + ' = …');
    }
  }
  // Um arquivo só com definições (funções, nomes, use e testes) é uma biblioteca: o que ele cria é para os outros usarem.
  const biblioteca = prog.body.some(st => st.type === 'Func') && prog.body.every(st => ['Func', 'Var', 'Use', 'Test'].includes(st.type) || (st.type === 'Assign' && st.op === '=' && st.target.type === 'Ident'));
  for (const b of todas) {
    if (b.name.startsWith('_') || b.importado || (biblioteca && b.esc === global)) continue;
    if (b.leituras === 0 && (b.tipo === 'var' || b.tipo === 'fixo')) add('aviso', b.pos, '`' + b.name + '` é criada mas nunca usada.', 'Apague a linha ou use o valor.');
    else if (b.leituras === 0 && b.tipo === 'função') add('aviso', b.pos, 'A função `' + b.name + '` nunca é chamada.');
    else if (b.tipo === 'var' && b.escritas === 0) add('aviso', b.pos, '`' + b.name + '` foi criada com var, mas nunca muda.', 'Se não precisa mudar, tire o var: ' + b.name + ' = …');
  }
}

// Para o autocompletar do editor.
function metodos() {
  const out = []; const visto = new Set();
  for (const [tbl, de] of [[LIST_METHODS, 'lista'], [TEXT_METHODS, 'texto'], [NUM_METHODS, 'número'], [DATE_METHODS, 'data'], [REC_METHODS, 'registro']])
    for (const m of tbl.values()) { const k = de + ':' + m.name; if (visto.has(k)) continue; visto.add(k); out.push({ nome: m.name, min: m.min, max: m.max, de }); }
  return out;
}
function funcoes() {
  const I = new Interp('', {}); const out = []; const visto = new Set();
  for (const b of I.builtins.values()) if (!visto.has(b.name)) { visto.add(b.name); out.push({ nome: b.name, min: b.min, max: b.max }); }
  return out;
}
// Uma descrição curta de um arquivo adicionado: "42 linhas", "NF-e 4180", "4 lançamentos".
function infoDeArquivo(f) {
  try {
    if (f.text !== undefined && (/\.ofx$/i.test(f.name) || /^\s*(OFXHEADER|<\?OFX|<OFX>)/i.test(f.text))) { const n = extratoOFX(f.text, null, f.name).rows.length; return n + (n === 1 ? ' lançamento' : ' lançamentos'); }
    if (f.text !== undefined && /\.xml$/i.test(f.name)) { const nf = notaFiscalDe(f.text, f.name, null); return nf.get('modelo') + ' ' + nf.get('numero'); }
  } catch (e) { return f.name.split('.').pop().toUpperCase(); }
  return null;
}
// Os campos (e os tipos) do primeiro registro de um arquivo: para sugestões no editor e para a IA.
function primeiroRegistro(f) {
  if (f.text !== undefined && (/\.ofx$/i.test(f.name) || /^\s*(OFXHEADER|<\?OFX|<OFX>)/i.test(f.text))) return extratoOFX(f.text, null, f.name).rows[0] || null;
  if (f.text !== undefined && /\.xml$/i.test(f.name)) return notaFiscalDe(f.text, f.name, null);
  let rows;
  if (f.sheets) rows = (f.sheets[0] ? f.sheets[0].rows : []).slice(0, 31);
  else rows = parseCSV(f.text.slice(0, 20000)).rows.slice(0, 31);
  return tableFromRows(rows, true)[0] || null;
}
function camposComTipo(f) {
  try { const r = primeiroRegistro(f); return r ? [...r.m.values()].map(e => [e.name, typeName(e.v)]) : []; } catch (e) { return []; }
}
function camposDeArquivo(f) {
  try { const r = primeiroRegistro(f); return r ? r.names() : []; } catch (e) { return []; }
}
const api = { run, start, norm, KW, UI_WORDS, parseCSV, metodos, funcoes, camposDeArquivo, camposComTipo, infoDeArquivo, verificar, formatar, modulosUsados, usosDe, __parse: src => new Parser(lex(src)).parseProgram(), version: '0.8.0' };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Cordel = api;
})(typeof window !== 'undefined' ? window : globalThis);
