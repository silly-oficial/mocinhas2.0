export const creditNotice='Conteúdo exibido com crédito ao criador. Direitos reservados ao autor original.';
export const creditsSections = [
 {title:'Perfis e galerias',paragraphs:['Explore perfis, fotos e vídeos no Mocinhas. As publicações do TikTok abrem no player da plataforma e os arquivos enviados são exibidos pelo aplicativo.']},
 {title:'Origem das publicações',paragraphs:['O @ e o link da origem aparecem junto das mídias quando informados. Para ajustar uma publicação, entre em contato em /pais.']},
];
export function removalEmailText({content,result,email,siteName='Mocinhas',resolved=true}:{content:string;result:string;email:string;siteName?:string;resolved?:boolean}){
 return `Olá!\n\nRecebemos o seu pedido sobre o conteúdo "${content}".\n\n${resolved?'Já tomamos a providência: ':'Resultado da análise: '}${result}\n\nSe precisar de mais alguma coisa, é só responder este e-mail.\n\nObrigado!\n\nEquipe ${siteName}${email?'\n'+email:''}`;
}

