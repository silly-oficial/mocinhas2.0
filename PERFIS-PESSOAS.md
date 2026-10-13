# Perfis de pessoas

## Onde encontrar

O botão Perfis está na navegação em todos os temas. No Início, os primeiros quatro perfis publicados aparecem em cartões com foto, nome, @ e Ver perfil. Os destacados aparecem primeiro; depois, a ordem definida pelo admin.

Para administrar, entre com a conta admin e abra Perfis → Gerenciar perfis. Também há Administrar perfis na página Conta. Este painel cuida somente dos perfis de pessoas. Esses cadastros não criam contas de acesso para as pessoas apresentadas.

## Cadastro

1. Selecione Novo perfil.
2. Informe nome, @usuário e foto do perfil. A foto pode ser enviada pelo celular ou informada por link https.
3. Adicione bio e, se desejar, uma capa.
4. Preencha os @ de TikTok, Instagram e Pinterest (somente o nome de usuário, não a URL).
5. Envie as fotos da galeria. Os controles permitem mover e remover cada foto. Limite de 40 fotos por perfil.
6. Adicione até 30 vídeos por links completos de TikTok e Instagram, com título opcional. Abra um link encurtado na plataforma antes de copiar o endereço completo.
7. Informe até oito categorias separadas por vírgula e uma ordem de exibição (números menores primeiro).
8. Marque Destacar no início se desejar. Marque Publicado para tornar o perfil visível e salve. Sem Publicado, ele fica como rascunho.
9. Ver prévia salva mostra o último cadastro salvo. Editar, despublicar e excluir estão no mesmo painel.

## Perfil exibido para os usuários

O modal mostra capa, avatar, nome, @usuário, bio, categorias e Redes sociais dessa pessoa. Os @ são links para as redes de origem. As abas Fotos e Vídeos mostram os respectivos conteúdos e quantidades. Uma foto pode ser ampliada. Há busca por nome/@ e filtro por categoria na área Perfis, além de compartilhamento por link.

Somente o vídeo selecionado carrega seu player externo. Os links Abrir em TikTok/Instagram permanecem disponíveis. Conteúdo privado, excluído ou com incorporação desativada pode não tocar dentro do modal; nesse caso, o usuário pode abrir a plataforma. Links não são baixados nem convertidos em MP4 pelo app.

Referências técnicas oficiais: https://developers.tiktok.com/docs/en/embed-player e https://help.instagram.com/620154495870484 .

## Instalação e armazenamento

O ZIP tem os arquivos na raiz para o Zip2Git. Atualize o repositório e faça o deploy pelo fluxo atual. Não é necessário criar novas tabelas SQL: peopleProfiles é uma coleção adicional no banco JSON/snapshot que o app já usa, inclusive no modo de nuvem. Os cadastros começam vazios, sem perfis fictícios.

## Validação

TypeScript e build de produção aprovados. Testes existentes e teste de perfis: autorização do admin, rascunhos ocultos, criação/edição/exclusão, @ duplicado, validação de URLs, limites de mídia, ordenação, persistência após reinício, cotas e preservação das contas/publicações existentes.

Testes de navegador com o app real: cartões, busca, modal, galeria, redes sociais, alternância de players, envio de foto e criação pelo admin; os cinco temas e navegação em 320 px. Players externos foram simulados no teste; a reprodução real depende do conteúdo e da plataforma. Não testado em iPhone/Android físico.
