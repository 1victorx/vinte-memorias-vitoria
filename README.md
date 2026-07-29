# 20 memórias para Vitória

Presente digital de aniversário para Vitória Nicoly Santiago Fernandes:
um álbum interativo com vinte capítulos, fotografias reais, uma música por
memória, mensagens escondidas e uma carta de encerramento.

O site foi criado exclusivamente para computadores, como uma área de trabalho
romântica inspirada em interfaces antigas, e é publicado gratuitamente pelo GitHub Pages.

## Funcionalidades

- Área de trabalho retrô com janelas sobrepostas, arrastáveis e dock de aplicativos.
- Barras de título movidas pelo mouse ou pelas setas do teclado.
- Visual mais pixelado, com sombras rígidas, grades e controles inspirados em interfaces antigas.
- 46 fotografias organizadas cronologicamente.
- 20 músicas otimizadas para carregamento pela internet.
- Janela independente para escolher livremente qualquer uma das 20 músicas.
- CDs personalizados com fotografias reais de cada memória.
- Botão especial para a música **No Escuro**.
- Mensagem escondida em cada memória.
- Janela de fotos e textos com índice cronológico dos 20 capítulos.
- Janelas específicas para a carta final e a resposta.
- Campo para Vitória enviar uma resposta ao Victor.
- Layout testado em monitores de 1280 px, 1440 px e 1920 px.
- Navegação por teclado, foco visível e redução de movimento.
- Imagem de compartilhamento e metadados para redes sociais.

## Tecnologias

- Next.js 16 com App Router
- React 19 e TypeScript strict
- CSS responsivo sem biblioteca visual pesada
- vinext/Vite para desenvolvimento local
- GitHub Actions e GitHub Pages para publicação
- Node Test Runner para verificações de conteúdo
- Playwright Core com Microsoft Edge para testes visuais

O projeto é estático: não existe banco de dados nem autenticação porque essas
partes do prompt genérico de comércio eletrônico não fazem parte deste
presente. O envio da resposta utiliza um provedor externo gratuito.

## Estrutura principal

```text
app/
  components/MemoryExperience.tsx  experiência interativa
  data/memories.ts                 textos, datas, músicas e fotos
  globals.css                      interface desktop e janelas retrô
public/
  media/photos/                    46 fotos otimizadas
  media/audio/                     20 faixas otimizadas
  og.png                           imagem de compartilhamento
scripts/
  prepare-assets.ps1               preparação reproduzível dos arquivos
tests/
  rendered-html.test.mjs           conteúdo e build renderizado
  visual-smoke.mjs                 fluxo real no Edge
.github/workflows/
  deploy-pages.yml                 publicação automática
```

## Executar no computador

Requisitos:

- Node.js 22.13 ou superior
- npm

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Verificações:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run test:visual
npm run build:pages
```

O teste visual pressupõe o Microsoft Edge no caminho padrão do Windows e o
servidor local ativo.

## Adicionar os textos definitivos

As 20 memórias ficam em `app/data/memories.ts`. Em cada item, substitua:

- `title`: título do capítulo;
- `preview`: frase curta apresentada antes do texto;
- `story`: texto definitivo da memória;
- `secret`: mensagem escondida.

A carta fica no bloco `letter-paper` de
`app/components/MemoryExperience.tsx`. As fotografias e músicas já estão
associadas a seus capítulos.

Quando os textos forem colocados em `Documents/ArquivosCodex`, basta solicitar
uma nova atualização: eles poderão ser incorporados sem reconstruir o layout.

Antes da versão-surpresa, confirme as datas das imagens originalmente chamadas
`02-11-2026.jpg` e `11-10-2026.jpg`, pois elas parecem estar fora da sequência
cronológica dos demais arquivos.

## Resposta por e-mail

O endereço de destino não fica versionado no repositório. O workflow recebe o
segredo `FEEDBACK_ENDPOINT` e o disponibiliza apenas durante o build.

O provedor gratuito usado é o FormSubmit. Na primeira resposta enviada, ele
solicita uma confirmação no e-mail do Victor; essa confirmação precisa ser
feita antes do aniversário para que as próximas mensagens sejam entregues.

Sem essa configuração, o formulário preserva a mensagem apenas no navegador
em que ela foi escrita. Como o GitHub Pages é uma hospedagem estática, um
backend privado exigiria outro serviço.

## Publicação

Todo envio para a branch `main` executa:

1. instalação reproduzível com `npm ci`;
2. lint;
3. build estático;
4. publicação no GitHub Pages.

Endereço planejado:

`https://1victorx.github.io/vinte-memorias-vitoria/`

## Privacidade e direitos

O repositório e o site são públicos. Isso significa que as fotos, músicas e
textos publicados podem ser acessados por qualquer pessoa com o link e também
podem aparecer em mecanismos de busca.

As gravações musicais foram fornecidas pelo proprietário do projeto. Antes de
manter os arquivos em um site público, confirme que existe autorização para
publicá-los; se necessário, substitua-os por links oficiais ou mídias
licenciadas. Nunca adicione senhas, tokens ou documentos pessoais ao
repositório.
