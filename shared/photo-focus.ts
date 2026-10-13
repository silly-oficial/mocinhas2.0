export type PhotoFocus = { x: number; y: number };
export function validatePhotoFocus(value: unknown): PhotoFocus {
  if (!value || typeof value !== 'object') throw new Error('Ponto de destaque inválido.');
  const { x, y } = value as PhotoFocus;
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) throw new Error('O ponto de destaque deve ficar entre 0 e 100.');
  return { x, y };
}
