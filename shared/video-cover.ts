export type VideoCover = { thumbnail: string; coverTime: number };
export function validateVideoCover(value: unknown): VideoCover {
  if (!value || typeof value !== 'object') throw new Error('Capa inválida.');
  const { thumbnail, coverTime } = value as VideoCover;
  // Posters must come from the application's authenticated upload route.
  if (typeof thumbnail !== 'string' || !/^\/uploads\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(thumbnail)) throw new Error('Envie a imagem da capa pelo aplicativo.');
  if (typeof coverTime !== 'number' || !Number.isFinite(coverTime) || coverTime < 0) throw new Error('Posição da capa inválida.');
  return { thumbnail, coverTime };
}
