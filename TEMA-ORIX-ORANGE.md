# Orix Orange — tema adicional

Selecione **Aparência → Orix Orange**. A troca é imediata e usa a persistência de tema existente. Original, Skyglass, Lilac Studio e Orelly Pop continuam disponíveis. O padrão do aplicativo não foi alterado.

## Referência visual e adaptação

Visível na imagem: superfícies brancas, títulos pretos com pesos contrastantes, laranja nos ícones ativos e botões, detalhes amarelos, cartões com cantos amplos e mídia dominante. A segunda tela mostra um cartão escuro com imagem arredondada e informações abaixo. O laranja externo à interface é o fundo da apresentação da referência; por isso não foi aplicado como fundo de todas as telas do app.

Deduzido: valores exatos de cor, fonte, raios e espaçamento, pois a imagem não fornece medidas ou arquivos de fonte. Foram usados o sistema de fontes já disponível no projeto e proporções ajustadas ao conteúdo real. O cubo decorativo foi desenhado em CSS, sem download externo. Não foram importados personagens, jogos, marcas, textos ou funções da referência.

O tema aplica fundo branco, acentos laranja, títulos amplos, cubo decorativo e ícones ativos circulares. As fotos usam cartões verticais preenchidos pela imagem até as bordas, legenda branca sobre um degradê preto inferior e ações sobre a própria foto. Início e Salvos usam uma galeria horizontal com encaixe central e o próximo cartão parcialmente visível no celular. Os vídeos mantêm sua apresentação e player existentes. A mesma linguagem se estende à entrada, conta, filtros, Universo, comentários, formulários, idiomas, Premium e painel administrativo. O Universo mantém busca, zoom e navegação reais, com superfícies claras e controles de 44 px. Nomes longos na conta quebram em linhas no tema novo.

## Arquitetura examinada

React 19 e TypeScript, Vite e Tailwind CSS 4; entrada em src/main.tsx. App.tsx controla as áreas ativas por estado: Início, Vídeos, Universo, Salvos e Conta. O backend Express está em server.ts e server/. AuthContext, LanguageContext e ThemeContext fornecem os estados compartilhados. Há integração de armazenamento/Supabase, pagamentos SyncPay, gerenciamento de acesso e mídia.

A publicação do novo tema reutiliza o carrossel, as ações e o player ManagedVideo existentes. Curtidas, comentários, favoritos, seleção de mídia, enquadramento completo, pausa, som, barra de posição e nitidez continuam ligados à implementação existente. Os temas antigos continuam com suas próprias apresentações. Os arquivos e componentes sociais desativados não foram reativados.

## Arquivos alterados

- src/orix.css: novo tema, tokens, apresentação, compatibilidade com estilos locais das telas, responsividade, foco e movimento reduzido. Seletores de tela limitados a data-theme=orix; a miniatura tem uma classe exclusiva.
- src/context/ThemeContext.tsx: registra orix e define a cor da interface do navegador quando selecionado.
- src/components/ThemeModal.tsx: quinta opção com prévia e descrição.
- src/App.tsx: apresentação de publicações, cabeçalho e navegação próprios quando Orix está selecionado; nome do tema na conta.
- src/main.tsx: importa a folha do tema.
- src/i18n/ui-catalog.ts: descrição do tema nas línguas já suportadas.
- TEMA-ORIX-ORANGE.md: este relatório.

Os arquivos de backend, serviços de API, player, banco, pagamentos, scripts de deploy e dependências não foram modificados. Não houve correção de lógica de negócio nem migração de banco nesta entrega.

## Validação executada

- npm run lint: aprovado (tsc --noEmit).
- npm run build: aprovado, frontend Vite e backend esbuild. Aviso não bloqueante do Vite: bundle JavaScript acima de 500 kB (cerca de 697 kB, gzip 204 kB). Não foi alterada a divisão de bundles neste trabalho visual.
- npm test: aprovadas as nove suítes existentes — consumo diário, acesso/permissões, pagamentos, idiomas, armazenamento, integração cloud, diagnóstico cloud, entrada e separação de mídias do feed. Os testes cloud/pagamentos usam ambientes isolados; não fazem cobranças reais.
- Chromium/Playwright: capturas do feed em 320, 390, 430, 768 e 1280 px, sem rolagem horizontal da página. Conferência das oito abas administrativas em 320, 390 e 1280 px, além de conta, edição, comentários, idiomas, Premium desativado, entrada, cadastro e recuperação.
- Interação no navegador: curtida, carrossel de mídia, enquadramento completo, reprodução de vídeo, navegação entre áreas, busca/zoom do Universo, seleção dos cinco temas, persistência após recarregar, foco dentro do diálogo e fechamento com Escape.
- Comparação visual das capturas com a referência: verificados branco/laranja, contraste dos títulos, proporções de cartão, base escura, cantos e ícones ativos. O contraste dos controles do Universo e a exibição de nomes na conta foram ajustados após inspeção.

