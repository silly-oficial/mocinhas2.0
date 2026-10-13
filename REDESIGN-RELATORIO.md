# Mocinhas — Skyglass com composição baseada na referência

Base: ZIP `mocinhas2.0-main (5).zip`. Referência visual prioritária: imagem `27072.jpg`, com as três telas de apresentação, descoberta e mapa. A Skill design-skyglass foi usada para interpretar medidas, materiais e estados; a imagem enviada prevaleceu na composição.

## O que mudou

O Skyglass foi reconstruído como uma composição, em vez de somente recolorir os componentes. O cabeçalho perdeu a grande cápsula; os filtros receberam tiles compactos com ícones; fotos e vídeos passaram a ocupar cards focais em 4:5; as ações reais ficam numa coluna sobre a mídia; legendas possuem proteção local de contraste. A navegação inferior tem cinco destinos reais — Início, Vídeos, Universo, Salvos e Conta — e um orbe azul central sem rótulo visual, mas com nome acessível. No desktop, a navegação vira uma barra lateral e o conteúdo conserva uma coluna focal.

O título/filtro do feed e o cabeçalho Skyglass seguem o fluxo da página: desaparecem ao rolar e não se sobrepõem aos vídeos. As galerias têm setas e indicador; o botão de enquadramento permite mostrar a mídia inteira. Legendas longas podem ser expandidas. Documentos e áudios mantêm seus controles e links em superfícies utilitárias.

Perfil, aparência, idiomas, comentários, autenticação, termos, Premium/Pix e administração recebem os materiais, tipografia e hierarquia do tema. Modais ativos usam `dialog` nativo com foco contido, Escape, retorno do foco e bloqueio da rolagem do fundo. Escape nos Termos fecha somente os Termos, preservando o cadastro aberto. Tab e Shift+Tab percorrem os controles da janela aberta sem alcançar o conteúdo de fundo. As opções Original, Lilac Studio e Orelly Pop continuam disponíveis. Preferências salvas são respeitadas; navegadores sem preferência começam em Skyglass. O script de abertura foi reconciliado com todas as opções para evitar uma abertura em tema diferente.

### Painel administrativo

- Organização em Visão geral, Publicar, Publicações, Contas, Limite diário, Pagamentos e Armazenamento.
- Removidas da interface as estatísticas de stories/direct, anúncios para notificações desativadas, categorias locais sem uso no feed e ações de limpeza incompatíveis com publicações permanentes. Os módulos sociais desativados e contratos do servidor permanecem no projeto.
- Estatísticas fictícias de usuários e engajamento foram substituídas por dados recebidos e somas reais de curtidas/comentários; o gráfico mostra publicações de sete dias.
- Upload múltiplo e links, um por linha. “Publicar cada mídia separadamente” gera uma postagem por arquivo/link; desativado, gera uma galeria. A legenda se aplica ao lote e comentários continuam habilitados. Nenhuma postagem temporária é criada.
- Envio sequencial, prevenção de duplo envio enquanto a operação está ativa e preservação dos itens ainda não publicados em uma falha confirmada. Mídias já enviadas são reaproveitadas durante a sessão. A confirmação do servidor continua necessária para marcar uma postagem como concluída.
- Hashtags mais usadas e recentes são extraídas das publicações carregadas, respeitando datas, frequência e deduplicação. Um clique acrescenta a tag à legenda; cliques repetidos não a duplicam.
- Publicações e contas têm busca. Premium, privilégios administrativos, verificação, exclusões manuais, limites e configurações de pagamento continuam ligados às APIs existentes. Alterar privilégios e excluir exige confirmação; a própria conta não pode retirar seu papel de admin por esse controle.
- Dados técnicos de armazenamento ficam recolhidos; backup e diagnóstico são acessíveis diretamente. A configuração avançada mantém o SQL e os campos do modo legado. Na persistência ativa por `mocinhas_app_state`, a conexão é somente consultável e explica a regra já existente do Render, evitando oferecer um formulário que o servidor rejeita.

## Arquitetura e inventário real

React 19 + TypeScript, Vite 6, Tailwind 4, lucide-react e Express. A aplicação ativa é `src/App.tsx`; não há roteador de páginas separadas. Ela alterna as vistas feed, vídeos, salvos, Universo e conta, com diálogos condicionais. `src/App.social-disabled.tsx` e os componentes sociais antigos não são pontos de entrada. Os estilos incluem `index.css`, `skyglass.css`, utilitários locais e agora `skyglass-reference.css`, importado por último. A fonte Plus Jakarta Sans é servida localmente, com a licença existente.

