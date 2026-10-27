export type VerificationStatus='recebido'|'em_analise'|'aprovado'|'recusado'|'revogado';
export interface VerificationRequest {
  id:string;requestId:string;profileId:string;requesterName:string;requesterEmail:string;handle:string;
  status:VerificationStatus;termDocUrl:string;reviewedBy?:string;reviewedAt?:string;notes:string;createdAt:string;
  boundTikTok?:string;
  approvedBy?:string;approvedAt?:string;revokedBy?:string;revokedAt?:string;
}
