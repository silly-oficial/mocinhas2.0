# Limpeza permanente das mídias existentes

Pedido: excluir as fotos e os vídeos publicados e remover idade, localização e categorias praia/biquíni. Preservar contas, pagamentos, assinatura Premium e configuração SyncPay existentes.

## Estado da execução

**Não executado em produção.** O workspace Render selecionado (`My Workspace`) lista somente o serviço `Silly`, vinculado a `silly-oficial/Silly`. Não foi localizado um serviço para `silly-oficial/mocinhas2.0`. Nenhum recurso do Silly foi alterado.

A main do Mocinhas não contém campos/filtros de idade ou localização no módulo de perfis. As tarefas anteriores que os solicitavam não foram implementadas. A ferramenta limpa eventuais campos legados de idade/localização e categorias praia/biquíni dos perfis persistidos.

## Ferramenta pronta

`scripts/purge-published-media.mjs` é uma operação pontual. Não roda no build, no deploy ou automaticamente no início do servidor.

- Sem `--apply`: somente inventário; não altera banco nem storage.
- Com `--apply`: remove posts de imagem/vídeo, esvazia galerias/capas/avatares e carrossel, limpa anexos visuais e miniaturas, sanitiza snapshots de backup e apaga arquivos de imagem/vídeo do storage de uploads, inclusive órfãos.
- Contas, hashes de senha, registros de pagamentos e configuração SyncPay são preservados. Posts/arquivos de áudio e documentos são preservados.
- O histórico jurídico e os termos enviados não são apagados. Assets de código em `static/` e arquivos em `legal-versions/` são preservados.
- Links externos deixam de ser exibidos pelo app; a ferramenta não apaga arquivos de contas de terceiros.
- Backups gerenciados pelo próprio aplicativo são sanitizados. Backups internos do provedor, outros buckets/projetos, caches externos e cópias fora da infraestrutura precisam ser verificados separadamente; não é possível atestar sua exclusão com esta ferramenta.
- Falhas de permissão, armazenamento ou concorrência interrompem a operação com erro. Pode haver limpeza parcial; mantenha o serviço parado, corrija o erro e execute novamente. A ferramenta é idempotente.

## Execução no ambiente correto

1. Identificar o serviço real do Mocinhas e seu storage. Não utilizar o serviço Silly.
2. Parar todas as instâncias do app para impedir gravações, novos uploads e recriação de backups durante a limpeza. Não criar outro backup com as mídias que serão apagadas.
3. No ambiente seguro que já possui as credenciais do Mocinhas, configurar `PURGE_TARGET=silly-oficial/mocinhas2.0`.
4. Executar `node scripts/purge-published-media.mjs` e conferir o inventário (apenas contagens).
5. Para exclusão, definir `PURGE_SITE_STOPPED=1` e executar `node scripts/purge-published-media.mjs --apply`.
6. No modo Supabase, usar `STORAGE_BACKEND=supabase`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` somente no servidor. A ferramenta atua em `mocinhas_app_state`, `mocinhas_app_backups` e no bucket `mocinhas-media`. Usa atualização condicionada à revisão, sem chamar o RPC normal que criaria um novo backup anterior à exclusão. É preciso permissão de UPDATE nos snapshots e DELETE no Storage.
7. No modo local, definir `DATA_DIR` absoluto no disco persistente. São processados `db.json`, os snapshots JSON de `backups/` e arquivos visuais de `uploads/`.
8. Reiniciar o app sem reintroduzir backups antigos e verificar catálogo, galerias e URLs antigas. URLs temporárias e caches de terceiros podem ter ciclos próprios de invalidação.

Não enviar chaves de serviço ou senhas por chat. A execução real depende do acesso ao ambiente correto; publicar este código no GitHub não apaga o conteúdo do site.

## Validação

`node tests/purge-published-media.test.mjs` usa apenas banco e arquivos fictícios em diretório temporário. Cobre inventário sem mutação, exclusão real dos arquivos de teste, sanitização dos backups, idempotência e preservação de contas/Premium/SyncPay. A conexão real com o Supabase de produção permanece pendente.
