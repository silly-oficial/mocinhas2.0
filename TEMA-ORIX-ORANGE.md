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
