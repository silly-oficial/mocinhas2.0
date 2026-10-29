export interface DirectorySettings {
  siteName: string; organizationName: string; contactEmail: string; dpoEmail: string;
  ageRating?:string;ageRatingNote?:string;
  websiteUrl: string; responseBusinessDays: number;
}
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export const defaultAgeRatingNote = 'Fotos e vídeos de animais.';
export const classificationNotice = 'Classificação informada pela curadoria; não é certificação oficial do Ministério da Justiça.';