A revisão visual foi feita com respostas de API e mídias de teste isoladas, fora do projeto entregue. Os testes de integração existentes também foram executados. Não houve acesso aos dados de produção, cobrança ou alteração de conteúdo publicado.

## Limites e instalação

A imagem mostra apenas duas telas de outro produto; as demais áreas são uma extensão coerente do tema, não uma reprodução pixel a pixel. Não foram testados Safari/WebKit, iPhone ou Android físicos. Pagamentos reais, upload para os serviços de produção e notificações do sistema operacional não foram exercitados. Os componentes e permissões existentes foram mantidos.

O comando vite preview encontrou uma limitação de rede do ambiente de execução; a inspeção no Chromium utilizou os mesmos arquivos finais de dist servidos localmente por Express.

O ZIP tem package.json na raiz e pode ser importado no Zip2Git. Instale as dependências e mantenha as variáveis e o armazenamento que a hospedagem já utiliza. O ZIP não inclui node_modules, dist, bancos locais, dados de revisão, caches ou credenciais privadas. Não é necessário recriar tabelas, importar dados nem substituir o banco para ativar o tema.

## Correção da apresentação das fotos — 13/10/2026

A apresentação anterior com moldura e legenda abaixo da foto foi substituída no tema Orix: fotos de ponta a ponta, cantos arredondados, legenda sobreposta e carrossel horizontal de publicações no Início e Salvos. A opção de foto completa mantém a proporção original e remove o degradê. O modo enquadrado usa recorte de capa, como a referência. O álbum dentro de cada publicação continua com suas setas, separado da rolagem entre publicações.

Verificação adicional no Chromium: rolagem horizontal do carrossel, foto preenchendo a largura do cartão, ausência de overflow horizontal da página, expansão da foto, troca de mídia, curtida e comentários. Capturas em 320, 390, 430, 768 e 1280 px. Os 34 arquivos antigos removidos na versão enxuta estão preservados nesta entrega completa, sem reativar funções sociais desativadas.

## Revisão do topo, navegação e vídeos — 13/10/2026

- Topo no Orix: ação Aparência com ícone laranja à esquerda, no lugar de Search. Perfil com o avatar real (ou iniciais quando não há imagem utilizável) à direita. O perfil abre Minha conta; visitantes abrem a autenticação.
- Menu superior de mais opções mantém Idioma, Salvos, Premium e Administração, respeitando a autenticação e as permissões existentes.
- Barra inferior com quatro destinos: Início, Vídeos, Universo e Conta. Somente o destino ativo exibe o texto, ao lado do círculo laranja; os demais ficam com ícones cinza. Salvos permanece acessível no menu superior e na conta. A navegação dos outros temas permanece intacta.
- Fotos: degradê preto reforçado atrás da legenda, texto na base ao lado da ação laranja de enquadramento completo. Curtidas, comentários e favoritos continuam disponíveis com contraste melhorado.
- Vídeos: carrossel com cartões de fundo escuro, mídia arredondada, legenda na base e botão laranja Play/Pause. Este botão controla o elemento de vídeo existente; não é apenas decorativo. O som, a barra de posição, o enquadramento completo e a nitidez continuam no player existente. A conexão entre botão e vídeo é mantida ao mudar de tema.
- Selo amarelo: primeira hashtag real da publicação; sem hashtag, mostra o tipo de mídia. Selo escuro: posição no álbum quando há várias mídias ou quantidade real de curtidas quando há uma mídia única. Não foram adicionados números de espectadores ou indicação de transmissão ao vivo sem dados reais.

Verificações desta revisão: build e TypeScript aprovados, testes existentes aprovados; Chromium com comparação de capturas, perfil no topo, quatro destinos inferiores, acesso a Salvos e Administração pelo menu, selos com dados reais, vídeo pausando/retomando pelo botão laranja e funcionando após trocar de Skyglass para Orix. As verificações de integração e a revisão visual usam ambiente isolado; não houve cobrança ou alteração de dados publicados. Safari e aparelhos físicos não foram testados.

