// Service worker do editor Cordel no site: guarda o app para funcionar sem internet e recebe
// arquivos compartilhados por outros apps (como o WhatsApp no Android), que chegam por POST em
// ./compartilhar e ficam guardados até a página buscá-los.
const VERSAO = '@VERSAO@';
const CACHE = 'cordel-' + VERSAO;
const COMPARTILHADOS = 'cordel-compartilhados';
const APP = ['./', 'index.html', 'manifest.webmanifest', 'icones/icone-32.png', 'icones/icone-192.png', 'icones/icone-512.png', 'icones/icone-mascara-512.png', 'icones/icone-apple-180.png'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(nomes => Promise.all(nomes.filter(n => n.startsWith('cordel-') && n !== CACHE && n !== COMPARTILHADOS).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', ev => {
  const req = ev.request, url = new URL(req.url);
  if (req.method === 'POST' && url.origin === location.origin && url.pathname.endsWith('/compartilhar')) { ev.respondWith(receber(req)); return; }
  if (req.method !== 'GET' || url.origin !== location.origin) return; // fontes e endereços de fora: direto pela rede
  // o que está guardado abre na hora; a cópia nova vem da rede e fica para a próxima vez
  ev.respondWith(caches.open(CACHE).then(async c => {
    const guardado = await c.match(req, { ignoreSearch: true });
    const daRede = fetch(req).then(r => { if (r.ok && r.type === 'basic') c.put(req, r.clone()); return r; }).catch(() => null);
    if (guardado) { ev.waitUntil(daRede); return guardado; }
    const r = await daRede;
    if (r) return r;
    return (req.mode === 'navigate' && await c.match('index.html')) || new Response('Sem internet e sem cópia guardada.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});

async function receber(req) {
  try {
    const dados = await req.formData(), c = await caches.open(COMPARTILHADOS);
    for (const f of dados.getAll('arquivos')) {
      if (!f || typeof f === 'string' || !f.name) continue;
      await c.put(new Request('compartilhados/' + encodeURIComponent(f.name)), new Response(f, { headers: { 'Content-Type': f.type || 'application/octet-stream' } }));
    }
  } catch (e) { /* nada a guardar */ }
  return Response.redirect(new URL('./?compartilhado=1', self.registration.scope).href, 303);
}
