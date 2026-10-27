export type LegalPageKey = 'terms' | 'privacy' | 'parents';
export interface LegalDocumentSection {title: string; paragraphs: string[]}
export interface LegalDocument {path: string; title: string; sections: LegalDocumentSection[]}
export const legalNotice = 'As imagens e vídeos pertencem aos seus criadores. Se você é responsável e quer ajustar ou remover algo,';
export const legalNavigation = [
  {path: '/termos', label: 'Termos de Uso'},
  {path: '/privacidade', label: 'Privacidade'},
  {path: '/pais', label: 'Para pais e responsáveis'},
  {path: '/versoes', label: 'Histórico de versões'},
] as const;

// These notices describe the implemented reporting channel, not an authorization
// to catalogue or monetize children's profiles. Do not add unsupported guarantees.
export const legalDocuments: Record<LegalPageKey, LegalDocument> = {
  terms: {
    path: '/termos', title: 'Termos de Uso do canal de atendimento', sections: [
      {title: '1. Finalidade deste canal', paragraphs: [
        'Estas regras descrevem o uso do canal de atendimento do Mocinhas para pedidos de remoção, correção de informações, reivindicação de perfil e apresentação de autorização. O atendimento é gratuito e não exige cadastro nem assinatura Premium.',
        'O aviso de tratamento dos dados enviados está em /privacidade. O formulário para encaminhar uma solicitação está em /pais.',
      ]},
      {title: '2. Titularidade e respeito aos responsáveis', paragraphs: [
        'As imagens e os vídeos pertencem aos seus respectivos criadores e titulares. A presença de um conteúdo em uma rede social, a atribuição de crédito ou o link para a origem não equivalem, por si só, a uma autorização de uso.',
        'Mocinhas é independente do TikTok e não representa a plataforma ou os titulares dos perfis. O envio de um termo ou pedido de reivindicação não concede automaticamente autorização, identidade verificada ou selo.',
      ]},
      {title: '3. Como solicitar atendimento', paragraphs: [
        'Use /pais para informar seu nome, e-mail, @ do perfil e o que precisa ser tratado. Para pedir remoção, não é necessário apresentar termo assinado, justificar o pedido ou contratar um plano.',
        'Informe dados verdadeiros e somente o necessário para analisar o pedido. Não envie senhas, dados de cartão ou documentos de identidade nas observações. A administração pode solicitar uma verificação proporcional da representação antes de compartilhar informações pessoais ou autorizar alterações.',
      ]},
      {title: '4. Recebimento e análise', paragraphs: [
        'Após o envio confirmado, guarde o protocolo. A administração responderá pelo e-mail informado em até cinco dias úteis. O protocolo confirma o recebimento; ele não indica que a análise ou a remoção já foi concluída.',
        'A análise e a resposta são manuais. Retirar um perfil de publicação oculta o perfil no diretório; pedidos relativos a arquivos, posts ou outras referências exigem tratamento específico pela administração. A equipe deve registrar o que foi feito antes de concluir o pedido.',
      ]},
      {title: '5. Uso adequado e contato', paragraphs: [
        'Não utilize o formulário para se passar por outra pessoa, enviar ameaças ou fazer envios abusivos. Limites técnicos protegem a disponibilidade do atendimento; não impedem o uso do contato da administração, quando informado na página.',
        'Você pode consultar a privacidade dos pedidos em /privacidade e solicitar acesso, correção ou exclusão dos dados do seu pedido em /pais, informando o protocolo.',
      ]},
      {title: '6. Alterações e histórico', paragraphs: [
        'As versões destes documentos são registradas com data e preservadas para consulta e download em /versoes. Uma atualização não altera o conteúdo das versões já arquivadas.',
      ]},
    ],
  },
  privacy: {
    path: '/privacidade', title: 'Privacidade dos pedidos de responsáveis', sections: [
      {title: '1. Alcance deste aviso', paragraphs: [
        'Este aviso descreve o tratamento dos dados enviados pelo canal de atendimento. Ele não é uma política completa sobre todas as funcionalidades do aplicativo. As regras do canal estão em /termos; o formulário fica em /pais.',
      ]},
      {title: '2. Dados recebidos e finalidade', paragraphs: [
        'Recebemos nome do responsável, e-mail, @ do perfil, tipo de pedido, observações e, opcionalmente, link de um termo. Esses dados servem para localizar o conteúdo indicado, analisar a solicitação, verificar a representação quando necessário e responder pelo e-mail informado.',
        'Não envie documentos de identidade, endereço ou outros dados desnecessários nas observações. O formulário não exige login ou Premium. O envio de um termo não gera selo nem autorização automática.',
      ]},
      {title: '3. Acesso e compartilhamento', paragraphs: [
        'Os dados do pedido, as observações administrativas e os links de termos são restritos à administração. Não são publicados no perfil, no histórico de documentos ou em anúncios.',
        'A infraestrutura do aplicativo armazena os pedidos. Links de termos apontam para o provedor escolhido por quem os envia; o servidor não acessa automaticamente esses links. Compartilhe apenas o documento necessário e controle quem pode abri-lo.',
      ]},
      {title: '4. Prazo de retenção', paragraphs: [
        'Pedidos encerrados são excluídos da base ativa após 90 dias do encerramento; pedidos ainda abertos, após 180 dias do envio. A rotina é executada diariamente e no início do serviço. Cópias de segurança seguem o ciclo de retenção da infraestrutura.',
        'O histórico público preserva somente os textos dos documentos, o aviso do rodapé, a data e os dados públicos de contato. Ele não inclui os pedidos ou os documentos enviados por responsáveis.',
      ]},
      {title: '5. Crianças e adolescentes', paragraphs: [
        'As solicitações relacionadas a crianças e adolescentes devem priorizar sua proteção e seu melhor interesse. A existência de um perfil público, o crédito ou um link para a origem não substituem uma autorização válida.',
        'O responsável pode solicitar remoção sem apresentar termo assinado. A administração deve avaliar o pedido e a representação, quando necessária, sem exigir dados excessivos.',
      ]},
      {title: '6. Dados técnicos e cookies do formulário', paragraphs: [
        'O formulário não instala cookies de publicidade nem cria um perfil comportamental. Um identificador derivado do endereço de rede, mantido somente em memória por até uma hora, limita envios repetidos. O provedor de hospedagem pode manter seus próprios registros técnicos.',
        'Este aviso não afirma que as demais funcionalidades do aplicativo deixam de usar cookies ou outros identificadores.',
      ]},
      {title: '7. Direitos e contato', paragraphs: [
        'Você pode solicitar acesso, correção ou exclusão dos dados do seu pedido em /pais, informando o protocolo. A administração pode verificar a identidade de forma proporcional antes de fornecer dados pessoais.',
        'As regras do canal estão em /termos. Versões anteriores deste aviso ficam em /versoes. O contato da administração aparece abaixo quando houver um e-mail configurado.',
      ]},
    ],
  },
  parents: {
    path: '/pais', title: 'Para pais e responsáveis', sections: [
      {title: '1. Pedir remoção ou correção', paragraphs: [
        'Os perfis são adicionados pela administração. Se você é responsável e quer remover conteúdo ou corrigir informações, use o formulário abaixo. O atendimento é gratuito, sem cadastro e sem necessidade de assinar o Premium.',
        'Para solicitar remoção, basta informar o @ e o que precisa ser removido. Não é necessário apresentar termo assinado ou justificar o pedido.',
      ]},
      {title: '2. Prazo e protocolo', paragraphs: [
        'Responderemos pelo e-mail informado em até cinco dias úteis. Guarde o protocolo exibido após o envio. O registro não remove automaticamente o conteúdo: a administração fará a análise e responderá ao pedido.',
        'Indique arquivos, posts ou outras referências que também precisem de tratamento. Ocultar um perfil do diretório não apaga automaticamente esses outros itens.',
      ]},
      {title: '3. Reivindicação e apresentação de termo', paragraphs: [
        'Você também pode solicitar a análise de uma reivindicação ou apresentar um termo por link HTTPS. Não envie documentos de identidade nas observações. Um termo não é necessário para solicitar remoção.',
        'Esses envios são analisados pela administração. Eles não concedem automaticamente acesso de gerenciamento, autorização de publicação, selo ou destaque.',
      ]},
      {title: '4. Como seus dados serão tratados', paragraphs: [
        'O pedido e seus documentos não são públicos. Leia /privacidade para saber quais dados são recebidos, quem pode acessá-los e por quanto tempo são mantidos. As regras do atendimento estão em /termos.',
      ]},
    ],
  },
};

export interface LegalDocumentVersion {
  id: string;
  recordedAt: string;
  digest: string;
  commit?: string;
  contactEmail: string;
  notice: string;
  documents: Record<LegalPageKey, LegalDocument>;
}
export type LegalVersionSummary = Pick<LegalDocumentVersion, 'id'|'recordedAt'|'digest'|'commit'>;
