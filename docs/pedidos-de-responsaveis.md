# Pedidos de responsáveis

## Entregue

- `/pais`: formulário público de remoção, correção de idade/nome, reivindicação e apresentação de autorização. Aceita link HTTPS opcional de termo nos dois últimos tipos. Não exige login ou Premium.
- `/termos`: Termos de Uso do canal de atendimento, com links para Privacidade e Pais.
- `/privacidade`: aviso específico do tratamento dos pedidos, com link de volta para os Termos; não substitui uma política completa sobre todas as funcionalidades do app.
- `/pais`: mantém o formulário funcional e explica o atendimento, a análise manual e os limites da retirada de publicação.
- Rodapé global e navegação das páginas com Termos, Privacidade, Pais e Histórico, aviso de titularidade/remoção e contato, quando configurado.
- `/versoes`: histórico público dos documentos, consulta dos textos anteriores e download de cada arquivo JSON datado. Consulte a seção de versionamento abaixo.
- Administração → Responsáveis: fila paginada por status, contato por e-mail, termo restrito à administração, registro da análise e retirada opcional do perfil correspondente de publicação em pedidos de remoção.
- Proteções: limite de 16 KB por envio, validação no servidor, bloqueio de origem cruzada, cinco tentativas por hora por rede, respostas públicas sem dados pessoais, respostas administrativas sem cache e rollback em falha de gravação.
- Retenção na base ativa: 90 dias após encerramento ou 180 dias após envio de pedidos ainda abertos; rotina diária e no início do serviço. Backups existentes seguem o ciclo da infraestrutura.
- Corrigida a idempotência do script de build: ele já encontrava rotas de mídia otimizadas na main e abortava antes da compilação. Agora aceita os blocos já aplicados, preservando a interrupção se encontrar uma estrutura desconhecida.

## Banco e configuração

Não há migração SQL. O aplicativo usa `mocinhas_app_state.payload` (JSON) no modo Supabase e `db.json` no modo local. Uma nova coleção opcional `directoryRequests` é criada no primeiro envio; bancos anteriores continuam válidos. O validador de snapshots reconhece a coleção. Não aplique alterações destrutivas no banco.

Campos de cada pedido: `id`, `responsibleName`, `email`, `handle`, `type`, `observations`, `documentUrl`, `status`, `createdAt`, `updatedAt`, `closedAt` e `adminNote`.

## Histórico dos documentos

Os textos ficam em `shared/legal-documents.ts`. Ao iniciar em produção, o servidor compara os textos e o contato público com a última versão registrada. Se houver alteração, salva um arquivo `documentos_<data-UTC>_<hash>_<id>.json` antes de registrar a versão. Reinícios/redeploys com os mesmos documentos não geram duplicatas. Reverter para um texto antigo depois de uma alteração gera outro registro datado.

No modo Supabase, o arquivo é gravado em `mocinhas-media/legal-versions/` (bucket privado, somente pelo servidor). No modo local, fica em `DATA_DIR/legal-versions/`. A coleção opcional `legalDocumentVersions` do banco guarda os textos, o identificador, a data UTC, o hash e, quando disponível, o commit informado por `RENDER_GIT_COMMIT`. Não há migração SQL; o validador aceita a nova coleção.

O histórico serve apenas os documentos públicos. Nomes/e-mails de solicitantes, observações e termos enviados não são incluídos. As datas são exibidas no fuso de Belém; o arquivo mantém a data ISO UTC. O contato da administração é público e faz parte do registro.

As rotas de histórico dispensam login e quota. A consulta é paginada e lista somente metadados; os textos completos são carregados ao abrir uma versão. Downloads possuem nome datado e conteúdo JSON. Não há edição ou exclusão de versões pela interface. Uma falha no arquivamento impede a inicialização em produção, evitando servir textos novos sem o arquivo correspondente.

O registro é feito na inicialização em produção, antes de o servidor começar a aceitar conexões. Ele não é uma confirmação independente de saúde/deploy do Render. Este é o histórico das páginas de atendimento, não um histórico de cada mudança do aplicativo. A branch/PR ainda não integrada não cria um registro de publicação no ambiente real.

Configure `CONTACT_EMAIL` com o endereço real da administração no ambiente do servidor. Não foi inventado um endereço: enquanto a variável estiver ausente/inválida, o formulário funciona, mas o e-mail não aparece no rodapé nem nas páginas públicas. Não há serviço de e-mail automático; a equipe deve monitorar a fila e responder em até cinco dias úteis, como informado no formulário.

O termo é recebido por link e aberto somente por ação do administrador; o servidor não busca a URL. Use compartilhamento com acesso restrito para documentos. A submissão não concede selo, não verifica a identidade e não autoriza automaticamente a publicação. A administração deve avaliar a representação e tratar a solicitação.

Retirar de publicação oculta o perfil do diretório. Não apaga arquivos, posts ou outras referências. O administrador deve removê-los manualmente quando o pedido se referir a eles e registrar o que foi feito antes de concluir.

## Escopo não implementado

Este conjunto trata somente de proteção e atendimento a responsáveis. Os modelos anexados não foram publicados integralmente: não foram incluídas justificativas para o catálogo de menores, campos sem preenchimento ou promessas sobre funcionalidades não implementadas. `/termos` é específico do canal de atendimento; `/privacidade` cobre os pedidos. Os documentos não constituem um pacote jurídico completo sobre o app.

Não altera nomenclatura de criação de perfis, cards de descoberta, oEmbed/cache do TikTok, proveniência de mídias, selos públicos, publicidade, Premium, ranking ou filtros. Não cria `/como-funciona` nem publica as premissas jurídicas fornecidas como garantia de autorização. Não implementa descoberta ou monetização de perfis de menores por idade, localização e praia/biquíni.

## Validação

- `npm run lint`
- `npm run build`
- `node scripts/optimize-media-delivery.mjs` após o build para verificar que a transformação pode ser repetida.
- `node --import tsx tests/directory-requests.test.ts`: validação, acesso administrativo, origem, limites, retenção, rollback, retirada de publicação e integração com persistência após reinício.
- `node tests/people.test.mjs`: regressão do cadastro de perfis, publicação e controle de acesso.
- `node --import tsx tests/legal-history.test.ts`: links recíprocos e do rodapé, renderização do formulário, isolamento de dados privados, histórico imutável, deduplicação em reinício, falhas de gravação e downloads.
- A integração de `directory-requests.test.ts` também verifica as quatro rotas, o arquivo datado em disco, a preservação após reinício e o download idêntico ao arquivo.

Os testes de integração usam banco temporário, usuários e dados fictícios. Não acessam dados de produção. Não houve validação visual em dispositivo Android/iOS nem envio real de e-mail.

## Arquivos

- `shared/directory-requests.ts`
- `shared/legal-documents.ts`
- `server/directory-requests.ts`
- `server/legal-history.ts`
- `server/legal-history-storage.ts`
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
- `tests/legal-history.test.ts`
- `package.json`
- `docs/pedidos-de-responsaveis.md`
