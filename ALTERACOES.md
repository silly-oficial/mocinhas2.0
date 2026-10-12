# Integração sobre o ZIP mais recente
Base: mocinhas2.0-main (2).zip. As telas, mídia, tradução e recursos solicitados já estavam presentes e foram preservados. Mudanças adicionais: persistência Supabase efetiva para o Render Free, mídia privada, proteção contra sobrescrita entre instâncias, primeiro ADM por ambiente, isolamento de credenciais privadas, métodos de cota compatíveis e build npm. Leia GUIA_RENDER.md antes do deploy: SQL + variáveis privadas são necessários. Não houve modificação do banco online.

Os registros abaixo são históricos; a exigência de DATA_DIR aplica-se apenas ao backend local. No modo Supabase a pasta local é cache descartável.

# Correção de persistência — ler primeiro
Consulte **RECUPERACAO-DO-BANCO.md antes de fazer deploy**. O ZIP deixou de incluir banco e uploads. Produção exige DATA_DIR em disco persistente fora do código, com banco restaurado previamente. Falha de leitura não cria mais dados de exemplo. Um diagnóstico e exportação de backup foram adicionados ao ADM. Dados reais da hospedagem ainda precisam ser analisados para recuperação.

# Mocinhas — modo de publicações da administração

## Entrega
- Navegação: Início, Vídeos, Universo e Conta. Universo ocupa o lugar de Publicar para usuários comuns, no celular e no desktop.
- Só administradores podem publicar e excluir posts. Validação no servidor pelo campo isAdmin persistido; nomes/e-mails não concedem privilégios.
- Feed, vídeos e Universo mostram publicações sem avatar, @, nome ou perfil do autor. Posts antigos de usuários comuns ficam ocultos, sem exclusão dos dados.
- Usuários comuns podem ver, curtir, comentar e salvar publicações. Seguir, mensagens, stories, grupos, salas e explorar continuam desativados. Rotas sociais bloqueadas no servidor; os componentes e o App.social-disabled.tsx ficam preservados para desenvolvimento futuro.
- Vídeos: hashtags no topo, seleção múltipla com união (vídeos com qualquer tag selecionada), botão Todos para limpar.
- Exclusão automática desativada: rotina periódica removida, limpeza interna inerte, endpoints de limpeza bloqueados e novas publicações sempre permanentes. Exclusão manual continua disponível ao ADM.
- Emojis decorativos removidos dos fontes da interface. Ícones Lucide, superfícies escuras e destaques verde-esmeralda; cores de erro ficam reservadas a erros.

## Limite diário
Painel Admin → Visão Geral → Limite diário de uso. Informe de 1 a 1440 minutos; zero desliga o limite. A alteração alcança sessões abertas em até 10 segundos. Admins são isentos, inclusive para configurar o bloqueio.

A cota renova 24 horas após o início do período de cada conjunto de identidades. Servidor usa seu próprio relógio e persiste a cota, reservando blocos de até 10 segundos antes de liberar conteúdo. Fechar uma aba pode gastar o restante do bloco. Abas paralelas compartilham a mesma reserva, sem multiplicar a franquia. Navegador fechado não continua renovando; conta aberta em outro aparelho mantém a cota da conta.

O identificador do navegador usa cookie assinado HttpOnly, compartilhado entre contas. Trocar de conta nesse navegador não reinicia a cota. Há reforço opcional por IP (salvo como HMAC), que também agrupa contas da mesma rede. Pessoas distintas no mesmo Wi-Fi/operadora podem compartilhar a cota nesse modo. O painel informa esse efeito antes da ativação.

Não existe identificação infalível de uma pessoa só com o navegador. Limpar cookies + usar outra conta e outra conexão/aparelho pode contornar a associação. Impedir isso exige identidade verificada. Conteúdo já baixado e links públicos de vídeos externos não podem ser revogados pelo site; proteção integral de mídia exigiria armazenamento privado e URLs temporárias. O bloqueio implementado cobre navegação, APIs e novos pedidos de arquivos locais, e pausa/remove mídia da interface ao terminar a autorização. APIs e mídia não ficam mais no cache offline do service worker.

## Hospedagem — necessário para preservar as cotas
Este projeto usa DATA_DIR/db.json para usuários/posts/cotas; a configuração Supabase existente não migra esses dados automaticamente. Use UM processo/instância Node e disco persistente. Configure DATA_DIR para esse disco (ex.: /var/data/mocinhas), restaurando uma cópia validada de db.json e uploads nesse diretório antes da inicialização. Não substitua o banco em produção pelo banco do ZIP a cada deploy. Sem disco persistente, reiniciar/reimplantar pode perder usuários e cotas.