Backend: `server.ts`, módulos de pagamentos, consumo, banco, armazenamento e Supabase. Dados em nuvem permanecem separados do ZIP de código. O código não acessou a produção durante o trabalho.

## Decisões e fidelidade

| Decisão | Origem | Classificação | Razão e diferença |
|---|---|---|---|
| Cabeçalho pequeno, céu ao fundo, foto dominante | Tela central; design §§7.17/8 | Observado na imagem / adaptação | Marca e cota substituem nome/saudação de um app de encontros. |
| Categorias glossy, raio 12, glifo 18 | Tela central; §§6/7.6 | Observado / adaptação | São filtros reais por hashtags, sem inventar categorias de encontros. |
| Card 4:5, raio 26, controles laterais | Tela central; §§7.7/7.9 | Observado / adaptação | Curtir, comentar, salvar e enquadrar substituem as ações do produto de referência. |
| Barra branca e orbe marinho | Telas central/direita; §7.16 | Observado / adaptação | Cinco destinos existentes. Publicação admin permanece acessível pelo cabeçalho e pela conta. |
| Miniaturas circulares e anéis do Universo | Tela direita; §7.15 | Observado / adaptação | Canvas de conteúdo, não localização geográfica: sem distâncias, compatibilidade ou ruas fictícias. |
| CTA preto e superfícies brancas nos formulários | Tela esquerda; §§7.11/7.12 | Observado / derivação | Tarefas administrativas mantêm leitura à esquerda e ações reais. |
| Legibilidade e alvos maiores | §13 | Adaptação | Ícones de toque de pelo menos 44 px; texto secundário escurecido; controle branco sobre foto protegido por fundo local. |
| Fotografias e lettering | Imagem; §9 | Limitação / adaptação | O feed usa as mídias reais publicadas. Não foram introduzidas as modelos, nomes, “match” ou frases do app de encontros. Não existe recorte transparente de sujeito para simular texto atrás dele. A entrada pública usa identidade gráfica, evitando expor mídias protegidas antes do acesso. |
| Desktop | §11 | Adaptação | Sidebar e coluna de conteúdo; não foram fabricados painéis de mapa ou dados extras. |

As capturas renderizadas foram comparadas visualmente com a referência quanto à hierarquia, card focal, proporção, cabeçalho, controles, filtros, orbe, navegação e camadas claras. Não se declara reprodução pixel a pixel nem identidade fotográfica. A imagem é um mockup de três telefones, não um arquivo de layout editável; fonte exata e medidas foram inferidas.

## Principais arquivos modificados

- `src/App.tsx`: composição do feed, galerias, ações, navegação, cabeçalho, conta e abertura de publicação.
- `src/skyglass-reference.css` (novo): composição centralizada e estados específicos, com regras mobile, desktop, movimento reduzido e fallback.
- `src/components/ModalFrame.tsx` (novo): infraestrutura de diálogos acessíveis.
- `src/components/AdminPanel.tsx`: painel, dados reais, publicação múltipla, hashtags e integrações.
- `src/components/StorageStatus.tsx` e `UsageSettings.tsx`: organização e legibilidade das configurações.
- `src/components/UniverseFeed.tsx`: formas de miniaturas, título e consulta visual, com câmera/zoom preservados.
- `ThemeModal.tsx`, `AuthModal.tsx`, `CommentsModal.tsx`, `LanguageModal.tsx`, `EditProfileModal.tsx`, `SyncpayModal.tsx`, `TermsModal.tsx`: integração com modal nativo; nomes e campos acessíveis na autenticação.
- `src/components/ErrorBoundary.tsx`: identificação visual do estado de erro.
- `src/context/ThemeContext.tsx`, `src/main.tsx`, `index.html`: escolha inicial, abertura coerente, importação e metadados atualizados.
- `src/i18n/ui-catalog.ts`: textos principais novos da navegação e mídia nas dez línguas estrangeiras. Os demais textos novos usam o fluxo de tradução em lote/cache já existente.

## Preservação e testes

Comparação byte a byte com o ZIP (5): quinze arquivos de servidor, módulos de persistência, SQL, scripts de recuperação, dependências e configuração do Render permaneceram idênticos. Não há migração de banco ou mudança de variáveis exigida por esta atualização. Nenhuma chave privada foi incluída no ZIP.

