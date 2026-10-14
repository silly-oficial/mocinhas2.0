# Tema Movimento

Ative em Aparência → Movimento. É uma opção adicional: os temas anteriores e a preferência salva continuam disponíveis.

O tema apresenta as cinco imagens fornecidas em uma composição esportiva e direciona o botão Explorar ginastas à seção de perfis. Visitantes passam primeiro pela autenticação existente. Os perfis, suas categorias e links continuam sendo cadastrados no painel Administrar perfis; as fotografias da apresentação não geram cadastros nem contas sociais fictícias.

## Decisões de design

Aplicação adaptada do sistema Skyglass: mantidos os níveis de superfície, tipografia Plus Jakarta Sans local, escala de raios, navegação consistente, alvos de 44 px e movimento por transform. A identidade azul/céu foi substituída por papel claro, rosa esportivo e tinta escura, conforme a nova direção de ginástica. Não há lettering atrás das pessoas, animação ambiente, expansão automática de fotos ou novos dados de demonstração no pacote.

As cinco fotos são assets locais WebP, sem alteração de conteúdo, com proporção preservada. A composição editorial é separada das categorias reais, geradas pelos perfis do admin. A cor principal #b72c59 sobre branco oferece aproximadamente 6:1 de contraste; texto secundário #70646a sobre #faf7f4 supera 5:1. O CTA escuro com texto branco supera 14:1.

## Verificação

- PASS: TypeScript sem erros e build de produção.
- PASS: suíte existente de acesso, pagamentos simulados, uso, armazenamento, mídia, idiomas e perfis.
- PASS: Chromium em 320, 390, 430, 540, 768 e 1280 px, sem overflow da página; inspeção de screenshots mobile e desktop.
- PASS: botão explorar, filtro de categoria, abrir perfil e voltar, seletor de aparência, persistência após recarregar e ausência de erros JavaScript no fluxo verificado.
- PASS: imagens locais otimizadas, sem scripts de animação/medição contínua adicionados; reduced-motion contemplado.
- N/A: mapa, match, lettering, gestos especiais e números promocionais — não fazem parte do produto.
- NÃO VERIFICADO: dispositivos físicos, Safari/iOS, zoom 200%, fontes ampliadas e auditoria completa de acessibilidade. Não há garantia de FPS baseada apenas em navegador automatizado.

As verificações visuais usaram perfis simulados apenas no navegador local, fora dos arquivos e banco entregues. Nenhum teste enviou mensagens ou criou cobranças reais.
