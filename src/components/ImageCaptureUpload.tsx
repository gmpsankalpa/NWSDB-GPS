import { useMemo, useRef, useState } from 'react';
import { Camera, Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { uploadImageToImgbb } from '../lib/imgbbUpload';

interface UploadedImageMeta {
  imageUrl: string;
  displayUrl: string;
  thumbnailUrl?: string;
  deleteUrl?: string;
  offlineDataUrl?: string;
  offlineFileName?: string;
}

interface ImageCaptureUploadProps {
  value?: UploadedImageMeta;
  onChange: (value?: UploadedImageMeta) => void;
  disabled?: boolean;
  showInlinePreview?: boolean;
}

const ImageCaptureUpload = ({
  value,
  onChange,
  disabled = false,
  showInlinePreview = true,
}: ImageCaptureUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryFile, setRetryFile] = useState<File | null>(null);

  const previewUrl = useMemo(() => value?.displayUrl || value?.imageUrl || '', [value]);

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          reject(new Error('Failed to read image'));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });

  const uploadFile = async (file: File) => {
    if (!file) return;

    if (!navigator.onLine) {
      const dataUrl = await fileToDataUrl(file);
      onChange({
        imageUrl: '',
        displayUrl: dataUrl,
        thumbnailUrl: dataUrl,
        offlineDataUrl: dataUrl,
        offlineFileName: file.name,
      });
      setRetryFile(null);
      toast.success('Image saved locally. It will upload when online.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const uploaded = await uploadImageToImgbb(file, {
        onProgress: (progressPercent) => setUploadProgress(progressPercent),
      });
      onChange(uploaded);
      setRetryFile(null);
      toast.success('Image uploaded successfully');
    } catch (error: unknown) {
      setRetryFile(file);
      const message = error instanceof Error ? error.message : 'Image upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadFile(file);
    } finally {
      event.target.value = '';
    }
  };

  const openPicker = () => {
    if (!disabled && !uploading) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="hidden"
      />

      {previewUrl && showInlinePreview ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <img src={previewUrl} alt="Connection" className="w-full h-48 object-cover bg-gray-100" />
          <div className="p-3 flex items-center justify-between bg-white">
            <p className="text-sm text-gray-600 truncate">Image uploaded to ImgBB</p>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              disabled={disabled || uploading}
              className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              <X size={16} />
              <span className="text-sm font-medium">Remove</span>
            </button>
          </div>
        </div>
      ) : previewUrl ? (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex items-center justify-between gap-2">
          <p className="text-sm text-green-700 font-medium">Image uploaded</p>
          <div className="flex items-center gap-2">
            <img
              src={previewUrl}
              alt="Uploaded connection"
              className="w-14 h-14 sm:w-10 sm:h-10 rounded-md object-cover border border-gray-200 bg-white"
            />
            <button
              type="button"
              onClick={() => onChange(undefined)}
              disabled={disabled || uploading}
              className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              <X size={16} />
              <span className="text-sm font-medium">Remove</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || uploading}
          className={cn(
            'w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 text-center transition-colors',
            'hover:border-blue-500 hover:bg-blue-50',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 mb-2">
            <ImageIcon size={20} />
          </div>
          <p className="text-sm font-semibold text-gray-700">Capture or Select Connection Image</p>
          <p className="text-xs text-gray-500 mt-1">Uses camera on mobile or file picker on desktop</p>
        </button>
      )}

      {uploading && (
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">Uploading... {uploadProgress}%</p>
        </div>
      )}

      {!uploading && retryFile && !previewUrl && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2.5">
          <p className="text-xs text-amber-800">Upload failed. Retry with the same image?</p>
          <button
            type="button"
            onClick={() => uploadFile(retryFile)}
            disabled={disabled}
            className="px-2.5 py-1 rounded-md bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || uploading}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all',
            'bg-blue-600 text-white hover:bg-blue-700 active:scale-95',
            'disabled:bg-gray-300 disabled:cursor-not-allowed disabled:active:scale-100'
          )}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
          <span>{uploading ? 'Uploading...' : previewUrl ? 'Replace Image' : 'Take Photo'}</span>
        </button>

        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || uploading}
          className="px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          title="Choose from files"
        >
          <Upload size={18} className="text-gray-700" />
        </button>
      </div>
    </div>
  );
};

export default ImageCaptureUpload;
