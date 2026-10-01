#!/usr/bin/env node
'use strict';
// Acrescenta um caso à suíte de testes e grava o resultado esperado com o interpretador atual.
//
//   node ferramentas/novo-caso.js <pasta> "<nome do caso>" <programa.cordel> [opções]
//
//   pasta: execucao, telas ou diagnostico
//   --planilhas a.csv,b.csv     planilhas de testes/planilhas usadas pelo programa
//   --respostas "Ana|30"        respostas para pergunte(…), separadas por |
//   --passos passos.json        (telas) lista de toques: [["descrição", id, valor], …]
//   --memoria nome              (telas) memória compartilhada com outros casos de mesmo nome
//   --modulos pasta             pasta (dentro de testes/modulos) com os módulos que o programa usa
//   --rede respostas.json       respostas da internet: { "https://…": { "status": 200, "tipo": "…", "texto": "…" } }
//
// Revise o arquivo .esperado gerado: ele passa a ser a verdade da suíte.
const fs = require('fs');
const path = require('path');
const Cordel = require('../lib/cordel.js');
const R = require('../testes/rodar.js');

const [pasta, nome, arquivo, ...resto] = process.argv.slice(2);
if (!['execucao', 'telas', 'diagnostico'].includes(pasta) || !nome || !arquivo) {
  console.error('Uso: node ferramentas/novo-caso.js <execucao|telas|diagnostico> "<nome>" <programa.cordel> [opções]');
  process.exit(2);
}
const opc = {};
for (let i = 0; i < resto.length; i += 2) opc[resto[i].replace(/^--/, '')] = resto[i + 1];

const dir = path.join(__dirname, '..', 'testes', pasta);
const casos = JSON.parse(fs.readFileSync(path.join(dir, 'casos.json'), 'utf8'));
const slug = Cordel.norm(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
const largura = Math.max(2, String(casos.length + 1).length);
const alvo = String(casos.length + 1).padStart(largura, '0') + '-' + slug + '.cordel';
const src = fs.readFileSync(arquivo, 'utf8').replace(/\r\n?/g, '\n').replace(/\n*$/, '\n');

const caso = { nome, arquivo: alvo };
if (opc.planilhas) caso.planilhas = opc.planilhas.split(',');
if (opc.respostas) caso.respostas = opc.respostas.split('|');
if (opc.passos) caso.passos = JSON.parse(fs.readFileSync(opc.passos, 'utf8'));
if (opc.memoria) caso.memoria = opc.memoria;
if (opc.modulos) caso.modulos = opc.modulos;
if (opc.rede) caso.rede = JSON.parse(fs.readFileSync(opc.rede, 'utf8'));

fs.writeFileSync(path.join(dir, alvo), src);
const obtido = pasta === 'execucao' ? R.executarPrograma(src, caso) : pasta === 'telas' ? R.executarTela(src, caso, new Map()) : R.diagnosticar(src, caso);
fs.writeFileSync(path.join(dir, alvo.replace(/\.cordel$/, '.esperado')), obtido);
casos.push(caso);
fs.writeFileSync(path.join(dir, 'casos.json'), JSON.stringify(casos, null, 2) + '\n');
console.log('caso acrescentado: testes/' + pasta + '/' + alvo + '\n');
process.stdout.write(obtido);
