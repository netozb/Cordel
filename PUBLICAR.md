# Como publicar a Cordel

Este roteiro põe a Cordel no ar em cinco lugares. Cada um é independente: dá para começar só pelo GitHub e ligar os outros depois.

| Destino | O que as pessoas ganham | Como fica automático |
|---|---|---|
| GitHub | O código, as versões para baixar (`.zip`, `.vsix`, `.tgz`, `cordel.html`) e os testes a cada mudança | Sempre ligado |
| GitHub Pages | O editor no ar, em `https://usuario.github.io/cordel/` | Variável `PUBLICAR_SITE` |
| npm | `npm install -g cordel` | Variável `PUBLICAR_NPM` |
| Visual Studio Marketplace | A extensão na aba Extensões do VS Code | Variável `PUBLICAR_MARKETPLACE` |
| Open VSX | A extensão no VSCodium, Cursor, Gitpod e outros editores | Variável `PUBLICAR_OPENVSX` |

Depois de configurado, publicar uma versão é criar uma etiqueta: o GitHub testa tudo em Linux e, se passar, publica em todos os destinos ligados.

---

## 1. Escolher os nomes e configurar

Você vai precisar de:

- **Um usuário no GitHub** e o nome do repositório (sugestão: `cordel`).
- **Um nome no npm.** `cordel` estava livre em 28/09/2026. Confira com `npm view cordel`: se responder `404`, está livre. Se não estiver, use um nome com o seu usuário, como `@usuario/cordel` (o comando instalado continua sendo `cordel`).
- **Um identificador de publicador** no Visual Studio Marketplace (só letras, números e hífens, por exemplo `antonioduarte`). Ele aparece no endereço da extensão: `antonioduarte.cordel`.

Com os nomes escolhidos, rode na pasta do projeto:

```sh
npm run configurar -- --github usuario/cordel --editor seu-publicador --autor "Seu Nome"
```

Isso atualiza, de uma vez, o `package.json`, o manifesto da extensão (inclusive o formatador padrão, que depende do publicador), a licença e o README (com o selo dos testes e o endereço do editor). Use `--npm @usuario/cordel` se precisar de outro nome no npm, e `--email` para pôr o e-mail no pacote. Depois de publicar no npm e no Marketplace, `npm run configurar -- --github usuario/cordel --selos npm,vscode` põe também os selos com a versão de cada um. Rodar sem opções mostra a configuração atual.

## 2. Pôr o código no GitHub

1. Crie o repositório vazio em <https://github.com/new> (sem README, sem licença: o projeto já tem os dois).
2. Na pasta do projeto:

```sh
npm ci && npm ci --prefix editores/vscode
npm run construir && npm test
git init -b main
git add .
git commit -m "Cordel 0.8.0"
git remote add origin https://github.com/usuario/cordel.git
git push -u origin main
```

3. Na aba **Actions** do repositório, o fluxo **Testes** começa sozinho: Linux, Windows e macOS, com Node 18, 22 e 24, mais o editor no Chromium e a montagem dos pacotes. Cada envio para `main` e cada pull request passam por ele.
4. Recomendado, em **Settings**:
   - **Code security › Private vulnerability reporting**: ligue, para que falhas de segurança possam ser relatadas em particular (o `SECURITY.md` explica como).
   - **Environments › New environment** chamado `publicacao`, com **Required reviewers** marcando você. Assim, nada é publicado no npm e nas lojas de extensões sem a sua aprovação, mesmo que alguém crie uma etiqueta.

## 3. Deixar o leitor de Excel seguro (recomendado, antes de publicar no npm)

A versão do leitor de Excel que está no npm (SheetJS 0.18.5) tem duas falhas conhecidas ao abrir planilhas preparadas para atacar. A versão corrigida só é distribuída pela própria SheetJS. Para quem instalar a Cordel pelo npm já receber a corrigida:

```sh
npm install --save-optional --save-exact https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
npm test
```

