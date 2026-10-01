'use strict';
// Gera um app em um único arquivo .html a partir de um programa com tela.
// O arquivo leva o interpretador, o motor de telas, as planilhas e os módulos usados: funciona sem internet.
const fs = require('fs');
const path = require('path');
const Cordel = require('./cordel.js');

const js = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const escH = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lib = n => fs.readFileSync(path.join(__dirname, n), 'utf8');

// Devolve { html, titulo, slug }, ou { erro } se o programa falhar ao abrir, ou { semTela: true }.
function gerarApp(src, arquivos, modulos, buscar) {
  const usados = Cordel.modulosUsados(src, modulos);
  const s = Cordel.start(src, { app: true, files: arquivos || [], modulos: usados, buscar: buscar || null, storage: { get: () => null, set: () => {} } });
  if (s.res.error) return { erro: s.res.error };
  if (!s.temTela) return { semTela: true };
  const titulo = (s.res.ui && s.res.ui.title) || 'Meu app';
  const slug = (Cordel.norm(titulo).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'app').slice(0, 40);
  const html = '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
    '<meta name="generator" content="Cordel ' + Cordel.version + '">\n' +
    '<title>' + escH(titulo) + '</title>\n' +
    '<style>html,body{margin:0;min-height:100%}body{background:var(--cx-fundo)}\n' + lib('app.css') + '</style>\n' +
    '</head>\n<body class="cx-host">\n<div id="app"></div>\n' +
    '<script>' + lib('cordel.js') + '<\/script>\n' +
    '<script>' + lib('app.js') + '<\/script>\n' +
    '<script>CordelApp.iniciar(document.getElementById("app"), ' + js(src) + ', ' + js({ chave: slug, arquivos: arquivos || [], modulos: usados }) + ');<\/script>\n' +
    '</body>\n</html>\n';
  return { html, titulo, slug };
}

module.exports = { gerarApp };
