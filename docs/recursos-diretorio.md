# Créditos, integrações e atendimento

## Implementado

- Administração de perfis: `Adicionar perfil ao diretório` substitui a ação anterior de criação. Um perfil publicado precisa informar o @ original do TikTok. A galeria registra origem por mídia; vídeos recebem metadados de origem separados. O servidor calcula datas e valida os links, sem aceitar carimbos de origem enviados livremente pelo cliente.
- Cards de perfis, fotos e vídeos: @ original clicável, `Ver no TikTok`, identificação de titularidade e ação separada para abrir o perfil interno. Créditos ficam fora das imagens e usam quebra de linha, inclusive no modo compacto. Publicações do feed também recebem crédito e exigem o @ de origem ao publicar mídia visual. No Universo, o cartão de detalhe em foco mostra o crédito da publicação.
- Vídeos TikTok: oEmbed oficial consultado no servidor, cache persistente de metadados (24 horas para resultados disponíveis, cinco minutos para indisponibilidade), requisições simultâneas coalescidas e limite de 2.000 entradas. Links arbitrários, perfis em vez de vídeos e domínios semelhantes não são aceitos. A resposta HTML não é executada nem salva como marcação confiável.
- Cards usam imagens. Nenhum vídeo/iframe é criado no primeiro render do grid, inclusive para arquivos enviados. Apenas o vídeo aberto cria um player. No player TikTok, mensagens de erro são verificadas por origem e janela; erro/timeout de 15 segundos preserva a prévia e oferece o link externo. A consulta da disponibilidade ao abrir usa o mesmo cache.
- Origem: `source_platform`, `source_url`, `source_handle`, `captured_at`, `display_mode`, `last_check_at` e `is_still_available` acompanham vídeos e a coleção `mediaSources` dos perfis. Publicações também guardam origem nas mídias. Disponibilidade desconhecida é `null`. Um arquivo enviado recebe `reupload`; um vídeo social recebe `embed`. Dados históricos sem origem conhecida não são atribuídos a um criador inventado.
- Verificação: pedido público não concede selo. A administração realiza `recebido → em_analise → aprovado/recusado`; a aprovação exige perfil correspondente, link HTTPS do termo e confirmação explícita da representação. Revogação retira o selo. A identidade do revisor, data da análise, aprovação e revogação são preservadas. Alterar o @ do TikTok retira a validade do vínculo do selo. Os dados do termo e do responsável não são enviados nas APIs públicas de perfis.
- Atendimento: o formulário grava protocolo, status, prazo em dias úteis e duas mensagens na fila (solicitante/admin). Concluir uma análise agenda a mensagem de conclusão. A mensagem não afirma exclusão física de arquivos quando a operação foi apenas administrativa. Aprovação/revogação também geram aviso.
- E-mail: interface `sendEmail` com adapter Resend. Fila persistente, tentativas a cada 30 segundos, retentativa com espera crescente, chave de idempotência e registro do ID devolvido pelo provedor. A tentativa é persistida antes da chamada externa. Após a janela segura de idempotência de uma tentativa ambígua, o job exige revisão manual, evitando reenvio automático que poderia duplicar o aviso. Aceitação pelo provedor não é confirmação de entrega na caixa de entrada.
- Admin → Configurações públicas: nome do site, organização, URL pública, contato, DPO e prazo de resposta (1–5 dias úteis). Valores ficam no banco, com trilha das últimas 100 alterações. Contatos são atualizados no rodapé. A alteração do contato também atualiza o histórico de documentos. O painel mostra configuração do provedor e contagens/erros da fila.
- Cookies: essenciais fixos, analíticos e publicidade separados, opcionais inicialmente desativados, recusa, aceitação, salvar preferências e reabertura. Escolha persistida no navegador. Não foi instalado nenhum SDK de publicidade ou analytics. Integrações futuras devem consultar `readCookieChoices` e reagir ao evento `mocinhas:cookie-choices`; o banner, por si só, não bloqueia scripts futuros adicionados sem essa integração. Players externos são criados somente por ação do usuário.

## Configuração necessária para e-mail real

No servidor, configurar `RESEND_API_KEY` e `EMAIL_FROM`, usando remetente/domínio verificado no Resend. `CONTACT_EMAIL` e `DPO_EMAIL` são os valores iniciais; o painel pode substituí-los ou limpá-los sem editar código. `.env.example` contém placeholders, que não são usados como destinatários reais. Não colocar chaves no frontend ou no painel público.

