import { api } from '../services/api';

/**
 * Captura um quadro do vídeo (no celular de quem está publicando) e gera uma
 * imagem JPEG pequena (~20–40 KB). Essa imagem é o "planeta" do universo:
 * o feed só mostra essa imagem leve e carrega o vídeo de verdade apenas
 * quando o usuário chega bem perto dele.
 */
export function captureVideoPoster(file: File, maxDim = 480, quality = 0.66): Promise<Blob | null> {
  return new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    let finished = false;

    const finish = (blob: Blob | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        video.removeAttribute('src');
        video.load();
      } catch {}
      URL.revokeObjectURL(objectUrl);
      resolve(blob);
    };

    const timer = setTimeout(() => finish(null), 9000);

    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      const d = isFinite(video.duration) ? video.duration : 0;
      // pega um quadro um pouco depois do início (evita tela preta do primeiro frame)
      video.currentTime = d > 1 ? Math.min(1, d * 0.1) : 0.05;
    };

    video.onseeked = () => {
      try {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) return finish(null);
        const scale = Math.min(1, maxDim / Math.max(vw, vh));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(vw * scale));
        canvas.height = Math.max(1, Math.round(vh * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => finish(blob), 'image/jpeg', quality);
      } catch {
        finish(null);
      }
    };

    video.onerror = () => finish(null);
  });
}

/** Gera o poster e envia para o servidor. Retorna a URL do poster (ou undefined se falhar). */
export async function uploadVideoPoster(file: File): Promise<string | undefined> {
  try {
    const blob = await captureVideoPoster(file);
    if (!blob) return undefined;
    const posterFile = new File([blob], `poster_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const res = await api.uploadFile(posterFile);
    return res?.url || undefined;
  } catch {
    return undefined;
  }
}
