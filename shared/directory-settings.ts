export interface DirectorySettings {
  siteName: string; organizationName: string; contactEmail: string; dpoEmail: string;
  ageRating?:string;ageRatingNote?:string;
  websiteUrl: string; responseBusinessDays: number;
}
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export const defaultAgeRatingNote = 'Conteúdo sem nudez. Podem aparecer trajes de banho, roupas de praia, decotes e roupas justas.';
export const classificationNotice = 'Classificação informada pela curadoria; não é certificação oficial do Ministério da Justiça.';
