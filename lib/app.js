/* Cordel — motor de telas: desenha a tela descrita pelo programa e liga os toques ao interpretador. */
(function (root) {
'use strict';
const d = () => root.document;
let digitando = null; // o campo que a pessoa está digitando agora: não é sobrescrito

function criar(n) {
  const doc = d(); let el;
  switch (n.t) {
    case 'tela': el = doc.createElement('div'); el.className = 'cx-app'; el.innerHTML = '<header class="cx-barra"><button type="button" class="cx-voltar" data-acao="voltar" aria-label="Voltar">‹</button><span class="cx-barra-titulo"></span></header><nav class="cx-abas" aria-label="Páginas"></nav><main class="cx-corpo"></main>'; break;
    case 'grafico': el = doc.createElement('div'); el.className = 'cx-grafico-caixa'; break;
    case 'titulo': el = doc.createElement('h1'); el.className = 'cx-titulo'; break;
    case 'subtitulo': el = doc.createElement('h2'); el.className = 'cx-subtitulo'; break;
    case 'texto': el = doc.createElement('p'); el.className = 'cx-texto'; break;
    case 'botao': el = doc.createElement('button'); el.type = 'button'; el.className = 'cx-botao'; break;
    case 'campo': el = doc.createElement('label'); el.className = 'cx-campo'; el.innerHTML = '<span></span><input autocomplete="off">'; break;
    case 'seletor': el = doc.createElement('label'); el.className = 'cx-campo'; el.innerHTML = '<span></span><select></select>'; break;
    case 'marque': el = doc.createElement('label'); el.className = 'cx-marque'; el.innerHTML = '<input type="checkbox"><span></span>'; break;
    case 'link': el = doc.createElement('a'); el.className = 'cx-link'; el.target = '_blank'; el.rel = 'noopener noreferrer'; break;
    case 'cartao': el = doc.createElement('section'); el.className = 'cx-cartao'; break;
    case 'linha': el = doc.createElement('div'); el.className = 'cx-linha'; break;
    case 'espaco': el = doc.createElement('div'); el.className = 'cx-espaco'; break;
    case 'tabela': el = doc.createElement('div'); el.className = 'cx-tab'; break;
    default: el = doc.createElement('div');
  }
  el.dataset.t = n.t; atualizar(el, n); return el;
}
const texto = (el, t) => { if (el.textContent !== t) el.textContent = t; };
const celula = c => typeof c === 'string' ? c : c.dt !== undefined ? c.s : c.n !== undefined ? c.n : c.b ? 'verdadeiro' : 'falso';
function atualizar(el, n) {
  switch (n.t) {
    case 'tela': {
      const barra = el.firstElementChild, voltar = barra.firstElementChild, titulo = barra.lastElementChild, abas = el.children[1];
      voltar.hidden = !n.voltar; texto(titulo, n.barra || n.title || '');
      barra.hidden = !(n.barra || n.title || n.voltar);
      el.style.setProperty('--cx-cor', n.cor || '#2B3A92');
      const chaveAbas = n.abas && n.paginas && n.paginas.length ? JSON.stringify(n.paginas) : '';
      abas.hidden = !chaveAbas;
      if (abas.dataset.k !== chaveAbas) {
        abas.dataset.k = chaveAbas; abas.innerHTML = '';
        if (chaveAbas) for (const p of n.paginas) { const b = d().createElement('button'); b.type = 'button'; b.className = 'cx-aba'; b.dataset.acao = 'ir'; b.dataset.pagina = p; b.textContent = p; abas.appendChild(b); }
      }
      for (const b of abas.children) b.setAttribute('aria-current', b.dataset.pagina === n.pagina ? 'page' : 'false');
      filhos(el.lastElementChild, n.kids); break;
    }
    case 'grafico': {
      const chave = JSON.stringify([n.title, n.labels, n.values]);
      if (el.dataset.k === chave) break; el.dataset.k = chave;
      el.innerHTML = ''; el.appendChild(grafico(n)); break;
    }
    case 'titulo': case 'subtitulo': case 'texto': texto(el, n.text); break;
    case 'botao': texto(el, n.text); el.dataset.id = n.id; break;
    case 'campo': {
      texto(el.firstElementChild, n.label);
      const inp = el.lastElementChild; inp.dataset.id = n.id;
      const tipo = n.tipo === 'data' ? 'date' : n.tipo === 'datahora' ? 'datetime-local' : 'text'; if (inp.type !== tipo) inp.type = tipo;
      inp.inputMode = n.num ? 'decimal' : 'text'; inp.placeholder = n.num ? '0' : '';
      const v = n.num && n.value === '0' ? '' : n.value;
      if (inp !== digitando && inp.value !== v) inp.value = v;
      break;
    }
    case 'seletor': {
      texto(el.firstElementChild, n.label);
      const s = el.lastElementChild; s.dataset.id = n.id;
      const chave = JSON.stringify(n.options) + (n.value < 0 ? '?' : '');
      if (s.dataset.k !== chave) {
        s.innerHTML = ''; s.dataset.k = chave;
        if (n.value < 0) { const o = d().createElement('option'); o.value = ''; o.textContent = 'Escolha…'; o.disabled = true; s.appendChild(o); }
        n.options.forEach((t, i) => { const o = d().createElement('option'); o.value = String(i); o.textContent = t; s.appendChild(o); });
      }
      s.value = n.value < 0 ? '' : String(n.value); break;
    }
    case 'marque': { const inp = el.firstElementChild; inp.dataset.id = n.id; inp.checked = !!n.value; texto(el.lastElementChild, n.label); break; }
    case 'link': texto(el, n.text); if (el.getAttribute('href') !== n.href) el.setAttribute('href', n.href); break;
    case 'cartao': case 'linha': filhos(el, n.kids); break;
    case 'tabela': {
      const chave = JSON.stringify([n.cols, n.rows]);
      if (el.dataset.k === chave) break; el.dataset.k = chave;
      const doc = d(); const t = doc.createElement('table');
      const numerica = (n.cols || []).map((_, i) => n.rows.every(r => r[i] === '' || (r[i] && r[i].n !== undefined)) && n.rows.some(r => r[i] && r[i].n !== undefined));
      if (n.cols) { const tr = t.createTHead().insertRow(); n.cols.forEach((c, i) => { const th = doc.createElement('th'); th.textContent = c; if (numerica[i]) th.className = 'n'; tr.appendChild(th); }); }
      const tb = t.createTBody();
      for (const r of n.rows) { const tr = tb.insertRow(); r.forEach((c, i) => { const td = tr.insertCell(); td.textContent = celula(c); if (numerica[i]) td.className = 'n'; }); }
      el.innerHTML = ''; el.appendChild(t);
      break;
    }
  }
}
const fmtNum = x => Number(x).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
// Barras horizontais: uma cor, base reta, ponta arredondada, valor na ponta, tabela para quem precisa.
function grafico(n) {
  const doc = d(); const fig = doc.createElement('figure'); fig.className = 'cx-grafico';
  const cap = doc.createElement('figcaption'); cap.className = 'cx-graf-titulo'; cap.textContent = n.title || n.campo || ''; if (cap.textContent) fig.appendChild(cap);
  const vals = n.values.map(Number);
  const min = Math.min(0, ...vals), max = Math.max(0, ...vals), span = (max - min) || 1, ESC = 76;
  const zero = (-min / span) * ESC;
  const lista = doc.createElement('div'); lista.className = 'cx-graf-linhas'; lista.setAttribute('role', 'list');
  n.labels.forEach((rot, i) => {
    const v = vals[i], w = Math.abs(v) / span * ESC;
    const linha = doc.createElement('div'); linha.className = 'cx-graf-linha'; linha.setAttribute('role', 'listitem');
    linha.title = rot + ': ' + fmtNum(n.values[i]);
    const r = doc.createElement('span'); r.className = 'cx-graf-rot'; r.textContent = rot;
    const trilha = doc.createElement('span'); trilha.className = 'cx-graf-trilha';
    if (min < 0) { const z = doc.createElement('span'); z.className = 'cx-graf-zero'; z.style.left = zero + '%'; trilha.appendChild(z); }
    const b = doc.createElement('span'); b.className = 'cx-graf-barra' + (v < 0 ? ' neg' : '');
    b.style.marginLeft = (v < 0 ? zero - w : zero) + '%'; b.style.width = Math.max(w, v === 0 ? 0 : 0.6) + '%';
    const val = doc.createElement('span'); val.className = 'cx-graf-val'; val.textContent = fmtNum(n.values[i]);
    trilha.appendChild(b); trilha.appendChild(val);
    linha.appendChild(r); linha.appendChild(trilha); lista.appendChild(linha);
  });
  fig.appendChild(lista);
  if (n.total > n.labels.length) { const nota = doc.createElement('p'); nota.className = 'cx-graf-nota'; nota.textContent = 'Mostrando ' + n.labels.length + ' de ' + n.total; fig.appendChild(nota); }
  const det = doc.createElement('details'); det.className = 'cx-graf-tab';
  const sum = doc.createElement('summary'); sum.textContent = 'Ver como tabela'; det.appendChild(sum);
  const t = doc.createElement('table'); const tr0 = t.createTHead().insertRow();
  for (const h of ['', n.campo || 'valor']) { const th = doc.createElement('th'); th.textContent = h; tr0.appendChild(th); }
  tr0.lastChild.className = 'n';
  const tb = t.createTBody(); n.labels.forEach((rot, i) => { const tr = tb.insertRow(); tr.insertCell().textContent = rot; const c = tr.insertCell(); c.textContent = fmtNum(n.values[i]); c.className = 'n'; });
  det.appendChild(t); fig.appendChild(det);
  return fig;
}
function filhos(pai, kids) {
  for (let i = 0; i < kids.length; i++) {
    const n = kids[i], el = pai.children[i];
    if (el && el.dataset.t === n.t) atualizar(el, n);
    else { const novo = criar(n); if (el) pai.replaceChild(novo, el); else pai.appendChild(novo); }
  }
  while (pai.children.length > kids.length) pai.lastElementChild.remove();
}
function desenhar(container, ui) {
  const el = container.firstElementChild;
  if (el && el.dataset.t === 'tela') atualizar(el, ui);
  else { container.innerHTML = ''; container.appendChild(criar(ui)); }
}

// Busca um endereço sem travar a tela: { status, tipo, texto } ou { erro, detalhe }.
async function buscar(pedido) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = setTimeout(() => { if (ctl) ctl.abort(); }, 15000);
  try {
    const r = await root.fetch(pedido.url, { headers: pedido.cabecalhos || {}, signal: ctl ? ctl.signal : undefined });
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 10 * 1024 * 1024) return { erro: 'grande' };
    const tipo = r.headers.get('content-type') || '';
    const cs = /charset=([^;]+)/i.exec(tipo);
    let texto; try { texto = new TextDecoder(cs ? cs[1].trim() : 'utf-8').decode(buf); } catch (e) { texto = new TextDecoder('utf-8').decode(buf); }
    return { status: r.status, tipo, texto };
  } catch (e) {
    return { erro: e && e.name === 'AbortError' ? 'tempo' : 'rede', segundos: 15, detalhe: String((e && e.message) || e) };
  } finally { clearTimeout(t); }
}

