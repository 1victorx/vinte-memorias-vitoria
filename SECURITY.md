# Segurança e privacidade

Este é um site estático hospedado no GitHub Pages. Ele não armazena contas,
senhas, pagamentos ou banco de dados.

## Dados tratados

- Fotografias, textos e músicas publicados no próprio site.
- Mensagem opcional escrita no formulário final.

Quando configurado, o formulário envia a mensagem diretamente ao FormSubmit.
Sem a configuração, ela permanece somente no `localStorage` do aparelho. Não
há cookies de rastreamento nem ferramentas de analytics.

## Controles

- Dependências de produção verificadas por `npm audit --omit=dev`.
- Nenhuma chave privada incluída no código.
- Endpoint de resposta configurado como segredo do GitHub Actions.
- Limites de tamanho e preenchimento obrigatório no campo de mensagem.
- Atualizações dependem de commit autenticado no repositório.

## Relato de problema

Não publique dados pessoais em uma issue pública. Entre em contato diretamente
com o proprietário do repositório para relatar uma exposição indevida ou outra
falha.

## Álbum vivo

- A chave Supabase presente no navegador é exclusivamente a chave pública.
- Criação, alteração e exclusão dependem simultaneamente de sessão autenticada e da lista `site_editors`.
- RLS permanece habilitado em todas as tabelas expostas.
- O bucket aceita apenas JPEG, PNG e WebP, limita cada arquivo a 8 MB e exige que o primeiro diretório corresponda ao usuário autenticado.
- O navegador valida textos, quantidade, tipo e tamanho; constraints e policies repetem os controles no serviço.
- A chave `service_role` nunca deve ser adicionada ao repositório, ao workflow do Pages ou a variáveis `NEXT_PUBLIC_*`.