# Limpeza do repositório

Foram removidos somente arquivos sem caminho de uso na aplicação, servidor, build ou testes, além de relatórios históricos substituídos pela documentação atual.

## Código removido

- `src/App.social-disabled.tsx`
- `src/components/ChatView.tsx`
- `src/components/CreatePostModal.tsx`
- `src/components/DailyLimitOverlay.tsx`
- `src/components/ExploreView.tsx`
- `src/components/FloatingParticles.tsx`
- `src/components/FollowListModal.tsx`
- `src/components/GymnasticsHero.tsx`
- `src/components/Header.tsx`
- `src/components/Navigation.tsx`
- `src/components/NotificationsView.tsx`
- `src/components/PhotoFocusEditor.tsx`
- `src/components/PostCard.tsx`
- `src/components/ProfileView.tsx`
- `src/components/ReelsViewer.tsx`
- `src/components/ReportModal.tsx`
- `src/components/RightSidebar.tsx`
- `src/components/SearchView.tsx`
- `src/components/SettingsModal.tsx`
- `src/components/SidebarNav.tsx`
- `src/components/SkyglassPhoto.tsx`
- `src/components/StoriesBar.tsx`
- `src/components/StoryViewerModal.tsx`
- `src/components/Worlds.tsx`
- `src/hooks/usePushNotifications.ts`
- `src/media/person-cutout.ts`
- `src/media/person-cutout.worker.ts`
- `src/services/supabase.ts`
- `src/services/supabaseService.ts`
- `src/utils/avatars.ts`
- `src/utils/videoPoster.ts`
- `src/worlds.css`

## Recursos e relatórios

- `public/blue-lab/*`: imagens de feature removida, já excluídas da distribuição pelo build antigo.
- `public/assets/person-segmentation/*`: modelos/WASM/avisos da segmentação cujo código não tinha importador ativo; removida também a rota de entrega específica.
- `ALTERACOES.md`, `MUNDOS-CATEGORIAS.md`, `REDESIGN-RELATORIO.md`: registros históricos de interfaces/fluxos antigos; o histórico permanece no Git.
- Removida dependência direta `@mediapipe/tasks-vision`.

## Preservado intencionalmente

- `src/vite-env.d.ts` é uma declaração ambiente necessária, mesmo sem importador.
- Scripts de recuperação, SQL da persistência JSON, diagnósticos, testes, configurações do build e documentação operacional atual.
- Adaptador e testes de pagamentos: preservam o contrato para manutenção do histórico, embora cobranças estejam desativadas na aplicação.
- Estilos e temas ainda importados; assets podem estar referenciados por configuração persistida. Não houve remoção indiscriminada desses recursos.
- Nenhum db.json, bucket, mídia de usuário ou dado de produção foi apagado.

## Como foi verificado

Mapa estático de imports/reexports/literais relativos a partir de src/main.tsx, server.ts, vite.config.ts, scripts e testes. Os únicos módulos de código restantes sem referência explícita foram declarações ambiente. Lint, build e suíte completa cobrem os contratos ativos. Isso não afirma validação visual em todos os dispositivos.

## Funções antigas removidas

- 38 handlers Express de rotas sociais/efêmeras já bloqueadas pela política atual; a política continua devolvendo os mesmos bloqueios.
- 55 métodos do cliente API sem chamadas na interface ou nos testes. A recuperação segura foi ligada ao formulário antes da remoção de métodos sem uso.
- Removida a criação opcional de contas e publicações de demonstração do banco local. Nenhum registro existente foi apagado. A inicialização controlada do primeiro administrador no Supabase continua preservada.
- Removido o fluxo falso de recuperação que só mostrava uma mensagem de sucesso; agora o formulário pede o código enviado e a nova senha.
