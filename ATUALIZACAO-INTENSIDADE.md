# Controle de intensidade da nitidez

Em **Conta → Nitidez dos vídeos**, ajuste a intensidade entre 0% e 100%. O padrão inicial é 70%; a preferência fica salva neste navegador. Desligar a nitidez mostra a imagem original e desabilita o controle. Em 0%, o filtro não aplica nitidez nem suavização. Valores maiores aumentam a máscara de nitidez; o limite nas bordas continua evitando alterações excessivas de pixels, mas ruídos, halos e artefatos de compressão podem ficar mais visíveis em intensidades altas.

O processamento passou a usar vizinhos diagonais e uma máscara mais forte. A intensidade é aplicada ao próximo quadro pelo mesmo programa da GPU, sem reiniciar o vídeo ou mudar seu tempo de reprodução. Não são feitas chamadas a serviços de terceiros; os arquivos armazenados permanecem intactos. As proteções anteriores de desempenho e retorno à imagem original foram mantidas.

## Sobre IA gratuita

Foi analisado o [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN), projeto de restauração por IA sob licença BSD-3-Clause. A documentação fornece modelos, dependências e executáveis para processamento em ambiente próprio. Código aberto não oferece, por si só, um serviço hospedado gratuito ou capacidade ilimitada.

Não foi integrada IA nesta atualização. O projeto atual é uma aplicação Node/React; não tem um executor de inferência provisionado e validado. O uso de Real-ESRGAN exigiria instalar e testar modelos, dependências e um processo de restauração de vídeos. Não foi possível validar essa infraestrutura no ambiente atual. Esta entrega aumenta o filtro local e oferece controle de intensidade; não alega super-resolução por IA ou recuperação de detalhes ausentes.

## Validação realizada

- `npm run lint`, `npm run build` e `npm test`: aprovados. Permanece o aviso de bundle maior que 500 KB.
- Chromium com vídeo real de teste: intensidades 0/25/70/100 comparadas na GPU sobre o mesmo quadro. Diferença média por canal em relação a 0%: 0, 0,159, 0,994 e 1,618, respectivamente, numa escala de pixels de 0 a 255. Isso confirma aumento efetivo do processamento, sem ser medida de qualidade perceptual nem garantia de recuperação de detalhes.
- Controle a 100% salvo e mantido após recarregar; opção desligada desabilita o slider e retorna à reprodução original; opção ligada reaplica processamento.
- Modo completo sem legenda/degradê, separação de abas, avanço do vídeo e retorno nativo após perda de contexto verificados novamente.
- Ausência de overflow em 320, 390, 430 e 1280 px na área de vídeos e no controle da Conta. Captura do controle na Conta revisada em 390 px.

Não foram testados aparelhos físicos iOS/Android, banco de produção ou cobranças reais. Não houve alteração de SQL, configuração Render, autenticação, persistência remota ou pagamentos. O ZIP completo contém o relatório e os arquivos necessários para build, sem dependências instaladas, credenciais ou mídias de teste.

Arquivos modificados: `src/media/videoQuality.ts`, `src/media/videoEnhancer.ts`, `src/components/ManagedVideo.tsx`, `src/components/VideoQualitySettings.tsx`, `src/App.tsx`, `src/skyglass-reference.css`.
