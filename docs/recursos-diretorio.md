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
