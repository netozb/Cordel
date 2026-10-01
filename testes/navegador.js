#!/usr/bin/env node
'use strict';
// Testes do editor no navegador (dist/cordel.html) com o Chromium do Playwright.
//
//   npm run construir && npm run testar:navegador
//
// Precisa do Playwright: npm install --no-save playwright && npx playwright install chromium
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.error('Este teste precisa do Playwright: npm install --no-save playwright && npx playwright install chromium');
  process.exit(2);
}
const RAIZ = path.join(__dirname, '..');
const PAGINA = 'file://' + path.join(RAIZ, 'dist', 'cordel.html');
const VERSAO = require('../package.json').version;
if (!fs.existsSync(path.join(RAIZ, 'dist', 'cordel.html'))) { console.error('Falta dist/cordel.html: rode npm run construir'); process.exit(2); }

let falhas = 0, total = 0;
function confira(nome, ok, detalhe) {
  total++;
  if (ok) console.log('  ✓ ' + nome);
  else { falhas++; console.log('  ✗ ' + nome + (detalhe !== undefined ? '\n      ' + String(detalhe).split('\n').join('\n      ') : '')); }
}
const subirServidor = () => new Promise((res, rej) => {
  const p = cp.spawn(process.execPath, [path.join(__dirname, 'servidor.js')]);
  p.stdout.once('data', d => res({ porta: parseInt(String(d), 10), parar: () => p.kill() }));
  p.once('error', rej);
});