Sem essas credenciais, pedidos e avisos permanecem registrados, mas nenhum e-mail real é enviado. O ambiente de produção não foi acessado e nenhum contato real foi inventado. Não houve disparos reais nesta implementação.

## Persistência e compatibilidade

O app usa um documento JSON no banco. Não é necessária migração SQL de tabelas físicas. Novos dados opcionais: `directorySettings`, `directorySettingsAudit`, `directoryEmailOutbox`, `verificationRequests`, `tiktokOembedCache`, `mediaSources`, campos de origem nas mídias e `dueAt` nos pedidos. O validador de snapshots reconhece as novas listas. A configuração SyncPay/Premium existente é preservada.

Arquivos de origem externa continuam pertencendo aos seus titulares. Um oEmbed bem-sucedido comprova que o vídeo estava disponibilizado pelo serviço naquele momento; não é uma prova permanente de que a conta inteira é pública. Falhas podem significar restrição regional, remoção, conta privada ou indisponibilidade. A aplicação não contorna restrições.

Dados e mídias antigas sem informação de origem precisam ser corrigidos pelo administrador ou removidos. Não houve criação de créditos fictícios nem retroatividade de autorizações. A limpeza permanente solicitada anteriormente permanece sob responsabilidade do usuário; o script do PR #2 não é executado por este trabalho.

Retenção: pedidos gerais encerrados por 90 dias e abertos por 180; verificações aprovadas enquanto a autorização estiver ativa, recusadas/revogadas por até 90 dias; fila de e-mail por até 90 dias, vinculada a pedidos ainda existentes. Backups seguem as políticas já configuradas da infraestrutura.

## Validação

- TypeScript e build de produção.
- Suíte existente, com fixtures ajustadas para os créditos agora exigidos. O mock de Storage suporta o subdiretório do histórico jurídico.
- `tests/directory-features.test.ts`: cache/coalescência/indisponibilidade do oEmbed com transporte simulado; grid de 20 cards sem iframe/vídeo; crédito; persistência de consentimento; envio simulado e deduplicação; autorização e rollback das configurações; transições, aprovação e revogação do selo.
- E-mails e TikTok usam transportes simulados nos testes; não há disparo real, cobrança ou acesso ao banco de produção. Sem validação visual em Android/iOS físico. Estilos foram preparados para larguras pequenas, mas a apresentação em 320 px ainda precisa de conferência visual no aparelho.

Referências técnicas: https://developers.tiktok.com/docs/en/embed-videos, https://developers.tiktok.com/docs/en/embed-player e https://resend.com/docs/api-reference/emails/send-email.



### Carrosséis de fotos do TikTok

Links completos `https://www.tiktok.com/@usuario/photo/ID` e `/video/ID` usam o mesmo player oficial, sem importar as imagens. Links encurtados precisam ser abertos antes de copiar o endereço completo. O painel Apresentação da entrada aceita publicações do TikTok, ordenação e remoção. O crédito é derivado do link; a miniatura vem do oEmbed quando disponível. Falhas de miniatura não impedem a exibição do cartão com crédito e link externo. O iframe só é montado ao tocar em Ver publicação; a rotação da entrada pausa enquanto o diálogo está aberto. O player oferece Abrir no TikTok permanentemente e trata erro/timeout.

O cadastro de links dos perfis também aceita `/photo/`. As galerias existentes e mídias legadas são preservadas; esta alteração não faz limpeza de produção.

Validação: tipos, compilação e testes direcionados com transporte TikTok simulado. A navegação entre imagens de uma publicação real em Android/iOS permanece pendente; a compilação não comprova disponibilidade do conteúdo externo nem compatibilidade no aparelho.


### Cadastro somente por TikTok e créditos públicos

Novos perfis e publicações aceitam somente links canônicos `/video/` e `/photo/` do TikTok. A apresentação da entrada usa a mesma integração. Os formulários ativos não oferecem upload, base64, troca de capa por arquivo ou importação de fotos. As rotas `/api/upload` e `/api/admin/people/prepare-video` retornam 410 para o administrador, sem processar os bytes; a troca manual de capa de posts também foi desativada. O servidor rejeita novas URLs de arquivos em perfis e posts.