Se passar, inclua `package.json` e `package-lock.json` no commit e ajuste o item sobre o SheetJS em **Segurança e limites** no README. (Esta troca não foi feita aqui porque o ambiente onde o pacote foi preparado não alcança o endereço da SheetJS.)

## 4. O editor no GitHub Pages

1. **Settings › Pages › Build and deployment › Source**: escolha **GitHub Actions**.
2. **Settings › Secrets and variables › Actions › Variables › New repository variable**: `PUBLICAR_SITE` com o valor `sim`.
3. **Settings › Environments › github-pages › Deployment branches and tags › Add deployment branch or tag rule**: tipo **Tag**, padrão `v*`. Sem isso o GitHub só deixa publicar a partir da `main` e recusa as etiquetas de versão ("is not allowed to deploy to github-pages due to environment protection rules"). O ambiente `github-pages` aparece depois do passo 1.

A cada versão, o editor fica em `https://usuario.github.io/cordel/`, com o `.zip` da versão ao lado. Se ligar o Pages depois de lançar uma versão, não precisa lançar outra: em **Actions › Publicar › Run workflow**, escolha a etiqueta da versão (aba **Tags** em *Use workflow from*) e rode; só o site é publicado. Fora do Claude, o botão Descrever some e os arquivos (apps, planilhas) são baixados direto pelo navegador. `busque(…)` funciona com qualquer serviço que permita acesso de outros sites (CORS).

## 5. npm

O npm recomenda a **publicação confiável** (trusted publishing): o GitHub prova ao npm quem está publicando e nenhum token fica guardado. Ela só pode ser ligada num pacote que já existe, então a primeira versão vai do seu computador.

1. Crie uma conta em <https://www.npmjs.com/signup> e ligue a verificação em duas etapas.
2. Primeira publicação, uma vez só:

```sh
npm login
npm run pacote
npm publish dist/cordel-0.8.0.tgz --access public
```

3. No npm, abra o pacote › **Settings › Trusted Publisher › GitHub Actions** e preencha: o seu usuário, o repositório `cordel`, o fluxo `publicar.yml` e o ambiente `publicacao`.
4. Ainda nas configurações do pacote, em **Publishing access**, escolha exigir verificação em duas etapas e **não permitir tokens**: daqui em diante, só o GitHub publica.
5. No GitHub, crie a variável `PUBLICAR_NPM` com o valor `sim`.

A partir da próxima versão, o npm recebe cada etiqueta sozinho, com o selo de procedência que liga o pacote ao código do GitHub. Se preferir usar um token de acesso, guarde-o como segredo `NPM_TOKEN` (em **Secrets**, não em Variables); o fluxo usa o token quando ele existe.

## 6. Visual Studio Marketplace

1. Entre em <https://marketplace.visualstudio.com/manage> com uma conta Microsoft e crie o publicador com o **mesmo identificador** que você passou em `--editor`.
2. Primeira publicação, pela própria página: rode `npm run pacote`, clique em **New extension › Visual Studio Code** e envie `dist/cordel-0.8.0.vsix`. A verificação da Microsoft leva alguns minutos.

Para as próximas versões irem sozinhas, o jeito atual é o **Microsoft Entra ID**, sem senha guardada. Os tokens pessoais (PAT) do Azure DevOps, usados até agora, deixam de funcionar em 1º de dezembro de 2026.

