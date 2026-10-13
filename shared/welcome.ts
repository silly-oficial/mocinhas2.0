export type WelcomeSlide = { id: string; type: 'image' | 'video'; url: string; name?: string };
export type WelcomeConfig = { intervalSeconds: number; slides: WelcomeSlide[] };
