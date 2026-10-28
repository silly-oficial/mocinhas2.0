export interface DirectorySettings {
  siteName: string; organizationName: string; contactEmail: string; dpoEmail: string;
  websiteUrl: string; responseBusinessDays: number;
}
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
