/**
 * Detecta aparelhos fracos / modo economia de dados.
 * Usado pelo feed "Universo" para ligar o modo LITE (menos efeitos, menos itens na tela).
 * Também existe uma checagem em tempo real de FPS dentro do UniverseFeed:
 * se o aparelho engasgar, o modo LITE é ligado sozinho.
 */
export function isDataSaver(): boolean {
  try {
    const conn = (navigator as any).connection;
    return Boolean(conn?.saveData);
  } catch {
    return false;
  }
}

export function detectLiteDevice(): boolean {
  try {
    const nav = navigator as any;
    const mem: number | undefined = nav.deviceMemory; // Chrome/Android (GB). Safari/Firefox não informam
    const cores: number = nav.hardwareConcurrency || 4;
    const conn = nav.connection;
    const slowNet = /(^|\s)(slow-2g|2g)$/.test(conn?.effectiveType || '');
    const reducedMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    return Boolean((mem !== undefined && mem <= 3) || cores <= 4 || conn?.saveData || slowNet || reducedMotion);
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
