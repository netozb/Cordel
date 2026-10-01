#!/usr/bin/env node
'use strict';
// Muda a versão do Cordel em todos os lugares de uma vez.
//
//   npm run versao -- 0.7.0              (ou patch, minor, major)
//   npm run versao -- 0.7.0 --data 2026-10-15
//   node ferramentas/versao.js --notas [0.7.0]   mostra as notas dessa versão (do CHANGELOG.md)
//
// Atualiza package.json, package-lock.json, lib/cordel.js, a extensão do VS Code e o README.
// No CHANGELOG.md, a seção "## [Não lançado]" passa a ter o número e a data da versão.
// Depois roda npm run construir, que regenera a documentação e confere se tudo bate.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const RAIZ = path.join(__dirname, '..');
const arq = rel => path.join(RAIZ, rel);
const le = rel => fs.readFileSync(arq(rel), 'utf8');
const grava = (rel, s) => fs.writeFileSync(arq(rel), s);
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?$/;

// A seção de uma versão no CHANGELOG.md, sem o título.
function notasDa(versao, historico) {
  const texto = historico || le('CHANGELOG.md');
  const ini = texto.indexOf('\n## [' + versao + ']');
  if (ini < 0) return null;
  const corpo = texto.slice(texto.indexOf('\n', ini + 1) + 1);
  const fim = corpo.search(/^## \[/m);
  return (fim < 0 ? corpo : corpo.slice(0, fim)).trim() + '\n';
}

function proxima(atual, pedido) {
  const m = SEMVER.exec(atual);
  if (!m) throw new Error('versão atual inválida: ' + atual);
  const [ma, mi, pa] = [+m[1], +m[2], +m[3]];
  if (pedido === 'major') return (ma + 1) + '.0.0';
  if (pedido === 'minor') return ma + '.' + (mi + 1) + '.0';
  if (pedido === 'patch') return ma + '.' + mi + '.' + (pa + 1);
  if (!SEMVER.test(pedido)) throw new Error('versão inválida: ' + pedido + ' (use x.y.z, patch, minor ou major)');
  return pedido;
}

function mudarJson(rel, fn) {
  if (!fs.existsSync(arq(rel))) return false;
  const o = JSON.parse(le(rel));
  fn(o);
  grava(rel, JSON.stringify(o, null, 2) + '\n');
  return true;
}

function principal(args) {
  if (args[0] === '--notas') {
    const v = args[1] || require('../package.json').version;
    const n = notasDa(v);
    if (!n) { console.error('CHANGELOG.md não tem a versão ' + v); process.exit(1); }
    process.stdout.write(n);
    return;
  }
  const pedido = args[0];
  if (!pedido) { console.error('Uso: npm run versao -- <x.y.z | patch | minor | major> [--data aaaa-mm-dd]'); process.exit(2); }
  const iData = args.indexOf('--data');
  const hoje = new Date();
  const data = iData >= 0 ? args[iData + 1] : [hoje.getFullYear(), String(hoje.getMonth() + 1).padStart(2, '0'), String(hoje.getDate()).padStart(2, '0')].join('-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) { console.error('data inválida: ' + data + ' (use aaaa-mm-dd)'); process.exit(2); }

  const atual = require('../package.json').version;
  const nova = proxima(atual, pedido);
  const feitos = [];

  mudarJson('package.json', o => { o.version = nova; }) && feitos.push('package.json');
  mudarJson('package-lock.json', o => { o.version = nova; if (o.packages && o.packages['']) o.packages[''].version = nova; }) && feitos.push('package-lock.json');
  mudarJson('editores/vscode/package.json', o => { o.version = nova; }) && feitos.push('editores/vscode/package.json');
  mudarJson('editores/vscode/package-lock.json', o => { o.version = nova; if (o.packages && o.packages['']) o.packages[''].version = nova; }) && feitos.push('editores/vscode/package-lock.json');

  const nucleo = le('lib/cordel.js');
  const re = /(\bversion: ')([^']+)(')/;
  if (!re.test(nucleo)) throw new Error("lib/cordel.js: não achei version: '…'");
  grava('lib/cordel.js', nucleo.replace(re, '$1' + nova + '$3')); feitos.push('lib/cordel.js');

  const esc = atual.replace(/\./g, '\\.');
  for (const doc of ['README.md', 'PUBLICAR.md']) {
    const texto = le(doc);
    const novo = texto.replace(new RegExp('(Cordel |cordel-)' + esc + '(?![\\d])', 'g'), '$1' + nova);
    if (novo !== texto) { grava(doc, novo); feitos.push(doc); }
  }

  let historico = le('CHANGELOG.md');
  const avisos = [];
  if (/^## \[Não lançado\]/m.test(historico)) {
    historico = historico.replace(/^## \[Não lançado\].*$/m, '## [' + nova + '] — ' + data);
    grava('CHANGELOG.md', historico); feitos.push('CHANGELOG.md');
  } else if (!historico.includes('## [' + nova + ']')) {
    avisos.push('CHANGELOG.md não tem "## [Não lançado]" nem "## [' + nova + ']": escreva as novidades antes de publicar.');
  }
  const conteudo = require('../web/conteudo.js');
  if (conteudo.ref.novidades[0][0] !== nova) avisos.push('web/conteudo.js: acrescente a versão ' + nova + ' no começo de ref.novidades (o resumo que aparece no editor).');

  console.log(atual + ' → ' + nova + '\n  ' + feitos.join('\n  '));
  if (avisos.length) { console.log('\nFalta:\n  ' + avisos.join('\n  ')); process.exitCode = 1; return; }
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'construir.js')], { stdio: 'inherit' });
  if (r.status) process.exitCode = r.status;
  else console.log('\nPróximo passo: revise, faça o commit e crie a etiqueta v' + nova + ' (veja PUBLICAR.md).');
}

if (require.main === module) {
  try { principal(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
}
module.exports = { notasDa, proxima };
