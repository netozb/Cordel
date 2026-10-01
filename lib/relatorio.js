/* Relatórios em PDF da Cordel, sem dependências: títulos, textos, tabelas, gráficos de barras e a
   origem de cada valor. Usa as fontes padrão do PDF (Helvetica), que todo leitor já tem. */
(function (root) {
'use strict';

// Larguras das letras (milésimos do tamanho) para os códigos 32 a 255 do WinAnsi, das métricas
// das fontes padrão da Adobe (Helvetica e Helvetica-Bold).
const LARGURAS = {
  F1: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,0,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,500,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500],
  F2: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,0,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,556,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556],
};
// Caracteres fora do Latin-1 que o WinAnsi tem em 128–159, e substitutos para os que ele não tem.
const WINANSI = { 8364: 128, 8218: 130, 402: 131, 8222: 132, 8230: 133, 8224: 134, 8225: 135, 710: 136, 8240: 137, 352: 138, 8249: 139, 338: 140, 381: 142, 8216: 145, 8217: 146, 8220: 147, 8221: 148, 8226: 149, 8211: 150, 8212: 151, 732: 152, 8482: 153, 353: 154, 8250: 155, 339: 156, 382: 158, 376: 159 };
const TROCAS = { '→': '->', '←': '<-', '↳': '>', '≠': '!=', '≤': '<=', '≥': '>=', '−': '-', '✓': 'v', '✗': 'x', '›': '>', '\t': '  ' };
function codigos(s) {
  const out = [];
  for (const ch of String(s)) {
    if (TROCAS[ch] !== undefined) { for (const c of TROCAS[ch]) out.push(c.charCodeAt(0)); continue; }
    const c = ch.codePointAt(0);
    if (c >= 32 && c < 127) out.push(c);
    else if (c >= 160 && c <= 255) out.push(c);
    else if (WINANSI[c]) out.push(WINANSI[c]);
    else if (c === 10 || c === 13) out.push(32);
    else {
      // letras com acento que o WinAnsi não tem: tira o acento
      const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
      out.push(base && base.charCodeAt(0) < 256 && base.length === 1 ? base.charCodeAt(0) : 63);
    }
  }
  return out;
}
// nomes de colunas que costumam ser dinheiro (para mostrar 389,90 mesmo quando a coluna só tem 1 casa)
const NOME_DINHEIRO = /valor|pre[çc]o|total|desconto|custo|saldo|pago|pagamento|receb|juros|multa|tarifa|frete|r\$/i;
// casas decimais de um número escrito com ponto: '389.9' → 1
function decimais(v) { return (String(v).split('.')[1] || '').length; }
function duasCasas(v) { const [int, f] = String(v).split('.'); return int + '.' + ((f || '') + '00').slice(0, 2); }
function largura(s, fonte, tam) { let w = 0; for (const c of codigos(s)) w += LARGURAS[fonte][c - 32] || 556; return w * tam / 1000; }
// Texto literal do PDF: só ASCII, com \ ( ) escapados e os demais bytes em octal.
function literal(s) {
  let r = '(';
  for (const c of codigos(s)) r += c === 40 || c === 41 || c === 92 ? '\\' + String.fromCharCode(c) : c < 127 ? String.fromCharCode(c) : '\\' + c.toString(8).padStart(3, '0');
  return r + ')';
}
function corta(s, fonte, tam, max) {
  s = String(s);
  if (largura(s, fonte, tam) <= max + 0.01) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (largura(s.slice(0, m) + '…', fonte, tam) <= max) lo = m; else hi = m - 1; }
  return s.slice(0, lo).replace(/\s+$/, '') + '…';
}
// Quebra o texto em linhas que cabem na largura (palavras longas demais são cortadas).
function quebra(s, fonte, tam, max) {
  const linhas = [];
  for (const par of String(s).split('\n')) {
    let atual = '';
    for (const p of par.split(/(\s+)/)) {
      if (!p) continue;
      const tentativa = atual + p;
      if (largura(tentativa, fonte, tam) <= max || !atual.trim()) atual = tentativa;
      else { linhas.push(atual.replace(/\s+$/, '')); atual = /^\s+$/.test(p) ? '' : p; }
      while (largura(atual, fonte, tam) > max && atual.length > 1) { const c = corta(atual, fonte, tam, max).replace(/…$/, ''); linhas.push(c); atual = atual.slice(c.length); }
    }
    linhas.push(atual.replace(/\s+$/, ''));
  }
  return linhas;
}
const celTexto = c => c === null || c === undefined ? '' : typeof c === 'string' ? c : c.dt !== undefined ? c.s : c.n !== undefined ? numeroBR(c.n) : c.b ? 'verdadeiro' : 'falso';
const ehNum = c => c && typeof c === 'object' && c.n !== undefined;
// 1234567.5 → 1.234.567,5 (como numa planilha brasileira)
function numeroBR(n) { const [i, f] = String(n).split('.'); const neg = i.startsWith('-'); return (neg ? '-' : '') + i.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (f ? ',' + f : ''); }

