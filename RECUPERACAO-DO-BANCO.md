# Leia antes de outro deploy

## O que foi encontrado
O servidor usa um banco JSON local. A integração/configuração Supabase não torna esse arquivo persistente nem importa automaticamente tabelas remotas.

O ZIP anterior incluía `data/db.json`: uma cópia antiga, com 10 contas e 2 publicações de administradores. Esse mesmo conteúdo existia no ZIP original enviado. Isso não demonstra que as publicações feitas depois tenham sido apagadas: elas podem estar no disco da instância anterior, em outro DATA_DIR, em backups, ou ocultas por autoria. Não houve acesso à hospedagem para confirmar qual desses casos aconteceu.

Enviar o banco antigo junto do código permite que uma nova implantação carregue essa cópia. Armazenamento efêmero também pode perder mudanças feitas após o deploy. O código anterior ainda substituía um banco ilegível por dados de exemplo. Esse comportamento foi removido.

## Antes de atualizar
1. Preserve uma cópia do `db.json` da instância atual, possíveis backups e da pasta `uploads`. Faça isso ANTES de reiniciar, recriar ou reimplantar o serviço. Não substitua pelo banco de nenhum ZIP antigo.
2. Preserve as variáveis de ambiente já usadas, especialmente JWT_SECRET e credenciais de integrações. Não publique esses valores no GitHub.
3. Confira os arquivos candidatos sem alterá-los:

   ```sh
   node scripts/recover-data.mjs inspect /caminho/do/backup/db.json
   ```

   O comando exibe somente contagens, caminho, data de modificação e hash. Não imprime senhas, tokens nem dados pessoais. Compare o total de posts com o que havia no app. A data do arquivo, sozinha, não comprova que seja o backup correto.

4. Se só restarem dados no Supabase, não exporte tabelas e substitua db.json diretamente: os formatos e IDs podem ser diferentes. É necessário analisar o esquema e planejar uma importação preservando contas, postagens e vínculos. Esta correção não faz migração Supabase nem restaura dados inexistentes.

## Instalar a correção após preservar e identificar o banco
O provedor precisa fornecer um disco persistente real. Apenas adicionar uma variável chamada DATA_DIR NÃO torna o disco persistente. Este backend exige uma única instância Node.

Restaure o backup validado para uma pasta NOVA desse disco. Exemplo ilustrativo (troque os caminhos pelos reais):

```sh
node scripts/recover-data.mjs restore /backup/db.json /var/data/mocinhas-restaurado /backup/uploads
```

O comando recusa um destino não vazio, preserva IDs/autores/configurações, copia as mídias antes do banco e nunca substitui o banco existente. O último argumento é opcional somente se não houver arquivos locais de mídia para copiar. O original não é alterado. Execute com o serviço parado ao definir o destino definitivo, para evitar gravações concorrentes.

Configure `DATA_DIR=/var/data/mocinhas-restaurado` na hospedagem, mantendo as demais variáveis. O banco deve estar em `DATA_DIR/db.json`; as mídias em `DATA_DIR/uploads`. Então:

```sh
npm ci
npm run build
npm start
```

Em produção o app agora interrompe a inicialização se DATA_DIR estiver ausente, dentro da pasta do código, se o banco não existir ou não for válido. Isso é proteção contra perda, não convite para criar um banco vazio. Verifique o caminho/backup informado no log.

## Diagnóstico e backups
Admin → Estatísticas → Banco de dados e recuperação mostra o caminho ativo, quantidades de posts/contas, posts ocultos por autoria, posts sem autor e quantidade de backups. O botão Baixar backup do banco exporta o JSON completo apenas para administradores. Ele contém dados privados e configurações: guarde-o com segurança. Arquivos de fotos/vídeos exigem cópia separada.

A inicialização preserva uma cópia do banco válido antes de alterações. Durante o uso, snapshots anteriores à gravação são feitos em intervalos de pelo menos 5 minutos. Snapshots datados têm retenção local de 7 dias. Gravações usam arquivo temporário, fsync e substituição atômica. Os backups no mesmo disco não protegem contra perda do disco: mantenha também cópias externas.

A regra “somente ADM publica” continua ativa; posts não são liberados com base em nome de usuário/e-mail. O diagnóstico permite distinguir conteúdo ausente de conteúdo oculto, sem excluir ou reatribuir autoria automaticamente.

## ZIP
Código completo na raiz, preparado para zip2git. `data`, `uploads`, backups, credenciais, node_modules e dist NÃO são enviados. A exclusão de arquivos do ZIP não remove automaticamente dados já rastreados no seu GitHub; o servidor de produção não usa mais essa pasta do repositório.

As cópias originais recebidas foram preservadas fora do pacote. Recuperar publicações criadas na hospedagem exige o arquivo/backup que realmente contenha essas publicações.
