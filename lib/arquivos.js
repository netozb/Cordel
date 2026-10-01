'use strict';
// Planilhas e arquivos no computador: o que tabela(…) lê e o que salve(…) grava.
// Usado pela linha de comando e pela extensão do VS Code.
const fs = require('fs');
const path = require('path');
const { norm } = require('./cordel.js');

const EXCEL = ['xlsx', 'xls', 'xlsm', 'ods'];
const EXTENSOES = ['.csv', '.tsv', '.txt', '.xlsx', '.xls', '.xlsm', '.ods', '.ofx', '.xml'];

// Lê um arquivo do disco no formato que o interpretador espera.
// carregarXLSX() devolve a biblioteca SheetJS ou lança um erro com uma mensagem clara.
function lerArquivo(p, carregarXLSX) {
  const ext = path.extname(p).toLowerCase().slice(1);
  const buf = fs.readFileSync(p);
  if (EXCEL.includes(ext)) {
    const planilhaParaAbas = require('./planilha.js');
    return { name: path.basename(p), sheets: planilhaParaAbas(carregarXLSX(), buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)) };
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (err) { text = new TextDecoder('windows-1252').decode(buf); }
  return { name: path.basename(p), text: text.replace(/^\ufeff/, '') };
}

// As planilhas citadas no programa em tabela("…"), leia("…"), abas("…") ou nota_fiscal("…"), procuradas na pasta dele.
// Como no editor, o nome pode vir sem extensão e sem acentos ou maiúsculas iguais: "VENDAS" acha vendas.csv.
function planilhasCitadas(src, dir) {
  const achados = [];
  let naPasta = null;
  const add = p => { if (!achados.includes(p)) achados.push(p); };
  for (const m of src.matchAll(/(?:tabela|leia|abas|nota_fiscal)\s*\(\s*["“”'‘’]([^"“”'‘’\n]+)["“”'‘’]/gi)) {
    const citado = m[1].trim();
    const direto = path.resolve(dir, citado);
    if (fs.existsSync(direto) && fs.statSync(direto).isFile()) { add(direto); continue; }
    const base = path.resolve(dir, path.dirname(citado));
    if (naPasta === null || naPasta.dir !== base) {
      let nomes = [];
      try { nomes = fs.readdirSync(base); } catch (err) { /* pasta inexistente */ }
      naPasta = { dir: base, nomes };
    }
    const alvo = norm(path.basename(citado));
    const achou = naPasta.nomes.find(n => norm(n) === alvo) ||
      naPasta.nomes.find(n => EXTENSOES.includes(path.extname(n).toLowerCase()) && norm(n.slice(0, -path.extname(n).length)) === alvo);
    if (achou) add(path.join(base, achou));
  }
  return achados;
}

// Converte uma data ISO no número de série usado pelo Excel.
const serialExcel = iso => {
  const [dia, hora] = iso.split('T'); const [a, m, d] = dia.split('-').map(Number);
  let s = (Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
  if (hora) { const [h, mi, se] = hora.split(':').map(Number); s += (h * 3600 + mi * 60 + (se || 0)) / 86400; }
  return s;
};

// Grava os arquivos de salve(…) numa pasta. Devolve os caminhos gravados.
function gravarSaidas(files, dir, carregarXLSX) {
  const escritos = [];
  for (const f of files || []) {
    const destino = path.resolve(dir || '.', path.basename(f.name));
    if (f.ext === 'xlsx') {
      const X = carregarXLSX();
      const aoa = [];
      if (f.cols) aoa.push(f.cols);
      for (const r of f.rows) aoa.push(r.map(c => typeof c === 'string' ? c : c.dt !== undefined ? serialExcel(c.dt) : c.n !== undefined ? Number(c.n) : c.b));
      const ws = X.utils.aoa_to_sheet(aoa);
      const off = f.cols ? 1 : 0;
      f.rows.forEach((r, ri) => r.forEach((c, ci) => {
        if (c && typeof c === 'object' && c.dt !== undefined) { const ref = X.utils.encode_cell({ r: ri + off, c: ci }); if (ws[ref]) ws[ref].z = c.dt.includes('T') ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy'; }
      }));
      const wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, ws, 'Cordel');
      X.writeFile(wb, destino);
    } else {
      // CSV com BOM: o Excel reconhece os acentos ao abrir.
      fs.writeFileSync(destino, (f.ext === 'csv' ? '\ufeff' : '') + f.text);
    }
    escritos.push(destino);
  }
  return escritos;
}

// Módulos: use "regras" acha regras.cordel na pasta do programa (ou "pasta/regras"), sem ligar para acentos
// e maiúsculas. textoAberto(caminho) pode devolver o texto de um arquivo aberto e ainda não salvo (VS Code).
function resolvedorDeModulos(dir, textoAberto) {
  return nome => {
    const citado = String(nome).trim().replace(/\\/g, '/');
    const base = path.resolve(dir, path.dirname(citado));
    const alvo = norm(path.basename(citado).replace(/\.cordel$/i, ''));
    let nomes = [];
    try { nomes = fs.readdirSync(base); } catch (err) { return null; }
    const achou = nomes.find(n => /\.cordel$/i.test(n) && norm(n.slice(0, -7)) === alvo);
    if (!achou) return null;
    const p = path.join(base, achou);
    const aberto = textoAberto && textoAberto(p);
    return { nome: achou.slice(0, -7), src: aberto != null ? aberto : fs.readFileSync(p, 'utf8').replace(/^\ufeff/, ''), caminho: p };
  };
}

module.exports = { lerArquivo, planilhasCitadas, gravarSaidas, resolvedorDeModulos, EXCEL };
