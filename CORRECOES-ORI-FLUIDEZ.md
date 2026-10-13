# Ori: vídeos fixos e controles limpos; SkyGlass: letras de nuvem

## Resultado atual

No Ori, vídeos usam um único modo com imagem inteira, cantos arredondados, barra laranja e tempo decorrido/duração. Removidos os botões de curtir, comentar, salvar e expandir dos cartões de vídeo. O vídeo não cresce ao rolar a página. Tocar na imagem pausa/reproduz; se a reprodução estiver bloqueada, o botão de play aparece sobre a imagem. Navegação de álbuns continua disponível quando necessária.

O som dos vídeos comuns começa ligado. A seleção automática continua limitando a reprodução a um vídeo visível por vez. Navegadores que bloqueiam autoplay com som exigem um toque; o app tenta novamente dentro de uma interação válida, sem silenciar automaticamente.

As correções anteriores de fluidez das fotos pequenas foram mantidas.

SkyGlass usa um alfabeto original de nuvens volumétricas, inspirado nas referências, para montar o texto dinâmico da legenda e da tradução. O recorte da pessoa continua acima das letras. O asset é compartilhado entre cartões e o filtro SVG anterior foi removido. Há suporte a letras latinas, números e acentos; outros caracteres usam texto normal. Se a imagem não carregar, a legenda continua legível em texto normal.

## Verificação

TypeScript e build de produção aprovados. Todos os testes existentes passaram.
Chromium, viewport 390×844, vídeo com áudio: sem botões de engajamento/expansão, áudio não silenciado, altura estável antes e depois de rolar, play/pause por toque e avanço real pela barra verificados. Alfabeto: texto acessível preservado, glyphs corretos e pessoa com z-index acima da legenda. Não testado em iPhone/Android físico.

## Aplicação

Substituir os arquivos do repositório pelos do ZIP e fazer o deploy normalmente. Incluir public/assets/skyglass/cloud-glyphs-v2.png. Nenhuma alteração de banco de dados.
