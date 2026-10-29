export type LegalPageKey = 'terms' | 'privacy' | 'parents';
export interface LegalDocumentSection {title: string; paragraphs: string[]}
export interface LegalDocument {path: string; title: string; sections: LegalDocumentSection[]}
export const legalNotice = 'Explore perfis, fotos e vídeos no Mocinhas.';
export const legalNavigation:readonly {path:string;label:string}[] = [
 {path:'/como-funciona',label:'Como funciona'},
 {path:'/pais',label:'Contato'},
] as const;
export const legalDocuments:Record<LegalPageKey,LegalDocument>={
 terms:{path:'/termos',title:'Sobre o Mocinhas',sections:[{title:'Perfis e galerias',paragraphs:['Explore os perfis e abra suas fotos e vídeos. Os links do TikTok usam o player da plataforma.']}]},
 privacy:{path:'/privacidade',title:'Dados da conta',sections:[{title:'Sua conta',paragraphs:['E-mail e senha são usados para acessar sua conta. Fotos e vídeos enviados ficam armazenados no aplicativo. Para ajustar informações, entre em contato pela página /pais.']}]},
 parents:{path:'/pais',title:'Contato',sections:[{title:'Fale com a administração',paragraphs:['Envie uma solicitação para corrigir informações ou ajustar uma publicação.']}]},
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


