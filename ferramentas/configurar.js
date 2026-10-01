#!/usr/bin/env node
'use strict';
// Põe os seus dados de publicação em todos os arquivos de uma vez. Rode uma vez, antes de publicar.
//
//   npm run configurar -- --github usuario/cordel --editor meu-publicador [--autor "Nome"] [--email eu@exemplo.com] [--npm nome-no-npm]
//
//   --github   usuário (ou organização) e repositório no GitHub
//   --editor   o identificador de publicador no Visual Studio Marketplace (e no Open VSX)
//   --autor    nome que aparece como autor e na licença
//   --email    e-mail do autor (opcional)
//   --npm      nome do pacote no npm, se "cordel" não estiver livre (ex.: @usuario/cordel)
//   --selos    selos de versão no README depois de publicar: npm, vscode ou npm,vscode
//
// Sem opções, mostra a configuração atual.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const arq = rel => path.join(RAIZ, rel);
const le = rel => fs.readFileSync(arq(rel), 'utf8');
const lerJson = rel => JSON.parse(le(rel));
const gravaJson = (rel, o) => fs.writeFileSync(arq(rel), JSON.stringify(o, null, 2) + '\n');
const EXT = 'editores/vscode/package.json';

function opcoes(args) {
  const o = {};
  for (let i = 0; i < args.length; i++) {
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(args[i]);
    if (!m) throw new Error('opção desconhecida: ' + args[i]);
    o[m[1]] = m[2] !== undefined ? m[2] : args[++i];
    if (o[m[1]] === undefined) throw new Error('falta o valor de --' + m[1]);
  }
  for (const k of Object.keys(o)) if (!['github', 'editor', 'autor', 'email', 'npm', 'selos'].includes(k)) throw new Error('opção desconhecida: --' + k);
  if (o.github && !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/.test(o.github)) throw new Error('--github deve ser usuario/repositorio');
  if (o.editor && !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(o.editor)) throw new Error('--editor deve ter só letras, números e hífens');
  if (o.npm && !/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(o.npm)) throw new Error('--npm: nome de pacote inválido (use minúsculas, como cordel ou @usuario/cordel)');
  if (o.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) throw new Error('--email inválido');
  if (o.selos && !o.selos.split(',').every(x => ['npm', 'vscode'].includes(x.trim()))) throw new Error('--selos aceita npm, vscode ou npm,vscode');
  return o;
}

function mostrar() {
  const p = lerJson('package.json'), e = lerJson(EXT);
  const repo = p.repository && (p.repository.url || p.repository);
  console.log([
    'npm:          ' + p.name,
    'autor:        ' + (typeof p.author === 'string' ? p.author : p.author ? p.author.name + (p.author.email ? ' <' + p.author.email + '>' : '') : '(nenhum)'),
    'GitHub:       ' + (repo ? String(repo).replace(/^git\+|\.git$/g, '') : '(não configurado)'),
    'VS Code:      ' + e.publisher + '.' + e.name,
  ].join('\n'));
  if (!repo) console.log('\nPara configurar: npm run configurar -- --github usuario/cordel --editor meu-publicador');
}

// Troca o trecho entre as marcas <!-- configurar:… --> do README.
function marcas(texto, nome, conteudo) {
  const re = new RegExp('(<!-- configurar:' + nome + ' -->)[\\s\\S]*?(<!-- /configurar:' + nome + ' -->)');
  if (!re.test(texto)) throw new Error('README.md não tem as marcas <!-- configurar:' + nome + ' -->');
  return texto.replace(re, (m, a, b) => a + (conteudo ? '\n' + conteudo + '\n' : '') + b);
}

