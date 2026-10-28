export const creditNotice='Conteúdo exibido com crédito ao criador. Direitos reservados ao autor original.';
export const creditsSections = [
 {title:'Meu aplicativo Mocinhas',paragraphs:[
  'Eu criei o Mocinhas como um diretório de perfis, com páginas individuais, publicações, vídeos, carrosséis de fotos e links para as plataformas originais. Eu organizo as informações pelo painel administrativo e disponibilizo uma interface para os visitantes explorarem os perfis e suas publicações.',
  'O cadastro dos perfis do diretório é administrado por mim. A ação se chama “Adicionar perfil ao diretório”, deixando mais clara a proposta do aplicativo.',
  'Cada perfil pode reunir nome público, identificação nas redes sociais, apresentação e publicações do TikTok. O aplicativo também possui recursos de apresentação visual, temas, categorias e visualização de mídia em destaque.'
 ]},
 {title:'Navegação, fotos e vídeos',paragraphs:[
  'Eu organizo o conteúdo em páginas e componentes próprios para perfis, publicações, galerias e vídeos. O visitante pode abrir um perfil e visualizar suas mídias.',
  'Novas mídias são cadastradas somente por links do TikTok. O painel aceita links completos de vídeos (/video/) e carrosséis de fotos (/photo/), inclusive para a apresentação da tela inicial. As fotos e os vídeos continuam hospedados no TikTok; o aplicativo não importa cada imagem para uma galeria própria.',
  'A estrutura também contém visualizadores de fotos e vídeos, edição de capas, ajuste de enquadramento e recursos de qualidade e carregamento de mídia utilizados em conteúdo antigo. As opções de enviar novos arquivos foram desativadas.',
  'Nem todo componente presente no repositório representa uma função atualmente habilitada: existem arquivos de interfaces anteriores e recursos que podem estar desativados.'
 ]},
 {title:'Crédito aos criadores',paragraphs:[
  'Eu mantenho a identificação do criador junto dos cards, com o @ clicável, um botão separado “Ver no TikTok” e a indicação “Imagem/vídeo do criador original”. As mídias pertencem aos seus criadores originais.',
  'O link externo fica separado da ação de abrir o perfil dentro do aplicativo. Os créditos usam quebra de linha para permanecerem legíveis em telas pequenas.',
  'Mídias antigas que não possuem uma origem conhecida precisam ser revisadas por mim. O sistema não cria créditos fictícios para preencher essas informações.',
  'Encontrou algo seu e quer ajustar ou remover? Use “Pedir remoção / reclamar” junto da mídia, o formulário em /pais ou o e-mail de contato informado nesta página e no rodapé.'
 ]},
 {title:'Integração com o TikTok',paragraphs:[
  'Quando eu adiciono um link de publicação do TikTok, o servidor consulta o oEmbed oficial para obter informações como a imagem de prévia e a identificação do autor.',
  'Essas informações ficam em cache, reduzindo consultas repetidas. Resultados disponíveis são armazenados por 24 horas; resultados indisponíveis, por cinco minutos.',
  'A listagem mostra uma thumbnail leve, quando disponível. O player só é criado quando o visitante abre a publicação, evitando carregar vários players simultaneamente.',
  'Se a reprodução falhar, o aplicativo apresenta a prévia disponível e oferece “Abrir no TikTok”. A disponibilidade depende da plataforma original; o aplicativo não contorna contas privadas ou outras restrições.'
 ]},
 {title:'Registro da origem das mídias',paragraphs:[
  'Eu mantenho um registro técnico da origem das mídias identificadas: plataforma e endereço original, identificação do criador, data de captura dos metadados, modo de exibição, data da última verificação e informação de disponibilidade, quando conhecida.',
  'Novas publicações usam embed. Registros antigos podem indicar arquivo enviado. Esse registro permite acompanhar de onde veio cada mídia. Ele não substitui uma autorização.'
 ]},
 {title:'Verificação manual de perfis',paragraphs:[
  'Eu disponibilizo um fluxo de solicitação de verificação. Um pedido novo começa como recebido e não concede selo automaticamente.',
  'No painel administrativo, eu posso colocar o pedido em análise, conferir a representação do solicitante, registrar o link do termo e aprovar ou recusar.',
  'O selo “Perfil Verificado” depende de uma aprovação válida. O sistema registra quem analisou e quando a decisão aconteceu. O selo não é uma promessa geral de autorização dos pais para todas as mídias.',
  'Eu também posso revogar a aprovação, retirando o selo. Se o identificador do TikTok vinculado ao perfil mudar, a verificação anterior perde a validade para esse novo vínculo.'
 ]},
 {title:'Atendimento de responsáveis e criadores',paragraphs:[
  'Eu disponibilizo a página /pais para receber solicitações relacionadas aos perfis e conteúdos. Criadores e titulares também podem pedir remoção ou correção por esse canal.',
  'Os pedidos são registrados com protocolo, status e prazo de atendimento. Eu acompanho o andamento na seção Responsáveis, dentro do painel administrativo.',
  'O sistema prepara uma confirmação para o solicitante e um aviso para a administração. Ao concluir o atendimento, ele prepara uma mensagem com o resultado registrado pela administração.',
  'O encerramento de um pedido não significa, por si só, que arquivos foram apagados permanentemente. A resposta precisa corresponder à ação realmente executada.'
 ]},
 {title:'E-mails automáticos',paragraphs:[
  'Eu uso uma fila persistente para os avisos de atendimento e verificação. Ela registra tentativas, falhas e a identificação devolvida pelo provedor.',
  'A implementação utiliza o Resend e depende da configuração de uma chave e de um remetente autorizado no servidor. Sem essa configuração, os pedidos continuam registrados, mas os e-mails não são enviados.'
 ]},
 {title:'Configurações que posso atualizar pelo admin',paragraphs:[
  'Na seção Configurações públicas, eu posso alterar o nome do site e da organização, endereço público do aplicativo, e-mail de contato, e-mail para assuntos de privacidade e prazo de atendimento, entre um e cinco dias úteis.',
  'Essas informações ficam no banco e possuem um histórico administrativo das alterações. O mesmo e-mail de contato é usado em todas as páginas. As chaves privadas de serviços continuam exclusivamente no servidor.'
 ]},
 {title:'Cookies e preferências',paragraphs:[
  'Eu disponibilizo um banner com escolhas separadas para cookies essenciais, analíticos e de publicidade.',
  'Os essenciais permanecem ativos. As categorias opcionais começam desativadas, e o visitante pode aceitar, recusar ou salvar uma seleção personalizada.',
  'A escolha fica guardada no navegador e pode ser revista. Essa implementação não adiciona ferramentas de publicidade ou analytics; qualquer integração futura precisa respeitar as preferências salvas.'
 ]},
 {title:'Premium e pagamentos',paragraphs:[
  'Eu mantenho a estrutura existente do Premium e a integração com a SyncPay. O pacote de novas funções preserva essa integração.',
  'A confirmação de pagamentos e a liberação de acesso dependem das configurações e das respostas do serviço de pagamento.'
 ]},
 {title:'Documentos e histórico',paragraphs:[
  'Eu disponibilizo páginas de Termos, Privacidade, Créditos e Remoção e atendimento aos responsáveis, com links no rodapé.',
  'A página /versoes permite consultar os registros dos documentos de atendimento publicados. Os registros preservam versões anteriores quando o sistema identifica alterações. A página Créditos e Remoção descreve a versão atual do aplicativo.'
 ]},
 {title:'Como o aplicativo funciona tecnicamente',paragraphs:[
  'Eu utilizo React e TypeScript na interface, Vite na preparação do frontend e Node.js com Express no servidor.',
  'A estrutura possui integração com Supabase para persistência e armazenamento, além de recursos de recuperação e diagnóstico. Os novos registros aproveitam a persistência JSON existente.',
  'O GitHub guarda o código do projeto, e o Render executa o processo de build e publicação. Uma alteração no repositório só aparece para os visitantes depois que a versão correspondente é publicada com sucesso.'
 ]}
];
export function removalEmailText({content,result,email,siteName='Mocinhas',resolved=true}:{content:string;result:string;email:string;siteName?:string;resolved?:boolean}){
 return `Olá!\n\nRecebemos o seu pedido sobre o conteúdo "${content}".\n\n${resolved?'Já tomamos a providência: ':'Resultado da análise: '}${result}\n\nSe precisar de mais alguma coisa, é só responder este e-mail.\n\nObrigado!\n\nEquipe ${siteName}${email?'\n'+email:''}`;
}