O ZIP desta revisão contém todos os arquivos do ZIP original e package.json na raiz. Não inclui node_modules, dist, caches, banco local nem conteúdo de teste.

## Ajustes finais de proporção, tradução e entrada — 13/10/2026

- Galeria de fotos: PublicationGallery.tsx identifica o cartão mais próximo do centro enquanto o usuário arrasta. O central usa escala 1; os vizinhos usam escala 0,86. O espaçamento foi ajustado para os cartões vizinhos continuarem aparecendo. A rolagem e o encaixe são nativos, com respeito a movimento reduzido.
- Tradução: botão compacto e escuro com texto branco. A limitação de duas linhas foi aplicada apenas ao texto da legenda, preservando o botão de tradução visível. Alternar original/traduzido continua usando o mecanismo existente. A área de toque se estende além da superfície visual compacta.
- Vídeos: aba em lista vertical, largura máxima de 430 px e área de exibição 4:5, min-height 320 px e max-height calc(100dvh - 124px), como Skyglass. A legenda e os controles ficam sobre a mídia; a base externa anterior foi removida. O modo completo preserva a imagem sem recorte. Play/Pause continua ligado ao player real.
- Selos amarelos: alternância por posição na lista entre a primeira hashtag real e Fotos, seguindo a sequência solicitada. Sem hashtag, a alternativa também é Fotos. Os selos escuros continuam informando álbum ou curtidas reais.
- Perfil: o avatar padrão verde profile-placeholder.svg é representado por um ícone laranja no Orix; avatares personalizados são preservados. O asset padrão e os demais temas não foram alterados.
- Cubo laranja: removido do cabeçalho de conteúdo. O cabeçalho não é mostrado antes da autenticação, evitando duplicação do título na entrada.
- Entrada: carrossel com a mesma faixa de altura do Skyglass, título e descrição abaixo e botão de entrada com seta. Foram usadas superfícies brancas, gradiente laranja e botão escuro. Imagens/vídeos configurados no painel e os controles do carrossel permanecem ativos.

Arquivos desta revisão: src/App.tsx, src/orix.css, src/components/AutoTranslatedText.tsx e novo src/components/PublicationGallery.tsx. Nenhum arquivo de backend foi modificado.

Validação: npm run lint, npm run build e as nove suítes de npm test aprovados. Revisão Chromium de 320 a 1280 px, sem overflow horizontal da página. Conferidos escala do cartão central, sequência de selos, fallback laranja do perfil, botão de tradução com altura visual de até 30 px e alternância real do conteúdo. As dimensões do cartão de vídeo foram comparadas entre Orix e Skyglass a 390 px, com diferença inferior a 2 px. Tela de entrada e botão de autenticação conferidos. Não foram testados aparelhos físicos ou Safari.

## Degradê, foto completa e ponto de destaque — 13/10/2026

- O degradê dos vídeos foi movido da legenda para a camada da mídia. Ele chega ao fundo do cartão, segue os cantos arredondados e fica abaixo da barra de posição e dos controles. A exibição completa de vídeo continua removendo o degradê.
- Ver foto completa agora exibe a imagem original com cantos arredondados, sem faixa preta, legenda ou botões de curtir/comentar/salvar. Há um botão flutuante para voltar ao enquadramento e as setas de álbum, quando necessárias. As ações reaparecem ao voltar ao modo de cartão.
- Painel administrativo: em Publicar, selecione uma foto ou informe um link de imagem e abra Ajustar destaque. Toque na região desejada ou use os controles Horizontal/Vertical; a prévia mostra o recorte. O ajuste é enviado junto com a publicação.
- Para fotos já publicadas, abra Publicações → Ajustar destaque, ajuste cada imagem e clique em Salvar destaque. A posição é armazenada por mídia, respeitando os álbuns.
- O app recebe apenas coordenadas neutras de apresentação (`focus: {x,y}`), sem identificação de quem escolheu o enquadramento e sem aviso público de edição. O arquivo original da foto não é recortado, regravado ou marcado. O modo completo mostra a imagem inteira. Não há afirmação pública de que uma IA ou algoritmo fez a escolha.

Implementação: PhotoFocusEditor.tsx e shared/photo-focus.ts; campo opcional no contrato de mídia; endpoint PATCH /api/admin/posts/:id/focus protegido por requireAdmin; validação de coordenadas numéricas de 0 a 100 e restrição a fotos/GIF. Fotos antigas sem coordenadas mantêm o enquadramento anterior. Não é necessário executar SQL adicional: o estado continua no armazenamento JSON existente.

