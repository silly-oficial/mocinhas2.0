# Mocinhas — modo de publicações da administração

## Entrega
- Navegação: Início, Vídeos, Universo e Conta. Universo ocupa o lugar de Publicar para usuários comuns, no celular e no desktop.
- Só administradores podem publicar e excluir posts. Validação no servidor pelo campo isAdmin persistido; nomes/e-mails não concedem privilégios.
- Feed, vídeos e Universo mostram publicações sem avatar, @, nome ou perfil do autor. Posts antigos de usuários comuns ficam ocultos, sem exclusão dos dados.
- Usuários comuns apenas consomem conteúdo: sem comentários, curtidas, seguir, mensagens, stories, grupos, salas ou explorar. Rotas sociais bloqueadas no servidor; os componentes e o App.social-disabled.tsx ficam preservados para desenvolvimento futuro.
- Vídeos: hashtags no topo, seleção múltipla com união (vídeos com qualquer tag selecionada), botão Todos para limpar.
- Exclusão automática desativada: rotina periódica removida, limpeza interna inerte, endpoints de limpeza bloqueados e novas publicações sempre permanentes. Exclusão manual continua disponível ao ADM.
- Emojis decorativos removidos dos fontes da interface. Ícones Lucide e paleta escura com verde, amarelo e roxo preservados; superfícies e destaques rosa antigos normalizados.

## Limite diário
Painel Admin → Visão Geral → Limite diário de uso. Informe de 1 a 1440 minutos; zero desliga o limite. A alteração alcança sessões abertas em até 10 segundos. Admins são isentos, inclusive para configurar o bloqueio.

A cota renova 24 horas após o início do período de cada conjunto de identidades. Servidor usa seu próprio relógio e persiste a cota, reservando blocos de até 10 segundos antes de liberar conteúdo. Fechar uma aba pode gastar o restante do bloco. Abas paralelas compartilham a mesma reserva, sem multiplicar a franquia. Navegador fechado não continua renovando; conta aberta em outro aparelho mantém a cota da conta.

O identificador do navegador usa cookie assinado HttpOnly, compartilhado entre contas. Trocar de conta nesse navegador não reinicia a cota. Há reforço opcional por IP (salvo como HMAC), que também agrupa contas da mesma rede. Pessoas distintas no mesmo Wi-Fi/operadora podem compartilhar a cota nesse modo. O painel informa esse efeito antes da ativação.

Não existe identificação infalível de uma pessoa só com o navegador. Limpar cookies + usar outra conta e outra conexão/aparelho pode contornar a associação. Impedir isso exige identidade verificada. Conteúdo já baixado e links públicos de vídeos externos não podem ser revogados pelo site; proteção integral de mídia exigiria armazenamento privado e URLs temporárias. O bloqueio implementado cobre navegação, APIs e novos pedidos de arquivos locais, e pausa/remove mídia da interface ao terminar a autorização. APIs e mídia não ficam mais no cache offline do service worker.

## Hospedagem — necessário para preservar as cotas
Este projeto usa data/db.json para usuários/posts/cotas; a configuração Supabase existente não migra esses dados automaticamente. Use UM processo/instância Node e disco persistente. Configure DATA_DIR para esse disco (ex.: /var/data/mocinhas), levando o db.json existente para esse diretório antes da primeira inicialização. Não substitua o banco em produção pelo banco do ZIP a cada deploy. Sem disco persistente, reiniciar/reimplantar pode perder usuários e cotas.

JWT_SECRET deve ser longo, aleatório e estável entre deploys. Se omitido, o servidor gera um segredo e salva no banco; sessões antigas podem exigir login novamente. Para agrupar por IP atrás de proxy, configure TRUST_PROXY apenas com os endereços/sub-redes confiáveis da hospedagem. Não habilite confiança irrestrita em cabeçalhos fornecidos pelos usuários.

Para várias instâncias, migre a reserva para banco transacional compartilhado antes de escalar; JSON local não coordena vários processos.

## Correções de autorização associadas
O código anterior concedia admin por nome/e-mail, redefinia senha administrativa ao iniciar e expunha o código de recuperação de senha a qualquer solicitante. A promoção por nome e os resets no carregamento foram removidos; administradores já marcados no banco continuam administradores. A recuperação pública insegura foi bloqueada até haver verificação de identidade por um canal confiável. Alteração de senha autenticada continua implementada. Nenhuma senha existente no banco anexado foi alterada. Troque credenciais de demonstração antes de expor o projeto publicamente.

## Validação
A inspeção visual automatizada no navegador não pôde ser executada: o navegador de teste não estava disponível e o download falhou. A aparência final deve ser conferida no celular após o deploy.

- npm run lint (TypeScript)
- npm run build (frontend + servidor; aviso não bloqueante de bundle grande)
- node --import tsx tests/usage.test.ts: deduplicação entre abas, herança da cota entre contas, esgotamento e renovação em 24h.
- node tests/access.test.mjs: servidor isolado com banco temporário; permissões, publicação anônima, rotas bloqueadas, permanência, quota após reinício, cadastro sem privilégio e exclusão manual pelo ADM.

Instalação: npm ci. Build: npm run build. Execução: npm start (NODE_ENV=production). O ZIP inclui package-lock.json; prefira npm. O bun.lock antigo foi retirado para evitar conflito com o lock atualizado.
