export const requestTypes = {
  remover_conteudo: 'Remover conteúdo',
  corrigir_idade: 'Corrigir idade',
  corrigir_nome: 'Corrigir nome',
  reivindicar_perfil: 'Reivindicar perfil',
  autorizar_oficialmente: 'Autorizar oficialmente',
} as const;
export type DirectoryRequestType = keyof typeof requestTypes;
export type DirectoryRequestStatus = 'pending' | 'reviewing' | 'resolved' | 'rejected';
export interface DirectoryRequest {
  id: string;
  responsibleName: string;
  email: string;
  handle: string;
  type: DirectoryRequestType;
  observations: string;
  documentUrl: string;
  status: DirectoryRequestStatus;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  adminNote: string;
}