JWT_SECRET deve ser longo, aleatório e estável entre deploys. Se omitido, o servidor gera um segredo e salva no banco; sessões antigas podem exigir login novamente. Para agrupar por IP atrás de proxy, configure TRUST_PROXY apenas com os endereços/sub-redes confiáveis da hospedagem. Não habilite confiança irrestrita em cabeçalhos fornecidos pelos usuários.

Para várias instâncias, migre a reserva para banco transacional compartilhado antes de escalar; JSON local não coordena vários processos.

## Correções de autorização associadas
O código anterior concedia admin por nome/e-mail, redefinia senha administrativa ao iniciar e expunha o código de recuperação de senha a qualquer solicitante. A promoção por nome e os resets no carregamento foram removidos; administradores já marcados no banco continuam administradores. A recuperação pública insegura foi bloqueada até haver verificação de identidade por um canal confiável. Alteração de senha autenticada continua implementada. Nenhuma senha existente no banco anexado foi alterada. Troque credenciais de demonstração antes de expor o projeto publicamente.

## Validação
Em 12/10/2026, a inspeção automatizada no navegador foi concluída com viewport mobile: filtros da inicial, curtidas, salvos, comentários, Premium, largura da página e preservação do Universo durante falha de rede e recuperação.

- npm run lint (TypeScript)
- npm run build (frontend + servidor; aviso não bloqueante de bundle grande)
- node --import tsx tests/usage.test.ts: deduplicação entre abas, herança da cota entre contas, esgotamento e renovação em 24h.
- node tests/access.test.mjs: servidor isolado com banco temporário; permissões, publicação anônima, rotas bloqueadas, permanência, quota após reinício, cadastro sem privilégio e exclusão manual pelo ADM.

Instalação: npm ci. Build: npm run build. Execução: npm start (NODE_ENV=production). O ZIP inclui package-lock.json; prefira npm. O bun.lock antigo foi retirado para evitar conflito com o lock atualizado.


## Atualização de 12/10/2026
Comentários, curtidas e favoritos foram restaurados no servidor e na interface. Publicações desativadas pela versão anterior voltam a aceitar comentários na primeira inicialização desta versão. Novos posts respeitam a opção de permitir comentários escolhida pelo ADM. O autor continua oculto nas publicações.

Salvos: marcador no cabeçalho ou Conta → Publicações salvas; persistência por conta, com restauração ao entrar novamente. Página inicial, Vídeos e Salvos têm seleção múltipla de hashtags. O filtro Todos limpa a seleção.

Universo: reserva do tempo renovada até três segundos antes da expiração, pagando o próximo bloco sem conceder tempo grátis. Falhas temporárias de conexão mantêm o componente montado e sua posição. Vídeos e interações pausam quando a autorização realmente vence. A interface mostra apenas um aviso pequeno de reconexão; não busca novamente o feed a cada renovação. Esgotamento real da cota ainda bloqueia o conteúdo.

Premium: verde esmeralda e fundos escuros. Valor carregado da configuração do servidor. Não promete acesso ilimitado nem privilégios sociais desativados; o limite diário continua valendo para Premium. Cada pagamento confirmado concede 30 dias de apoio, sem renovação automática.

### SyncPay — resultado da auditoria
A implementação anterior era uma simulação: não chamava a API da SyncPay, fabricava o código Pix e ativava Premium apenas pelo clique. Webhooks não eram autenticados. No banco anexado não há clientId, clientSecret, segredo de webhook ou registros de pagamentos reais. Por isso não foi possível confirmar saldo, recebimento real nem histórico de pagamentos em produção.

A simulação foi removida. Agora o backend autentica no host oficial, solicita cash-in, guarda identifier/valor/conta, gera o QR localmente a partir do pix_code retornado e consulta a transação pelo identifier. Pagamentos pendentes ou divergentes não ativam Premium. A consulta manual só reconhece cobranças pertencentes à conta conectada. Webhook sem segredo/assinatura é rejeitado, e até eventos autenticados exigem confirmação na API do seller. Repetições de um pagamento confirmado não estendem a assinatura. Nenhum pagamento real foi solicitado durante os testes.

### Configuração de produção
Admin → SyncPay: informe Client ID, Client Secret, preço e a URL HTTPS do webhook (seu domínio + /api/syncpay/webhook). Cadastre esse endpoint na SyncPay e copie o segredo de assinatura para o campo do painel. Use o evento transaction para o contrato HMAC; também há validação de Bearer no contrato legado. Salve e clique em Testar conexão com SyncPay (sem cobrança). Esse teste autentica a conta, mas não comprova liquidação de um Pix.

Alternativamente, mantenha segredos só no ambiente da hospedagem: SYNCPAY_CLIENT_ID, SYNCPAY_CLIENT_SECRET, SYNCPAY_WEBHOOK_SECRET e SYNCPAY_WEBHOOK_URL. A conta SyncPay precisa estar aprovada e o IP de saída do servidor autorizado. Checkout pede nome, CPF e telefone exigidos pela API; não armazena CPF/telefone no banco local. Nunca envie segredos no chat ou commite esses valores.

