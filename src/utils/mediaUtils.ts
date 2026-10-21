import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Extrai o ID de 11 caracteres de qualquer URL do YouTube (incluindo vídeos não listados, shorts, youtu.be, embed)
 */
export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  // Tenta extrair parâmetro v= caso esteja em outra posição na query string
  try {
    const parsedUrl = new URL(trimmed);
    if (parsedUrl.hostname.includes('youtube.com')) {
      const v = parsedUrl.searchParams.get('v');
      if (v && v.length === 11) return v;
    }
  } catch {
    // Ignora erro de URL inválida
  }
  return null;
}

/**
 * Verifica se uma URL é do YouTube
 */
export function isYouTubeUrl(url?: string): boolean {
  return extractYouTubeId(url) !== null;
}

/**
 * Retorna a URL da miniatura oficial do YouTube para que o cliente visualize a capa do vídeo não listado
 */
export function getYouTubeThumbnail(
  urlOrId: string,
  quality: 'hqdefault' | 'mqdefault' | 'maxresdefault' = 'hqdefault'
): string | null {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Retorna a URL de embed do YouTube para reprodução integrada no sistema
 */
export function getYouTubeEmbedUrl(urlOrId?: string, startSeconds?: number): string | null {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) return null;
  const startParam = startSeconds && startSeconds > 0 ? `&start=${Math.floor(startSeconds)}` : '';
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1${startParam}`;
}

/**
 * Captura automaticamente um frame de um arquivo de vídeo MP4 e gera uma miniatura (Data URL JPEG compacta)
 */
export function generateVideoThumbnailFromFile(file: File, seekToSeconds = 1.0): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    video.onloadedmetadata = () => {
      // Define um ponto seguro do vídeo para capturar a miniatura
      const targetTime =
        video.duration && video.duration > 0
          ? Math.min(seekToSeconds, Math.max(0.1, video.duration * 0.25))
          : 0.1;
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxWidth = 640;
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 360;
        const scale = vw > maxWidth ? maxWidth / vw : 1;

        canvas.width = Math.round(vw * scale);
        canvas.height = Math.round(vh * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Não foi possível criar contexto de canvas'));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Falha ao carregar o arquivo MP4 para gerar miniatura'));
    };
  });
}

/**
 * Captura um frame de um elemento <video> já carregado na tela no momento atual
 */
export function captureFrameFromVideoElement(videoEl: HTMLVideoElement): string | null {
  try {
    const vw = videoEl.videoWidth || 640;
    const vh = videoEl.videoHeight || 360;
    const maxWidth = 640;
    const scale = vw > maxWidth ? maxWidth / vw : 1;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}

/**
 * Comprime uma imagem de capa/miniatura enviada pelo usuário para Data URL leve
 */
export function compressImageToDataUrl(file: File, maxWidth = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Faz upload do arquivo para o Firebase Storage com fallback imediato para URL local caso offline/sem permissão
 */
export async function uploadMediaFile(file: File, clienteId: string): Promise<string> {
  const localUrl = URL.createObjectURL(file);
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = ref(storage, `clientes/${clienteId}/midias/${Date.now()}_${safeName}`);
    const uploadPromise = uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef));
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Upload timeout fallback')), 3500)
    );
    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch {
    return localUrl;
  }
}
