# Relatório de redesign — Orelly Pop

## Resumo

- Referência analisada: interface mobile com fundo lavanda claro, superfícies brancas, roxo/lilás, cartões de acento amarelo, azul e rosa, cantos arredondados, tipografia geométrica e navegação inferior escura/compacta.
- Projeto identificado: React 19 + TypeScript + Vite + Tailwind CSS 4, com servidor Express e tema existente por `data-theme`.
- Implementação: refinado o tema **Orelly Pop** já presente no projeto para aproximá-lo da referência; mantidos Original e Skyglass como opções.
- O tema Orelly Pop passa a ser o padrão em instalações sem preferência salva. Uma escolha já salva pelo usuário continua sendo respeitada.
- Arquivos alterados: `src/context/ThemeContext.tsx` e `src/skyglass.css`.
- A lógica de negócio, serviços, APIs, rotas, banco de dados, autenticação e integrações não foram alterados intencionalmente.

## Sistema visual aplicado

- Canvas lavanda `#F7F3FF`; superfícies claras `#FFFEFC`; superfícies secundárias lilás `#F0E7FF`.
- Texto principal `#201832`; texto secundário `#746A86`; contornos lilás `#D9C9F4`.
- Acentos: lilás `#B88BFA`, roxo `#8B5BE7`, amarelo-lima `#D7FF38`, além de azul claro, laranja e rosa para expandir o sistema visual.
- Cartões claros, contornos definidos, sombras violetas suaves, cantos arredondados, estados de foco visíveis e interação pressionada discreta.
- Cabeçalho, navegação inferior, sidebar, cartões de publicação, filtros, formulários e modais recebem ajustes específicos para o tema.
- Regras de compatibilidade cobrem classes Tailwind legadas usadas pelo painel administrativo e por diálogos existentes.
- Responsividade reforçada para navegação inferior, conteúdo e modais em larguras móveis; respeita `prefers-reduced-motion`.

## Matriz de auditoria por arquivo/componente

Status **Implementado, não verificado** significa que os tokens/overrides globais e os ajustes de componente foram adicionados, mas a inspeção visual em runtime não pôde ser concluída neste ambiente. A funcionalidade foi preservada por não alterar os handlers desses componentes; não foi possível executar testes de regressão funcionais completos.

| Página/área | Componente/arquivo | Categoria | Arquivo modificado | Tema aplicado? | Responsividade verificada? | Funcionalidade preservada? | Teste executado? | Resultado |
|---|---|---|---|---|---|---|---|---|
| Global | `src/index.css` | Tokens/base e superfícies existentes | Não | Parcialmente via overrides Orelly | Não | Sim, sem edição | Não | Implementado, não verificado |
| Global | `src/skyglass.css` | Tema, tokens e compatibilidade global | Sim | Sim | Regras responsivas adicionadas; runtime não verificado | Sim, CSS apenas | Inspeção estática | Implementado, não verificado |
| Global | `src/context/ThemeContext.tsx` | Preferência de tema | Sim | Define Orelly Pop como padrão sem preferência salva | N/A | Sim; persistência e sincronização mantidas | Inspeção estática | Implementado, não verificado |
| Aplicação | `src/App.tsx` | Shell, feed e navegação de páginas | Não | Via classes globais e seletores existentes | Regras adicionadas; runtime não verificado | Sim, sem edição | Não | Implementado, não verificado |
| Aplicação | `src/components/UniverseFeed.tsx` | Conteúdo/visualização | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/EditProfileModal.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/TranslationStatus.tsx` | Componente reutilizável | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/CreatePostModal.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/SidebarNav.tsx` | Navegação/layout | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/TermsModal.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/AuthModal.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/UsageSettings.tsx` | Admin/configuração | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/ErrorBoundary.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/StoriesBar.tsx` | Conteúdo/visualização | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/AutoTranslatedText.tsx` | Componente reutilizável | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/Navigation.tsx` | Navegação/layout | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/NotificationsView.tsx` | Conteúdo/visualização | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/StorageStatus.tsx` | Admin/configuração | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/SettingsModal.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/ExploreView.tsx` | Conteúdo/visualização | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/FloatingParticles.tsx` | Componente reutilizável | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/ChatView.tsx` | Conteúdo/visualização | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/SearchView.tsx` | Conteúdo/visualização | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/ProfileView.tsx` | Perfil/conta | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/DailyLimitOverlay.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/SyncpayModal.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/FollowListModal.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/ReportModal.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/ManagedVideo.tsx` | Componente reutilizável | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/LanguageModal.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/StoryViewerModal.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/ReelsViewer.tsx` | Conteúdo/visualização | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/Header.tsx` | Navegação/layout | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/RightSidebar.tsx` | Navegação/layout | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/ThemeModal.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/CommentsModal.tsx` | Modal/diálogo/estado | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/AdminPanel.tsx` | Admin/configuração | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |
| Aplicação | `src/components/PostCard.tsx` | Conteúdo/visualização | Não | Via tema global e normalização de estilos legados | Não verificada em runtime | Sim, sem edição de lógica | Não | Implementado, não verificado |

## Verificações

- Inventário de arquivos fonte e componentes: executado.
- Inspeção de configuração e arquitetura: executada.
- Inspeção estática dos tokens e regras de tema: executada.
- `npm run build`: **não executado com sucesso**. O comando falhou com `vite: not found`, pois a instalação de dependências (`npm ci`) não terminou dentro do limite disponível no ambiente. Não afirmo que o build está aprovado.
- Testes automatizados: não executados, pois as dependências do projeto não ficaram disponíveis.
- Inspeção visual em navegador e testes reais de botões/rotas: não executados neste ambiente.
- Banco de dados, Supabase e pagamentos: não acessados nem alterados.

## Pendências conhecidas

1. Instalar dependências em ambiente com acesso funcional ao registry npm e executar `npm run build`, `npm run lint` e `npm test`.
2. Percorrer visualmente as rotas e todas as abas administrativas no navegador, inclusive modais e estados condicionais.
3. Validar os breakpoints e a navegação por toque em dispositivos reais ou em automação de navegador.
4. Confirmar visualmente a legibilidade de gráficos e estados semânticos alimentados por dados reais.

Nenhuma pendência foi marcada como concluída sem verificação.
