# Base jurídica e limites do diretório

Este documento descreve as decisões do produto e os limites da implementação. Não constitui autorização geral de publicação nem comprovação de adequação jurídica de cada perfil.

## Dados públicos e ausência de captação ativa

O diretório não faz captação ativa de autorização nem adota um consentimento geral para catalogar perfis. As preferências de cookies são outra finalidade. A administração deve avaliar finalidade, necessidade e impactos de cada inclusão e permitir oposição em /pais.

A dispensa de consentimento para dados manifestamente públicos pelo titular está no art. 7º, §4º da LGPD; o §3º exige consideração da finalidade, boa-fé e interesse público. O art. 7º, IX não afasta direitos fundamentais. O teste de balanceamento precisa ser documentado no caso concreto: finalidade legítima, dados necessários e avaliação dos impactos, prevalecendo direitos e melhor interesse quando houver conflito. Um campo de critério editorial não substitui sozinho essa avaliação.

Fontes oficiais:
- https://www.presidencia.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
- https://bibliotecadigital.mj.gov.br/bitstream/1/10215/2/Enunciado_ANPD_2023_1.html

## Idade e minimização

O cadastro guarda somente o ano, quando informado. Ano de referência menos ano de nascimento é a idade completada naquele ano; antes do aniversário ela pode ser um ano menor. A interface mostra esse intervalo e informa que a idade/faixa não foi verificada. A faixa derivada usa o ano de referência, não prova a idade em uma data específica. Sem ano, mostra somente a faixa informada. A ausência de verificação documental é uma decisão de minimização deste cadastro, não uma declaração de dispensa legal para todos os serviços ou conteúdos.

A versão 18+ exige fonte pública de declaração de maioridade e revisão administrativa da idade também na gravação das mídias. O embed não confirma idade, e o ano isolado não satisfaz essa revisão. Perfis antigos sem revisão ou com mídia legada ficam ocultos nas rotas públicas, preservando os registros administrativos. Não são preenchidas idades fictícias. Categorias livres são definidas no painel; filtros etários e temas fixos foram retirados da interface. Essa revisão manual não é verificação documental nem comprovação de autorização comercial.

## Registro inicial da origem

sourceSnapshot registra endereço canônico, identificação da origem, data de captura e, somente quando confirmado pelos metadados oficiais da mesma publicação, data/resultado positivo da consulta. Falha ou ausência de confirmação fica como null. O registro não contém bytes, frames, cópias de mídia nem comprova autorização, disponibilidade permanente ou regularidade jurídica.

O primeiro registro não é substituído em edições e fica preservado em sourceSnapshots mesmo após exclusão administrativa do perfil. availabilityHistory registra consultas posteriores, ordenadas e limitadas a 50. Auditoria e registros iniciais não têm expurgo automático: sua necessidade e os pedidos de direitos devem continuar sendo avaliados. Não são registros criptograficamente imunes a um administrador do banco ou restauração de backup.

## Direitos e selos

Remoção não exige documento ou justificativa, mas o envio exige nome e e-mail. A consulta/reabertura exige chave privada entregue ao solicitante, armazenada no pedido somente como hash; a confirmação inicial por e-mail pode conter a chave e integra a fila privada de envio. Contestações exigem análise e fundamentação antes da decisão. Despublicar não equivale a exclusão física.

Titularidade do @ e autorização documentada do responsável são selos separados. A autorização exige aprovação de termo; a titularidade pode ser conferida sem termo. Mudanças de nome, ano ou @ invalidam o vínculo anterior. A ausência de um selo não permite concluir, sozinha, regularidade ou irregularidade.

## Monetização

Novas cobranças estão desativadas nesta versão; syncpaySettings e históricos foram preservados. O art. 34 do Decreto 12.880/2026 trata de autorização judicial em conteúdo monetizado ou impulsionado que explore habitualmente imagem ou rotina de criança ou adolescente. Ativar monetização exige avaliação específica; chamar o produto de diretório ou usar embed não cria uma exceção automática.

Fonte oficial: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12880.htm

## Operação e pendências externas

As páginas públicas não inventam e-mail, identidade do encarregado, CNPJ, endereço, foro exclusivo ou certificação oficial de classificação. O contato e a descrição da classificação são configuráveis. A falta desses dados reais não pode ser corrigida com texto fictício.

O código registra logs sensíveis de autenticação/administração/atendimento e os expurga após seis meses; não afirma controlar os logs próprios de todos os provedores. Há políticas SQL no repositório, mas elas não foram executadas no Supabase de produção. Transferências internacionais exigem conferência da instalação e dos contratos pelo operador; a política não declara contratação automática de garantias.

## Verificação de acesso ao banco

As políticas foram escritas no repositório, mas ainda precisam ser executadas e verificadas no Supabase de produção. Até essa conferência, uma anon key pode permitir acesso direto a dados caso existam permissões ou políticas antigas permissivas. Não é possível afirmar isolamento de produção somente com lint ou testes locais.

A persistência atual usa `mocinhas_app_state` e `mocinhas_app_backups`; a seção 0 de `supabase_schema.sql` e o script `supabase/mocinhas_persistence.sql` restringem tabelas e `mocinhas_commit_state(bigint,jsonb)` ao servidor. As consultas comentadas da seção 26 de `supabase_schema.sql` verificam RLS, permissões efetivas das duas funções de usuário do Supabase (`anon` e `authenticated`), políticas e execução da função de gravação. Devem aparecer as duas tabelas com RLS ativo, sem acesso de navegador, nenhuma política nas tabelas privadas e execução da função somente pelo servidor. Ausência de linhas não comprova segurança. Políticas antigas devem ser revisadas, inclusive em tabelas legadas e Storage; não publicar payloads ou segredos durante a conferência.

Os avisos distinguem estimativa editorial, declaração do perfil, declaração do responsável e origem desconhecida. Nenhuma origem equivale a verificação documental. A classificação exibida é editorial e não é certificação oficial do Ministério da Justiça. A versão v2 do aviso reapresenta essa informação mesmo a quem dispensou o aviso anterior. Novas cobranças continuam desativadas e o histórico SyncPay permanece preservado.

A proteção precisa ser aplicada no SQL Editor da instalação existente; publicar o código não altera o banco. Os scripts removem políticas anteriores e privilégios de tabela, coluna e sequência de PUBLIC, anon e authenticated nas duas tabelas privadas, e reservam a função de gravação ao servidor. Não imprimem nem apagam o documento JSON.
