'use strict';
// busque(…) no computador: a busca roda num processo auxiliar do Node e o programa espera a resposta.
// Assim o interpretador continua simples (sem espera assíncrona) e o tempo limite é garantido.
const cp = require('child_process');

const LIMITE = 10 * 1024 * 1024; // 10 MB
const TEMPO = Number(process.env.CORDEL_TEMPO_BUSCA) || 15000; // ms

const AUXILIAR = `
const [url, cabecalhos, limite, tempo] = JSON.parse(process.argv[1]);
const fim = o => process.stdout.write(JSON.stringify(o));
(async () => {
  try {
    const r = await fetch(url, { headers: cabecalhos, redirect: 'follow', signal: AbortSignal.timeout(tempo) });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > limite) return fim({ erro: 'grande' });
    const tipo = r.headers.get('content-type') || '';
    const cs = /charset=([^;]+)/i.exec(tipo);
    let texto; try { texto = new TextDecoder(cs ? cs[1].trim() : 'utf-8').decode(buf); } catch (e) { texto = buf.toString('utf8'); }
    fim({ status: r.status, tipo, texto });
  } catch (e) {
    const causa = e && e.cause && (e.cause.code || e.cause.message);
    fim({ erro: e && (e.name === 'TimeoutError' || e.name === 'AbortError') ? 'tempo' : 'rede', segundos: tempo / 1000, detalhe: String(causa || (e && e.message) || e) });
  }
})();
`;

// Devolve { status, tipo, texto } ou { erro: 'rede' | 'tempo' | 'grande', detalhe }.
function buscarSincrono(url, cabecalhos) {
  const r = cp.spawnSync(process.execPath, ['-e', AUXILIAR, JSON.stringify([url, cabecalhos || {}, LIMITE, TEMPO])], {
    encoding: 'utf8', maxBuffer: 4 * LIMITE, timeout: TEMPO + 10000, windowsHide: true,
    // dentro do VS Code, o executável é o Electron: esta variável o faz agir como Node
    env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1' }),
  });
  if (r.error) return { erro: r.error.code === 'ETIMEDOUT' ? 'tempo' : 'rede', segundos: TEMPO / 1000, detalhe: r.error.message };
  try { return JSON.parse(r.stdout); } catch (e) { return { erro: 'rede', detalhe: (r.stderr || 'sem resposta').trim().split('\n').pop() }; }
}

// Uma função de busca que lembra as respostas: útil quando o programa roda de novo (pergunte).
function lembrarBuscas() {
  const memo = new Map();
  return (url, cabecalhos) => {
    const k = url + '\u0000' + JSON.stringify(cabecalhos || {});
    if (!memo.has(k)) memo.set(k, buscarSincrono(url, cabecalhos));
    return memo.get(k);
  };
}

module.exports = { buscarSincrono, lembrarBuscas };
