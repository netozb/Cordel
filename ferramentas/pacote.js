#!/usr/bin/env node
'use strict';
// Prepara tudo o que vai numa versão publicada, na pasta dist/:
//
//   cordel-X.tgz        o pacote do npm (npm install -g cordel-X.tgz)
//   cordel-X.vsix       a extensão do VS Code (code --install-extension cordel-X.vsix)
//   cordel.html         o editor no navegador, num arquivo só
//   cordel-X.zip        os três acima com exemplos, documentação e instruções, para quem baixa da página de versões
//   notas-X.md          as notas da versão, tiradas do CHANGELOG.md
//   SHA256SUMS.txt      as somas de verificação dos arquivos acima
//
//   npm run pacote
//
// Precisa das dependências da extensão: npm --prefix editores/vscode install
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const zlib = require('zlib');
const crypto = require('crypto');
const { notasDa } = require('./versao.js');

const RAIZ = path.join(__dirname, '..');
const DIST = path.join(RAIZ, 'dist');
const EXT = path.join(RAIZ, 'editores', 'vscode');
const passo = t => console.log('• ' + t);
function roda(cmd, args, opcoes) {
  const r = cp.spawnSync(cmd, args, Object.assign({ cwd: RAIZ, encoding: 'utf8', shell: process.platform === 'win32' && cmd === 'npm' }, opcoes));
  if (r.status !== 0) {
    process.stderr.write((r.stdout || '') + (r.stderr || ''));
    throw new Error(cmd + ' ' + args.join(' ') + ' falhou' + (r.error ? ': ' + r.error.message : ''));
  }
  return r.stdout || '';
}

