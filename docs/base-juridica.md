# Base jurídica: pontos confirmados e decisões pendentes

Este documento não afirma autorização geral para publicar perfis nem substitui avaliação jurídica do caso concreto.

## Conteúdo público e oposição

A ANPD admite o uso das hipóteses dos arts. 7º e 11 da LGPD no tratamento de dados de crianças e adolescentes, condicionado ao melhor interesse avaliado no caso concreto. Ser público, ter crédito ou usar um embed não resolve sozinho essa avaliação. Não se deve apresentar o art. 7º, §3º como dispensa geral de deveres ou confundir aviso de cookies com autorização de uso da imagem.

Fonte oficial: https://bibliotecadigital.mj.gov.br/bitstream/1/10215/2/Enunciado_ANPD_2023_1.html

O diretório possui canal de oposição em /pais. Remoção não exige justificativa nem documento. O envio é identificado por nome e e-mail. Um link de termo é opcional e não é aberto automaticamente pelo servidor. Não foi implementada captação ativa de autorização.

## Idade e registros

Só o ano de nascimento não comprova idade nem permite determinar anos completos antes de conhecer o aniversário. O pacote de idade, faixas e atualização diária ainda não foi entregue nesta etapa. Também ainda não existe o sourceSnapshot proposto: o registro de metadados existente não deve ser chamado de prova conclusiva de licitude ou publicidade permanente.

## Monetização

O art. 34 do Decreto 12.880/2026 prevê autorização judicial para conteúdo monetizado ou impulsionado que explore habitualmente a imagem ou rotina de criança ou adolescente. Os elementos concretos de incidência precisam de avaliação; chamar o produto de diretório ou usar embed não cria uma exceção automática. A decisão sobre monetização permanece pendente. Os dados syncpaySettings foram preservados.

Fonte oficial: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12880.htm

## Estado técnico desta etapa

Foram implementados hash/expiração/uso único da recuperação, limites de tentativas, exclusão do e-mail da representação pública do usuário, lista explícita dos campos públicos do diretório e retirada imediata com auditoria administrativa. O arquivo SQL foi corrigido para instalações/revisões futuras; não foi executado no Supabase de produção. As novas políticas precisam ser aplicadas em procedimento próprio, após revisão do administrador. Não se declara proteção RLS efetiva no banco existente apenas por editar o arquivo.

Permanecem pendentes os novos modelos de idade e selos independentes, publicação de classificação, /como-funciona, reabertura autenticada por protocolo, decisões fundamentadas de contestação, revisão integral dos documentos, cookies de sessão, retenção de logs e a auditoria de todos os campos propostos. Não publicar promessas sobre esses recursos antes da sua entrega.