Validação real: TypeScript e build aprovados; as nove suítes existentes aprovadas; teste de integração ampliado para criação com foco, atualização administrativa, rejeição de usuário comum e de valores inválidos, preservação da URL original, ausência de autoria no retorno público e persistência após reiniciar o servidor. Revisão Chromium: foto completa sem rodapé e retorno aos controles, camada do degradê abaixo da barra, ajuste de foto publicada com aplicação no feed e publicação de arquivo novo com as coordenadas escolhidas. Editor conferido em 320, 390 e 1280 px, sem overflow horizontal da página. Os testes usam dados isolados e não alteram produção. Safari/aparelhos físicos e uma conexão Supabase real não foram testados.

Arquivos desta revisão: src/App.tsx, src/orix.css, src/skyglass-reference.css, src/components/AdminPanel.tsx, novo src/components/PhotoFocusEditor.tsx, src/types.ts, src/services/api.ts, server.ts, server/db.ts, novo shared/photo-focus.ts e tests/access.test.mjs. O ZIP preserva todos os arquivos originais, package.json na raiz e exclui bancos locais, node_modules, dist, caches e dados de revisão.

## Zoom, capa por frame e barra inferior — 13/10/2026

- Ajustar destaque das fotos agora tem Zoom de 100% a 300%, com prévia, salvamento por mídia e validação no servidor. Posição e zoom são aplicados juntos no cartão; ver a foto completa continua mostrando o original sem zoom. Dados antigos sem zoom continuam funcionando com escala 1.
- Ajustar destaque dos vídeos agora abre Capa do vídeo. O indicador permite navegar no tempo do vídeo, com ajustes de 0,1 s e controle de 0,01 s pelo slider. Salvar capa extrai o frame decodificado em JPEG de até 960 px e o envia pelo upload autenticado existente. Para arquivos novos, Usar este frame guarda a seleção e Publicar envia o vídeo com a capa escolhida. Para vídeos já publicados, a seleção é salva imediatamente após confirmar Salvar capa.
- O vídeo original, sua URL e a reprodução permanecem intactos. São salvos apenas thumbnail e coverTime, sem autoria pública da escolha. A capa é usada pelo poster do player, miniaturas e Universo, conforme os componentes existentes; reprodução automática continua mostrando o vídeo durante o play.
- Captura de links externos depende de o navegador poder decodificar e acessar o vídeo. Quando o provedor bloqueia a captura, o editor informa o problema e permite Usar arquivo original. Não há falsa confirmação de uma capa que não foi extraída ou enviada. Safari e dispositivos físicos não foram testados.
- A barra inferior do Orix agora é branca opaca até o fundo da viewport, incluindo a área segura do dispositivo. Não há transparência ou margem inferior expondo vídeos atrás da navegação.

Validação: TypeScript/build aprovados e as nove suítes de npm test aprovadas. Integração ampliada: validação do zoom, controle de permissões da capa, rejeição de URL/timestamp inválidos, preservação da URL do vídeo e persistência de zoom/capa após reiniciar. Chromium: zoom 200% salvo/aplicado no feed; captura real de bytes JPEG e timestamp escolhido para vídeo publicado; seleção de frame e publicação de vídeo novo preservando sua fonte. Fundo branco e posição da barra inferior verificados na aba Vídeos. Revisão visual e testes foram feitos com dados isolados, sem alterar produção.

Arquivos desta revisão: shared/photo-focus.ts, novo shared/video-cover.ts, src/components/PhotoFocusEditor.tsx, novo src/components/VideoCoverEditor.tsx, src/components/AdminPanel.tsx, src/App.tsx, src/orix.css, src/skyglass-reference.css, src/types.ts, src/services/api.ts, server/db.ts, server.ts e tests/access.test.mjs. Não é necessário SQL adicional ou novas variáveis de ambiente. Todos os arquivos originais continuam no ZIP.

## Hierarquia da legenda — 13/10/2026

No tema Orix, a primeira linha visual da legenda usa peso 750 e as seguintes peso 350, acompanhando a referência de título grosso e texto fino. Havendo texto além das hashtags, as hashtags são retiradas apenas da apresentação da legenda, inclusive da tradução, e o selo superior continua mostrando a categoria. Legendas compostas somente por hashtags continuam disponíveis. O texto original salvo não é alterado, e os demais temas mantêm sua apresentação. A expansão mantém a hierarquia de pesos.

