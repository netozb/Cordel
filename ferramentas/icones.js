#!/usr/bin/env node
'use strict';
// Gera os ícones PNG a partir do desenho em SVG (precisa do Playwright com Chromium):
//   editores/vscode/icones/   ícone da extensão e dos arquivos .cordel
//   web/icones/               ícones do app instalável (celular e computador)
//
//   node ferramentas/icones.js   (depois de npm ci e npx playwright install chromium)
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULO || 'playwright');

const RAIZ = path.join(__dirname, '..');
const traco = claro => `
  <path d="M 76 36.5 A 31 31 0 1 0 76 91.5" fill="none" stroke="#E8C23A" stroke-width="15" stroke-linecap="round"/>
  <rect x="80" y="51" width="27" height="7.5" rx="3.75" fill="${claro ? '#F3EBD8' : '#9AA3AD'}"/>
  <rect x="80" y="63" width="19" height="7.5" rx="3.75" fill="${claro ? '#F3EBD8' : '#9AA3AD'}" opacity=".72"/>
  <rect x="80" y="75" width="23" height="7.5" rx="3.75" fill="${claro ? '#F3EBD8' : '#9AA3AD'}" opacity=".48"/>`;
// forma: 'cartao' (cantos arredondados), 'cheio' (fundo até a borda, para máscaras do Android) ou 'solto' (sem fundo)
function svg(tam, forma) {
  const fundo = forma === 'cartao' ? '<rect width="128" height="128" rx="28" fill="#15171A"/>' : forma === 'cheio' ? '<rect width="128" height="128" fill="#15171A"/>' : '';
  // na versão cheia, o desenho encolhe para caber no círculo seguro (80% do centro)
  const desenho = forma === 'cheio' ? `<g transform="translate(64 64) scale(.72) translate(-64 -64)">${traco(true)}</g>` : traco(forma !== 'solto');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 128 128">${fundo}${desenho}</svg>`;
}
const ALVOS = [
  ['editores/vscode/icones/cordel.png', 256, 'cartao'],
  ['editores/vscode/icones/arquivo.png', 64, 'solto'],
  ['web/icones/icone-192.png', 192, 'cartao'],
  ['web/icones/icone-512.png', 512, 'cartao'],
  ['web/icones/icone-mascara-512.png', 512, 'cheio'],
  ['web/icones/icone-apple-180.png', 180, 'cheio'],
  ['web/icones/icone-32.png', 32, 'cartao'],
];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 1 });
  for (const [rel, tam, forma] of ALVOS) {
    const destino = path.join(RAIZ, rel);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    await p.setViewportSize({ width: tam, height: tam });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg(tam, forma)}</body></html>`);
    await p.screenshot({ path: destino, omitBackground: true, clip: { x: 0, y: 0, width: tam, height: tam } });
  }
  await b.close();
  console.log('ícones gerados: ' + ALVOS.map(a => a[0]).join(', '));
})();
