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

Novos cadastros/edições publicados exigem ano ou faixa. Não houve migração para preencher idades fictícias ou despublicar perfis antigos em lote. Registros antigos sem informação precisam de revisão administrativa. Não foram implementadas classificações ou filtros sexualizados de menores; os temas disponíveis são arte, esporte, música, educação, humor e viagem.

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