function principal(args) {
  if (!args.length) return mostrar();
  const o = opcoes(args);
  const p = lerJson('package.json'), e = lerJson(EXT);
  const nomeAntigo = p.name;
  const feitos = new Set();

  if (o.autor || o.email) {
    const antigo = typeof p.author === 'string' ? { name: p.author.replace(/\s*<.*$/, '') } : (p.author || {});
    const autor = { name: o.autor || antigo.name };
    if (o.email || antigo.email) autor.email = o.email || antigo.email;
    if (!autor.name) throw new Error('falta --autor');
    p.author = autor; e.author = { name: autor.name };
    feitos.add('package.json').add(EXT);
    if (o.autor) {
      const lic = le('LICENSE').replace(/^(Copyright \(c\) \d{4}(?:-\d{4})? ).*$/m, '$1' + o.autor);
      fs.writeFileSync(arq('LICENSE'), lic); feitos.add('LICENSE');
      // a licença também aparece na referência do editor
      const html = le('web/modelo.html').replace(/(mantendo o aviso de direitos autorais\. © \d{4} )[^<]*?(\.<\/p>)/, (m, a, b) => a + o.autor.replace(/[<>&]/g, '') + b);
      fs.writeFileSync(arq('web/modelo.html'), html); feitos.add('web/modelo.html');
    }
  }
  if (o.github) {
    const url = 'https://github.com/' + o.github;
    p.repository = { type: 'git', url: 'git+' + url + '.git' };
    p.homepage = url + '#readme';
    p.bugs = { url: url + '/issues' };
    e.repository = { type: 'git', url: 'git+' + url + '.git', directory: 'editores/vscode' };
    e.homepage = url + '/tree/main/editores/vscode#readme';
    e.bugs = { url: url + '/issues' };
    feitos.add('package.json').add(EXT);
  }
  if (o.editor) {
    e.publisher = o.editor;
    const cfg = e.contributes && e.contributes.configurationDefaults && e.contributes.configurationDefaults['[cordel]'];
    if (cfg) cfg['editor.defaultFormatter'] = o.editor + '.' + e.name;
    feitos.add(EXT);
  }
  if (o.npm) { p.name = o.npm; feitos.add('package.json'); }

  gravaJson('package.json', p);
  gravaJson(EXT, e);
  if (o.npm && fs.existsSync(arq('package-lock.json'))) {
    const l = lerJson('package-lock.json');
    l.name = o.npm; if (l.packages && l.packages['']) l.packages[''].name = o.npm;
    gravaJson('package-lock.json', l); feitos.add('package-lock.json');
  }

  // README: nome do pacote, autor e a linha de endereços logo abaixo do título
  let leia = le('README.md');
  if (o.npm && o.npm !== nomeAntigo) {
    const esc = nomeAntigo.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    leia = leia.replace(new RegExp('(npm (?:install|uninstall) -g )' + esc + '(?![\\w@/.-])', 'g'), '$1' + o.npm)
      .replace(new RegExp("require\\('" + esc + "'\\)", 'g'), "require('" + o.npm + "')");
  }
  if (o.autor) leia = leia.replace(/^(\[MIT\]\(LICENSE\) © \d{4} ).*$/m, '$1' + o.autor);
  const repo = p.repository && String(p.repository.url || '').replace(/^git\+https:\/\/github\.com\/|\.git$/g, '');
  if (repo) {
    const [dono, nome] = repo.split('/');
    // os selos do npm e do VS Code só depois de publicar (antes, mostrariam "não encontrado")
    const atual = (/<!-- configurar:links -->([\s\S]*?)<!-- \/configurar:links -->/.exec(leia) || [])[1] || '';
    const selos = new Set((o.selos || '').split(',').map(x => x.trim()).filter(Boolean));
    if (atual.includes('img.shields.io/npm/')) selos.add('npm');
    if (atual.includes('visual-studio-marketplace')) selos.add('vscode');
    const links = [
      '[![Testes](https://github.com/' + repo + '/actions/workflows/testes.yml/badge.svg)](https://github.com/' + repo + '/actions/workflows/testes.yml)',
      ...(selos.has('npm') ? ['[![npm](https://img.shields.io/npm/v/' + p.name + '?label=npm)](https://www.npmjs.com/package/' + p.name + ')'] : []),
      ...(selos.has('vscode') ? ['[![VS Code](https://img.shields.io/visual-studio-marketplace/v/' + e.publisher + '.' + e.name + '?label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=' + e.publisher + '.' + e.name + ')'] : []),
      '', '**Experimente no navegador:** https://' + dono.toLowerCase() + '.github.io/' + nome + '/',
    ].join('\n');
    leia = marcas(leia, 'links', links);
  }
  fs.writeFileSync(arq('README.md'), leia); feitos.add('README.md');

  console.log('Atualizados:\n  ' + [...feitos].join('\n  ') + '\n');
  mostrar();
}

try { principal(process.argv.slice(2)); } catch (err) { console.error(err.message); process.exit(2); }