Mídias legadas são preservadas para revisão e remoção administrativa, sem limpeza de dados neste deploy. Perfis novos não exigem um arquivo de avatar: usam placeholder ou thumbnail de uma publicação do mesmo criador. Carrosséis do TikTok aparecem na aba Fotos do perfil. As prévias não são salvas como novos uploads. Origem desconhecida de mídia antiga não recebe crédito inventado.

O rodapé global tem o texto de autoria solicitado, copyright com ano atual e link para `/creditos`. A página Créditos e Remoção descreve o fluxo atual, sem prometer autorização dos pais. Mídias têm o aviso curto e o atalho Pedir remoção / reclamar, que abre `/pais` com @ e URL preenchidos quando conhecidos. O contato é sempre o mesmo `contactEmail` de Configurações públicas (`CONTACT_EMAIL` é fallback de ambiente). Como nenhum endereço real foi fornecido no pedido, não foi inventado ou publicado um e-mail de exemplo. Sem endereço configurado, o formulário continua acessível.

A conclusão de um pedido de remoção exige a providência pública executada ou a ação explícita de retirar o perfil de publicação. O e-mail usa o assunto “Sobre o seu pedido no Mocinhas”, a descrição da providência e o contato configurado; o registro interno não é incluído. Recusas recebem resultado de análise, sem afirmar remoção. A fila e a configuração Resend existentes continuam necessárias; estes testes não enviam e-mails reais.

Validação: tipos e build; contratos de upload bloqueado (multipart e base64 sem gravação), cadastro TikTok com crédito derivado no servidor, renderização sem players iniciais, rodapé e página de créditos, e-mail com resposta pública, legado, quotas, persistência e pagamentos com provedores simulados. A exibição externa real continua sujeita ao TikTok e à validação em celular físico.


### Avatar por seleção de publicação

O editor de perfil aceita `avatarSelection`: link canônico do TikTok e índice da foto (base zero) ou início/fim em segundos de um trecho de até 15 segundos. Salvar não baixa, exporta ou envia mídia e não depende de extrair frames. O player oficial recebe `navigateTo`, `pause`, `seekTo`, `play` e `mute` somente depois de pronto; mensagens são verificadas por origem, janela e marcador TikTok. O trecho volta ao início ao atingir o fim; não há reprodução reversa. A seleção aparece nos cards e no detalhe dos perfis. Players são montados apenas quando visíveis e em primeiro plano, e usam avatar padrão em erro ou timeout. A publicação pode ser aberta pelo crédito externo.

Persistência usa o JSON já existente, sem migração de tabela física. A posição escolhida é uma preferência para o player, não um arquivo de avatar. Índice acima da quantidade real de fotos e duração real dependem do conteúdo servido pelo TikTok. Navegação e repetição em Android/iOS físicos continuam pendentes; testes locais validam dados e integração, sem afirmar validação visual do player real.


### Links encurtados no cadastro e avatar

Os botões Adicionar link do TikTok e Abrir publicação resolvem `vt.tiktok.com`/`vm.tiktok.com` no servidor antes de validar o post. `/api/admin/tiktok-link` exige administrador e retorna somente o endereço canônico. Redirecionamentos são manuais, limitados a seis e a oito segundos no total, com HTTPS, sem credenciais/portas e destinos restritos aos domínios e caminhos de compartilhamento TikTok; a resolução para antes de requisitar a página canônica. Não há download ou processamento de arquivos de mídia.

Carregamento e erros aparecem junto do botão, em região de status, em vez de somente no fim do formulário. O editor de avatar pode abrir o player mesmo sem oEmbed; o cadastro da publicação ainda depende dos metadados disponíveis na plataforma. Testes de redirecionamento e destinos inseguros usam transporte simulado. Validação real no iPhone continua pendente.

### Resposta oEmbed sem autor/thumbnail e player lento

O link `https://vt.tiktok.com/ZSgbbxQ8F/` foi consultado de verdade durante o diagnóstico. O oEmbed retornou HTTP 200 com `provider_name`, `embed_product_id`, `embed_type` e `html`, mas sem `author_url` e `thumbnail_url`. Esse formato é aceito verificando a identidade do post; campos opcionais presentes continuam validados. Não se inventa thumbnail nem identificação de autor: o crédito utiliza o @ do endereço canônico.

O avatar passa a reconhecer também `onImageChange` e `onCurrentTime` como sinais de resposta, além de `onPlayerReady`. Timeout e erros não desmontam mais o iframe nem o trocam silenciosamente pela silhueta. A prévia mostra mensagem, nova tentativa e link externo. A mesma preservação do player se aplica às publicações. Consulta real de metadados não equivale a validação da renderização no Safari físico.