3. No [portal do Azure](https://portal.azure.com), em **Microsoft Entra ID › App registrations › New registration**, crie um registro (por exemplo, `cordel-publicacao`). Anote o **Application (client) ID** e o **Directory (tenant) ID**.
4. No registro: **Certificates & secrets › Federated credentials › Add credential › GitHub Actions deploying Azure resources**. Preencha o seu usuário, o repositório `cordel`, **Entity type: Environment** e o ambiente `publicacao`.
5. No GitHub, crie as variáveis `AZURE_CLIENT_ID` e `AZURE_TENANT_ID` com os valores anotados.
6. Na aba **Actions**, rode o fluxo **Identidade do Marketplace** (botão **Run workflow**). O resumo mostra um identificador: na página do publicador no Marketplace, em **Members**, acrescente esse identificador com o papel **Contributor**.
7. Crie a variável `PUBLICAR_MARKETPLACE` com o valor `sim`.

Se você ainda tem um PAT do Azure DevOps com o escopo **Marketplace (Manage)**, pode guardá-lo como segredo `VSCE_PAT` e pular os passos 3 a 6 — mas só até 1º de dezembro de 2026.

## 7. Open VSX

1. Entre em <https://open-vsx.org> com uma conta do GitHub, ligue a conta da Eclipse Foundation e aceite o acordo de publicação (**Settings › Profile**).
2. Em **Settings › Access Tokens**, crie um token.
3. Crie o espaço com o mesmo identificador de publicador, uma vez só:

```sh
npx ovsx create-namespace seu-publicador -p SEU_TOKEN
```

4. No GitHub, guarde o token como segredo `OVSX_PAT` e crie a variável `PUBLICAR_OPENVSX` com o valor `sim`.

## 8. Publicar uma versão

Durante o trabalho, as novidades vão para o `CHANGELOG.md`, numa seção `## [Não lançado]` no topo. Na hora de publicar:

1. Acrescente a versão nova no começo de `ref.novidades`, em `web/conteudo.js` (é o resumo que aparece no editor).
2. Mude a versão em todos os lugares de uma vez:

```sh
npm run versao -- x.y.z        # o número novo, como 0.8.0 (ou: patch, minor, major)
```

   Isso atualiza `package.json`, `lib/cordel.js`, a extensão e o README, troca `## [Não lançado]` por `## [x.y.z] — data de hoje` e reconstrói tudo.
3. Confira e envie:

```sh
npm test
git commit -am "Cordel x.y.z"
git tag vx.y.z
git push origin main vx.y.z
```

Sem computador por perto, dá para criar a etiqueta pela página do GitHub, depois de enviar o commit: **Releases › Draft a new release**, em *Choose a tag* digite `vx.y.z` e escolha *Create new tag on publish* (alvo: `main`), e toque em **Publish release** (título e notas podem ficar em branco). O fluxo preenche a versão com o título, as notas e os arquivos.

Na aba **Actions**, o fluxo **Publicar** confere se a etiqueta bate com a versão, roda todos os testes, monta os pacotes e publica: a versão no GitHub (com as notas tiradas do `CHANGELOG.md`) e os destinos que você ligou. Se você criou o ambiente `publicacao` com aprovação, o GitHub espera o seu clique antes do npm e das lojas.

Versões de teste (`npm run versao -- x.y.z-beta.1`, etiqueta `vx.y.z-beta.1`) vão para o GitHub como pré-lançamento e para o npm com a etiqueta `proxima` (`npm install -g cordel@proxima`). O Marketplace, o Open VSX e o site só recebem versões finais.

## Para conferir no seu computador

| Comando | O que faz |
|---|---|
| `npm run pacote` | Monta em `dist/` exatamente o que vai para as lojas: `.tgz`, `.vsix`, `.zip`, `cordel.html`, notas e somas de verificação |
| `npm run checar` | Confere se os arquivos gerados estão em dia (o fluxo de testes falha se não estiverem) |
| `npm run testar:navegador` | Testa o editor no Chromium (precisa de `npx playwright install chromium`) |
| `node ferramentas/versao.js --notas` | Mostra as notas da versão atual, como vão aparecer no GitHub |

## Referências

- [Publicação confiável no npm](https://docs.npmjs.com/trusted-publishers/)
- [Publicar extensões do VS Code](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Publicar no Open VSX](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)
- [GitHub Pages com GitHub Actions](https://docs.github.com/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
