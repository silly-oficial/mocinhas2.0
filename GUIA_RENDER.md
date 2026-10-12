# Mocinhas — ZIP atualizado para Render + Supabase

Esta entrega usa o ZIP mais recente enviado como base. Ele já continha as mudanças de vídeo, tradução e interface. Foram preservados PORT do Render, carregamento de ambiente, sincronização da configuração pública Supabase e componentes extras. A persistência foi completada: o servidor agora salva o estado no Supabase e os uploads em um bucket privado.

## Antes do deploy — três passos

1. No SQL Editor do seu projeto Supabase, execute o conteúdo de `supabase/mocinhas_persistence.sql` uma vez. O script cria `mocinhas_app_state`, `mocinhas_app_backups`, uma função de gravação e o bucket privado `mocinhas-media`. Não apaga nem substitui suas tabelas existentes de posts/perfis. Ele NÃO importa automaticamente dados de tabelas antigas.
2. No Render → seu serviço → Environment, configure:

   | Variável | Valor |
   | --- | --- |
   | `STORAGE_BACKEND` | `supabase` |
   | `SUPABASE_URL` | URL do seu projeto Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Chave **nova** de servidor/service role, somente no Render |
   | `INITIAL_ADMIN_EMAIL` | Seu e-mail para o primeiro ADM |
   | `INITIAL_ADMIN_PASSWORD` | Senha escolhida por você, com pelo menos 12 caracteres |
   | `JWT_SECRET` | Segredo longo e aleatório; preserve o valor existente se já tiver |
   | `NODE_ENV` | `production` |
   | `NODE_VERSION` | `22` |

   A conta inicial é criada somente se a tabela de estado estiver vazia. Login: seu e-mail ou `admin`. Depois da primeira inicialização, remova INITIAL_ADMIN_PASSWORD e INITIAL_ADMIN_EMAIL das variáveis. Novos deploys NÃO recriam o ADM nem redefinem sua senha. Não há usuário/senha de demonstração em produção.
3. Configure Build Command `npm ci && npm run build` e Start Command `npm start`, então faça o deploy. O modo Supabase não exige DATA_DIR nem disco pago do Render. `.env.example` é apenas exemplo: subir esse arquivo não configura automaticamente o painel Render. O render.yaml também só configura o serviço quando aplicado por Blueprint.

## Chave administrativa encontrada no arquivo original
O guia recebido continha uma chave administrativa real do Supabase. Ela foi removida desta entrega. Revogue/substitua a chave exposta no Supabase e configure a nova SOMENTE nas variáveis privadas do Render. Remover o arquivo não apaga o histórico do GitHub. Nunca use chave de servidor em `VITE_*`, no JavaScript do navegador ou em documentos públicos. O guia não reproduz nenhuma credencial.

O arquivo Vite também permitia expor todas as variáveis `SUPABASE_*` ao navegador. Isso foi corrigido. O endpoint de configuração pública entrega apenas URL e chave anon/publishable, quando configurada. O app principal usa a API autenticada do servidor e não precisa da chave administrativa no navegador.

## Como os dados ficam salvos
- Banco: `mocinhas_app_state`, com contas, publicações, comentários, favoritos, configurações, pagamentos e cotas. A tabela contém dados privados e não pode ser consultada por anon/authenticated.
- Mídia: bucket privado `mocinhas-media`; `/uploads/...` continua funcionando pela API, com autorização/cota e suporte a Range para vídeo.
- `.runtime-cache` é descartável. Na inicialização, ela é preenchida a partir do banco remoto. Cache local nunca é enviado por cima do remoto ao iniciar.
- Uma resposta de sucesso da API só sai após a gravação remota. Em falha persistente/conflito de revisão, a instância retorna 503 e precisa reiniciar para recarregar o banco remoto; não há fallback silencioso para um banco novo.
- Backups de estado são gravados na tabela `mocinhas_app_backups` no máximo uma vez por dia nas gravações normais, e também antes de exclusões de posts. Não há exclusão automática de posts ou backups remotos. Faça também backups externos e acompanhe o espaço utilizado.
- Use **uma instância** do serviço. O formato de snapshot preserva a estrutura do app existente; não é uma arquitetura para escalar grandes volumes. As gravações enviam o estado completo e consomem tráfego/cota do Supabase. Conflitos de revisão impedem que uma instância antiga sobrescreva outra; isso não substitui um banco transacional por entidade para escalar.

Se já houver dados relevantes em outro db.json ou nas tabelas antigas do Supabase, preserve-os antes de inicializar uma instância nova. Esta entrega não migra tabelas antigas nem afirma recuperar dados que não recebeu. Como você informou que os dados anteriores eram testes, o primeiro cadastro administrativo permite começar um banco novo explicitamente.

## Diagnóstico
Admin → Estatísticas → Banco de dados e recuperação identifica o backend ativo. O botão de backup exporta o estado completo; mantenha o arquivo privado. Backups JSON não contêm os bytes das mídias, que permanecem no bucket e precisam de backup próprio.

`SUPABASE_DATABASE_UNAVAILABLE`: verifique URL/chave e se executou o SQL no mesmo projeto. Não crie db.json para contornar isso.
`INITIAL_ADMIN_REQUIRED`: configure e-mail e senha inicial em um banco novo.
`STORAGE_CONFIG_REQUIRED`: confira se STORAGE_BACKEND está como supabase no Render. Modo local continua exigindo disco persistente e banco existente.

## Validação realizada
Compilação e testes locais. Integração Supabase simulada: primeiro ADM, confirmação de gravação antes da resposta, reinício sem cache, mídia com Range, conflitos/rejeição de escrita e proteção de chave privada. A conexão com seu Supabase real e os recebimentos SyncPay NÃO foram executados neste ambiente.

## ZIP / zip2git
Arquivos do projeto estão na raiz do ZIP. O pacote não inclui db.json, uploads, cache, backups, .env real, node_modules ou dist. npm usa package-lock.json. bun.lock foi removido para não escolher um gerenciador incompatível com o build npm do Render.
