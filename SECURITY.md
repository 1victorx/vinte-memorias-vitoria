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
