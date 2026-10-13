# Correções do tema Ori / Orix Orange

- Vídeo completo respeita a proporção real, sem moldura preta adicionada pelo app, com cantos arredondados.
- Indicador de tempo decorrido e duração e barra para avançar/recuar; controles fora da imagem no modo completo.
- Fotos pequenas distribuem ações em uma linha e reservam espaços próprios para legenda, expansão e navegação do álbum.
- Expansão usa transição de 220 ms; escala horizontal varia continuamente com a posição, evitando a troca brusca entre dois tamanhos.
- Medições da galeria agrupadas antes de qualquer alteração de estilo, sem recalcular layout a cada cartão.
- Apenas um cálculo agendado por quadro; estilos e atributos são atualizados somente quando mudam.
- Proporção recalculada ao carregar os metadados do vídeo; preferência de movimento reduzido mantida.

## Validação

TypeScript, build de produção e todos os testes existentes passaram.
Verificação em Chromium com os componentes reais: foto de 280 px sem sobreposição entre controles em viewport 320×640; expansão para 446 px; vídeo 16:9 preservou a proporção, os cantos de 26 px e o indicador 0:00 / 0:03 em viewport 390×844.
Não testado em aparelho Android/iPhone físico. A fluidez final depende do aparelho e da mídia. Faixas pretas já gravadas no próprio arquivo não são removidas.

## Instalação

O ZIP contém o projeto na raiz, pronto para substituir os arquivos do repositório e fazer o deploy pelo fluxo atual. Nenhuma alteração no banco de dados é necessária.