### Cadastro de perfil sem metadados oEmbed

O link informado `https://vt.tiktok.com/ZSgbgEMFU/` resolveu de verdade para `https://www.tiktok.com/@rlk_levada/photo/7698298117665328405`; a consulta oEmbed retornou HTTP 400 com mensagem genérica. O cadastro de publicações dos perfis passa a tratar metadados como opcionais. Adicionar, salvar e editar preservam o endereço canônico e o crédito, mesmo sem thumbnail. Falhas oEmbed produzem disponibilidade desconhecida (`null`), sem afirmar que a conta/post está privado/removido nem afirmar que está disponível. O player oficial continua responsável por disponibilizar ou restringir o conteúdo. O fluxo de avatar permanece inalterado. Teste de integração cobre a resposta real observada (simulada), cadastro, edição, status e rejeição de host inválido.

### Seleção direta, navegação externa e crédito automático

Usar foto exibida aplica diretamente ao rascunho do perfil o índice reportado pelo player, com confirmação junto ao botão; Salvar perfil persiste a escolha. A navegação anterior/próxima e seleção numérica ficam abaixo da imagem. O editor usa os tokens e botões do tema atual, com ação principal e mensagens fora da imagem. Controles opcionais do player são desativados por parâmetros oficiais; elementos internos que o TikTok mantiver não são manipulados/cortados pelo site. O erro genérico obsoleto onError não é tratado como falha fatal; erro de reprodução de música não cobre foto já confirmada por onImageChange. Falhas modernas continuam visíveis abaixo da prévia.

O @ é derivado do endereço canônico ao abrir o avatar ou adicionar publicação, também no servidor. O @ do diretório é sugerido pelo link quando estiver vazio. Nenhum arquivo de mídia é exportado ou enviado. Verificação visual e dos controles internos no Safari físico permanece pendente.

### Publicações selecionadas, trecho e zoom

Cada publicação do perfil tem “Escolher fotos, trecho e zoom”. O editor permite navegar no carrossel e incluir/remover a foto confirmada pelo player; os chips mostram os índices escolhidos, sem inventar a quantidade real de fotos do post. Aplicar à publicação guarda `presentation` com índices ou início/fim e zoom 0,5–2. Salvar perfil persiste os dados. O player público usa apenas a navegação da lista selecionada; interação direta com o iframe é desativada, e eventos de imagem fora da seleção são redirecionados ao índice escolhido. O link de origem continua abrindo a publicação original completa. Isso não apaga nem altera mídia no TikTok.

Vídeos têm barra de busca, pausa, início/fim numéricos e ações para usar o momento exibido. Buscar pausa antes de enviar seekTo; repetir a busca no mesmo instante envia novo comando. A precisão de reprodução depende do player externo, não é prometida precisão de frame. O avatar também recebe busca e zoom, mantendo limite de 15 segundos do trecho do avatar. Zoom amplia a janela do iframe e pode recortar suas bordas; não altera pixels do arquivo. Controles e créditos permanecem fora da área ampliada.

**Contrato visual adaptado (A):** preservar Plus Jakarta Sans, paleta e tokens do tema ativo; método Skyglass §§4/5/7/10/13 para ritmo 12–24, raios 14/16/24, hierarquia preview → controles → CTA e alvos ≥44. Não trocar a marca para azul nem inserir efeitos editoriais sem função. Ação dominante: Aplicar à publicação, seguida de Salvar perfil. Menus/links de origem preservados.

| Decisão | Origem | Classe | Verificação |
|---|---|---|---|
| Prévia acima de controles e seleção | §§7/10 | D/A | Estrutura SSR e código |
| Cores herdadas do tema, superfícies suaves | §§2/5 + identidade atual | A | CSS; aparência real NÃO VERIFICADA |
| Navegação/filtros fora da foto, alvos44 | §§4/7/13 | D/A | CSS e estrutura; teclado/contraste renderizado NÃO VERIFICADOS |
| Faixas compactas e dvh | §11 | A | CSS; screenshots 320/390/430/tablet NÃO VERIFICADOS |
| Contagem somente de selecionadas | Verdade semântica | D | Teste seis de dez e navegação1/6 |
| Sem lettering/recortes/motion decorativo | Tela utilitária | N/A | Não contribuem à tarefa |

