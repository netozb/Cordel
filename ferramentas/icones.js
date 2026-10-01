// Gera os ícones PNG da extensão a partir de SVG (precisa do Playwright com Chromium).
//   node ferramentas/icones.js   (precisa de npm ci e npx playwright install chromium)
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULO || 'playwright');

const marca = (fundo) => `
  ${fundo ? '<rect width="128" height="128" rx="28" fill="#15171A"/>' : ''}
  <path d="M 76 36.5 A 31 31 0 1 0 76 91.5" fill="none" stroke="#E8C23A" stroke-width="15" stroke-linecap="round"/>
  <rect x="80" y="51" width="27" height="7.5" rx="3.75" fill="${fundo ? '#F3EBD8' : '#9AA3AD'}"/>
  <rect x="80" y="63" width="19" height="7.5" rx="3.75" fill="${fundo ? '#F3EBD8' : '#9AA3AD'}" opacity=".72"/>
  <rect x="80" y="75" width="23" height="7.5" rx="3.75" fill="${fundo ? '#F3EBD8' : '#9AA3AD'}" opacity=".48"/>`;
const svg = (tam, fundo) => `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 128 128">${marca(fundo)}</svg>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 1 });
  for (const [nome, tam, fundo] of [['cordel.png', 256, true], ['arquivo.png', 64, false]]) {
    await p.setViewportSize({ width: tam, height: tam });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg(tam, fundo)}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, nome), omitBackground: true, clip: { x: 0, y: 0, width: tam, height: tam } });
  }
  await b.close();
  console.log('ícones gerados');
})();
