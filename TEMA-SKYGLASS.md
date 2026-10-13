# Tema Skyglass

Abra **Aparência** no cabeçalho ou em **Conta → Aparência** e escolha **Skyglass**. Para voltar, escolha **Original**.

O tema Original continua sendo o padrão. A escolha é salva neste navegador e sincronizada entre suas abas. Ela não altera a conta, permissões ou dados publicados. Caso o navegador impeça salvar, o tema funciona durante a sessão e o seletor informa essa limitação.

## Aplicação do design

O tema incorpora as regras da Skill design-skyglass ao código visual; não executa uma IA ao ser selecionado. Usa céu azul, superfícies brancas, vidro em elementos de navegação, sombras azuladas, tipografia Plus Jakarta Sans e ações principais escuras. Os tokens e adaptações estão em src/skyglass.css.

Foram preservados os quatro destinos reais do app, a prioridade das mídias e as funções existentes. Não foram acrescentadas funções fictícias, fotos decorativas ou composições de texto sobre pessoas sem recortes adequados. Cores de erros e avisos continuam semânticas. Textos secundários foram escurecidos para manter contraste nas superfícies claras. A fonte está incluída em public/fonts, com licença OFL.

## Escopo e validação

- Feed, filtros, vídeos, Universo, conta, seletor de idioma, comentários, Premium e painel administrativo receberam o tema.
- Seletor acessível por teclado, fechamento com Escape e retorno do foco; preferência sincronizada entre abas.
- Compilação e análise TypeScript aprovadas.
- Verificações em Chromium automatizado: larguras de 320 a 1280 pixels, persistência, retorno ao original, seleção sem armazenamento disponível, redução de movimento, curtidas, favoritos, comentários, navegação e traduções.
- Vídeos reais de teste: carregamento automático, primeiro quadro, reprodução exclusiva e descarte de mídia ao trocar de tela.
- APIs simuladas nos testes visuais. Não foram efetuados pagamentos reais nem alterações no banco de produção. A verificação não substitui testes físicos em todos os modelos de celular.

O servidor, SQL, scripts de persistência e dependências foram comparados com o ZIP de origem e permanecem intactos. Esta atualização de tema não exige novo SQL nem mudanças nas variáveis do Render. O ZIP contém o código completo, sem banco local, credenciais, dependências instaladas ou arquivos de compilação; o build de implantação permanece o mesmo.