Checklist: PASS tipos, build e testes direcionados de validação, cadastro/edição de subconjuntos, zoom e estrutura dos controles. NÃO VERIFICADO: renderização visual, contraste composto, zoom do navegador, teclado, movimento e Safari físico. Tentativa de iniciar Playwright confirmou ausência do executável Chromium neste ambiente; nenhum resultado visual foi apresentado como validado.

### Estabilidade após zoom/rolagem

O iframe do avatar agora é montado uma única vez após entrar na área visível. Rolar, alternar aba e mudar zoom não trocam o iframe por uma imagem nem alteram sua URL/key. A visibilidade apenas pausa/retoma; somente mudança de publicação ou nova tentativa explícita cria outra instância. A seleção é enviada na inicialização ou quando muda; eventos repetidos de tempo/imagem não reinstalam listeners nem reiniciam o trecho. Correções do loop são limitadas para evitar uma sequência de seeks ao mesmo tempo.

Foi removida a barreira de visibilidade que podia manter o iframe oculto indefinidamente. O player usa viewport interno 325×578 e escala calculada pelo tamanho real do quadro, preservando o recorte em overflow hidden. Estilos de badge que atingiam o span do avatar são sobrescritos com uma regra específica; o avatar do detalhe tem dimensões explícitas. Publicações TikTok sem thumbnail usam o próprio player na prévia, sem substituir uma foto desconhecida por silhueta. Card único ocupa a largura útil, a grade móvel usa duas colunas e os créditos têm espaçamento/tipo próprios.

Testes de sessão verificam uma inicialização, ausência de seek em zoom/rolagem/retorno da aba, correção limitada de loop e preservação do índice. Renderização física no iPhone segue NÃO VERIFICADA. Ao abrir/atualizar a página ou navegar para uma tela que recria o componente, o carregamento inicial da plataforma externa permanece esperado; não há promessa de cache offline de mídia.


### Revisão de harmonia e reprodução — 28/10/2026
Contrato A: manter a paleta laranja/neutra e a tipografia do Mocinhas; controles sólidos sobre fundo claro, mídias em destaque, créditos compactos com informações completas expansíveis. Diálogos são superfícies centralizadas com altura do conteúdo, largura limitada e rolagem no viewport dinâmico.

| Decisão | Origem | Proveniência | Motivo e validação |
|---|---|---|---|
| CSS final e escopo dos controles | §§4,7,10 | A/D | Evitar que estilos genéricos dos modais substituam a escala dos botões |
| Crédito compacto e detalhes expansíveis | §§10,13 | D | Preservar autoria e remoção sem parágrafos repetidos dominando a grade |
| Toque nativo nos trechos de vídeo abertos | API oficial do TikTok | A | Safari pode exigir gesto direto no iframe; preservar play nativo além do comando externo |
| Altura natural e limite dvh nos diálogos | §§7,11 | D | Não herdar a altura fullscreen do wrapper; rolagem interna sem corte |

Verificação: TypeScript, build e testes de sessão/seleção/créditos executados neste patch. Player real no Safari, contraste renderizado e screenshots responsivas: NÃO VERIFICADO neste ambiente, sem navegador instalado. Curtidas e comentários pertencem ao iframe externo e não são removidos por CSS do site. O player de vídeo aberto aceita toque direto; a miniatura continua abrindo o modal. Nenhuma mídia foi baixada, extraída ou enviada ao servidor.


### Ajuste de créditos e avatar em vídeo
- A: controles de remoção exibidos apenas no crédito principal dentro do perfil (`showRights` explícito); cards e visualizadores mantêm autoria e acesso à origem sem o expansor.
- A: removida a seção pública de redes sociais. Os dados históricos das redes permanecem preservados; o acesso ao TikTok usa o crédito principal.
- D: ação TikTok e expansor de créditos usam preenchimento laranja e texto branco. Créditos sobre fotos usam variáveis locais de contraste claro sobre fundo escuro, evitando herdar a cor de texto do tema claro.
- D: avatar em vídeo solicita `autoplay=1`, `muted=1` e `loop=1` ao player oficial; fotos mantêm autoplay desligado. Zoom altera somente a transformação do quadro e não a URL do iframe.
- D: evento load envia início sem depender do ready, evento playing confirma inicialização se ready foi perdido, e ended reinicia o trecho uma vez por transição, mesmo para trecho curto. Offscreen/aba oculta pausa também antes do ready.
- PASS: testes de sessão, parâmetros de embed, créditos por contexto, TypeScript e build. Reprodução real em Safari e contraste renderizado: NÃO VERIFICADO. Não se promete vencer bloqueios de autoplay do navegador ou indisponibilidade do TikTok.