(async () => {
  const srv = await subirServidor();
  const base = 'http://127.0.0.1:' + srv.porta;
  const navegador = await chromium.launch();
  const erros = [];
  const nova = async (opcoes, programas) => {
    const ctx = await navegador.newContext(Object.assign({ viewport: { width: 1360, height: 900 }, acceptDownloads: true }, opcoes || {}));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    if (programas) await ctx.addInitScript(p => { if (!sessionStorage.getItem('pronto')) { sessionStorage.setItem('pronto', '1'); localStorage.setItem('cordel.programas', p); } }, JSON.stringify(programas));
    const p = await ctx.newPage();
    p.on('pageerror', e => erros.push('erro na página: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/net::|Failed to load resource/.test(m.text())) erros.push('console: ' + m.text()); });
    return p;
  };
  try {
    // ── abre, roda o tour, versão
    let p = await nova();
    await p.goto(PAGINA); await p.waitForTimeout(900);
    confira('abre e mostra a versão ' + VERSAO, (await p.textContent('#versao')) === 'v' + VERSAO, await p.textContent('#versao'));
    confira('roda o tour', (await p.$$eval('#console .c-out', x => x.length)) > 3);

    // ── diagnóstico e formatador
    await p.fill('#codigo', 'SE 1<2 ENTAO\nmostre  "oi" ,1+1\nFIM\nmostre precco\n'); await p.waitForTimeout(600);
    confira('diagnóstico aponta o nome que não existe', (await p.textContent('#st-e')) === '1');
    await p.fill('#codigo', 'SE 1<2 ENTAO\nmostre  "oi" ,1+1\nFIM\n'); await p.waitForTimeout(300);
    await p.click('#formatar'); await p.waitForTimeout(200);
    confira('formata no formato oficial', (await p.inputValue('#codigo')) === 'se 1 < 2 então\n  mostre "oi", 1 + 1\nfim\n', await p.inputValue('#codigo'));

    // ── datas com hora
    await p.fill('#codigo', 'e1 = data("03/09/2026 08:15")\nmostre e1.minutos_até(data("03/09/2026 17:40")), e1.horário\n');
    await p.click('#rodar'); await p.waitForTimeout(500);
    confira('datas com hora', (await p.textContent('#console .c-out')) === '565 08:15', await p.textContent('#console'));

    // ── origem: tocar num valor ou numa linha mostra de onde veio
    await p.fill('#codigo', 'vendas = tabela("vendas_exemplo.csv")\nmostre "Total: {vendas.soma(v => v.total).dinheiro}"\nmostre vendas.transforme(v => {nota: v.nota, total: v.total}).pegue(3)\n');
    await p.click('#rodar'); await p.waitForTimeout(600);
    confira('origem: o valor mostrado vira botão', (await p.textContent('#console .c-orig')) === 'Total: R$ 106.358,33', await p.textContent('#console'));
    await p.click('#console .c-orig'); await p.waitForTimeout(200);
    confira('origem: tocar mostra as células e as linhas', (await p.textContent('#console .c-orig-painel .c-orig-texto')) === '42 células de vendas_exemplo.csv (coluna Total; linhas 2 a 43)' && (await p.$$eval('#console .c-orig-painel tbody tr', x => x.length)) === 20);
    await p.click('#console .c-orig-painel .c-orig-fechar'); await p.waitForTimeout(100);
    confira('origem: fechar', !(await p.$('#console .c-orig-painel')));
    await p.click('#console tr.c-tr-orig >> nth=1'); await p.waitForTimeout(200);
    confira('origem: tocar numa linha da tabela', (await p.textContent('#console .c-orig-painel .c-orig-texto')) === 'vendas_exemplo.csv, linha 3 (coluna Total)', await p.textContent('#console .c-orig-painel'));
    confira('arquivos de exemplo: só o que o código cita aparece', (await p.$$eval('.arq-nome', x => x.map(e => e.textContent))).join(',') === 'vendas_exemplo.csv');
    await p.selectOption('#programa', { label: 'Conciliação de vendas com o extrato' }); await p.waitForTimeout(800);
    confira('exemplo de conciliação roda', (await p.textContent('#console .c-out')) === '40 pares (1 com diferença), 2 só no primeiro e 2 só no segundo', await p.textContent('#console'));
    confira('arquivos de exemplo: vendas e extrato', (await p.$$eval('.arq-nome', x => x.map(e => e.textContent))).join(',') === 'vendas_exemplo.csv,extrato_exemplo.csv');
    await p.selectOption('#programa', { label: 'Conferência de nota fiscal (XML da NF-e)' }); await p.waitForTimeout(800);
    confira('nota fiscal: lê o XML de exemplo', (await p.textContent('#console .c-out')) === 'NF-e 4180 de MÓVEIS MANDACARU LTDA' && (await p.textContent('.arq-info')).includes('NF-e 4180'), await p.textContent('#console'));

    // ── baixar direto (fora do Claude, sem o recurso de downloads)
    await p.fill('#codigo', 'tela "Oi"\n  mostre "olá"\nfim\n'); await p.click('#rodar'); await p.waitForTimeout(600);
    const [baixado] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('text=Baixar app').catch(() => null)]);
    confira('fora do Claude, Baixar app baixa o arquivo', baixado && baixado.suggestedFilename() === 'oi.html', baixado && baixado.suggestedFilename());
    await p.context().close();

    // ── módulos entre programas guardados
    const programas = { lista: [
      { id: 'p1', nome: 'Principal', codigo: 'use "Minhas regras"\nuse "regras" como r\nmostre dobro(21), r.limite_de_desconto\nmostre quebra(1)\n', em: 1 },
      { id: 'p2', nome: 'Minhas regras', codigo: 'função dobro(x) = x * 2\n\nfunção quebra(x) = x / 0\n', em: 1 },
      { id: 'p3', nome: 'Rede', codigo: 'empresa = busque("' + base + '/cnpj/11222333000181")\nmostre empresa.razao_social, empresa.capital_social\nmostre tabela("' + base + '/vendas.csv").soma(v => v.total)\n', em: 1 },
      { id: 'p4', nome: 'App rede', codigo: 'var cnpj = "11222333000181"\nvar consultas = 0\nvar resposta = "-"\ntela "Consulta"\n  campo "CNPJ" em cnpj\n  botão "Consultar"\n    consultas += 1\n    empresa = busque("' + base + '/cnpj/" + cnpj)\n    resposta = empresa.razao_social\n  fim\n  mostre resposta, consultas\nfim\n', em: 1 },
    ], atual: 'p1' };
    p = await nova({}, programas);
    await p.goto(PAGINA); await p.waitForTimeout(1200);
    confira('módulos: use de outro programa e de um exemplo', (await p.$$eval('#console .c-out', x => x.map(e => e.textContent))).join('|') === '42 15', await p.textContent('#console'));
    confira('módulos: erro aponta o módulo', (await p.textContent('#console .c-err-ir')).includes('Minhas regras'));
    confira('módulos: diagnóstico conhece os nomes', (await p.textContent('#st-e')) === '0');
    await p.click('#console .c-err-ir'); await p.waitForTimeout(600);
    confira('módulos: tocar no erro abre o módulo na linha', (await p.textContent('#prog-titulo')).includes('Minhas regras') && (await p.textContent('#st-pos')).startsWith('Ln 3'));

    // ── busque no editor (worker) e num app (sem travar a tela)
    await p.selectOption('#programa', { label: 'Rede' }); await p.waitForTimeout(1000);
    confira('busque no editor', (await p.$$eval('#console .c-out', x => x.map(e => e.textContent))).join('|') === 'MÓVEIS MANDACARU LTDA 12345678901234.56789|2480.5', await p.textContent('#console'));
    await p.selectOption('#programa', { label: 'App rede' }); await p.waitForTimeout(800);
    await p.click('#console .cx-botao'); await p.waitForTimeout(1500);
    confira('busque num app: o toque é repetido sem efeito dobrado', (await p.textContent('#console .cx-texto')) === 'MÓVEIS MANDACARU LTDA 1', await p.textContent('#console .cx-texto'));

    // ── guia e referência
    await p.goto(PAGINA + '#guia'); await p.waitForTimeout(900);
    for (const id of ['horas', 'modulos', 'internet', 'origem', 'conciliacao', 'indices']) confira('guia tem a seção ' + id, !!(await p.$('#guia-' + id)));
    confira('guia: a conciliação roda com os dois arquivos de exemplo', (await p.textContent('#guia-conciliacao .console')).includes('40 pares'));
    await p.click('#aba-ref'); await p.waitForTimeout(500);
    const secoes = await p.$$eval('.ref-sec h2', x => x.map(e => e.textContent));
    confira('referência tem as seções novas', ['Módulos', 'Internet', 'Origem dos valores', 'Conciliação', 'Índices e cotações'].every(t => secoes.includes(t)), secoes.join(', '));
    await p.context().close();

    // ── app exportado pela linha de comando, que busca ao abrir
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cordel-nav-'));
    fs.writeFileSync(path.join(dir, 'consulta.cordel'), 'empresa = busque("' + base + '/cnpj/11222333000181")\ntela "Consulta"\n  mostre empresa.razao_social\nfim\n');
    cp.execFileSync(process.execPath, [path.join(RAIZ, 'bin', 'cordel.js'), 'app', path.join(dir, 'consulta.cordel'), '-o', path.join(dir, 'consulta.html')]);
    p = await nova();
    await p.goto('file://' + path.join(dir, 'consulta.html')); await p.waitForTimeout(1200);
    confira('app exportado busca ao abrir, sem travar', (await p.textContent('.cx-texto')) === 'MÓVEIS MANDACARU LTDA');
    await p.context().close();

    // ── celular: nada passa da largura da tela
    p = await nova({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await p.goto(PAGINA); await p.waitForTimeout(900);
    confira('celular: sem rolagem para os lados', (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    await p.context().close();

    confira('nenhum erro no console', erros.length === 0, erros.join('\n'));
  } finally { await navegador.close(); srv.parar(); }
  console.log((falhas ? '  ' + falhas + ' de ' + total + ' verificações falharam' : '  ✓ navegador: ' + total + ' verificações passaram'));
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
