import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LaundryItems } from '@/types';
import { createEmptyItems } from './store';

export async function processImageWithGemini(
  imageBase64: string,
  apiKey: string,
  onProgress?: (progress: number) => void
): Promise<LaundryItems> {
  if (!apiKey) {
    throw new Error('Gemini API key não configurada. Configure nas Configurações.');
  }

  try {
    if (onProgress) onProgress(10);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    if (onProgress) onProgress(30);

    // Remove data URL prefix if present
    const base64Data = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1]
      : imageBase64;

    const prompt = `Você é um assistente que extrai dados de folhas de lavanderia de hotel.

Analise esta imagem de uma folha de lavanderia manuscrita e extraia as quantidades para cada tipo de item.

Os tipos de itens são:
- L. Casal (Lençol de Casal)
- L. Solteiro (Lençol de Solteiro)
- Fronha
- T. Banho (Toalha de Banho)
- T. Rosto (Toalha de Rosto)
- Piso (Tapete de Piso)
- Edredom
- Colcha
- Capa Edredom (Capa de Edredom)
- Sala
- Box (Tapete de Box)
- Capa Colchão (Capa de Colchão)
- Toalha Mesa (Toalha de Mesa)

Retorne APENAS um objeto JSON no seguinte formato (sem nenhum texto adicional):
{
  "l_casal": 0,
  "l_solteiro": 0,
  "fronha": 0,
  "t_banho": 0,
  "t_rosto": 0,
  "piso": 0,
  "edredom": 0,
  "colcha": 0,
  "capa_edredom": 0,
  "sala": 0,
  "box": 0,
  "capa_colchao": 0,
  "toalha_mesa": 0
}

Se não conseguir identificar algum item, deixe o valor como 0.
Some TODOS os valores que encontrar para cada categoria (se houver múltiplas linhas/dias).
IMPORTANTE: Retorne APENAS o JSON, sem markdown, sem explicações, sem \`\`\`json.`;

    if (onProgress) onProgress(50);

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    if (onProgress) onProgress(80);

    const response = await result.response;
    const text = response.text();

    if (onProgress) onProgress(90);

    // Parse the JSON response
    let cleanedText = text.trim();

    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Try to extract JSON if it's embedded in text
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    const parsedData = JSON.parse(cleanedText);

    // Merge with empty items to ensure all fields exist
    const items: LaundryItems = {
      ...createEmptyItems(),
      ...parsedData
    };

    if (onProgress) onProgress(100);

    return items;
  } catch (error) {
    console.error('Gemini error:', error);
    throw new Error(`Erro ao processar imagem com Gemini: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}
