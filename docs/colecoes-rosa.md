# Coleções rosa e uploads dos perfis

Referência principal: imagem fornecida no pedido de 29/10/2026. Adaptação explícita da paleta para rosa; não é reprodução fiel do Skyglass azul. Tipografia Plus Jakarta Sans já hospedada no projeto.

| Elemento da referência | Função existente / adaptação | Evidência |
| --- | --- | --- |
| Cabeçalho compacto + botão circular | Marca/início, menu existente e conta | Inspeção da prévia em iframe de 390 px |
| Filtros em pílulas | Categorias reais cadastradas e busca existente | Inspeção dos controles renderizados |
| Card grande, título superior e vidro inferior | Avatar existente, abrir perfil, contagem real e categoria | Inspeção visual da prévia |
| Ícone no canto do card | Abrir perfil; nenhum favorito novo foi inventado | Reutiliza a seleção existente |
| Barra inferior flutuante | Início, vídeos, universo, perfis e conta | Destinos preservados; salvos continuam no menu e na conta |
| Área abaixo do card | Crédito, origem e informações expansíveis | Ações e correção de idade preservadas |

Os tons rosa substituem as superfícies pretas e o acento laranja da aparência pública. Fotografias mantêm suas cores. Cards usam recorte proporcional, proteção para texto, bordas arredondadas e controles de 44 px. Há regras para 320–359, 360–430, 431–599, tablet e desktop, além de fallback de blur e redução de movimento.

## Envio de arquivos

No painel **Administrar perfis**, os controles **Enviar fotos** e **Enviar vídeos** aceitam seleção múltipla. O lote envia um arquivo por vez e informa porcentagem dos bytes transmitidos, quantidade processada, arquivo atual, etapa de salvamento e falhas individuais. É possível cancelar os envios restantes. Arquivos concluídos continuam no rascunho; a confirmação do perfil exige salvar.

Fotos: JPG, PNG, GIF, WebP e AVIF, até 20 MB. Vídeos: MP4, MOV e WebM, até 50 MB. Mantido o limite já existente de 30 vídeos; fotos não têm limite fixo de 40. A compatibilidade de reprodução depende também do codec do arquivo e do navegador. Não há transcodificação.

O endpoint `POST /api/admin/people/upload` exige administrador, valida formato/tamanho e gera nomes aleatórios. Usa o bucket privado `mocinhas-media` no modo Supabase, ou o diretório de mídia persistente já configurado no modo local. Não exige alteração de esquema SQL. Os limites do bucket e o espaço disponível continuam sendo respeitados pelo provedor.

Links, vídeo como avatar por embed, enquadramento e zoom existentes foram preservados. Fotos enviadas podem ser usadas como imagem de perfil. Novos arquivos invalidam a revisão de mídia no rascunho. A publicação continua exigindo revisão 18+ e origem para o crédito; mídias legadas fora do formato atual não são republicadas automaticamente.

## Verificação

- PASS: build de produção e TypeScript.
- PASS: testes de upload com servidor real e armazenamento local isolado: autenticação, permissão de administrador, arquivo inválido, formato/tamanho, dois vídeos, 45 fotos, rascunho/publicação, revisão 18+, crédito, evidência privada, acesso às mídias por cookie, Range de vídeo e persistência após reiniciar.
- PASS: teste existente `adult-directory.test.ts`, inclusive supressão de perfis legados e de idade incerta.
- PASS: prévia isolada da interface em viewport de 390 px, cards, navegação, formulário e ausência de overflow horizontal nessa largura.
- NÃO VERIFICADO: seletor de arquivos via navegador automatizado; ferramenta expirou durante a abertura. Fluxo de transporte/persistência foi validado pela API real.
- NÃO VERIFICADO: dispositivos físicos, demais larguras em navegador, contraste composto de todos os estados, Supabase e Render de produção. Não se afirma conformidade WCAG integral ou fidelidade pixel a pixel.

A prévia utiliza somente dados fictícios e não é parte da publicação. Autenticação, regras de consumo, pagamentos e dados de produção não foram alterados.