| Verificação executada | Resultado real |
|---|---|
| `npm run lint` | Aprovado: TypeScript sem erros. |
| `npm run build` | Aprovado: frontend e servidor compilados. Vite avisa sobre o bundle acima de 500 kB; o aviso não impede o build. |
| `npm test` | Aprovado: sete suítes/etapas, cobrindo cotas, autorização, publicações permanentes/anônimas, rotas desativadas, SyncPay, 11 idiomas, armazenamento, persistência em nuvem e diagnósticos. |
| Navegador Chromium, fluxo de redesign | Aprovado: filtros, galerias, enquadramento, curtidas, favoritos, comentários, perfil, idiomas, Premium/Pix, Universo, todas as seções administrativas, envio separado/galeria, hashtags, falha parcial, contas, limite e configurações. |
| Vídeo real de teste em Chromium | Aprovado: início automático, primeiro quadro, som de um único vídeo, pausa e remoção da mídia ao trocar de vista, editor de perfil e posters distantes do Universo. |
| Estados da interface | Vazio, limite esgotado, legenda expandida, PDF, cadastro com termos, login e modal de recuperação renderizados. Recuperação não teve envio de e-mail confirmado; veja pendência abaixo. |
| Verificações adicionais | Aprovado: espanhol, francês e árabe/RTL; alturas curtas, nome longo, ciclo de teclado, fonte de modal ampliada e superfícies sem blur. Zoom de navegador real e teclado virtual físico não foram testados. |
| Larguras | 320, 360, 375, 390, 414, 430, 768 e 1280 px; sem rolagem horizontal da página nos fluxos verificados. As abas e filtros mantêm rolagem horizontal intencional. |
| Testes de integrações no navegador | Somente APIs interceptadas para executar fluxos e contratos; não comprovam cobrança real, entrega de e-mail ou conexão com o Supabase do usuário. As suítes de servidor também usam armazenamento/serviços isolados. |

Os scripts de inspeção no navegador foram executados em um ambiente de QA com Playwright/Chromium. Os dados e a foto de teste ficaram fora do projeto distribuído. Os testes existentes do projeto continuam disponíveis via `npm test`, após o build. Screenshots de inspeção são evidências internas e não contêm dados da produção.

## Matriz de auditoria

“Verificado” indica as verificações descritas na coluna Teste, em Chromium; não implica teste físico em todas as plataformas nem certificação WCAG. Sim/Parcial/Não nas colunas descrevem o alcance, e o estado final usa a legenda solicitada.