TypeScript, build e nove suítes de testes aprovados. Chromium confirmou os dois pesos, ausência de hashtags no texto da legenda e permanência da hashtag no selo; captura visual conferida em 390 px. A revisão do navegador também cobre larguras de 320, 430, 768 e 1280 px, zoom, capa por frame, navegação, administração e entrada. O build mantém o aviso de bundle acima de 500 kB.

## Carrossel de vídeos e crescimento após rolagem — 13/10/2026

- A aba Vídeos do Orix agora usa o mesmo carrossel lateral nativo das fotos, com cartão central maior que os vizinhos, encaixe ao arrastar e prévias nas bordas. Os cartões de vídeo são um pouco maiores que os de foto e usam mídia em toda a superfície, legenda sobre o degradê e bordas arredondadas. Ao trocar de aba, a galeria começa no primeiro cartão. Os demais temas mantêm a navegação existente.
- A barra de tempo do vídeo só aparece em Ver mídia completa no Orix. Retornar à exibição normal remove o controle; reprodução, áudio, tempo atual e ações continuam no player existente. A visualização completa contém o vídeo proporcional e permite avançar/retroceder pelo slider.
- No celular, quando o título sai da área visível abaixo do cabeçalho fixo, as fotos crescem verticalmente para aproveitar a altura disponível acima da navegação. As larguras e o efeito de cartão central permanecem, conservando os vizinhos nas bordas. Voltar ao topo restaura as proporções iniciais. O ajuste considera altura do cabeçalho, menu e viewport, sem alterar dados ou arquivos de mídia.

Arquivos principais: src/App.tsx, src/components/PublicationGallery.tsx, src/components/ManagedVideo.tsx e src/orix.css. TypeScript e build aprovados; nove suítes existentes de testes aprovadas. Revisão Chromium em 320, 390, 430, 768 e 1280 px: carrossel horizontal, vídeos maiores, ausência de overflow da página, slider exclusivo da visualização completa e mudança real de tempo; crescimento e retorno das fotos com vizinhos nas bordas conferidos em 320, 390 e 430 px. Capturas mobile e desktop analisadas com dados isolados. Safari/aparelhos físicos e produção não foram testados. Permanece o aviso do build sobre bundle acima de 500 kB.

Ao abrir o vídeo completo, o cartão é levado para abaixo do cabeçalho fixo, mantendo a barra de tempo visível acima da navegação. Essa posição foi conferida no navegador nas três larguras mobile.

## Expansão limitada e transição estável — 13/10/2026

Esta revisão substitui o cálculo anterior de expansão. O espaço de rolagem fica estável em um contêiner próprio e o carrossel permanece abaixo do cabeçalho inteiro. A altura dos cartões considera também o menu, a área final da página e a viewport visual do navegador. Isso elimina a realimentação entre crescimento do cartão e comprimento da página que permitia cortar o topo da mídia. Não há mais salto automático de scroll ao abrir o vídeo completo. Fotos, vídeos e suas visualizações completas continuam entre os limites do cabeçalho e da navegação, mantendo os vizinhos nas bordas. A imagem completa usa contain, sem o zoom do recorte.

A transição de altura dura 220 ms, coordenada com requestAnimationFrame e eventos passivos de rolagem. A medição também acompanha alterações da viewport visual e os estados de expansão. O navegador acompanha a taxa de atualização disponível; não se força nem se promete 60/120 fps em hardware não testado. Movimento reduzido desativa as transições. Em cartões baixos, ações ficam em linha e áudio muda de posição para evitar cortes e sobreposição com play/pause.

Arquivos principais: src/components/PublicationGallery.tsx, src/orix.css e src/App.tsx. TypeScript/build e nove suítes de testes aprovados; aviso de bundle acima de 500 kB permanece. Chromium em 320, 390, 430, 768 e 1280 px: limites superior/inferior conferidos no topo, em vários pontos da rolagem, até o fim da página e com foto/vídeo completo; arraste lateral, crescimento, barra de tempo e alteração real do tempo preservados. Altura mobile reduzida para 640 px também conferida, além de movimento reduzido. Capturas comparadas visualmente. Dados isolados; produção, FPS real em aparelhos, Safari e aparelhos físicos não foram testados.

## Centralização e agrupamento da navegação — 13/10/2026

