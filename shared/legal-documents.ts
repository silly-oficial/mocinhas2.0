export type LegalPageKey = 'terms' | 'privacy' | 'parents';
export interface LegalDocumentSection {title: string; paragraphs: string[]}
export interface LegalDocument {path: string; title: string; sections: LegalDocumentSection[]}
export const legalNotice = 'Todo o conteúdo do Mocinhas é de autoria dos criadores originais. Cada mídia mantém o crédito e o link do perfil de origem. Encontrou algo seu e quer ajustar ou remover? Fale com a gente pelo contato público ou em /pais. As mídias pertencem aos seus criadores originais.';
export const legalNavigation = [
  {path: '/como-funciona', label: 'Como funciona'},
  {path: '/creditos', label: 'Créditos e Remoção'},
  {path: '/termos', label: 'Termos de Uso'},
  {path: '/privacidade', label: 'Privacidade'},
  {path: '/pais', label: 'Para pais e responsáveis'},
  {path: '/versoes', label: 'Histórico de versões'},
] as const;

// These notices describe the implemented reporting channel, not an authorization
// to catalogue or monetize children's profiles. Do not add unsupported guarantees.
export const legalDocuments: Record<LegalPageKey, LegalDocument> = {
  "terms": {
    "path": "/termos",
    "title": "Termos de Uso do Mocinhas",
    "sections": [
      {
        "title": "1. Objeto e natureza editorial",
        "paragraphs": [
          "Mocinhas é um diretório editorial de perfis, organizado manualmente. A inclusão, o destaque e a ordem seguem critérios subjetivos da curadoria. Não são avaliações objetivas das pessoas nem resultado de votação pública. Os critérios informados aparecem em cada perfil e em /como-funciona."
        ]
      },
      {
        "title": "2. Acesso e gratuidade",
        "paragraphs": [
          "O acesso ao diretório e ao atendimento é atualmente gratuito. Novas cobranças estão desativadas nesta versão. Não é necessário Premium, cadastro ou pagamento para pedir remoção, correção ou contestar uma classificação. Registros antigos de pagamentos permanecem sujeitos às obrigações aplicáveis."
        ]
      },
      {
        "title": "3. Informações e limitações",
        "paragraphs": [
          "Nome, apresentação, ano de nascimento e faixa etária podem estar incompletos ou errados. Só o ano não permite determinar a idade em anos completos: o aplicativo informa um intervalo aproximado. Não fazemos verificação de idade com documento, selfie ou provedor externo. Use /pais para corrigir informações."
        ]
      },
      {
        "title": "4. Conteúdo e propriedade intelectual",
        "paragraphs": [
          "Novas publicações são exibidas por links no player oficial do TikTok, com crédito e acesso à origem. Não baixamos, reenviamos nem processamos essas mídias. Referências antigas ainda presentes podem exigir tratamento individual pela administração. As mídias e os direitos de terceiros não pertencem ao Mocinhas.",
          "Conteúdo público, crédito, link ou incorporação não constituem, sozinhos, autorização geral de uso. Mocinhas é independente do TikTok. O selo de titularidade e o de autorização documentada são diferentes; nenhum deles comprova a idade ou oferece garantia geral de regularidade."
        ]
      },
      {
        "title": "5. Uso adequado",
        "paragraphs": [
          "Não se passe por outra pessoa, ameace, persiga ou tente obter dados privados dos perfis e responsáveis. Não envie senhas ou documentos de identidade no formulário de atendimento. É proibido tentar contornar restrições do TikTok, acessar contas privadas ou explorar falhas do aplicativo."
        ]
      },
      {
        "title": "6. Remoção, correção e contestação",
        "paragraphs": [
          "O canal /pais exige nome e e-mail para resposta, sem cadastro obrigatório. Remoção não exige justificativa ou documento. Termos são opcionais; apresentá-los não concede selo automaticamente. Retirar de publicação oculta o perfil no diretório e não declara exclusão física de arquivos nem remoção na plataforma original.",
          "Pedidos de remoção têm prazo de 48 horas úteis; os demais, cinco dias úteis. A contagem pausa aos sábados e domingos, no fuso de Belém, e não considera um calendário automático de feriados. O prazo exato aparece no protocolo.",
          "Contestações de classificação recebem decisão fundamentada após análise. Guarde a chave privada do protocolo para consultar a resposta e reabrir o mesmo pedido em caso de discordância. Não compartilhe essa chave."
        ]
      },
      {
        "title": "7. Disponibilidade e responsabilidade",
        "paragraphs": [
          "O TikTok pode restringir, alterar ou retirar uma publicação e o navegador pode impedir sua reprodução automática. O diretório não contorna essas restrições. Falha de reprodução ou indisponibilidade na origem não comprova que um perfil deixou de ser público em outro momento.",
          "Podemos corrigir falhas, retirar itens da curadoria ou interromper o serviço. Não prometemos disponibilidade contínua. Estas limitações não afastam responsabilidades impostas pela legislação nem direitos do usuário."
        ]
      },
      {
        "title": "8. Mudanças, privacidade e solução de conflitos",
        "paragraphs": [
          "As alterações de Termos, Privacidade e atendimento são registradas com data e versões em /versoes. Consulte /privacidade para entender o tratamento dos dados.",
          "Tente primeiro o canal /pais ou o contato público configurado pela administração. Eventuais conflitos serão tratados no foro competente conforme a legislação brasileira, preservado o foro do consumidor quando aplicável. Não foi estabelecido um endereço ou foro exclusivo fictício."
        ]
      }
    ]
  },
  "privacy": {
    "path": "/privacidade",
    "title": "Política de Privacidade do Mocinhas",
    "sections": [
      {
        "title": "1. Quem responde e alcance",
        "paragraphs": [
          "Esta política abrange o diretório, as contas, o atendimento e os registros técnicos do Mocinhas. O nome da organização e os contatos publicados dependem das configurações da administração. O contato de privacidade/encarregado aparece nesta página quando informado; sua ausência é uma pendência de configuração, não indicação de que exista um encarregado fictício."
        ]
      },
      {
        "title": "2. Dados e finalidades",
        "paragraphs": [
          "@, nome público, bio, links, critérios editoriais e temas servem para apresentar e organizar os perfis. O ano de nascimento, quando conhecido, serve somente para estimar a idade e informar a faixa; não guardamos a data completa neste cadastro.",
          "E-mail de conta e senha com hash servem para autenticação e recuperação de acesso. A recuperação guarda hash do código, validade de 15 minutos e tentativas, sem publicar o código em produção. Nome, e-mail, observações e links opcionais de termos dos pedidos servem para atendimento e análise.",
          "IP, user-agent, horário, método, caminho sem query e status da API servem para segurança e diagnóstico. Senhas, corpos de requisição, tokens e chaves de protocolo não são incluídos deliberadamente no log de acesso. Preferências locais e cookies essenciais permitem sessão, limites técnicos, escolhas de interface e registro das preferências opcionais."
        ]
      },
      {
        "title": "3. Hipóteses legais e oposição",
        "paragraphs": [
          "O diretório não faz captação ativa de autorização nem usa um consentimento geral como fundamento para catalogar perfis. O art. 7º, §3º da LGPD exige considerar a finalidade, a boa-fé e o interesse público que justificaram a disponibilização dos dados de acesso público, e o §4º dispensa o consentimento para dados tornados manifestamente públicos pelo próprio titular, resguardados os direitos do titular e os princípios da LGPD. A eventual dispensa não elimina os demais deveres legais nem autoriza automaticamente a inclusão no diretório.",
          "O legítimo interesse do art. 7º, IX, exige avaliação documentada de finalidade, necessidade e equilíbrio com direitos e expectativas; a proteção do titular e o melhor interesse de crianças e adolescentes devem prevalecer. Publicar esta política não prova que todo perfil atende a esses requisitos. A curadoria deve avaliar cada caso e receber oposição em /pais.",
          "Dados de conta também atendem à prestação do acesso solicitado; registros de segurança e atendimento podem atender a obrigações legais e exercício de direitos. As escolhas opcionais de cookies são separadas e não autorizam uso da imagem de terceiros."
        ]
      },
      {
        "title": "4. Compartilhamento e transferência internacional",
        "paragraphs": [
          "Supabase pode guardar o documento JSON e arquivos históricos; Render hospeda a aplicação; Resend recebe o endereço e o conteúdo das mensagens necessárias ao atendimento e recuperação quando configurado. O player do TikTok é uma integração externa e pode tratar dados de conexão conforme suas próprias regras.",
          "Esses provedores podem operar fora do Brasil. A administração deve verificar a localização e as garantias contratuais de cada operação, adotando mecanismo permitido pelo art. 33 da LGPD quando houver transferência internacional. O código não confirma automaticamente contratação de cláusulas-padrão, países de destino ou adequação de todos os contratos."
        ]
      },
      {
        "title": "5. Retenção por categoria",
        "paragraphs": [
          "Perfis são mantidos enquanto necessários à curadoria e sujeitos a correção, oposição ou retirada. Retirar de publicação não equivale a apagar dados. Contas permanecem até sua exclusão ou atendimento específico, ressalvadas obrigações legais. A administração deve analisar pedidos de exclusão e eventuais exceções.",
          "Logs de acesso das rotas de autenticação, administração e atendimento são expurgados da base ativa após seis meses, em rotina no início do serviço e diária. Pedidos encerrados permanecem por até 90 dias do encerramento; os abertos, até 180 dias do envio. Respostas e decisões vinculadas seguem o mesmo protocolo e prazo.",
          "Verificações aprovadas permanecem enquanto ativas; após recusa ou revogação, até 90 dias; verificações abertas, até 180 dias. A fila de e-mails permanece por até 90 dias conforme a rotina de atendimento.",
          "A auditoria jurídica e o registro inicial da origem não têm expurgo automático nesta implementação; ficam restritos à administração. Essa conservação exige revisão de necessidade e não impede pedidos de direitos. Versões públicas dos documentos preservam seus textos e contatos históricos. Cópias de segurança e registros próprios dos provedores seguem seus ciclos, que podem diferir da base ativa."
        ]
      },
      {
        "title": "6. Direitos e como exercer",
        "paragraphs": [
          "Use /pais para pedir confirmação, acesso, correção, informação sobre compartilhamentos, oposição, revisão, anonimização, bloqueio ou eliminação quando aplicáveis, nos termos do art. 18 da LGPD. Não há decisão de classificação inteiramente automatizada: a curadoria e o atendimento são humanos.",
          "O formulário é identificado por nome e e-mail, sem documento obrigatório. Para fornecer dados pessoais privados, pode ser necessária confirmação proporcional da identidade. Não exigimos comprovação excessiva para simplesmente receber uma oposição ou pedido de remoção. Guarde protocolo e chave privada para acompanhar e responder à decisão."
        ]
      },
      {
        "title": "7. Crianças e adolescentes",
        "paragraphs": [
          "O melhor interesse deve orientar a curadoria e cada tratamento, com minimização e linguagem simples. Guardamos apenas o ano quando informado; não realizamos verificação documental de idade. Oposição e correção são acessíveis em /pais.",
          "Os dados privados de responsáveis e os termos não são publicados. O selo de titularidade não substitui autorização documentada; a ausência de um selo não resolve, por si só, a análise jurídica de um caso. Não há filtros ou sugestões de classificação sexualizada de menores."
        ]
      },
      {
        "title": "8. Segurança praticada",
        "paragraphs": [
          "A aplicação usa HTTPS quando publicada, controles administrativos, sessão por cookie HttpOnly/SameSite=Lax/Secure em produção e compatibilidade com clientes antigos que usam token. Novos logins da interface não gravam o token no armazenamento local.",
          "Senhas novas usam bcrypt com custo 12. Há limites de tentativas, códigos de recuperação com hash, uso único e expiração, validação das mensagens do player e listas explícitas de campos públicos. Nenhuma medida elimina todos os riscos. As políticas SQL do repositório não são prova de que foram aplicadas à instalação existente."
        ]
      },
      {
        "title": "9. Cookies, publicidade e preferências",
        "paragraphs": [
          "Cookies essenciais permanecem necessários à sessão e às proteções do serviço. Analíticos e publicidade começam desativados. Recusar opcionais e aceitar opcionais têm o mesmo peso visual; a seleção e sua versão ficam no navegador com data. A preferência pode ser revista.",
          "Esta implementação não instala SDK de analytics, anúncios ou perfilamento comportamental. Se houver publicidade no futuro, ela dependerá de avaliação própria, respeito às preferências e às vedações aplicáveis, inclusive as da Lei 15.211/2025. Não afirmamos que uma integração futura já existe ou está automaticamente autorizada."
        ]
      },
      {
        "title": "10. Contato e versões",
        "paragraphs": [
          "Use o contato público ou o canal /pais para falar com a administração. O contato específico de privacidade é configurável e aparece abaixo. As versões anteriores desta política estão em /versoes."
        ]
      }
    ]
  },
  "parents": {
    "path": "/pais",
    "title": "Para pais, responsáveis e titulares",
    "sections": [
      {
        "title": "1. Remover, corrigir ou contestar",
        "paragraphs": [
          "O atendimento é gratuito, identificado por nome e e-mail, sem login ou Premium. A ação padrão é remover conteúdo. Para remoção, não exigimos justificativa, termo ou documento. Basta indicar o @ e, quando possível, o que deve ser retirado.",
          "Também é possível corrigir idade ou nome, contestar a classificação e reivindicar um perfil. A apresentação de termo e a revogação de autorização são opções de atendimento, não uma captação ativa."
        ]
      },
      {
        "title": "2. Prazo e protocolo",
        "paragraphs": [
          "Remoção: 48 horas úteis. Demais pedidos: cinco dias úteis. A contagem pausa nos fins de semana, no fuso de Belém; não há calendário automático de feriados. O prazo aparece após o envio.",
          "Guarde o protocolo e a chave privada. Eles permitem consultar a providência executada e reabrir o mesmo protocolo com uma resposta, caso discorde. A consulta não expõe dados a quem conhece apenas o número do protocolo."
        ]
      },
      {
        "title": "3. Análise e retirada imediata",
        "paragraphs": [
          "A administração pode retirar um perfil da publicação antes de concluir a análise. Despublicar não apaga arquivos, posts ou a publicação no TikTok. A resposta deve descrever a ação realmente realizada.",
          "Contestações passam de recebidas para em análise e depois procedentes ou improcedentes, com fundamentação de pelo menos 80 caracteres. A nova resposta do solicitante fica vinculada ao mesmo protocolo. Os avisos por e-mail dependem de configuração do provedor."
        ]
      },
      {
        "title": "4. Documentos e selos",
        "paragraphs": [
          "Documentos por link HTTPS são opcionais em todos os tipos de pedido; o servidor não abre o link automaticamente. Não envie identidade, selfie ou dados desnecessários.",
          "“Perfil verificado” trata do vínculo com o @. “Autorizado pelo responsável” exige termo aprovado. Um pedido não concede nenhum selo automaticamente. A administração pode revogar aprovações; mudar a identidade vinculada invalida os selos anteriores."
        ]
      },
      {
        "title": "5. Privacidade e contato",
        "paragraphs": [
          "Pedidos e dados de responsáveis ficam restritos à administração. Leia /privacidade e /termos. Contatos reais são publicados quando configurados; sem e-mail informado, o formulário continua sendo o canal disponível."
        ]
      }
    ]
  }
};

export interface LegalDocumentVersion {
  id: string;
  recordedAt: string;
  digest: string;
  commit?: string;
  contactEmail:string;
  publicSettings?:import('./directory-settings').DirectorySettings;
  notice: string;
  documents: Record<LegalPageKey, LegalDocument>;
}
export type LegalVersionSummary = Pick<LegalDocumentVersion, 'id'|'recordedAt'|'digest'|'commit'>;

