# Correção: controles por modo e fotos fixas

## Vídeos Ori

Modo normal: visual original com curtidas, comentários, salvar, som, play/pause, legenda e botão de mídia completa.
Modo de mídia completa: sem botões de engajamento, navegação do álbum ou expansão; mantidos imagem arredondada, barra laranja e tempo. Tocar na imagem pausa/reproduz. Dois toques retornam ao modo normal; Escape também retorna. O botão de play aparece se o navegador bloquear a reprodução.
Som configurado como ligado. Navegadores que restringem autoplay com áudio exigem interação.
Os vídeos normais têm tamanho fixo durante a rolagem.

## Fotos Ori

Altura fixa por largura de tela, sem aumento ao rolar verticalmente ou ao passar entre cartões. O layout adapta o tamanho somente quando a largura da janela muda.
Ver foto completa abre uma visualização sobre o app com somente a foto inteira, sem corte, com cantos arredondados e sem botões, legenda ou navegação. Um toque na foto ou no fundo retorna ao feed; Escape também fecha. O feed permanece na posição anterior. Vídeos são pausados enquanto a foto completa estiver aberta.

As letras de nuvem do SkyGlass continuam presentes e atrás do recorte da pessoa.

## Validação

TypeScript, compilação de produção e testes existentes. Verificação em Chromium: controles presentes no vídeo normal, ausentes no completo e restaurados ao retornar; avanço real pela barra e som não silenciado; foto com altura estável em ambas as direções de rolagem, sem escala; visualização completa com apenas uma imagem e nenhum botão, bordas de 26 px, fechamento por toque e Escape. Não testado em dispositivo Android/iPhone físico.

## Aplicação

Substituir os arquivos do repositório pelo conteúdo do ZIP e fazer o deploy normal. Nenhuma alteração de banco de dados.
