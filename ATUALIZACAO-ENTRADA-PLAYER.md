# Carrossel da entrada e player

A área azul da entrada no tema Skyglass agora pode apresentar fotos e vídeos. O restante da tela e o degradê das publicações foram preservados.

No Painel Administrativo, abra **Tela de entrada**. Adicione até 20 fotos ou vídeos, ajuste a ordem e o tempo de troca (2 a 30 segundos) e pressione **Salvar apresentação**. Cada arquivo pode ter até 50 MB. Vídeos da apresentação são reproduzidos sem som. Sem mídias, a arte azul original continua aparecendo. O carrossel tem navegação manual e pausa; respeita movimento reduzido e pausa quando a página fica oculta.

As mídias escolhidas e salvas nessa seção são públicas, pois aparecem antes do login. Somente os itens dessa apresentação recebem acesso público; as postagens e os demais uploads continuam protegidos. Remover um item e salvar revoga seu acesso público pela apresentação.

O player das publicações usa uma barra própria para arrastar a posição do vídeo. Os controles nativos, o menu de download e o picture-in-picture foram desativados. O controle de som existente e a alternativa de reprodução quando o navegador bloqueia autoplay foram preservados. Continua havendo apenas um vídeo com reprodução ativa por vez.

O menu de contexto e o arraste das mídias foram bloqueados nas áreas de exibição. Essas medidas dificultam o salvamento casual; não tornam impossível copiar mídia recebida pelo navegador ou fazer capturas de tela. Não foi implementado DRM.

## Persistência

A configuração utiliza um campo opcional no estado existente do aplicativo, salvo pela mesma persistência Supabase. Esta atualização não exige SQL adicional, novas variáveis do Render ou mudança de bucket. Não contém banco local, uploads de usuários nem credenciais.

## Validação realizada

- `npm run lint`: aprovado.
- `npm run build`: aprovado; permanece o aviso de bundle maior que 500 KB.
- `npm test`: aprovado, incluindo limite diário, autorização, contratos SyncPay, 11 idiomas, armazenamento, persistência e diagnóstico Supabase, e os novos testes da apresentação.
- Teste da apresentação no servidor: autorização do admin, validação de arquivos e intervalos, acesso público limitado aos itens selecionados, respostas por intervalo de bytes, persistência após reiniciar e revogação após remover mídia.
- Chromium com APIs locais de teste: troca automática entre imagem e vídeo, reprodução sem som, pausa, navegação manual, ordem e tempo salvos pelo painel, avanço do player por barra e teclado, ausência de controles nativos e supressão do menu de contexto.
- Layouts em 320, 390, 430 e 1280 px: sem rolagem horizontal involuntária. Capturas da entrada, painel e player revisadas.
- Regressão de mídia: autoplay, quadro inicial, reprodução única, descarte de vídeo ao sair, editor de perfil e pôsteres do Universo aprovados.

Não foram usados banco de produção nem pagamentos reais. Safari/iOS em dispositivo físico e conectividade real Render/Supabase não foram testados. A compatibilidade de arquivos MOV depende do codec suportado pelo navegador; MP4 compatível com navegadores é preferível.

## Principais arquivos

- `src/components/WelcomeCarousel.tsx`, `WelcomeSettings.tsx`, `ManagedVideo.tsx`, `AdminPanel.tsx`, `UniverseFeed.tsx`.
- `src/App.tsx`, `src/skyglass-reference.css`, `src/services/welcome.ts`.
- `shared/welcome.ts`, `server/welcome.ts`, `server/db.ts`, `server.ts`.
- `tests/welcome.test.mjs`, `package.json`.

O ZIP inclui o projeto completo na raiz, sem node_modules, build gerado, caches, banco de execução ou credenciais privadas.