// Monta um app num elemento. onSaida(r, doEvento) recebe console, erros e arquivos.
// Se o programa usa busque, as respostas chegam sem travar a tela: o toque é repetido quando elas chegam.
function montar(container, src, opts) {
  opts = opts || {};
  const onSaida = opts.onSaida || function () {};
  const buscarAgora = opts.buscar || buscar;
  container.classList.add('cx-host');
  const rede = {}; // respostas já buscadas enquanto o app está aberto
  const abrir = () => root.Cordel.start(src, { app: true, storage: opts.storage, files: opts.files || [], modulos: opts.modulos || null, rede, maxSteps: opts.maxSteps || 5000000 });
  let sess = abrir(), vivo = true, ocupado = false, pagina = null;
  const fila = [];
  const buscando = on => container.classList.toggle('cx-buscando', !!on);
  async function comecar() {
    while (vivo && sess.res.busca) { buscando(true); rede[sess.res.busca.chave] = await buscarAgora(sess.res.busca); sess = abrir(); }
    buscando(false);
    if (!vivo) return sess.res;
    pagina = sess.res.ui ? sess.res.ui.pagina : null;
    if (sess.res.ui) desenhar(container, sess.res.ui); else container.innerHTML = '';
    onSaida(sess.res, false);
    return sess.res;
  }
  async function disparar(id, valor) {
    if (ocupado) { fila.push([id, valor]); return; } // toques durante uma busca esperam a vez
    ocupado = true;
    try {
      let r = sess.event(id, valor);
      while (vivo && r.busca) {
        buscando(true);
        const resp = await buscarAgora(r.busca);
        rede[r.busca.chave] = resp; sess.lembrar(r.busca.chave, resp);
        r = sess.event(id, valor);
      }
      buscando(false);
      if (!vivo) return;
      if (r.ui) {
        desenhar(container, r.ui);
        if (r.ui.pagina !== pagina) { pagina = r.ui.pagina; const top = container.getBoundingClientRect().top; if (top < 0) container.scrollIntoView({ block: 'start' }); }
      }
      onSaida(r, true);
    } finally {
      ocupado = false;
      if (vivo && fila.length) { const [i, v] = fila.shift(); disparar(i, v); }
    }
  }
  const clique = ev => {
    const a = ev.target.closest('[data-acao]');
    if (a && container.contains(a)) { ev.preventDefault(); if (a.dataset.acao === 'voltar') disparar('voltar'); else disparar('ir', a.dataset.pagina); return; }
    const b = ev.target.closest('button[data-id]'); if (b && container.contains(b)) { ev.preventDefault(); disparar(+b.dataset.id); }
  };
  const entrada = ev => { const el = ev.target; if (el.matches('input[data-id]:not([type=checkbox])')) { digitando = el; try { disparar(+el.dataset.id, el.value); } finally { digitando = null; } } };
  const mudanca = ev => {
    const el = ev.target;
    if (el.matches('input[type=checkbox][data-id]')) disparar(+el.dataset.id, el.checked);
    else if (el.matches('select[data-id]') && el.value !== '') disparar(+el.dataset.id, el.value);
  };
  const tecla = ev => {
    const el = ev.target;
    if (ev.key !== 'Enter' || !el.matches('input[data-id]:not([type=checkbox])')) return;
    const grupo = el.closest('.cx-linha, .cx-cartao'); const b = grupo && grupo.querySelector('button[data-id]');
    if (b) { ev.preventDefault(); b.click(); setTimeout(() => { const i = container.querySelector('input[data-id="' + el.dataset.id + '"]'); if (i) i.focus(); }, 0); }
  };
  container.addEventListener('click', clique); container.addEventListener('input', entrada);
  container.addEventListener('change', mudanca); container.addEventListener('keydown', tecla);
  const pronto = comecar();
  return {
    get res() { return sess.res; }, get temTela() { return sess.temTela; }, pronto,
    desmontar() { vivo = false; container.removeEventListener('click', clique); container.removeEventListener('input', entrada); container.removeEventListener('change', mudanca); container.removeEventListener('keydown', tecla); },
  };
}
function memoriaLocal(prefixo) {
  return {
    get(k) { try { return root.localStorage.getItem(prefixo + k); } catch (e) { return null; } },
    set(k, v) { try { root.localStorage.setItem(prefixo + k, v); } catch (e) { /* sem memória neste navegador */ } },
    limpar() { try { const ls = root.localStorage; for (let i = ls.length - 1; i >= 0; i--) { const k = ls.key(i); if (k && k.indexOf(prefixo) === 0) ls.removeItem(k); } } catch (e) { /* nada */ } },
  };
}
// App autônomo (arquivo .html exportado): memória no aparelho e aviso de erro na própria tela.
function iniciar(container, src, cfg) {
  cfg = cfg || {};
  const aviso = d().createElement('div'); aviso.className = 'cx-erro'; aviso.hidden = true; aviso.setAttribute('role', 'alert');
  const onSaida = r => {
    if (r.error) { aviso.textContent = 'Erro ' + (r.error.arquivo ? 'no módulo "' + r.error.arquivo + '", ' : 'na ') + 'linha ' + r.error.line + ': ' + r.error.msg + (r.error.dica ? ' ' + r.error.dica : ''); aviso.hidden = false; }
    else aviso.hidden = true;
    const corpo = container.querySelector('.cx-corpo') || container;
    if (aviso.parentNode !== corpo) corpo.appendChild(aviso);
  };
  return montar(container, src, { storage: memoriaLocal('cordel:' + (cfg.chave || 'app') + ':'), files: cfg.arquivos || [], modulos: cfg.modulos || null, onSaida });
}

root.CordelApp = { montar, iniciar, memoriaLocal, desenhar, grafico, buscar };
})(typeof window !== 'undefined' ? window : globalThis);