Para comprovar recebimento real: gere uma cobrança no site, pague com seu banco, confira o mesmo identifier no painel da SyncPay e a ativação do Premium. Fechar/reabrir o checkout reutiliza a cobrança pendente. Se a requisição de criação sofrer timeout antes de receber identifier, confira o painel antes de gerar outra cobrança (a API não documenta idempotência).

O endpoint protegido GET /api/admin/syncpay/payments fornece os últimos registros locais de conciliação. Esse endpoint não substitui o extrato financeiro do seller. Reembolsos/estornos e retirada de direitos após estorno não foram implementados nesta atualização; não há cobrança recorrente automática.

Fontes técnicas consultadas:
- https://syncpay.apidog.io/
- https://syncpay.apidog.io/solicitação-de-depósito-via-pix-18075879e0
- https://syncpay.apidog.io/consultar-transação-v1-18075877e0
- https://blog.syncpayments.com.br/ajuda/webhooks-syncpay-eventos-pagamento/

Validação adicional: npm test cobre as ações sociais, renovação antecipada e o contrato de pagamentos com provedor simulado: criação/autenticação, valor e titularidade, pagamento pendente, assinatura do webhook, replay e ausência de configuração. A homologação real com credenciais ainda está pendente.


## Revisão — reprodução, idiomas e interface (12/10/2026)
- Player único para feed e Universo. Vídeos visíveis carregam e iniciam sem toque, sem som por padrão para respeitar os navegadores. Botão de áudio explícito; play manual continua disponível caso o navegador bloqueie autoplay (economia de energia/dados, preferências do usuário etc.).
- Apenas um vídeo/áudio toca por vez. Vídeos fora de vista, em telas anteriores, atrás de modais ou em aba oculta são pausados. Ao desmontar, o player pausa e libera a fonte. BroadcastChannel coordena abas do mesmo navegador quando disponível.
- O cabeçalho ganhou proporções compactas, botões de acesso consistentes e Premium em esmeralda. Conta ganhou resumo de salvos/tempo, atalhos e edição do nome. Removidos presets, capas combinadas, profissão, biografia e escolha de gênero do cadastro/editor ativos; os dados legados foram preservados.
- Universo mantém miniaturas em todos os níveis de zoom, com limite de elementos por dispositivo. Os blocos distantes não viram mais círculos azuis/rosas. Vídeos antigos sem poster mostram fundo neutro e ícone; novas publicações continuam gerando miniatura no upload. Fundo com profundidade, estrelas discretas e grade suave; busca e instruções revisadas.
- Tradução conectada ao feed, vídeos, conta, editor, Universo, comentários, autenticação, Premium e administração, incluindo rótulos, campos e mensagens. O idioma persiste e ajusta lang/dir e datas/moeda. Hashtags, nomes pessoais, endereços, Pix e marcas preservados. Corrigidas chaves inexistentes de tradução nos comentários.
- Navegação e perfil têm traduções locais nos 11 idiomas. Inglês/espanhol também têm catálogo local das telas mais usadas. Textos complementares da interface usam o serviço de tradução com cache e lotes limitados; a tradução inicial desses textos depende de acesso externo do servidor. Falha mostra aviso discreto com nova tentativa, mantendo o texto original utilizável. Não se anuncia uma tradução concluída se o serviço falhar.
- A opção de tradução automática controla somente legendas/comentários, sem impedir a mudança do idioma da interface. Conteúdo dinâmico requer serviço externo disponível; cache evita repetições.
- Interruptor de tradução esmeralda com indicador branco, ícone visível, estados selecionados com contraste. Revisados também botões de autenticação, comentários e administração.

### Verificação desta revisão
`npm run lint`, `npm run build` e `npm test` passaram. Os testes incluem cotas, autorização, contratos SyncPay e tradução (catálogos, cache, isolamento entre idiomas e recuperação de falhas).

Teste de navegador com vídeo MP4/áudio real: carregamento automático, exclusividade do som, pausa ao rolar/trocar de tela, liberação do player desmontado, perfil sem presets, interruptor com contraste, troca PT/EN/ES/FR/AR, persistência, RTL sem rolagem horizontal e miniaturas distantes. Chamadas de dados e tradução externa foram simuladas nesse teste; não foi verificada disponibilidade real dos provedores de tradução nem liquidação de pagamentos. Revisão visual em viewport 390 × 844.

### Uso no zip2git
Os arquivos estão na raiz do ZIP. Instale com `npm ci`, compile com `npm run build` e execute `npm start`. Mantenha o banco/disco persistente e as variáveis de ambiente da hospedagem. O ZIP não inclui node_modules, build gerado, credenciais .env ou arquivos de uploads locais.