| Página ou rota | Componente | Categoria | Arquivo modificado | Redesign aplicado? | Fidelidade visual revisada? | Responsividade verificada? | Funcionalidade preservada? | Teste executado? | Resultado | Pendências |
|---|---|---|---|---|---|---|---|---|---|---|
| SPA / feed | Cabeçalho, filtros, card e navegação | Estrutura e mídia | App.tsx; skyglass-reference.css | Sim | Sim | Sim, 320–1280 | Sim | Capturas, rolagem, filtros, curtidas/favoritos | Concluído e verificado | Conteúdo fotográfico depende das mídias publicadas. |
| SPA / vídeos | ManagedVideo em card | Player | App.tsx; CSS | Sim | Sim | Sim | Sim | MP4 real, autoplay, exclusividade de áudio, descarte | Concluído e verificado | Safari/iPhone físico não testado. |
| SPA / galerias | Setas, contador e enquadramento | Mídia | App.tsx; CSS | Sim | Sim | Sim | Sim | Troca de mídia e object-fit contain | Concluído e verificado | Sem alteração do arquivo original. |
| SPA / salvos | Lista e navegação | Coleção | App.tsx; CSS | Sim | Sim | Sim | Sim | Salvar e abrir lista filtrada | Concluído e verificado | Nenhuma conhecida nos fluxos testados. |
| SPA / Universo | Canvas, busca, círculos e detalhe | Navegação de conteúdo | UniverseFeed.tsx; CSS | Sim | Sim | Sim | Sim | Zoom, recentrar, abertura, redução de movimento, posters | Concluído e verificado | Gestos físicos de pinça não testados em aparelho. Não é mapa geográfico. |
| SPA / publicação aberta | Dialog e card | Modal | App.tsx; ModalFrame.tsx; CSS | Sim | Sim | Sim | Sim | Abertura e Escape | Concluído e verificado | Nenhuma conhecida nos fluxos testados. |
| SPA / conta | Resumo, cota e opções | Perfil | App.tsx; CSS | Sim | Sim | Sim | Sim | Editar nome e opções | Concluído e verificado | Foto/avatares antigos não reintroduzidos. |
| SPA / editar perfil | Nome e salvar | Formulário | EditProfileModal.tsx; ModalFrame.tsx; CSS | Sim | Sim | Sim | Sim | Envio à API e atualização de nome | Concluído e verificado | Nenhuma conhecida nos fluxos testados. |
| SPA / aparência | Quatro temas | Preferências | ThemeContext.tsx; index.html; CSS | Sim | Sim | Sim | Sim | Alternância e persistência | Concluído e verificado | Preferência continua local ao navegador. |
| SPA / idiomas | Seleção e tradução automática | Preferências | LanguageModal.tsx; CSS; catálogo | Sim | Sim | Sim | Sim | Inglês e toggle; suítes de 11 línguas | Concluído e verificado | Textos fora do catálogo dependem da tradução em lote disponível. |
| SPA / comentários | Vazio, lista e envio | Interação | CommentsModal.tsx; ModalFrame.tsx; CSS | Sim | Sim | Sim | Sim | Escrever, enviar e fechar; contratos de exclusão/curtida na suíte | Concluído e verificado | Nenhuma cobrança ou banco de produção usado. |
| SPA / entrada pública | Marca, atmosfera e CTA | Apresentação | App.tsx; CSS | Sim | Sim, adaptado | Sim | Sim | Abrir autenticação | Concluído e verificado | Sem foto recortada ou lettering atrás de pessoa. |
| SPA / login e cadastro | Campos, senha e termos | Autenticação | AuthModal.tsx; ModalFrame.tsx; CSS | Sim | Sim | Sim | Sim | Login/cadastro com APIs de QA, mostrar senha, aceite | Concluído e verificado | Serviços externos reais não acessados. |
| SPA / termos | Conteúdo e aceite | Modal aninhado | TermsModal.tsx; ModalFrame.tsx; CSS | Sim | Sim | Sim | Sim | Abertura e Escape preservando cadastro | Concluído e verificado | Conteúdo jurídico não foi reescrito. |
| SPA / recuperação | Formulário | Autenticação | AuthModal.tsx; CSS | Sim | Sim | Sim | Parcial: lógica preexistente | Somente renderização | Implementado, não verificado | O código original afirma envio sem chamar API de recuperação. Bug preexistente documentado abaixo. |
| SPA / Premium e Pix | Oferta, QR, copiar/verificar e sucesso | Pagamentos | SyncpayModal.tsx; ModalFrame.tsx; CSS | Sim | Sim | Sim | Sim | Fluxo Pix simulado; sete suítes incluem contrato financeiro | Concluído e verificado | Transação real não executada. |
| Admin / Visão geral | Métricas e gráfico | Administração | AdminPanel.tsx; CSS | Sim | Sim | Sim, 320/390/1280 | Sim | Dados carregados e gráfico real de datas | Concluído e verificado | Números refletem os dados disponíveis, sem taxa de engajamento inventada. |
| Admin / Publicar | Upload, links, lote e hashtags | Administração | AdminPanel.tsx; CSS | Sim | Sim | Sim | Sim | Dois MP4 separados, galeria de dois links, falha parcial e retomada | Concluído e verificado | Perda de resposta após gravação não foi simulada; não há novo contrato de idempotência. |
| Admin / Publicações | Busca e exclusão | Administração | AdminPanel.tsx; CSS | Sim | Sim | Sim | Sim | Lista/busca; autorização e exclusão no teste de servidor | Concluído e verificado | Exclusão de dados reais não executada. |
| Admin / Contas | Busca e permissões | Administração | AdminPanel.tsx; CSS | Sim | Sim | Sim | Sim | Premium, verificação, admin e exclusão interceptados | Concluído e verificado | Operações reais de produção não executadas. |
| Admin / Limite diário | Cota e vínculo por rede | Configuração | AdminPanel.tsx; UsageSettings.tsx; CSS | Sim | Sim | Sim | Sim | Atualizar 45 minutos via contrato; suítes de cotas | Concluído e verificado | Identificação por navegador/rede mantém os limites já documentados no app. |
| Admin / Pagamentos | Campos, webhook e diagnóstico | Integração | AdminPanel.tsx; CSS | Sim | Sim | Sim | Sim | Salvar e diagnosticar em QA; suíte SyncPay | Concluído e verificado | Credenciais/provedor reais não validados neste trabalho. |
| Admin / Armazenamento | Estado, backup, SQL e conexão | Integração | AdminPanel.tsx; StorageStatus.tsx; CSS | Sim | Sim | Sim | Sim | Consultas em QA; política de conexão e testes isolados de persistência | Concluído e verificado | Exportação com dados privados reais não foi feita. |
| SPA / vazio e cota esgotada | Mensagem e próximo acesso | Estado | App.tsx; CSS | Sim | Sim | Sim | Sim | Estado controlado em QA | Concluído e verificado | Nenhuma conhecida nos fluxos testados. |
| SPA / reconexão e avisos | Notificação compacta | Estado | CSS e estrutura preservada | Sim | Parcial | Layout inspecionado | Sim | Contratos preservados; nenhum ciclo real de perda de rede | Implementado, não verificado | Falha de rede real prolongada não simulada. |
| SPA / falha global | ErrorBoundary | Estado excepcional | ErrorBoundary.tsx; CSS | Sim | Não | Não | Lógica preservada | Inspeção estática | Implementado, não verificado | Exceção global não forçada no navegador. |
| Rotas sociais desativadas | Stories, direct, seguidores, grupos e explorar | Legado | Não alterado | Não | Não aplicável | Não aplicável | Desativação preservada | Testes de acesso negado | Não aplicável | Fora da aplicação ativa; código mantido para futuro uso. |
| Projeto | Calendário, paginação, gráficos externos, lazy routes | Ausentes | Não aplicável | Não aplicável | Não aplicável | Não aplicável | Não aplicável | Inventário do código ativo | Não aplicável | Não existem nessas vistas; não foram inventados. |