### Composição dos créditos e ações
Adaptação A da identidade existente: no card, autoria compacta seguida de um grupo com perfil como ação principal e origem como ação secundária. No detalhe, remover o identificador duplicado e alinhar TikTok/Créditos em duas colunas; o painel de remoção expande abaixo do grupo, com aria-expanded e aria-controls. O aviso de autoria passa a “Conteúdo do criador original.”, após todas as ações, sem texto intercalado entre botões. Laranja sólido reservado à ação primária e superfície clara com texto forte para a secundária (§§4,7,10,13; D/A). Mudanças somente na apresentação, sem alterar player, seleção ou zoom.
Validação: TypeScript, renderização estrutural dos grupos e build; screenshots reais de Safari NÃO VERIFICADAS.


### Contraste das páginas públicas e preferências
Correção na origem: páginas legais, rodapé e cookies passam a usar `--theme-text` e `--theme-muted`, os mesmos tokens do tema público, com fallback escuro sobre superfície branca. Os antigos tokens `--text-primary`/`--text-secondary` inexistentes nesses componentes acionavam fallbacks claros. Campos, placeholders, links e botões acompanham os tokens do tema. Cookies recebem título/ações com hierarquia explícita e foco visível. Adaptação A/D dos §§2,7,13; nenhuma mudança no consentimento salvo ou nos formulários. Contraste numérico dos pares do tema Ori verificado; validação física em Safari NÃO VERIFICADA.


### Redução de controles sobre as mídias
A configuração oficial de controles foi centralizada e aplicada ao avatar e ao player completo: controls, progress_bar, play_button, volume_control, fullscreen_button, timestamp, description, music_info, closed_caption e native_context_menu em zero. Reprodução/pausa e navegação de fotos ficam fora do quadro no player completo; os trechos selecionados mantêm o controle externo já existente. Autoplay sem som, loop e zoom são preservados. O próximo índice do carrossel é solicitado ao player, que confirma a foto efetiva por onImageChange; não se inventa a quantidade de imagens.
Limitação: a documentação https://developers.tiktok.com/docs/en/embed-player não publica comando “Limpar tela”. O site não injeta scripts, CSS ou cliques no iframe de outra origem, nem promete remover a identificação e o painel social que o TikTok imponha. Nenhuma extração, download ou upload foi adicionado. Testes estruturais e de parâmetros não substituem validação de reprodução real em Safari.

## Segurança e limpeza de código — etapa em andamento

- Recuperação: código aleatório criptográfico, hash bcrypt 12, validade 15 minutos, uso único e cinco tentativas. Produção não devolve o código e depende de Resend configurado; desenvolvimento preserva demoCode. Códigos legados sem hash deixam de ser aceitos, sem modificar dados em lote.
- Limites em memória: login 5/minuto por IP+identificador, recuperação 3/hora por e-mail. Reinícios reiniciam esses contadores; não se afirma limite distribuído entre instâncias.
- toPublicUser deixou de publicar email; senha, recuperação e campos não listados não são expostos. O diretório público também usa lista explícita de campos.
- Auditoria opcional legalAudit incluída no validador do snapshot. Não foi criado expurgo dessa coleção. Retirada imediata e retirada por conclusão registram o ato, com rollback em falha de gravação.
- Removidos, após conferir ausência de importadores: server/profile-video.ts, ProfileVideoEditor.tsx, VideoCoverEditor.tsx e FullVideoViewer.tsx. Eliminadas dependências diretas ffmpeg/multer e o script que reescrevia fontes durante o build, pois os ajustes já estavam aplicados. O build agora compila os fontes diretamente. Testes de rotas 410, recuperação e diagnóstico continuam necessários e foram preservados.
- Nenhum arquivo de dados, credencial, mídia ou recurso de produção foi apagado. Player, zoom, oEmbed e cache não foram alterados. Nem todo código antigo foi removido: componentes ainda importados, contratos legados, assets e rotinas de recuperação exigem avaliação própria.

Esta etapa não representa a conclusão dos doze itens solicitados. Consulte docs/base-juridica.md para as pendências e referências verificadas.
