export interface ImgbbUploadResult {
  imageUrl: string;
  displayUrl: string;
  thumbnailUrl?: string;
  deleteUrl?: string;
}

interface UploadOptions {
  onProgress?: (progressPercent: number) => void;
}

interface ImgbbApiResponse {
  success?: boolean;
  data?: {
    url?: string;
    display_url?: string;
    delete_url?: string;
    thumb?: {
      url?: string;
    };
  };
  error?: {
    message?: string;
  };
}

const IMGBB_UPLOAD_ENDPOINT = 'https://api.imgbb.com/1/upload';
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const COMPRESSED_MAX_DIMENSION = 1280;
const COMPRESSED_QUALITY = 0.82;

export const validateImageFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image size must be 10MB or less');
  }
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to read image file'));
    };
    img.src = objectUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to process image'));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });

const compressImageIfNeeded = async (file: File): Promise<File> => {
  const shouldCompress = file.size > 1024 * 1024 || !['image/jpeg', 'image/webp'].includes(file.type);
  if (!shouldCompress) {
    return file;
  }

  const image = await loadImage(file);
  const scale = Math.min(1, COMPRESSED_MAX_DIMENSION / Math.max(image.width, image.height));
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to process image');
  }

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  const blob = await canvasToBlob(canvas, 'image/jpeg', COMPRESSED_QUALITY);
  const compressedName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
  return new File([blob], compressedName, { type: 'image/jpeg' });
};

const uploadWithProgress = async (
  file: File,
  apiKey: string,
  onProgress?: (progressPercent: number) => void
): Promise<ImgbbApiResponse> =>
  new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ''));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${IMGBB_UPLOAD_ENDPOINT}?key=${encodeURIComponent(apiKey)}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(percent);
    };

    xhr.onload = () => {
      try {
        const payload: ImgbbApiResponse = JSON.parse(xhr.responseText || '{}');
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(payload?.error?.message || 'Failed to upload image to ImgBB'));
          return;
        }
        resolve(payload);
      } catch {
        reject(new Error('Unexpected response from image upload service'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during image upload'));
    xhr.send(formData);
  });

export const uploadImageToImgbb = async (
  file: File,
  options?: UploadOptions
): Promise<ImgbbUploadResult> => {
  validateImageFile(file);

  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error('ImgBB API key is missing. Set VITE_IMGBB_API_KEY in your environment.');
  }

  options?.onProgress?.(5);
  const optimizedFile = await compressImageIfNeeded(file);
  options?.onProgress?.(15);

  const payload = await uploadWithProgress(optimizedFile, apiKey, options?.onProgress);

  if (!payload?.success || !payload?.data?.url) {
    throw new Error(payload?.error?.message || 'Failed to upload image to ImgBB');
  }

  options?.onProgress?.(100);

  return {
    imageUrl: payload.data.url,
    displayUrl: payload.data.display_url || payload.data.url,
    thumbnailUrl: payload.data.thumb?.url,
    deleteUrl: payload.data.delete_url,
  };
};

export const uploadBase64ImageToImgbb = async (
  dataUrl: string,
  fileName: string = 'offline-capture.jpg',
  options?: UploadOptions
): Promise<ImgbbUploadResult> => {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data for upload');
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const file = new File([bytes], fileName, { type: mimeType });
  return uploadImageToImgbb(file, options);
};