// ───────── zip (sem depender de programas do sistema) ─────────
const TABELA = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = TABELA[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function horaDos(d) {
  return { hora: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dia: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}
// entradas: [{ nome: 'pasta/arquivo', dados: Buffer }]
function zipar(entradas, quando) {
  const { hora, dia } = horaDos(quando || new Date());
  const partes = [], central = [];
  let pos = 0;
  for (const { nome, dados } of entradas) {
    const n = Buffer.from(nome, 'utf8');
    const comp = zlib.deflateRawSync(dados, { level: 9 });
    const usa = comp.length < dados.length;
    const corpo = usa ? comp : dados;
    const crc = crc32(dados);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(usa ? 8 : 0, 8); local.writeUInt16LE(hora, 10); local.writeUInt16LE(dia, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(corpo.length, 18); local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(n.length, 26); local.writeUInt16LE(0, 28);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(0x031E, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(usa ? 8 : 0, 10); cen.writeUInt16LE(hora, 12); cen.writeUInt16LE(dia, 14);
    cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(corpo.length, 20); cen.writeUInt32LE(dados.length, 24);
    cen.writeUInt16LE(n.length, 28); cen.writeUInt32LE(((0o100644) << 16) >>> 0, 38); cen.writeUInt32LE(pos, 42);
    partes.push(local, n, corpo); central.push(cen, n);
    pos += local.length + n.length + corpo.length;
  }
  const tamCentral = central.reduce((s, b) => s + b.length, 0);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(entradas.length, 8); fim.writeUInt16LE(entradas.length, 10);
  fim.writeUInt32LE(tamCentral, 12); fim.writeUInt32LE(pos, 16);
  return Buffer.concat([...partes, ...central, fim]);
}
function arquivosDe(dir, prefixo) {
  const out = [];
  for (const nome of fs.readdirSync(dir).sort()) {
    const f = path.join(dir, nome);
    if (fs.statSync(f).isDirectory()) out.push(...arquivosDe(f, prefixo + nome + '/'));
    else out.push({ nome: prefixo + nome, dados: fs.readFileSync(f) });
  }
  return out;
}

function principal() {
  const pacote = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
  const V = pacote.version;
  const notas = notasDa(V);
  if (!notas) throw new Error('CHANGELOG.md não tem a versão ' + V);

  passo('construindo');
  roda(process.execPath, [path.join(__dirname, 'construir.js')], { stdio: 'inherit' });

  for (const f of fs.readdirSync(DIST)) if (/\.(tgz|vsix|zip)$|^notas-|^SHA256SUMS/.test(f)) fs.rmSync(path.join(DIST, f));

  passo('pacote do npm');
  const info = JSON.parse(roda('npm', ['pack', '--json', '--pack-destination', DIST]));
  const tgz = info[0].filename.replace(/^@/, '').replace(/\//, '-');
  if (!fs.existsSync(path.join(DIST, tgz))) throw new Error('npm pack não criou ' + tgz);
  const finalTgz = 'cordel-' + V + '.tgz';
  if (tgz !== finalTgz) fs.renameSync(path.join(DIST, tgz), path.join(DIST, finalTgz));

  passo('extensão do VS Code');
  let vsce;
  try { vsce = require.resolve('@vscode/vsce/vsce', { paths: [EXT] }); } catch (e) {
    throw new Error('falta o vsce: rode npm --prefix editores/vscode install');
  }
  const ext = JSON.parse(fs.readFileSync(path.join(EXT, 'package.json'), 'utf8'));
  const vsix = 'cordel-' + V + '.vsix';
  roda(process.execPath, [vsce, 'package', '--no-dependencies', '--out', path.join(DIST, vsix)].concat(ext.repository ? [] : ['--allow-missing-repository']), { cwd: EXT });

  passo('pacote para baixar');
  const pasta = 'cordel-' + V + '/';
  const texto = s => Buffer.from(s.replace(/\r?\n/g, '\r\n'));
  const instrucoes = [
    'Cordel ' + V,
    '',
    '1. Editor no navegador (não precisa instalar nada)',
    '   Abra cordel.html no Chrome, Edge, Firefox ou Safari. Funciona sem internet.',
    '',
    '2. Linha de comando (precisa do Node.js 18 ou mais novo: https://nodejs.org)',
    '   Abra o terminal nesta pasta e rode:',
    '     npm install -g ./' + finalTgz,
    '     cordel --versao',
    '     cordel rodar exemplos/tour.cordel',
    '',
    '3. Extensão do VS Code',
    '     code --install-extension ' + vsix,
    '   Ou, no VS Code: Extensões > ... > Instalar do VSIX.',
    '',
    'Documentação: pasta docs/ (guia, referência e manual para IA).',
    'Exemplos: pasta exemplos/ (veja exemplos/LEIA-ME.md).',
    'Novidades desta versão: CHANGELOG.md.',
    '',
  ].join('\n');
  const entradas = [
    { nome: pasta + 'LEIA-ME.txt', dados: texto(instrucoes) },
    { nome: pasta + 'cordel.html', dados: fs.readFileSync(path.join(DIST, 'cordel.html')) },
    { nome: pasta + finalTgz, dados: fs.readFileSync(path.join(DIST, finalTgz)) },
    { nome: pasta + vsix, dados: fs.readFileSync(path.join(DIST, vsix)) },
    ...['README.md', 'CHANGELOG.md', 'LICENSE'].map(f => ({ nome: pasta + f, dados: fs.readFileSync(path.join(RAIZ, f)) })),
    ...arquivosDe(path.join(RAIZ, 'docs'), pasta + 'docs/'),
    ...arquivosDe(path.join(RAIZ, 'exemplos'), pasta + 'exemplos/'),
  ];
  const zip = 'cordel-' + V + '.zip';
  fs.writeFileSync(path.join(DIST, zip), zipar(entradas));

  const notasArq = 'notas-' + V + '.md';
  fs.writeFileSync(path.join(DIST, notasArq), notas);

  const lista = [finalTgz, vsix, 'cordel.html', zip];
  fs.writeFileSync(path.join(DIST, 'SHA256SUMS.txt'), lista.map(f => crypto.createHash('sha256').update(fs.readFileSync(path.join(DIST, f))).digest('hex') + '  ' + f).join('\n') + '\n');

  console.log('\nPronto, em dist/:');
  for (const f of lista.concat(notasArq, 'SHA256SUMS.txt')) console.log('  ' + f.padEnd(24) + (fs.statSync(path.join(DIST, f)).size / 1024).toFixed(0).padStart(6) + ' KB');
}

if (require.main === module) {
  try { principal(); } catch (e) { console.error('\n' + e.message); process.exit(1); }
}
module.exports = { zipar, crc32 };
