'use client';

import { useState, useRef } from 'react';
import { processImage, fileToBase64 } from '@/lib/ocr';
import { processImageWithGemini } from '@/lib/gemini';
import type { LaundryItems } from '@/types';
import { createEmptyItems, useLaundryStore } from '@/lib/store';

interface PhotoUploadProps {
  onImageProcessed: (items: LaundryItems, imageUrl: string) => void;
  mode?: 'send' | 'return';
}

export default function PhotoUpload({ onImageProcessed, mode = 'send' }: PhotoUploadProps) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { geminiApiKey } = useLaundryStore();

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Max dimensions for storage (reduce file size)
          const maxWidth = 1200;
          const maxHeight = 1600;

          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.8 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Process with Gemini AI or fallback to OCR
    setProcessing(true);
    setProgress(0);

    try {
      // Use full resolution for AI processing
      const imageUrl = await fileToBase64(file);
      let items: LaundryItems;

      // Use Gemini 2.5 Flash model
      const useGemini = true;

      if (geminiApiKey && useGemini) {
        // Use Gemini AI Vision
        try {
          items = await processImageWithGemini(imageUrl, geminiApiKey, (p) => setProgress(p));
        } catch (geminiError) {
          console.error('Gemini error, falling back to OCR:', geminiError);
          // Fallback to basic OCR
          const result = await processImage(file, (p) => setProgress(p));
          items = {
            ...createEmptyItems(),
            ...result.items
          };
        }
      } else {
        // Use basic OCR (Tesseract)
        const result = await processImage(file, (p) => setProgress(p));
        items = {
          ...createEmptyItems(),
          ...result.items
        };
      }

      // Compress image for storage
      const compressedImageUrl = await compressImage(file);

      onImageProcessed(items, compressedImageUrl);
    } catch (error) {
      console.error('Error processing image:', error);
      alert(`Erro ao processar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center">
        {preview ? (
          <div className="space-y-4">
            <img
              src={preview}
              alt="Preview"
              className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
            />
            {processing && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Processando imagem... {progress}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleCameraCapture}
            disabled={processing}
            className="w-full flex flex-col items-center space-y-4 py-8 hover:bg-primary/5 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg
              className="w-16 h-16 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">
                {mode === 'send' ? 'Fotografar Folha de Lavanderia' : 'Fotografar Documento de Retorno'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Toque para abrir a câmera ou selecionar uma foto
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