const A4 = { w: 595.28, h: 841.89 }, M = { esq: 48, dir: 48, topo: 58, base: 54 };
const COR = { tinta: '0.08 0.09 0.11', fraco: '0.40 0.42 0.46', linha: '0.85 0.86 0.88', faixa: '0.955 0.96 0.965', cab: '0.92 0.93 0.94', marca: '0.17 0.23 0.57', barra: '0.17 0.36 0.78', erro: '0.72 0.2 0.16', ok: '0.12 0.48 0.3' };
const n2 = x => (Math.round(x * 100) / 100).toString();

// Monta as páginas: cada uma é uma lista de comandos de desenho do PDF.
function paginar(doc) {
  const paginas = []; let ops = null, y = 0;
  const util = A4.w - M.esq - M.dir;
  const nova = () => { ops = []; paginas.push(ops); y = M.topo; };
  const cabe = h => { if (!ops || y + h > A4.h - M.base) { nova(); return false; } return true; };
  const texto = (s, x, yy, fonte, tam, cor) => ops.push('BT /' + fonte + ' ' + n2(tam) + ' Tf ' + (cor || COR.tinta) + ' rg ' + n2(x) + ' ' + n2(A4.h - yy) + ' Td ' + literal(s) + ' Tj ET');
  const ret = (x, yy, w, h, cor) => ops.push(cor + ' rg ' + n2(x) + ' ' + n2(A4.h - yy - h) + ' ' + n2(w) + ' ' + n2(h) + ' re f');
  const linhaH = (x, yy, w, cor, esp) => ops.push(cor + ' RG ' + n2(esp || 0.6) + ' w ' + n2(x) + ' ' + n2(A4.h - yy) + ' m ' + n2(x + w) + ' ' + n2(A4.h - yy) + ' l S');
  const paragrafo = (s, fonte, tam, cor, x, larg, entre) => {
    const alt = tam * (entre || 1.4);
    for (const l of quebra(s, fonte, tam, larg || util)) { cabe(alt); texto(l, x || M.esq, y + tam, fonte, tam, cor); y += alt; }
  };
  nova();
  // capa: título, subtítulo e uma linha
  paragrafo(doc.titulo || 'Relatório', 'F2', 20, COR.tinta, M.esq, util, 1.25);
  if (doc.subtitulo) { y += 2; paragrafo(doc.subtitulo, 'F1', 10, COR.fraco); }
  y += 6; linhaH(M.esq, y, util, COR.marca, 1.2); y += 16;

  for (const b of doc.blocos || []) {
    if (b.tipo === 'titulo') {
      const tam = b.nivel === 2 ? 12.5 : 15;
      y += b.nivel === 2 ? 6 : 10; cabe(tam * 2.2);
      paragrafo(b.texto, 'F2', tam, COR.tinta, M.esq, util, 1.3); y += 4;
    } else if (b.tipo === 'texto') {
      paragrafo(b.texto === '' ? ' ' : b.texto, b.forte ? 'F2' : 'F1', 10.5, b.cor ? COR[b.cor] : COR.tinta);
      if (b.origem && doc.origens !== false) paragrafo('Origem: ' + b.origem, 'F1', 8.5, COR.fraco, M.esq + 10, util - 10, 1.35);
      y += 3;
    } else if (b.tipo === 'tabela') tabela(b);
    else if (b.tipo === 'grafico') grafico(b);
    else if (b.tipo === 'aviso') {
      y += 4; const linhas = quebra(b.texto, 'F1', 10, util - 20), h = linhas.length * 14 + 14;
      cabe(h); ret(M.esq, y, 3, h, COR[b.cor] || COR.erro);
      linhas.forEach((l, i) => texto(l, M.esq + 14, y + 17 + i * 14, i === 0 ? 'F2' : 'F1', 10, COR.tinta));
      y += h + 8;
    }
  }
  return paginas;

  function tabela(b) {
    const comOrigem = b.origens && doc.origens !== false && b.origens.some(Boolean);
    const cols = (b.cols || (b.rows[0] || []).map((_, i) => 'coluna ' + (i + 1))).concat(comOrigem ? ['Origem'] : []);
    const num = cols.map((_, i) => i < (b.rows[0] || []).length && b.rows.every(r => r[i] === '' || ehNum(r[i])) && b.rows.some(r => ehNum(r[i])));
    // colunas de dinheiro (até 2 casas, alguma com 2) saem com 2 casas: 389,90 em vez de 389,9
    // (ou com 1 casa e nome de dinheiro: Valor, Preço, Total…)
    const casas = num.map((n, i) => { if (!n) return null; const d = Math.max(...b.rows.filter(r => ehNum(r[i])).map(r => decimais(r[i].n))); return d === 2 || (d === 1 && NOME_DINHEIRO.test(cols[i])) ? 2 : null; });
    const cel = (c, i) => !ehNum(c) || !casas[i] ? celTexto(c) : numeroBR(duasCasas(c.n));
    // a origem de cada linha; se todas vêm da mesma planilha, o nome dela vai na nota e a coluna fica só com a linha
    let origens = comOrigem ? b.origens.map(o => o ? o.curto || o.texto || '' : '') : [], fonteUnica = '';
    if (comOrigem) {
      const m = /^(.*), (?:linhas?|itens?|item) [^+]*$/.exec(origens.find(Boolean) || '');
      if (m && origens.every(o => !o || (o.startsWith(m[1] + ', ') && !o.includes(' + ') && /^(?:linhas?|itens?|item) /.test(o.slice(m[1].length + 2))))) {
        fonteUnica = m[1]; origens = origens.map(o => o && o.slice(m[1].length + 2));
      }
    }
    const rows = b.rows.map((r, i) => r.map(cel).concat(comOrigem ? [origens[i]] : []));
    let tam = 9, pad = 6, larg;
    for (;;) {
      larg = cols.map((c, i) => Math.min(util * 0.45, Math.max(largura(c, 'F2', tam), ...rows.slice(0, 300).map(r => largura(r[i] || '', 'F1', tam))) + 2 * pad + 1));
      const soma = larg.reduce((a, x) => a + x, 0);
      if (soma <= util || tam <= 6.5) {
        if (soma > util) {
          // ainda não coube: as colunas mais largas encolhem até um teto comum, e as estreitas ficam inteiras
          const ordem = larg.slice().sort((a, c) => a - c);
          let resto = util, teto = util;
          for (let i = 0; i < ordem.length; i++) { const parte = resto / (ordem.length - i); if (ordem[i] <= parte) resto -= ordem[i]; else { teto = parte; break; } }
          larg = larg.map(w => Math.min(w, Math.max(teto, 24)));
        } else if (soma < util && cols.length > 1) { const extra = (util - soma) / cols.length; larg = larg.map(w => w + Math.min(extra, 24)); }
        break;
      }
      tam -= 0.5;
    }
    const alt = tam * 1.9, largTotal = larg.reduce((a, x) => a + x, 0);
    const cabecalho = () => {
      ret(M.esq, y, largTotal, alt, COR.cab);
      let x = M.esq;
      cols.forEach((c, i) => { const s = corta(c, 'F2', tam, larg[i] - 2 * pad); texto(s, num[i] ? x + larg[i] - pad - largura(s, 'F2', tam) : x + pad, y + alt * 0.66, 'F2', tam); x += larg[i]; });
      y += alt;
    };
    y += 2; cabe(alt * 2); cabecalho();
    rows.forEach((r, ri) => {
      if (!cabe(alt)) cabecalho();
      if (ri % 2 === 1) ret(M.esq, y, largTotal, alt, COR.faixa);
      let x = M.esq;
      r.forEach((c, i) => {
        const fonte = 'F1', s = corta(c, fonte, tam, larg[i] - 2 * pad), cor = comOrigem && i === cols.length - 1 ? COR.fraco : COR.tinta;
        texto(s, num[i] ? x + larg[i] - pad - largura(s, fonte, tam) : x + pad, y + alt * 0.66, fonte, tam, cor);
        x += larg[i];
      });
      y += alt;
    });
    linhaH(M.esq, y, largTotal, COR.linha);
    y += 4;
    const nota = (b.rows.length < b.total ? 'Mostrando ' + b.rows.length + ' de ' + numeroBR(b.total) + ' linhas' : numeroBR(b.total) + (b.total === 1 ? ' linha' : ' linhas')) + (fonteUnica ? ' · origem: ' + fonteUnica : '');
    cabe(12); texto(nota, M.esq, y + 8, 'F1', 8, COR.fraco); y += 18;
  }
  function grafico(b) {
    const vals = b.values.map(Number), maxAbs = Math.max(...vals.map(Math.abs), 0) || 1;
    const d = Math.max(0, ...b.values.map(decimais)), dinheiro = d === 2 || (d === 1 && NOME_DINHEIRO.test(b.campo || ''));
    const tam = 9, alt = 15, larRot = Math.min(util * 0.32, Math.max(...b.labels.map(l => largura(l, 'F1', tam))) + 8), larVal = 70;
    const larBarra = util - larRot - larVal;
    y += 4;
    if (b.title || b.campo) { cabe(alt * 2); texto(b.title || b.campo, M.esq, y + 11, 'F2', 11); y += 20; }
    b.labels.forEach((l, i) => {
      cabe(alt);
      texto(corta(l, 'F1', tam, larRot - 8), M.esq, y + 11, 'F1', tam);
      const w = Math.max(1, Math.abs(vals[i]) / maxAbs * (larBarra - 8));
      ret(M.esq + larRot, y + 3, w, alt - 6, vals[i] < 0 ? COR.erro : COR.barra);
      texto(numeroBR(dinheiro ? duasCasas(b.values[i]) : b.values[i]), M.esq + larRot + w + 6, y + 11, 'F1', tam, COR.fraco);
      y += alt;
    });
    if (b.total > b.labels.length) { texto('Mostrando ' + b.labels.length + ' de ' + b.total, M.esq, y + 10, 'F1', 8, COR.fraco); y += 14; }
    y += 8;
  }
}