## Checklist de qualidade e limites

- PASS: referência examinada e comparada com screenshots; composição, posições e formas revistas, mantendo ações reais.
- PASS: estilos globais, componentes compartilhados, estilos locais, modais condicionais e administração ativa percorridos.
- PASS: famílias e fontes existentes mantidas; mídia sem distorção e com alternativa de enquadramento completo; nada de nomes ou compatibilidade fictícia.
- PASS: foco nativo, Escape e retorno de foco; navegação nomeada; acesso alternativo ao conteúdo do Universo pelo feed/busca.
- PASS: contraste calculado nos papéis principais: texto secundário sobre o céu mais escuro 4,63:1; ícone branco do rail sobre foto branca com proteção 52% 3,67:1; texto branco sobre scrim 88% 12,88:1; CTA preto 19,32:1; azul escuro sobre branco 7,59:1. Isso é uma amostra dos papéis, não auditoria WCAG integral.
- PASS: reduzidos loops/efeitos quando solicitado pelo sistema. Fallback claro/escuro definido para ausência de blur.
- NÃO VERIFICADO: aparelhos físicos iOS/Android, VoiceOver/TalkBack, teclado virtual real, safe areas reais, blur nativo em Safari e desempenho em dispositivos fracos. CSS utiliza safe areas/dvh, mas a emulação não comprova essas condições.
- NÃO VERIFICADO: precisão pixel a pixel, fotografia recortada/lettering da referência e equivalência exata de fontes do mockup.

### Pendência funcional preexistente — recuperação de senha

No ZIP original, o modo recovery de `AuthModal.tsx` somente apresenta “Link de recuperação enviado para seu e-mail.” e não faz uma requisição que entregue o link. O redesign preservou essa lógica; não foi implementado um serviço de recuperação nem alegado envio real. Precisa de uma tarefa funcional própria, com o sistema de autenticação/entrega de e-mail em uso, para concluir esse fluxo.

### Limite do lote em falhas de rede

Falha HTTP confirmada preserva os itens pendentes e não republica os itens com resposta de sucesso. Se a conexão cair depois que o servidor gravou e antes de a resposta chegar, a aplicação não tem como saber se aquela operação foi concluída. Antes de repetir esse item, confira a lista de publicações. Não foi alterado o contrato da API para introduzir chaves de idempotência.

## Entrega

ZIP completo, com arquivos de código/configuração, fontes e licenças, testes existentes e este relatório. `node_modules`, `dist`, caches, banco local, uploads da produção e credenciais foram excluídos. O banco remoto não é substituído pelo código do ZIP. O script de build/deploy permanece o mesmo.
