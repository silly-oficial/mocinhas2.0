# Vídeos, exibição completa e nitidez

## Alterações

- Início exibe apenas mídias que não sejam vídeos. A aba Vídeos exibe apenas vídeos. Álbuns mistos mantêm fotos no Início e vídeos na aba Vídeos, sem modificar os arquivos ou a publicação no banco.
- Salvos e Universo mantêm os conteúdos disponíveis para preservar os fluxos existentes de consulta e favoritos.
- No tema Skyglass, ao ativar **Ver mídia completa** em um vídeo, a legenda e as hashtags saem da tela junto com o degradê. O vídeo usa enquadramento inteiro e fundo neutro nas áreas sem imagem. A barra de avanço e os controles existentes continuam disponíveis; desativar o modo restaura a legenda.
- Nitidez automática durante a reprodução, com processamento local na GPU. **Conta → Nitidez dos vídeos** permite ligar/desligar a melhoria; a preferência fica salva no dispositivo.

## O que a melhoria faz

O exemplo enviado mostra contornos e texturas mais definidos no resultado. A implementação aplica máscara de nitidez com limites nas bordas e redução suave de ruído em áreas planas. A força é moderada para evitar halos e amplificação de artefatos de compressão. O arquivo original não é recomprimido nem substituído: o processamento acontece apenas na exibição.

Não é uma IA de super-resolução e não reconstrói olhos, cabelo ou outros detalhes ausentes da fonte. Não há promessa de reproduzir o resultado das imagens enviadas. Não há serviço pago, envio para terceiros, chave de API ou cota de processamento; o limite prático é o desempenho e a capacidade do dispositivo. Não foi integrado um serviço de IA supostamente gratuito e ilimitado.

A reprodução original permanece como alternativa automática quando WebGL não está disponível, há perda de contexto, a origem da mídia impede leitura dos pixels, o processamento apresenta falhas ou se mostra lento. Fontes acima de 1920 pixels em qualquer dimensão usam a reprodução original para evitar reduzir sua resolução ou alocar texturas grandes. O processamento para ao pausar, ocultar a página ou sair do vídeo. Somente o vídeo em reprodução recebe o processamento.

## Validação

- `npm run lint`, `npm run build` e `npm test`: aprovados. Permanece o aviso de bundle maior que 500 KB.
- Novo teste do feed: álbuns mistos separados entre abas, favoritos mantidos e estado original sem mutação.
- Chromium com mídia real de teste e APIs locais: Início sem vídeos; aba Vídeos sem fotos; modo completo sem legenda/degradê; barra de avanço funcional; melhoria processada em WebGL; leitura dos pixels confirma diferença entre imagem processada e original, sem erro de GPU; preferência desliga e religa o processamento; perda de contexto mantém reprodução nativa.
- Sem overflow em 320, 390, 430 e 1280 px; capturas do modo completo e player revisadas.
- Regressão de mídia: autoplay, primeiro quadro, um único proprietário de áudio, descarte do vídeo ao sair, perfil e pôsteres do Universo aprovados.
- Suíte existente de autorização, limite diário, idiomas, armazenamento, Supabase e contratos SyncPay aprovada. Supabase e pagamentos foram testados com substitutos locais, sem banco de produção nem cobrança real.

Safari/iOS e Android em aparelhos físicos não foram testados. O resultado visual e o custo de GPU variam por navegador, aparelho e conteúdo. A melhoria é de nitidez durante a reprodução, não aumento garantido de resolução ou qualidade equivalente a uma restauração offline por IA.

## Arquivos principais

`src/App.tsx`, `src/components/ManagedVideo.tsx`, `src/skyglass-reference.css`, `src/media/feed.ts`, `src/media/videoEnhancer.ts`, `src/media/videoQuality.ts`, `tests/media-feed.test.ts`, `package.json`.

Não foram alterados banco, esquema SQL, autenticação, regras de acesso, integração de pagamento ou configuração do Render. O ZIP contém o projeto completo para Zip2Git, sem credenciais, node_modules, caches, banco de execução ou mídias de teste.
