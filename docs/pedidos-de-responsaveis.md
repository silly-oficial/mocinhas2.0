# Pedidos de responsáveis

## Entregue

- `/pais`: formulário público de remoção, correção de idade/nome, reivindicação e apresentação de autorização. Aceita link HTTPS opcional de termo nos dois últimos tipos. Não exige login ou Premium.
- `/privacidade`: aviso específico do tratamento dos pedidos; não substitui uma política completa sobre todas as funcionalidades do app.
- Rodapé global com acesso ao formulário, aviso de titularidade e contato, quando configurado.
- Administração → Responsáveis: fila paginada por status, contato por e-mail, termo restrito à administração, registro da análise e retirada opcional do perfil correspondente de publicação em pedidos de remoção.
- Proteções: limite de 16 KB por envio, validação no servidor, bloqueio de origem cruzada, cinco tentativas por hora por rede, respostas públicas sem dados pessoais, respostas administrativas sem cache e rollback em falha de gravação.
- Retenção na base ativa: 90 dias após encerramento ou 180 dias após envio de pedidos ainda abertos; rotina diária e no início do serviço. Backups existentes seguem o ciclo da infraestrutura.
- Corrigida a idempotência do script de build: ele já encontrava rotas de mídia otimizadas na main e abortava antes da compilação. Agora aceita os blocos já aplicados, preservando a interrupção se encontrar uma estrutura desconhecida.

## Banco e configuração

Não há migração SQL. O aplicativo usa `mocinhas_app_state.payload` (JSON) no modo Supabase e `db.json` no modo local. Uma nova coleção opcional `directoryRequests` é criada no primeiro envio; bancos anteriores continuam válidos. O validador de snapshots reconhece a coleção. Não aplique alterações destrutivas no banco.

Campos de cada pedido: `id`, `responsibleName`, `email`, `handle`, `type`, `observations`, `documentUrl`, `status`, `createdAt`, `updatedAt`, `closedAt` e `adminNote`.

Configure `CONTACT_EMAIL` com o endereço real da administração no ambiente do servidor. Não foi inventado um endereço: enquanto a variável estiver ausente/inválida, o formulário funciona, mas o e-mail não aparece no rodapé nem nas páginas públicas. Não há serviço de e-mail automático; a equipe deve monitorar a fila e responder em até cinco dias úteis, como informado no formulário.

O termo é recebido por link e aberto somente por ação do administrador; o servidor não busca a URL. Use compartilhamento com acesso restrito para documentos. A submissão não concede selo, não verifica a identidade e não autoriza automaticamente a publicação. A administração deve avaliar a representação e tratar a solicitação.

Retirar de publicação oculta o perfil do diretório. Não apaga arquivos, posts ou outras referências. O administrador deve removê-los manualmente quando o pedido se referir a eles e registrar o que foi feito antes de concluir.

## Escopo não implementado

Este conjunto trata somente de proteção e atendimento a responsáveis. Não altera nomenclatura de criação de perfis, cards de descoberta, oEmbed/cache do TikTok, proveniência de mídias, selos públicos, publicidade, Premium, ranking ou filtros. Não cria `/termos` ou `/como-funciona` nem publica as premissas jurídicas fornecidas como garantia de autorização. Não implementa descoberta ou monetização de perfis de menores por idade, localização e praia/biquíni.

## Validação

- `npm run lint`
- `npm run build`
- `node scripts/optimize-media-delivery.mjs` após o build para verificar que a transformação pode ser repetida.
- `node --import tsx tests/directory-requests.test.ts`: validação, acesso administrativo, origem, limites, retenção, rollback, retirada de publicação e integração com persistência após reinício.
- `node tests/people.test.mjs`: regressão do cadastro de perfis, publicação e controle de acesso.

Os testes de integração usam banco temporário, usuários e dados fictícios. Não acessam dados de produção. Não houve validação visual em dispositivo Android/iOS nem envio real de e-mail.

## Arquivos

- `shared/directory-requests.ts`
- `server/directory-requests.ts`
- `server/db.ts`
- `server.ts`
- `scripts/database-utils.mjs`
- `scripts/optimize-media-delivery.mjs`
- `src/components/DirectorySafety.tsx`
- `src/components/DirectoryRequestsAdmin.tsx`
- `src/components/AdminPanel.tsx`
- `src/directory-safety.css`
- `src/main.tsx`
- `tests/directory-requests.test.ts`
- `package.json`
- `docs/pedidos-de-responsaveis.md`
