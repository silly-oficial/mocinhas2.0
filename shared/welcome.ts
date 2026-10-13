export type WelcomeFrame = { fit: 'cover' | 'contain'; x: number; y: number; zoom: number };
export type WelcomeSlide = { id: string; type: 'image' | 'video'; url: string; name?: string; frame?: WelcomeFrame };
export type WelcomeConfig = { intervalSeconds: number; slides: WelcomeSlide[] };
export const defaultWelcomeFrame: WelcomeFrame = { fit: 'cover', x: 50, y: 50, zoom: 1 };
export function welcomeFrameStyle(frame = defaultWelcomeFrame) {
  return { objectFit: frame.fit, objectPosition: `${frame.x}% ${frame.y}%`, transform: `scale(${frame.zoom})`, transformOrigin: `${frame.x}% ${frame.y}%` };
}
