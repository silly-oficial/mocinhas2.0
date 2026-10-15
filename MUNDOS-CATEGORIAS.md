# Mundos: categorias com identidade própria

Na página inicial, escolha Silly, Barbie, Meninas Superpoderosas ou Cartoon Network. Cada cartão abre uma galeria de fotos com paleta, arte, enquadramentos e controles próprios. O botão Voltar retorna ao ponto da página onde você estava; a preferência de tema do aplicativo não é alterada.

## Adicionar fotos

1. Entre com uma conta admin.
2. Abra um mundo e toque em Adicionar fotos. O painel abre em Publicar, com a categoria já escolhida.
3. Selecione fotos do aparelho ou links de imagens, escreva a legenda se quiser e publique.

Também é possível escolher Mundo / categoria da publicação no painel de publicação normal. Geral mantém a publicação fora dos quatro mundos. O álbum da categoria mostra apenas fotos e GIFs; vídeos de álbuns mistos continuam nas áreas habituais do app. As galerias começam vazias até você publicar fotos associadas a cada mundo. As artes dos personagens são apenas parte da apresentação, não fotos fictícias na galeria.

As categorias de perfis por vírgulas continuam independentes e funcionam como antes.

## Implementação e origem

Foram reutilizados os assets reais do ZIP Silly-Disney-Livro-de-Aventuras-Completo-Zip2Git e adaptadas suas identidades: mascote do Silly em lavanda e cores doces; Barbie rosa; trio Superpoderosas em rosa, azul e verde; Cartoon Network com amarelo, azul e detalhes quadriculados. São categorias de conteúdo, não novas opções no seletor de tema. Não foram importados backend, contas, pagamentos, chat ou configurações do outro app.

A associação usa os campos existentes de hashtags das publicações, persistidos pelo servidor: mundo_silly, mundo_barbie, mundo_powerpuff e mundo_cn. O painel adiciona a associação automaticamente e o feed oculta essas marcações internas. As hashtags tradicionais Silly, Barbie, Superpoderosas e Cartoon Network também são reconhecidas por correspondência de categoria, sem aceitar fragmentos de palavras. Não há migração de banco ou dependência nova.

## Verificação

- TypeScript e build de produção: aprovados.
- Suíte existente e novo teste de categorias: aprovados. Validados isolamento, publicação restrita a admin e persistência após reiniciar o servidor real, com dados temporários.
- Navegador Chromium: hub em 320, 390, 430, 540, 768 e 1280 px; quatro mundos em celular e desktop; sem overflow da página.
- Verificados: fotos exclusivas de cada categoria, exclusão de vídeos na galeria, abrir/fechar foto completa, retorno, manutenção do tema salvo, publicação pelo formulário com categoria preenchida e atualização do álbum.
- Os mundos foram abertos nos seis temas existentes, sem erros JavaScript no fluxo testado. Os perfis e a autenticação usam os mecanismos existentes.
- Movimento restrito à entrada curta por opacidade/transform e feedback de toque; reduced-motion desliga essas transições.
- Não verificado em aparelhos físicos ou Safari/iOS; não se trata de auditoria completa de acessibilidade.

Os perfis, fotos e respostas simuladas usados nas capturas de verificação não acompanham o banco entregue. O pacote contém somente o código e os assets necessários, sem node_modules, dist, dados privados ou capturas de teste.
