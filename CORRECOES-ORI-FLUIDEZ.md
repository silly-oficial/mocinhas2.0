# Ori: galeria reorganizada e vídeo completo; SkyGlass sem texto em profundidade

## Correções

A galeria Ori agora usa rolagem horizontal nativa, cartões de proporção fixa e espaço real de 20 px entre eles. Foram retirados o cálculo de tamanho por rolagem, a galeria sticky, as margens negativas, a troca de escala e a altura variável da galeria. Cada foto ocupa seu próprio espaço. O tamanho muda somente com a largura da janela.

O vídeo completo passa a ocupar uma área fixa entre o limite inferior real do cabeçalho e o limite superior real do menu. Não desconta mais a altura do título nem o padding do rodapé duas vezes. O vídeo é exibido no maior tamanho que cabe nessa área, preservando sua proporção e os cantos arredondados. Vídeos horizontais naturalmente usam menos altura para não serem cortados ou esticados. Ao girar a tela, redimensionar a janela ou mudar a barra do navegador, os limites são atualizados somente para o vídeo completo.

O modo normal mantém curtidas, comentários, salvar, legenda, som e reprodução. O modo completo mantém a barra laranja e o tempo; tocar no vídeo pausa/reproduz. Dois toques ou Escape retornam ao modo normal. O mesmo elemento de vídeo continua montado, preservando o ponto de reprodução.

Ver foto completa continua mostrando somente a imagem arredondada, sem botões. Um toque retorna ao feed.

No SkyGlass, o texto atrás da pessoa foi removido. A legenda normal permanece. O recorte e o alfabeto de nuvens não são mais carregados pelo feed.

## Verificação

TypeScript e build de produção; testes existentes do projeto. Chromium: fotos em 320×640, 390×844 e 1280×900 sem sobreposição, com 20 px de separação e dimensões invariáveis nas duas direções de rolagem. Vídeos horizontal e vertical completos respeitam cabeçalho/menu; controles normais reaparecem ao sair e avanço pela barra altera a posição real. SkyGlass não renderiza letras em profundidade nem recorte da pessoa.
Não testado em celulares físicos.

## Instalação

ZIP com projeto na raiz. Substituir os arquivos do repositório e fazer o deploy normal. Sem alteração de banco de dados.