O carrossel ocupa a área útil limitada e centraliza verticalmente os cartões, distribuindo o espaço livre acima e abaixo em vez de manter a mídia encostada no topo. A navegação foi elevada 24 px; seu fundo branco continua até o fundo da tela. A opção ativa, com nome e ícone juntos, fica à esquerda, enquanto os outros três ícones ficam agrupados à direita. A opção ativa não usa mais flex expansível, que criava lacunas ao alternar entre as abas. Todas as ações e destinos permanecem existentes, sem alterar os demais temas.

Arquivo principal: src/orix.css. TypeScript e build aprovados. Revisão Chromium em 320, 390, 430, 768 e 1280 px: centralização vertical e limites do cabeçalho/menu no topo, durante a rolagem e com mídia completa; menu conferido nas quatro abas, ativo à esquerda e ícones agrupados com espaçamento curto à direita. Também conferidas janelas mobile de 640 px de altura. Mantém carrossel, vizinhos nas bordas, expansão, slider exclusivo do vídeo completo e movimento reduzido. Safari/aparelhos físicos não foram testados; aviso de bundle grande permanece.

## Skyglass: legenda atrás da pessoa / Orix: movimentos suaves — 13/10/2026

Fotos estáticas do Skyglass com legenda agora recebem segmentação real de pessoa. A foto original continua ao fundo, a legenda traduzida fica na camada intermediária e a pessoa recortada fica à frente, alinhada ao mesmo enquadramento/zoom. A legenda usa título branco grande e permanece acessível por Ver mais; a expansão da legenda não bloqueia as ações laterais. Tradução, álbum, curtidas, comentários, salvos e mídia completa usam as funções existentes. Abrir a foto completa mostra o original sem o recorte decorativo. GIFs e vídeos não recebem segmentação.

MediaPipe Selfie Segmenter é processado localmente em Web Worker, apenas para fotos visíveis/próximas e de forma sequencial. Há cache de até oito resultados; o original não é sobrescrito e não se salva uma imagem recortada no banco. Modelo de cerca de 250 kB e runtimes WASM SIMD/fallback acompanham o projeto, com licença e avisos: não há download de modelo de um CDN externo em uso nem envio da foto a serviço de IA. A primeira utilização baixa esses arquivos do próprio site. Arquivos WASM novos são necessários para o recorte e aumentam o tamanho do ZIP. Dependência @mediapipe/tasks-vision 1.1.0 e lockfile atualizados.

O modelo é para pessoas: cabelos, roupas, múltiplas pessoas e fotos distantes podem ter bordas imprecisas. Sem máscara útil, sem suporte do navegador ou quando a origem da imagem bloqueia CORS, mantém foto e legenda normais. Não se promete recorte em toda foto ou em todo dispositivo. Documentação: https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter/web_js . Modelo e documentação de terceiros identificados em public/assets/person-segmentation/NOTICE.txt.

Nas fotos do Skyglass, botões, contadores e navegação do álbum usam branco translúcido, ícones brancos e backdrop-filter com blur, incluindo estados ativos sem preenchimento azul. A aparência de vídeos do Skyglass permanece existente.

O Orix recebeu transições de cores, opacidade e sombras nos controles; feedback discreto ao tocar; entrada suave de galerias, menus, modais, rótulos ativos e notificações. Mantém limites/centralização da mídia. A preferência de movimento reduzido desativa animações/transições. Taxa de quadros depende do aparelho; não foi medida em dispositivos físicos.

Validação: TypeScript e build aprovados, nove suítes de npm test aprovadas. Chromium executou inferência verdadeira com o modelo local e confirmou PNG de pessoa acima do texto (z-index 3/2), botões rgba(255,255,255,.24) e blur de 18 px. Conferidos tradução, Ver mais, mídia completa sem recorte, retorno ao efeito, vídeos sem segmentação, modais Orix animados e movimento reduzido. Fotos revisadas em 320, 390, 430 e 1280 px, sem overflow e com alinhamento entre original e pessoa recortada. Revisão de carrossel/limites/menu Orix executada novamente. Produção, Safari e aparelhos físicos não foram testados. Aviso de bundle grande permanece.

Arquivos principais: src/components/SkyglassPhoto.tsx, src/media/person-cutout.ts, src/media/person-cutout.worker.ts, src/App.tsx, src/skyglass-reference.css, src/orix.css, package.json, package-lock.json e public/assets/person-segmentation/.
