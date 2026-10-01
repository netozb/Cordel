#!/usr/bin/env node
'use strict';
// Servidor local para os testes de busque: responde sempre igual, sem depender da internet.
// Escreve a porta na primeira linha da saída e fica no ar até o processo ser encerrado.
const http = require('http');

const EMPRESA = {
  cnpj: '11222333000181',
  razao_social: 'MÓVEIS MANDACARU LTDA',
  nome_fantasia: 'Mandacaru',
  descricao_situacao_cadastral: 'ATIVA',
  data_inicio_atividade: '1998-03-15',
  capital_social: 12345678901234.56,
  uf: 'CE',
  municipio: 'IGUATU',
  qsa: [{ nome_socio: 'ANA SILVA', qualificacao_socio: 'Sócio-Administrador' }, { nome_socio: 'JOÃO SOUZA', qualificacao_socio: 'Sócio' }],
  observacao: null,
  optante_simples: true,
};

const rotas = {
  '/cnpj/11222333000181': (req, res) => json(res, 200, EMPRESA, true),
  '/cnpj/00000000000000': (req, res) => json(res, 404, { message: 'CNPJ não encontrado' }),
  '/vendas.csv': (req, res) => texto(res, 200, 'text/csv; charset=utf-8', 'Filial;Total\nCrato;1.500,50\nIguatu;980,00\n'),
  '/vendas.json': (req, res) => json(res, 200, [{ filial: 'Crato', total: 1500.5 }, { filial: 'Iguatu', total: 980 }]),
  '/texto': (req, res) => texto(res, 200, 'text/plain; charset=utf-8', 'Olá do servidor'),
  '/ruim': (req, res) => texto(res, 200, 'application/json', '{"a": 1,'),
  '/eco': (req, res) => json(res, 200, { token: req.headers['x-token'] || '' }),
  '/erro': (req, res) => json(res, 500, { message: 'falhou' }),
  '/lento': (req, res) => setTimeout(() => json(res, 200, { ok: true }), 3000),
};
function cabecalhos(res, tipo) {
  res.setHeader('Content-Type', tipo);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
}
function json(res, status, obj, exato) {
  cabecalhos(res, 'application/json; charset=utf-8');
  res.statusCode = status;
  // o capital social vai com todas as casas, como uma API de verdade mandaria
  let s = JSON.stringify(obj);
  if (exato) s = s.replace('12345678901234.56', '12345678901234.567890');
  res.end(s);
}
function texto(res, status, tipo, t) { cabecalhos(res, tipo); res.statusCode = status; res.end(t); }

const servidor = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { cabecalhos(res, 'text/plain'); res.statusCode = 204; return res.end(); }
  const rota = rotas[req.url.split('?')[0]];
  if (rota) rota(req, res); else texto(res, 404, 'text/plain', 'não encontrado');
});
servidor.listen(0, '127.0.0.1', () => console.log(servidor.address().port));