// Gera o arquivo PDF: { titulo, subtitulo, rodape, blocos, origens } → Uint8Array
function gerar(doc) {
  const paginas = paginar(doc), total = paginas.length;
  const rodape = doc.rodape || doc.titulo || '';
  paginas.forEach((ops, i) => {
    const p = 'Página ' + (i + 1) + ' de ' + total;
    ops.push('0.85 0.86 0.88 RG 0.5 w ' + n2(M.esq) + ' ' + n2(M.base - 18) + ' m ' + n2(A4.w - M.dir) + ' ' + n2(M.base - 18) + ' l S');
    ops.push('BT /F1 8 Tf ' + COR.fraco + ' rg ' + n2(M.esq) + ' ' + n2(M.base - 30) + ' Td ' + literal(corta(rodape, 'F1', 8, 360)) + ' Tj ET');
    ops.push('BT /F1 8 Tf ' + COR.fraco + ' rg ' + n2(A4.w - M.dir - largura(p, 'F1', 8)) + ' ' + n2(M.base - 30) + ' Td ' + literal(p) + ' Tj ET');
  });
  const objs = [];
  const add = s => { objs.push(s); return objs.length; };
  const catalogo = add(null), arvore = add(null);
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids = [];
  for (const ops of paginas) {
    const corpo = ops.join('\n');
    const conteudo = add('<< /Length ' + corpo.length + ' >>\nstream\n' + corpo + '\nendstream');
    kids.push(add('<< /Type /Page /Parent ' + arvore + ' 0 R /MediaBox [0 0 ' + A4.w + ' ' + A4.h + '] /Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R >> >> /Contents ' + conteudo + ' 0 R >>'));
  }
  objs[catalogo - 1] = '<< /Type /Catalog /Pages ' + arvore + ' 0 R /Lang (pt-BR) >>';
  objs[arvore - 1] = '<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
  const quando = doc.quando || new Date();
  const d2 = x => String(x).padStart(2, '0');
  const dataPDF = 'D:' + quando.getFullYear() + d2(quando.getMonth() + 1) + d2(quando.getDate()) + d2(quando.getHours()) + d2(quando.getMinutes()) + d2(quando.getSeconds());
  const utf16 = s => '<FEFF' + [...String(s)].map(ch => { const c = ch.codePointAt(0); if (c > 0xFFFF) { const h = Math.floor((c - 0x10000) / 0x400) + 0xD800, l = (c - 0x10000) % 0x400 + 0xDC00; return h.toString(16).padStart(4, '0') + l.toString(16).padStart(4, '0'); } return c.toString(16).padStart(4, '0'); }).join('').toUpperCase() + '>';
  const info = add('<< /Title ' + utf16(doc.titulo || 'Relatório') + ' /Producer ' + utf16(doc.produtor || 'Cordel') + ' /CreationDate (' + dataPDF + ') >>');
  let s = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const pos = [];
  objs.forEach((o, i) => { pos.push(s.length); s += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const xref = s.length;
  s += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + pos.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('');
  s += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalogo + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xFF;
  return bytes;
}

// O que um programa mostrou (resultado de Cordel.run) como blocos do relatório.
function blocosDaSaida(res) {
  const blocos = [];
  for (const o of res.out || []) {
    if (o.kind === 'titulo') blocos.push({ tipo: 'titulo', texto: o.text, nivel: o.nivel || 1 });
    else if (o.kind === 'out') blocos.push({ tipo: 'texto', texto: o.text, origem: o.origens && o.origens.length ? [...new Set(o.origens.map(g => (o.origens.length > 1 ? o.text.slice(g.ini, g.fim) + ': ' : '') + g.texto))].join('; ') : null });
    else if (o.kind === 'ask') blocos.push({ tipo: 'texto', texto: '? ' + o.text, cor: 'marca' });
    else if (o.kind === 'answer') blocos.push({ tipo: 'texto', texto: '> ' + o.text, cor: 'fraco' });
    else if (o.kind === 'table') blocos.push({ tipo: 'tabela', cols: o.cols, rows: o.rows, total: o.total, origens: o.origens });
    else if (o.kind === 'chart') blocos.push({ tipo: 'grafico', title: o.title, campo: o.campo, labels: o.labels, values: o.values, total: o.total });
    else if (o.kind === 'file') blocos.push({ tipo: 'texto', texto: 'Arquivo gerado: ' + o.name + (o.rows != null ? ' (' + o.rows + (o.rows === 1 ? ' linha)' : ' linhas)') : ''), cor: 'fraco' });
  }
  if (res.tests && res.tests.length) {
    const ok = res.tests.filter(t => t.ok).length;
    blocos.push({ tipo: 'titulo', texto: 'Testes: ' + ok + ' de ' + res.tests.length + ' passaram', nivel: 2 });
    for (const t of res.tests) blocos.push({ tipo: 'texto', texto: (t.ok ? 'Passou: ' : 'Falhou: ') + t.name + (t.ok ? '' : ' (' + String(t.msg).replace(/`/g, '') + ')'), cor: t.ok ? 'ok' : 'erro' });
  }
  if (res.error) blocos.push({ tipo: 'aviso', texto: 'O programa parou com erro' + (res.error.line ? ' na linha ' + res.error.line + (res.error.arquivo ? ' do módulo ' + res.error.arquivo : '') : '') + '.\n' + String(res.error.msg).replace(/`/g, '') + (res.error.dica ? '\nDica: ' + String(res.error.dica).replace(/`/g, '') : ''), cor: 'erro' });
  return blocos;
}
// O relatório de uma execução: título (o primeiro título mostrado ou o nome do programa) e data.
function daSaida(res, opcoes) {
  opcoes = opcoes || {};
  const quando = opcoes.quando || new Date();
  const d2 = x => String(x).padStart(2, '0');
  const blocos = blocosDaSaida(res);
  let titulo = opcoes.titulo || 'Relatório';
  if (blocos[0] && blocos[0].tipo === 'titulo' && blocos[0].nivel === 1) titulo = blocos.shift().texto;
  const sub = (opcoes.programa ? 'Programa ' + opcoes.programa + ' · ' : '') + 'Gerado pela Cordel' + (opcoes.versao ? ' ' + opcoes.versao : '') + ' em ' + d2(quando.getDate()) + '/' + d2(quando.getMonth() + 1) + '/' + quando.getFullYear() + ' às ' + d2(quando.getHours()) + ':' + d2(quando.getMinutes());
  return gerar({ titulo, subtitulo: sub, rodape: titulo, blocos, quando, origens: opcoes.origens, produtor: 'Cordel' + (opcoes.versao ? ' ' + opcoes.versao : '') });
}

const api = { gerar, daSaida, blocosDaSaida, largura, quebra };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.CordelRelatorio = api;
})(typeof window !== 'undefined' ? window : globalThis);
