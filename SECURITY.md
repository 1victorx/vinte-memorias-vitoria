# Segurança e privacidade

Site estático no GitHub Pages com álbum vivo opcional no Supabase (PostgreSQL +
Storage + Realtime). Não há pagamentos nem senhas tradicionais; o acesso de
edição usa magic link por e-mail.

## Dados tratados

- Fotografias, textos e músicas publicados no próprio site.
- Mensagem opcional no formulário final e pedidos de encontro no calendário.
- Memórias novas, fotos do álbum vivo e encontros agendados quando o Supabase
  está configurado.

Quando configurado, o formulário envia a mensagem diretamente ao FormSubmit.
Sem a configuração, ela permanece somente no `localStorage` do aparelho. Não
há cookies de rastreamento nem ferramentas de analytics.

## Controles

- Dependências de produção verificadas por `npm audit --omit=dev`.
- Nenhuma chave privada incluída no código.
- Endpoint de resposta e chaves Supabase configurados como segredos do GitHub Actions.
- Limites de tamanho e preenchimento obrigatório nos formulários.
- Content-Security-Policy básica no HTML exportado.
- Atualizações dependem de commit autenticado no repositório.

## Relato de problema

Não publique dados pessoais em uma issue pública. Entre em contato diretamente
com o proprietário do repositório para relatar uma exposição indevida ou outra
falha.

## Álbum vivo e calendário (Supabase)

- A chave presente no navegador é exclusivamente a chave pública (`anon`).
- Criação, alteração e exclusão de memórias dependem de sessão autenticada e da
  lista `site_editors`.
- RLS permanece habilitado em todas as tabelas expostas.
- O bucket aceita apenas JPEG, PNG e WebP, limita cada arquivo a 8 MB e exige
  que o primeiro diretório corresponda ao usuário autenticado.
- Editores só removem fotos da própria pasta (`auth.uid()`).
- Encontros anônimos têm rate limit de 5 inserções por hora por IP; editores
  autorizados não entram nesse limite.
- O navegador valida textos, quantidade, tipo e tamanho; constraints, triggers
  e policies repetem os controles no serviço.
- A chave `service_role` nunca deve ser adicionada ao repositório, ao workflow
  do Pages ou a variáveis `NEXT_PUBLIC_*`.

## Migrations

Após atualizar o repositório, execute as migrations novas no SQL Editor do
Supabase (ou via CLI) para aplicar rate limit e políticas de storage.
