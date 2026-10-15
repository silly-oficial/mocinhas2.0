# Ori e vídeos dos perfis

Esta atualização substitui a experiência de mundos da versão anterior. Silly, Barbie, Meninas Superpoderosas e Cartoon Network deixaram de aparecer na interface. Ori é a aparência pública fixa, inclusive em navegadores com outro tema salvo. O seletor de aparência foi ocultado. As implementações anteriores permanecem no código para recuperação futura, sem apagar contas, publicações ou perfis.

## Perfis e vídeos

- A seção Vídeos dentro de cada perfil agora usa uma grade de capas verticais. Ao tocar em uma capa, o vídeo abre em um player integrado, com fechamento, controles e navegação anterior/próximo.
- A aba principal Vídeos reúne vídeos de todos os perfis publicados. Rascunhos não aparecem. As publicações antigas continuam armazenadas; esta aba passa a apresentar o catálogo dos perfis.
- No player, a foto, o nome e o @ identificam o perfil de origem. Tocar nessa identificação abre o perfil em uma página com Voltar, que retorna à lista de vídeos.
- Arquivos enviados usam vídeo HTML, sem links para abrir ou baixar o arquivo. TikTok e Instagram continuam usando os players incorporados das plataformas, sujeitos à disponibilidade e às permissões delas.

## Administração

Em Administrar perfis, selecione um perfil:

1. Escolher capa do perfil permite enviar a imagem do cabeçalho e mostra uma prévia. A capa pode ser removida.
2. Adicionar vídeo e escolher corte abre o editor. Escolha início, fim e frame da capa. O botão Usar frame atual como capa também permite selecionar a imagem exibida na prévia.
3. Usar vídeo e capa processa o arquivo no servidor e gera um MP4 já cortado, com capa JPEG. Salve o perfil para publicar.
4. Cortar / capa reabre um vídeo já enviado para nova edição. Trocar capa permite enviar uma imagem separada, inclusive para vídeos adicionados por link.

Cada arquivo original deve ter até 50 MB. O corte aplica-se a arquivos enviados do aparelho; links sociais continuam opcionais e não são baixados nem recortados. O perfil suporta até 30 vídeos. O processamento mantém áudio quando existe, converte para H.264/AAC e prepara o MP4 para reprodução progressiva. A prévia depende do suporte do navegador ao formato original; prefira MP4.

## Instalação e validação

Use package.json e package-lock.json desta versão. A instalação npm inclui @ffmpeg-installer/ffmpeg e o executável correspondente à plataforma, sem instalação manual no servidor. Não omita dependências opcionais: o pacote do executável depende da plataforma. FFMPEG_PATH é opcional e permite indicar outro executável do servidor.

Verificado: TypeScript e build de produção; suíte existente de acesso, uso, pagamentos simulados, armazenamento, idiomas, mídia e perfis; novo teste de processamento real com corte de 4 para 2 segundos, vídeo H.264 e áudio AAC, capa JPEG, rejeição de intervalos inválidos, acesso exclusivo de admin e persistência após reiniciar.

No Chromium foram testados Ori com preferência antiga salva, ausência de mundos e seletor público, lista agregada sem rascunhos, origem do vídeo e abertura/retorno do perfil, grade própria do perfil, fechamento do player e editor real com envio, corte e salvamento. Inspecionadas larguras 320, 390, 430, 768 e 1280 px, sem overflow da página no fluxo testado.

Safari/iOS e aparelhos físicos não foram testados. A reprodução automática com som continua sujeita às permissões do navegador; os controles do player permanecem disponíveis. Não houve cobranças, mensagens enviadas ou alteração de dados reais nos testes.

Os documentos de temas e mundos anteriores são registros das versões antigas; o comportamento atual é o descrito neste arquivo.
