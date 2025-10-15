import Tesseract from 'tesseract.js';
import type { OCRResult, LaundryItems } from '@/types';

// Process image with OCR
export async function processImage(
  imageFile: File | string,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(
      imageFile,
      'por', // Portuguese language
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(m.progress * 100));
          }
        }
      }
    );

    const text = result.data.text;
    const confidence = result.data.confidence;
    const items = extractItemsFromText(text);

    return {
      text,
      confidence,
      items
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process image');
  }
}

// Extract laundry items from OCR text
export function extractItemsFromText(text: string): Partial<LaundryItems> {
  const items: Partial<LaundryItems> = {};
  const lines = text.split('\n');

  // Patterns to match different item types - more flexible for handwriting
  const patterns: Record<string, RegExp[]> = {
    l_casal: [/l\.?\s*casal/i, /lencol\s*casal/i, /\bcasal\b/i, /lcasal/i, /l\s*cas/i],
    l_solteiro: [/l\.?\s*solteiro/i, /lencol\s*solteiro/i, /\bsolteiro\b/i, /lsolteiro/i, /l\s*solt/i],
    fronha: [/fronha/i, /fronia/i],
    t_banho: [/t\.?\s*banho/i, /toalha\s*banho/i, /\bbanho\b/i, /tbanho/i, /t\s*ban/i],
    t_rosto: [/t\.?\s*rosto/i, /toalha\s*rosto/i, /\brosto\b/i, /trosto/i, /t\s*rost/i],
    piso: [/piso/i, /plso/i, /p1so/i],
    edredom: [/edredom/i, /edredon/i, /edred/i],
    colcha: [/colcha/i, /coicha/i],
    capa_edredom: [/capa\s*edredom/i, /capa\s*edredon/i, /c\.?\s*edredom/i],
    sala: [/sala/i],
    box: [/box/i, /b[o0]x/i],
    capa_colchao: [/capa\s*colch[aã]o/i, /c\.?\s*colch[aã]o/i, /colch[aã]o/i, /capa\s*col/i],
    toalha_mesa: [/toalha\s*mesa/i, /t\.?\s*mesa/i, /\bmesa\b/i]
  };

  // Try to extract numbers from each line
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    // Extract all numbers from the line (including those that might have OCR errors)
    const numbers = cleanLine.match(/\d+/g);
    if (!numbers || numbers.length === 0) continue;

    // Check which category this line might belong to
    for (const [category, regexes] of Object.entries(patterns)) {
      for (const regex of regexes) {
        if (regex.test(cleanLine)) {
          // Find the number that's likely the quantity
          // Usually it's the last number in the line, or the largest reasonable number
          const validNumbers = numbers
            .map(n => parseInt(n, 10))
            .filter(n => !isNaN(n) && n >= 0 && n < 1000); // Filter out unreasonable values

          if (validNumbers.length > 0) {
            // Use the last valid number (most likely to be the quantity)
            items[category as keyof LaundryItems] = validNumbers[validNumbers.length - 1];
          }
          break;
        }
      }
    }
  }

  // If no items were detected, try a more aggressive approach: look for column-based data
  if (Object.keys(items).length === 0) {
    console.log('No items detected with keyword matching. Full OCR text:', text);
  }

  return items;
}

// Convert file to base64 for storage
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
