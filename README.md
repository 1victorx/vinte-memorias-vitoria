# 20 memórias para Vitória

Presente digital de aniversário para Vitória Nicoly Santiago Fernandes:
um álbum interativo com vinte capítulos, fotografias reais, uma música por
memória, mensagens escondidas e um calendário de encontros.

O site foi criado exclusivamente para computadores, como uma área de trabalho
romântica inspirada em interfaces antigas, e é publicado gratuitamente pelo GitHub Pages.

## Funcionalidades

- Tela de boas-vindas romântica com a fotografia real de flores ocupando todo o fundo, transição leve e botão Não protegido por uma fuga antecipada do cursor.
- Área de trabalho retrô iniciada limpa, com todas as janelas fechadas; depois da interação, elas podem ficar sobrepostas e ser arrastadas livremente nos dois eixos.
- Barras de título movidas pelo mouse ou pelas setas do teclado, com maximização e restauração.
- Janelas redimensionáveis livremente pelo canto inferior direito.
- Visual soft-retro legível em zoom de 100%, com fonte serifada em toda a interface, cantos moderados, detalhes florais e textura pixelada.
- 45 fotografias exibidas cronologicamente; a última duplicata da primeira memória foi retirada da galeria.
- 20 músicas otimizadas para carregamento pela internet.
- Tocador rápido permanente no canto inferior direito, além da janela independente para escolher livremente qualquer uma das 20 músicas.
- CDs personalizados com fotografias reais de cada memória e um CD grande giratório no tocador.
- Botão especial para a música **No Escuro**.
- Mensagem escondida em cada memória.
- Janela de fotos e textos com índice cronológico dos 20 capítulos.
- Janela específica para Vitória responder ao presente; a carta digital foi retirada para dar lugar à versão física.
- Janela **Nova memória** para continuar o álbum: data, título, abertura, relato, mensagem escondida e até seis fotos, sincronizados online em tempo real.
- Campo para Vitória enviar uma resposta ao Victor.
- Janela de encontro com calendário mensal completo: datas passadas livres registram encontros vividos, enquanto hoje e datas futuras marcam os próximos passeios.
- Roleta de encontros incorporada ao calendário, com oito ideias personalizadas e preenchimento automático do passeio sorteado ao escolher uma data.
- 36 encontros vividos de 2025 e 2026 já destacados com cor, flor e contorno; novas lembranças e encontros aparecem imediatamente e registros existentes abrem seus detalhes.
- Layout testado em 1366 × 768, 1440 × 900, 1536 × 864 e 1920 × 1080, além de equivalentes a zoom de 125% e 150%.
- Navegação por teclado, foco visível e redução de movimento.
- Imagem de compartilhamento e metadados para redes sociais.

## Tecnologias

- Next.js 16 com App Router
- React 19 e TypeScript strict
- CSS responsivo sem biblioteca visual pesada
- vinext/Vite para desenvolvimento local
- Supabase gratuito para login por link, banco de dados, fotos e sincronização em tempo real
- GitHub Actions e GitHub Pages para publicação
- Node Test Runner para verificações de conteúdo
- Playwright Core com Microsoft Edge para testes visuais

A interface continua sendo publicada como site estático no GitHub Pages. Apenas
os novos capítulos usam o Supabase gratuito, com leitura pública e escrita
protegida por login via link de e-mail e políticas RLS no próprio banco. O envio
da resposta utiliza um provedor externo gratuito.

## Estrutura principal

```text
app/
  components/MemoryExperience.tsx  experiência interativa
  data/memories.ts                 textos, datas, músicas e fotos
  lib/living-memories.ts          cliente seguro do álbum online
  globals.css                      interface desktop e janelas retrô
public/
  media/photos/                    fotos das memórias e a foto de flores otimizada
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

As fotografias e músicas já estão associadas a seus capítulos.


Quando os textos forem colocados em `Documents/ArquivosCodex`, basta solicitar
uma nova atualização: eles poderão ser incorporados sem reconstruir o layout.

Antes da versão-surpresa, confirme as datas das imagens originalmente chamadas
`02-11-2026.jpg` e `11-10-2026.jpg`, pois elas parecem estar fora da sequência
cronológica dos demais arquivos.


## Álbum vivo e armazenamento gratuito

Os vinte capítulos originais continuam versionados no projeto. A janela **Nova
memória** adiciona capítulos posteriores sem exigir uma nova publicação. Cada
capítulo aceita data, título, frase de abertura, relato, mensagem escondida
opcional e de uma a seis fotografias JPG, PNG ou WebP de até 8 MB cada.

A proteção não depende de uma senha escondida no JavaScript. O Supabase envia
um link de entrada ao e-mail e as políticas RLS só aceitam escrita dos
endereços cadastrados em `site_editors`. Visitantes podem ler capítulos
publicados, mas não criar, alterar ou apagar registros. As fotos usam nomes
aleatórios e as limitações são repetidas no armazenamento.

### Configuração única do Supabase

1. Crie um projeto no plano gratuito em `https://supabase.com`.
2. Abra **SQL Editor**, copie e execute
   `supabase/migrations/202607310001_living_memories.sql`.
3. Ainda no SQL Editor, autorize os e-mails que poderão escrever:

```sql
insert into public.site_editors (email) values
  ('seu-email@exemplo.com'),
  ('email-da-vitoria@exemplo.com');
```

Os endereços precisam estar em letras minúsculas.

4. Em **Authentication > URL Configuration**, use como Site URL:
   `https://1victorx.github.io/vinte-memorias-vitoria/`
5. Em **Project Settings > API**, copie a Project URL e a chave pública
   `anon`/`publishable`.
6. No repositório GitHub, abra **Settings > Secrets and variables > Actions** e
   crie:

```text
SUPABASE_URL=Project URL
SUPABASE_ANON_KEY=chave pública anon/publishable
```

7. Execute novamente o workflow **Publicar no GitHub Pages**.

Para desenvolvimento local, copie `.env.example` para `.env.local`, preencha
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` e reinicie o
servidor. A chave pública pode aparecer no navegador; a segurança real está nas
políticas RLS. Nunca use a chave `service_role` no site ou no GitHub Pages.

Sem essas duas variáveis, o restante do presente continua funcionando e a nova
janela mostra um aviso de configuração, sem salvar dados apenas localmente ou
fingir que a memória foi publicada.

## Resposta por e-mail

O endereço de destino não fica versionado no repositório. O workflow recebe o
segredo `FEEDBACK_ENDPOINT` e o disponibiliza apenas durante o build.

O provedor gratuito usado é o FormSubmit. Na primeira resposta enviada, ele
solicita uma confirmação no e-mail do Victor; essa confirmação precisa ser
feita antes do aniversário para que as próximas mensagens sejam entregues.

Sem essa configuração, o formulário preserva a mensagem apenas no navegador
em que ela foi escrita. Como o GitHub Pages é uma hospedagem estática, um
backend privado exigiria outro serviço.

Os encontros agendados e as lembranças adicionadas também são guardados no armazenamento local do navegador para aparecerem imediatamente no calendário e impedir uma segunda criação na mesma data. Essa persistência é específica daquele computador; a cópia enviada por e-mail continua sendo o registro acessível ao Victor.

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
